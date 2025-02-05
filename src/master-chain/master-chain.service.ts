import { Injectable, Inject } from '@nestjs/common';
import { MasterChainBlockRepository, MASTER_CHAIN_BLOCK_REPOSITORY } from '../storage/repositories/master-chain-block.repository';
import { MasterChainBlockEntity } from '../storage/entities/master-chain-block.entity';

@Injectable()
export class MasterChainService {
  constructor(
    @Inject(MASTER_CHAIN_BLOCK_REPOSITORY)  // Inject the storage repository
    private readonly repository: MasterChainBlockRepository,
  ) { }

  /**
   * Retrieve the highest block height in storage.
   */
  async getGreatestHeight(): Promise<number> {
    return this.repository.getGreatestHeight();
  }

  /**
   * Retrieve a MasterChainBlock by its height.
   */
  async getBlockByHeight(height: number): Promise<MasterChainBlockEntity | null> {
    return this.repository.getBlockByHeight(height);
  }

  /**
   * Retrieve the latest indexed MasterChainBlock.
   */
  async getLatestBlock(): Promise<MasterChainBlockEntity | null> {
    return this.repository.getLatestBlock();
  }

  /**
   * Retrieve all indexed MasterChainBlocks.
   */
  async getAllBlocks(): Promise<MasterChainBlockEntity[]> {
    return this.repository.getAllBlocks();
  }
}
