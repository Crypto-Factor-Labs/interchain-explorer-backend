import { PartialChainBlockEntity } from '../entities/partial-chain-block.entity.js';

// Define a NestJS token for dependency injection
export const PC_BLOCK_REPO = Symbol('PC_BlockRepo');

export interface PartialChainBlockRepository {
  save(block: PartialChainBlockEntity): Promise<void>;
  //getGreatestHeight(chainId: number): Promise<number>;
  //getBlockByHeight(chainId: number, height: number): Promise<PartialChainBlockEntity | null>;
  getBlockByHash(block_hash: string): Promise<PartialChainBlockEntity | null>;
  //getLatestBlock(chainId: number): Promise<PartialChainBlockEntity | null>;
  //getBlocks(take: number, skip: number): Promise<PartialChainBlockEntity[]>;
}
