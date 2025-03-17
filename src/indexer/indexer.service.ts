import { Injectable, Inject, Logger } from '@nestjs/common';
import { PartisiaService } from '../partisia/partisia.service.js';
import { MasterChainBlockRepository, MC_BLOCK_REPO } from '../storage/repositories/master-chain-block.repository.js';
import { PartialChainBlockRepository, PC_BLOCK_REPO } from '../storage/repositories/partial-chain-block.repository.js';
import { MasterChainBlockEntity } from '../storage/entities/master-chain-block.entity.js';
import { PartialChainBlockEntity } from '../storage/entities/partial-chain-block.entity.js';
import { IndexerLockRepository } from '../storage/repositories/indexer-lock.repository.js';

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

    private readonly partisiaService: PartisiaService,
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
      let lastIndexedHeight = await this.masterBlockRepo.getGreatestHeight();
      //lastIndexedHeight = 1027;

      // Fetch the new blocks from the blockchain
      const newBlocks = await this.partisiaService.fetchMasterBlocks(lastIndexedHeight);

      // Index the new blocks
      for (const block of newBlocks) {
        await this.indexMasterBlock(block);
      }

      if (newBlocks.length > 0) {
        this.logger.log(`🌟 ${(newBlocks).length} new block${newBlocks.length === 1 ? '' : 's'} indexed`);
        this.logger.log(`>>> Last indexed height = ${await this.masterBlockRepo.getGreatestHeight()}`);
      }
    } catch (error) {
      this.logger.error('Error during indexing of blocks:', error);
    } finally {
      // Release the lock after the job is done
      await this.lockRepo.releaseLock();
      this.logger.log('🔓 Lock released, indexing job completed!');
    }
  }


  /**
   * TEMP: Generate a unique height as increment from the maximum height present in storage.
   */
  async generateUniqueHeight(): Promise<number> {
    const greatestHeight = await this.masterBlockRepo.getGreatestHeight();
    return greatestHeight + 1;
  }

  /**
   * Manually trigger a block index (for testing purposes).
   *
  async indexBlockManually() {
    const blockData = await this.generateBlockData();
    await this.indexBlock(blockData);
    this.logger.log('>>> Manually indexed a new block!');
  }

  /**
   * Index a new block by saving it to storage.
   */
  async indexMasterBlock(block: any): Promise<void> {
    // Create a new block entity
    const entity = new MasterChainBlockEntity();

    entity.height = this.partisiaService.getHeight(block);
    entity.block_hash = this.partisiaService.getHash(block);
    entity.timestamp = this.partisiaService.getTimestamp(block);
    entity.merkle_root = this.partisiaService.getMerkleRoot(block);
    entity.block_mint_transaction = this.partisiaService.getMintTransaction(block);
    entity.indexed_at = new Date();  // Timestamp of when this block was indexed

    // Save the block to storage
    await this.masterBlockRepo.save(entity);

    // Index the PartialBlocks that are related to the MasterBlock
    await this.indexPartialBlocks(block);

    //console.log(`>>> Indexed MasterChainBlock - Height: ${entity.height}`);
  }

  async indexPartialBlocks(masterBlock: any): Promise<void> {
    //console.log('>>> Indexing PartialBlocks...');

    // TEMPORARY !!!
    // This should be taken care of inside the PartisiaService.
    const forkNr = await this.partisiaService.fetchActiveForkNr();
    const blockchainAddress = await this.partisiaService.fetchBlockchainAddress(forkNr);
    const abi = await this.partisiaService.fetchAbi(blockchainAddress);

    const partialBlockHashes = this.partisiaService.getPartialBlockHashes(masterBlock);
    //console.log(`#PartialBlockHashes = ${partialBlockHashes.length}`);

    for (const blockHash of partialBlockHashes) {
      const partialBlock = await this.partisiaService.fetchPartialBlock(abi, blockchainAddress, blockHash);
      await this.indexPartialBlock(partialBlock, this.partisiaService.getHash(masterBlock));
    }
  }

  async indexPartialBlock(block: any, masterBlockHash: string): Promise<void> {
    // Create a new block entity
    const entity = new PartialChainBlockEntity();

    entity.chain_id = this.partisiaService.getChainId(block);
    entity.height = this.partisiaService.getHeight(block);
    entity.block_hash = this.partisiaService.getHash(block);
    entity.master_block_hash = masterBlockHash;
    entity.mempool_epoch = this.partisiaService.getMempoolEpoch(block);
    entity.txn_root = this.partisiaService.getTransactionRoot(block);
    entity.source_txn_hash = this.partisiaService.getSourceTransactionHash(block);
    entity.commit_txn_hash = this.partisiaService.getCommitTransactionHash(block);
    entity.commit_proof = this.partisiaService.getCommitProof(block);
    entity.confirmed = this.partisiaService.getConfirmed(block);
    entity.indexed_at = new Date();  // Timestamp of when this block was indexed

    // Save the block to storage
    await this.partialBlockRepo.save(entity);

    console.log(`>>> Indexed PartialChainBlock : [${entity.chain_id}, ${entity.height}]`);
  }

  async dummyJob() {
    // Dummy Job for the scheduler
  }
}
