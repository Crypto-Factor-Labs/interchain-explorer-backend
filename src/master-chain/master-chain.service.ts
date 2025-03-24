import { Injectable, Inject } from '@nestjs/common';
import { MasterChainBlockRepository, MC_BLOCK_REPO } from '../storage/repositories/master-chain-block.repository.js';
import { MasterChainBlockEntity } from '../storage/entities/master-chain-block.entity.js';

@Injectable()
export class MasterChainService {
  constructor(
    @Inject(MC_BLOCK_REPO)  // Inject the storage repository
    private readonly repository: MasterChainBlockRepository,
  ) { }

  /**
   * Retrieve the highest MasterChainBlock height in storage.
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
   * Retrieve a MasterChainBlock by its hash.
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
   * Retrieve X MasterChainBlocks from storage, starting with the latest block.
   * @param nr Number of blocks to fetch
   * @param skip Number of blocks to skip (for pagination)
   */
  async getBlocks(nr: number, skip: number) {
    return await this.repository.getBlocks(nr, skip);
  }

  /**
   * Retrieve X MasterChainBlocks including the related PartialChainBlocks from storage,
   * starting with the latest block.
   * @param nr Number of blocks to fetch
   * @param skip Number of blocks to skip (for pagination)
   */
  async getBlocksIncludingPartialBlocks(nr: number, skip: number) {
    const blocks = await this.repository.getBlocksIncludingPartialBlocks(nr, skip);

    // Sort the PartialBlocks for each MasterBlock by chain_id
    blocks.forEach(block => {
      if (block.partialBlocks) {
        block.partialBlocks.sort((a, b) => a.chain_id - b.chain_id);
      }
    });

    return blocks;
  }

  /**
   * Retrieve all indexed MasterChainBlocks.
   */
  async getAllBlocks(): Promise<MasterChainBlockEntity[]> {
    return this.repository.getAllBlocks();
  }
}
