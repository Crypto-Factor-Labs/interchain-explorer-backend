import { Injectable, Inject, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import BN from 'bn.js';
import { ReaderNodeService } from '../reader-node/reader-node.service.js';
import { MasterChainBlockRepository, MC_BLOCK_REPO } from '../storage/repositories/master-chain-block.repository.js';
import { PartialChainBlockRepository, PC_BLOCK_REPO } from '../storage/repositories/partial-chain-block.repository.js';
import { TransactionRepository, TX_REPO } from '../storage/repositories/transaction.repository.js';
import { PartialBlock } from '../reader-node/types/partialblock.types.js';
import { IndexerLockRepository } from '../storage/repositories/indexer-lock.repository.js';
import { indexMasterBlock } from './index-master-block.js';
import { indexExecutionPart } from './index-execution-part.js';
import { upsertChainEvent } from './index-chain-event.js';
import { normalizeChainEvent, resultFromEvent } from '../reader-node/ingest-helpers.js';
import { TransactionEntity } from '../storage/entities/transaction.entity.js';

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  constructor(
    @Inject(MC_BLOCK_REPO)  // Repository for interacting with MasterBlock storage
    private readonly masterBlockRepo: MasterChainBlockRepository,

    @Inject(PC_BLOCK_REPO)  // Repository for interacting with PartialBlock storage
    private readonly partialBlockRepo: PartialChainBlockRepository,

    @Inject(TX_REPO)
    private readonly txRepo: TransactionRepository,

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

      // Refresh a batch of pending Transactions
      await this.processPendingTransactions(100);

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

  // ------------ Refresh pending Transactions ------------
  /*
    private async processPendingTransactions(batch: number): Promise<void> {
      const pending = await this.txRepo.getPending(batch);
      if (pending.length === 0) return;
  
      this.logger.log(`🔁 Refreshing ${pending.length} pending Transactions...`);
  
      for (const pendingTx of pending) {
        try {
          const rnTx: RNTransaction = await this.rnService.fetchTransaction(pendingTx.transactionHash);
  
          // Update core tx fields
          const patch: Partial<TransactionEntity> = {
            state: rnTx.state ?? pendingTx.state,
            result: rnTx.result ?? pendingTx.result,
            stateValidationResult: rnTx.stateValidationEvent?.result ?? pendingTx.stateValidationResult,
            // masterBlockTransactionIndex: only if present (0 is valid!)
            ...(rnTx.masterBlockTransactionIndex != null
              ? { masterBlockTransactionIndex: rnTx.masterBlockTransactionIndex }
              : {}),
          };
  
          // Only set if non-empty
          const includedIn = rnTx.includedInMasterBlock?.trim();
          if (includedIn)
            patch.includedInMasterBlock = includedIn;
          else
            if (pendingTx.includedInMasterBlock)
              this.logger.warn(`Prevented to reset includedInMasterBlock | txHash = ${pendingTx.transactionHash}`)
  
          await this.txRepo.patchByHash(pendingTx.transactionHash, patch);
  
          // Upsert ExecutionParts (idempotent)
          for (const [i, part] of rnTx.executionParts.entries()) {
            await this.partRepo.upsert({
              transaction: { id: pendingTx.id } as any,           // minimal shape
              transactionHash: rnTx.transactionHash,
              partIndex: part.transactionExecutionPartIndex ?? i,
              isRevert: false,
              chainId: part.chainId,
              operatorAddress: part.operatorAddress,
              senderAddress: part.senderAddress,
              includedInPartialBlock: part.includedInPartialBlock,
            });
  
            // Possible revert part
            const rp = rnTx.revertExecutionPart;
            if (rp) {
              await this.partRepo.upsert({
                transaction: { id: pendingTx.id } as any,
                transactionHash: rnTx.transactionHash,
                partIndex: null,
                isRevert: true,
                chainId: rp.chainId,
                operatorAddress: rp.operatorAddress,
                senderAddress: rp.senderAddress,
                includedInPartialBlock: rp.includedInPartialBlock,
              });
            }
          };
        } catch (e: any) {
          this.logger.warn(`Failed to refresh tx ${pendingTx.transactionHash}: ${e?.message ?? e}`);
        }
      }
    }
  */

  private async processPendingTransactions(batch: number): Promise<void> {
    const pending = await this.txRepo.getPending(batch);
    if (pending.length === 0) return;

    this.logger.log(`🔁 Refreshing ${pending.length} pending Transactions...`);

    for (const pendingTx of pending) {
      try {
        const rnTx = await this.rnService.fetchTransaction(pendingTx.transactionHash);

        await this.dataSource.transaction(async manager => {
          // ---- Tx-level ChainEvents (push + state validation) ----
          const pushEvt = normalizeChainEvent(rnTx.sourceChainPushEvent);
          const svEvt = normalizeChainEvent(rnTx.stateValidationEvent);
          const svRes = resultFromEvent(rnTx.stateValidationEvent) ?? null;

          // Upsert events first (so hashes exist if you reference them)
          const pushHash = await upsertChainEvent(manager, pushEvt, null);
          const svHash = await upsertChainEvent(manager, svEvt, svRes);

          // ---- Patch top-level tx fields that may evolve while pending ----
          const patch: Partial<TransactionEntity> = {
            state: rnTx.state ?? pendingTx.state,
            result: rnTx.result ?? pendingTx.result,
            sourcePushTxHash: pushHash,
            stateValidationTxHash: svHash,
            stateValidationResult: svRes ?? pendingTx.stateValidationResult,
            // masterBlockTransactionIndex: only if present (0 is valid!)
            ...(rnTx.masterBlockTransactionIndex != null
              ? { masterBlockTransactionIndex: rnTx.masterBlockTransactionIndex }
              : {}),
          };

          // Only set if non-empty
          const includedIn = rnTx.includedInMasterBlock?.trim();
          if (includedIn)
            patch.includedInMasterBlock = includedIn;
          else
            if (pendingTx.includedInMasterBlock)
              this.logger.warn(`Prevented to reset includedInMasterBlock | txHash = ${pendingTx.transactionHash}`)

          await manager.getRepository(TransactionEntity).update({ id: pendingTx.id }, patch);

          // ---- Update the ExecutionParts (and their ChainEvents) via the existing method ----
          let autoIndex = 0;
          for (const part of rnTx.executionParts) {
            const partIdx = typeof part.transactionExecutionPartIndex === 'number'
              ? part.transactionExecutionPartIndex
              : autoIndex++;
            await indexExecutionPart(manager, pendingTx, rnTx.transactionHash, part, false, partIdx);
          }

          if (rnTx.revertExecutionPart) {
            await indexExecutionPart(manager, pendingTx, rnTx.transactionHash, rnTx.revertExecutionPart, true);
          }
        });
      } catch (e: any) {
        this.logger.warn(`Failed to refresh tx ${pendingTx.transactionHash}: ${e?.message ?? e}`);
      }
    }
  }

  async dummyJob() {
    // Dummy Job for the scheduler
  }
}
