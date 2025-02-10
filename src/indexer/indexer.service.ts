import { Injectable, Inject, Logger } from '@nestjs/common';
import { PartisiaService } from '../partisia/partisia.service.js';
import { MasterChainBlockRepository, MASTER_CHAIN_BLOCK_REPOSITORY } from '../storage/repositories/master-chain-block.repository.js';
import { MasterChainBlockEntity } from '../storage/entities/master-chain-block.entity.js';

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  constructor(
    @Inject(MASTER_CHAIN_BLOCK_REPOSITORY)
    private readonly repository: MasterChainBlockRepository,
    private readonly partisiaService: PartisiaService,
  ) { }

  // Trigger block indexing when the application starts.
  async onApplicationBootstrap() {
    this.logger.log('🚀 IndexerService is starting. Running initial block indexing...');
    await this.indexBlocks();
  }

  async indexBlocks(): Promise<void> {
    let lastIndexedHeight = await this.repository.getGreatestHeight();
    //lastIndexedHeight = 1027;

    // Fetch the new blocks from the blockchain
    const newBlocks = await this.partisiaService.fetchBlocks(lastIndexedHeight);

    // Index the new blocks
    for (const block of newBlocks) {
      await this.indexBlock(block);
    }

    if (newBlocks.length > 0) {
      this.logger.log(`🌟 ${(newBlocks).length} new block${newBlocks.length === 1 ? '' : 's'} indexed`);
      this.logger.log(`>>> Last indexed height = ${await this.repository.getGreatestHeight()}`);
    }
  }


  /**
   * TEMP: Generate a unique height as increment from the maximum height present in storage.
   */
  async generateUniqueHeight(): Promise<number> {
    const greatestHeight = await this.repository.getGreatestHeight();
    return greatestHeight + 1;
  }

  /**
   * TEMP: Generate mock block data for indexing.
   *
  async generateBlockData(): Promise<Partial<MasterChainBlockEntity>> {
    const latestBlockHeight = await this.partisiaService.getLatestBlockHeight();  // Fetch the latest block height from Partisia

    const blockData: Partial<MasterChainBlockEntity> = {
      height: latestBlockHeight,
      timestamp: new Date(),
      merkle_root: 'some-merkle-root',
      block_hash: randomUUID(),                   // TEMP: Generate a random hash
      block_mint_transaction: randomUUID(),       // TEMP: Generate a random transaction hash
      date_indexed: new Date(),
    };

    return blockData;
  }
  */

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
  async indexBlock(block: any): Promise<void> {
    // Create a new block entity
    const entity = new MasterChainBlockEntity();

    entity.height = this.partisiaService.getHeight(block);
    entity.timestamp = this.partisiaService.getTimestamp(block);
    entity.merkle_root = this.partisiaService.getMerkleRoot(block);
    entity.block_hash = this.partisiaService.getHash(block);
    entity.block_mint_transaction = this.partisiaService.getMintTransaction(block);
    entity.date_indexed = new Date();  // Timestamp of when this block was indexed

    /*
    console.log(`Indexing block
      height: ${entity.height}
      timestamp: ${entity.timestamp}
      merkle_root: ${entity.merkle_root}
      hash: ${entity.block_hash}
      mint_transaction: ${entity.block_mint_transaction}`
    );
    */

    // Save the block to storage
    await this.repository.save(entity);

    //console.log(`>>> Indexed MasterChainBlock - Height: ${entity.height}`);
  }

  async dummyTask() {
    // Dummy task for the scheduler
  }
}
