import { Injectable, Inject } from '@nestjs/common';
import { MasterChainBlockRepository, MASTER_CHAIN_BLOCK_REPOSITORY } from '../storage/repositories/master-chain-block.repository.js';
import { MasterChainBlockEntity } from '../storage/entities/master-chain-block.entity.js';

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
   * Retrieve a MasterChainBlock by its height.
   */
  async getBlockByHash(hash: string): Promise<MasterChainBlockEntity | null> {
    return this.repository.getBlockByHash(hash);
  }

  /**
   * Retrieve the latest indexed MasterChainBlock.
   */
  async getLatestBlock(): Promise<MasterChainBlockEntity | null> {
    return this.repository.getLatestBlock();
  }

  /**
   * Retrieve X blocks from storage, starting with the latest block.
   * @param nr Number of blocks to fetch
   * @param skip Number of blocks to skip (for pagination)
   */
  async getBlocks(nr: number, skip: number) {
    return await this.repository.getBlocks(nr, skip);
  }

  /**
   * Retrieve all indexed MasterChainBlocks.
   */
  async getAllBlocks(): Promise<MasterChainBlockEntity[]> {
    return this.repository.getAllBlocks();
  }
}
