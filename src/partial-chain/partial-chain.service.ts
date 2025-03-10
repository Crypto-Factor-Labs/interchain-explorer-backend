import { Injectable, Inject } from '@nestjs/common';
import { PartialChainBlockRepository, PC_BLOCK_REPO } from '../storage/repositories/partial-chain-block.repository.js';
import { PartialChainBlockEntity } from '../storage/entities/partial-chain-block.entity.js';

@Injectable()
export class PartialChainService {
  constructor(
    @Inject(PC_BLOCK_REPO)  // Inject the storage repository
    private readonly repository: PartialChainBlockRepository
  ) { }

  /**
   * Retrieve a PartialChainBlock by its hash.
   */
  async getBlockByHash(hash: string): Promise<PartialChainBlockEntity | null> {
    return this.repository.getBlockByHash(hash);
  }
}
