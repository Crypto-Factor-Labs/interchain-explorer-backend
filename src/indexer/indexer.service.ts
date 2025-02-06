import { Injectable, Inject, Logger } from '@nestjs/common';
//import { randomUUID } from 'crypto';
import { PartisiaService } from '../partisia/partisia.service';
import { MasterChainBlockRepository, MASTER_CHAIN_BLOCK_REPOSITORY } from '../storage/repositories/master-chain-block.repository';
import { MasterChainBlockEntity } from '../storage/entities/master-chain-block.entity';

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  constructor(
    @Inject(MASTER_CHAIN_BLOCK_REPOSITORY)
    private readonly repository: MasterChainBlockRepository,
    private readonly partisiaService: PartisiaService,
  ) { }

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

  async generateBlockData(): Promise<Partial<MasterChainBlockEntity>> {
    // Fetch latest block once
    const latestBlock = await this.partisiaService.fetchLatestBlock();

    // Call all extraction methods synchronously
    const blockData: Partial<MasterChainBlockEntity> = {
      height: this.partisiaService.getHeight(latestBlock),
      timestamp: this.partisiaService.getTimestamp(latestBlock),
      merkle_root: this.partisiaService.getMerkleRoot(latestBlock),
      block_hash: this.partisiaService.getHash(latestBlock),
      block_mint_transaction: this.partisiaService.getMintTransaction(latestBlock),
      date_indexed: new Date(),  // Timestamp of when this block was indexed
    };

    return blockData;
  }

  /**
   * Manually trigger a block index (for testing purposes).
   */
  async indexBlockManually() {
    const blockData = await this.generateBlockData();
    await this.indexBlock(blockData);
    this.logger.log('>>> Manually indexed a new block!');
  }

  /**
   * Index a new block by saving it to storage.
   */
  async indexBlock(blockData: Partial<MasterChainBlockEntity>): Promise<void> {
    const block = new MasterChainBlockEntity();
    block.height = blockData.height!;
    block.timestamp = blockData.timestamp!;
    block.merkle_root = blockData.merkle_root!;
    block.block_hash = blockData.block_hash!;
    block.block_mint_transaction = blockData.block_mint_transaction!;
    block.date_indexed = new Date();

    await this.repository.save(block);
    this.logger.log(`>>> Indexed MasterChainBlock - Height: ${blockData.height}`);
  }
}
