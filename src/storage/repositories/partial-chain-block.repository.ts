import { PartialChainBlockEntity } from '../entities/partial-chain-block.entity.js';

// Define a NestJS token for dependency injection
export const PC_BLOCK_REPO = Symbol('PC_BlockRepo');

export interface PartialChainBlockRepository {
  save(block: PartialChainBlockEntity): Promise<void>;
  getBlockByHash(block_hash: string): Promise<PartialChainBlockEntity | null>;

  getUnconfirmed(take: number): Promise<PartialChainBlockEntity[]>;
  patchByHash(block_hash: string, patch: Partial<PartialChainBlockEntity>): Promise<void>;
}
