import { Injectable, Inject, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import BN from 'bn.js';
//import { PartisiaService } from '../partisia/partisia.service.js';
import { ReaderNodeService } from '../reader-node/reader-node.service.js';
import { MasterChainBlockRepository, MC_BLOCK_REPO } from '../storage/repositories/master-chain-block.repository.js';
//import { PartialChainBlockRepository, PC_BLOCK_REPO } from '../storage/repositories/partial-chain-block.repository.js';
import { MasterChainBlockEntity } from '../storage/entities/master-chain-block.entity.js';
import { PartialChainBlockEntity } from '../storage/entities/partial-chain-block.entity.js';
import { IndexerLockRepository } from '../storage/repositories/indexer-lock.repository.js';
import { MasterBlock } from '../types/masterblock.types.js';
import { PartialBlock } from '../types/partialblock.types.js';

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  constructor(
    @Inject(MC_BLOCK_REPO)  // Repository for interacting with MasterBlock storage
    private readonly masterBlockRepo: MasterChainBlockRepository,

    //@Inject(PC_BLOCK_REPO)  // Repository for interacting with PartialBlock storage
    //private readonly partialBlockRepo: PartialChainBlockRepository,

    @Inject(IndexerLockRepository)  // Repository for interacting with Indexer-lock storage
    private readonly lockRepo: IndexerLockRepository,

    //private readonly partisiaService: PartisiaService,
    private readonly rnService: ReaderNodeService,
    private readonly dataSource: DataSource,  // DataSource for transaction management
  ) { }

  // Trigger block indexing when the application starts.
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
      this.logger.debug(`>>> Last indexed height = ${lastIndexedHeight}`);
      this.logger.debug(`>>> Latest height on ReaderNode = ${latestHeight}`);

      await this.indexNewBlocks(lastIndexedHeight, latestHeight);

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
        const block = await this.rnService.fetchMasterBlock(height);
        await this.indexMasterBlock(block);
        this.logger.debug(`Indexed MasterBlock at height ${height.toString()}, including ${block.partialBlocks.length} PartialBlocks`);
      } catch (error) {
        this.logger.error(`Failed to index block at height ${height.toString()}:`, error);
        throw error; // Stop indexing to avoid gaps
      }
      height = height.addn(1);
    }

    const nrOfBlocks = latestHeight.sub(lastIndexedHeight);
    if (nrOfBlocks.gt(new BN(0))) {
      this.logger.log(`🌟 ${nrOfBlocks.toString()} new block${nrOfBlocks.eq(new BN(1)) ? '' : 's'} indexed`);
      this.logger.log(`>>> Last indexed height = ${await this.masterBlockRepo.getGreatestHeight()}`);
    }
  }

  /**
   * Index a new block by saving it to storage.
   * Also indexes related PartialBlocks, all in the same transaction.
   * @param block - The MasterBlock to index
   */
  async indexMasterBlock(block: MasterBlock): Promise<void> {
    await this.dataSource.manager.transaction(async (manager) => {
      try {
        // Create a new MasterBlock entity
        const entity = new MasterChainBlockEntity();

        entity.height = new BN(block.height);
        entity.block_hash = block.blockHash;
        entity.timestamp = new Date(block.timestamp); // Convert from number (ms) if needed
        entity.merkle_root = block.partialBlockRoot;
        entity.block_mint_transaction = block.transactions?.[0]?.transactionHash ?? ''; // First tx hash
        entity.indexed_at = new Date();  // Timestamp of when this block was indexed

        // Save the block to storage
        await manager.save(entity);

        // Index the PartialBlocks that are related to the MasterBlock
        for (const partialSummary of block.partialBlocks) {
          const partialBlock = await this.rnService.fetchPartialBlock(
            partialSummary.chainId,
            partialSummary.blockHash
          );

          await this.indexPartialBlock(partialBlock, entity.block_hash, manager);
        }
      } catch (error) {
        this.logger.error(`Failed to index MasterBlock ${block.height}:`, error);
        throw error; // Rollback transaction
      }
    });

    //console.log(`>>> Indexed MasterBlock - Height: ${block.height} and its PartialBlocks`);
  }

  /*
  async indexPartialBlocks(masterBlock: any): Promise<void> {
    //console.log('>>> Indexing PartialBlocks...');

    const [_forkNr, forkAddress] = await this.partisiaService.fetchForkByHeight(this.partisiaService.getHeight(masterBlock));
    const partialBlockHashes = this.partisiaService.getPartialBlockHashes(masterBlock);
    //const partialBlockHashes = this.partisiaService.getPartialBlockHashes(forkNr, masterBlock);
    //console.log(`#PartialBlockHashes = ${ partialBlockHashes.length }, forkNr = ${ forkNr } `);

    await Promise.all(partialBlockHashes.map(async minimalPartialBlock => {
      return this.partisiaService
        .fetchPartialBlock(forkAddress, minimalPartialBlock.chainId, minimalPartialBlock.hash)
        .then(partialBlock => this.indexPartialBlock(partialBlock, this.partisiaService.getHash(masterBlock)));
    }));
  }
  */

  /**
   * Index a PartialBlock by saving it to storage.
   * @param block - The PartialBlock to index
   * @param masterBlockHash - The hash of the parent MasterBlock
   * @param manager - The EntityManager for transaction management
   */
  async indexPartialBlock(block: PartialBlock, masterBlockHash: string, manager: EntityManager): Promise<void> {
    // Create a new PartialBlock entity
    const entity = new PartialChainBlockEntity();

    entity.chain_id = block.chainId;
    entity.height = new BN(block.height);
    entity.block_hash = block.blockHash;
    entity.master_block_hash = masterBlockHash; // Link to parent MasterBlock's hash
    entity.mempool_epoch = block.mempoolEpoch ?? 0; // fallback to 0 if missing

    // The JSON does not directly have txn_root, source_txn_hash, commit_txn_hash, commit_proof
    // You need to extract or compute these from the block data or from executionParts/events
    // Here's an example to set them empty or parse if available:

    entity.txn_root = block.executionPartsRoot ?? '';  // maybe partial executionPartsRoot

    // For source_txn_hash and commit_txn_hash and commit_proof, you may need to extract from events or other fields:
    // Example (replace with real logic):
    entity.source_txn_hash = block.executionParts?.[0]?.transactionHash ?? '';
    entity.commit_txn_hash = block.targetChainPublishEvent?.transactionHash ?? '';
    entity.commit_proof = block.mempoolEpochConsensusProof ?? '';

    entity.confirmed = block.confirmed ?? false;
    entity.indexed_at = new Date();

    // Save the block to storage in the same transaction as the MasterBlock
    await manager.save(entity);

    //console.log(`>>> Indexed PartialBlock: [${entity.chain_id}, ${entity.height}]`);
  }

  async dummyJob() {
    // Dummy Job for the scheduler
  }
}
