import { Injectable, Inject, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MasterChainBlockRepository, MASTER_CHAIN_BLOCK_REPOSITORY } from '../storage/repositories/master-chain-block.repository';
import { MasterChainBlockEntity } from '../storage/entities/master-chain-block.entity';

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  constructor(
    @Inject(MASTER_CHAIN_BLOCK_REPOSITORY)
    private readonly repository: MasterChainBlockRepository,
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
   */
  async generateBlockData(): Promise<Partial<MasterChainBlockEntity>> {
    return {
      height: await this.generateUniqueHeight(),  // TEMP: Generate an incrementing height
      timestamp: new Date(),
      merkle_root: 'some-merkle-root',
      block_hash: randomUUID(),                   // TEMP: Generate a random hash
      block_mint_transaction: randomUUID(),       // TEMP: Generate a random transaction hash
      date_indexed: new Date(),
    };
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
    const masterChainBlock = new MasterChainBlockEntity();
    masterChainBlock.height = blockData.height!;
    masterChainBlock.timestamp = blockData.timestamp!;
    masterChainBlock.merkle_root = blockData.merkle_root!;
    masterChainBlock.block_hash = blockData.block_hash!;
    masterChainBlock.block_mint_transaction = blockData.block_mint_transaction!;
    masterChainBlock.date_indexed = new Date();

    await this.repository.save(masterChainBlock);
    this.logger.log(`>>> Indexed MasterChainBlock - Height: ${blockData.height}`);
  }
}
