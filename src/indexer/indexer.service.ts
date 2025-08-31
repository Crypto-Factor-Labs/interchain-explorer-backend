import { Injectable, Inject, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import BN from 'bn.js';
import { ReaderNodeService } from '../reader-node/reader-node.service.js';
import { MasterChainBlockRepository, MC_BLOCK_REPO } from '../storage/repositories/master-chain-block.repository.js';
import { PartialChainBlockRepository, PC_BLOCK_REPO } from '../storage/repositories/partial-chain-block.repository.js';
import { PartialBlock } from '../reader-node/types/partialblock.types.js';
import { IndexerLockRepository } from '../storage/repositories/indexer-lock.repository.js';
import { indexMasterBlock } from './index-master-block.js';

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  constructor(
    @Inject(MC_BLOCK_REPO)  // Repository for interacting with MasterBlock storage
    private readonly masterBlockRepo: MasterChainBlockRepository,

    @Inject(PC_BLOCK_REPO)  // Repository for interacting with PartialBlock storage
    private readonly partialBlockRepo: PartialChainBlockRepository,

    @Inject(IndexerLockRepository)  // Repository for interacting with Indexer-lock storage
    private readonly lockRepo: IndexerLockRepository,

    private readonly rnService: ReaderNodeService,
    private readonly dataSource: DataSource,  // DataSource for transaction management
  ) { }

  // Trigger block indexing when the application starts
  async onApplicationBootstrap() {
    this.logger.log('🚀 IndexerService is starting. Running initial block indexing...');
    this.lockRepo.releaseLock();  // Force unlock at application start
    await this.indexBlocks();
  }

  async indexBlocks(): Promise<void> {
    // Check if an indexing job is already running
    const isRunning = await this.lockRepo.isIndexingInProgress();

    if (isRunning) {
      this.logger.log('🛑 Indexing job is already running');
      return;
    }

    // Acquire the lock
    await this.lockRepo.acquireLock();
    this.logger.log('🔒 Lock acquired, starting indexing job...');

    try {
      let lastIndexedHeight = await this.masterBlockRepo.getGreatestHeight();  // Returns -1 when no blocks indexed yet
      //lastIndexedHeight = new BN(0);  // Reset to 0 for testing purposes

      //const avgBlockSpeed = await this.masterBlockRepo.getAvgBlockSpeed_24hr();
      //console.log(`>>> avgBlockSpeed = ${avgBlockSpeed}`);

      const latestHeight = await this.rnService.getLatestHeight();
      //this.logger.debug(`>>> Last indexed height = ${lastIndexedHeight}`);
      //this.logger.debug(`>>> Latest height on ReaderNode = ${latestHeight}`);

      // If there are new blocks, index them
      await this.indexNewBlocks(lastIndexedHeight, latestHeight);

      // Refresh a batch of unconfirmed PartialBlocks
      await this.processPendingPartialBlocks(100);

    } catch (error: any) {
      this.logger.error('Error during indexing of blocks:', error?.stackTrace ?? error?.message);
    } finally {
      // Release the lock after the job is done
      await this.lockRepo.releaseLock();
      this.logger.log('🔓 Lock released, indexing job completed!');
    }
  }

  async indexNewBlocks(lastIndexedHeight: BN, latestHeight: BN,): Promise<void> {
    let height = lastIndexedHeight.addn(1);

    while (height.lte(latestHeight)) {
      try {
        // Fetch the block from the ReaderNode and index it
        const block = await this.rnService.fetchMasterBlockByHeight(height);
        await indexMasterBlock(block, { dataSource: this.dataSource, rnService: this.rnService, logger: this.logger });
        this.logger.debug(`Indexed MasterBlock at height ${height.toString()}, including ${block.partialBlocks.length} PartialBlocks and ${block.transactions.length} Transactions`);

      } catch (error) {
        this.logger.error(`Failed to index block at height ${height.toString()}:`, error);
        throw error; // Stop indexing to avoid gaps
      }
      height = height.addn(1);

      //console.log(`>>> STOPPING AFTER THE FIRST BLOCK FOR TESTING PURPOSES`);
      //return;
    }

    const nrOfBlocks = latestHeight.sub(lastIndexedHeight);
    if (nrOfBlocks.gt(new BN(0))) {
      this.logger.log(`🌟 ${nrOfBlocks.toString()} new block${nrOfBlocks.eq(new BN(1)) ? '' : 's'} indexed`);
      this.logger.log(`>>> Last indexed height = ${await this.masterBlockRepo.getGreatestHeight()} `);
    }
  }

  // ------------ Refresh unconfirmed PartialBlocks ------------

  private async processPendingPartialBlocks(batch: number): Promise<void> {
    // fetch a batch of unconfirmed partials
    const pending = await this.partialBlockRepo.getUnconfirmed(batch);
    if (pending.length === 0) return;

    this.logger.log(`🔁 Refreshing ${pending.length} unconfirmed PartialBlocks...`);

    for (const row of pending) {
      try {
        const fresh = await this.rnService.fetchPartialBlock(row.chain_id, row.block_hash);
        const patch = this.buildPartialPatchFromRN(fresh);
        if (Object.keys(patch).length > 0) {
          await this.partialBlockRepo.patchByHash(row.block_hash, patch);
        }
      } catch (e: any) {
        this.logger.warn(`Failed to refresh PartialBlock ${row.chain_id}:${row.block_hash}: ${e?.message ?? e}`);
      }
    }
  }

  private buildPartialPatchFromRN(pb: PartialBlock): Partial<import('../storage/entities/partial-chain-block.entity.js').PartialChainBlockEntity> {
    const patch: any = {};
    // Only patch fields that may change post-mint
    if (typeof pb.confirmed === 'boolean') patch.confirmed = pb.confirmed;
    if (pb.executionPartsRoot) patch.txn_root = pb.executionPartsRoot;
    if (pb.targetChainPublishEvent?.transactionHash) patch.commit_txn_hash = pb.targetChainPublishEvent.transactionHash;
    if (pb.mempoolEpochConsensusProof) patch.commit_proof = pb.mempoolEpochConsensusProof;
    if (typeof pb.mempoolEpoch === 'number') patch.mempool_epoch = pb.mempoolEpoch;

    // Always bump indexed_at so we know when last refreshed
    patch.indexed_at = new Date();
    return patch;
  }

  async dummyJob() {
    // Dummy Job for the scheduler
  }
}
