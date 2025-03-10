import { MasterChainBlockEntity } from '../entities/master-chain-block.entity.js';

// Define a NestJS token for dependency injection
export const MC_BLOCK_REPO = Symbol('MC_BlockRepo');

export interface MasterChainBlockRepository {
  save(block: MasterChainBlockEntity): Promise<void>;
  getGreatestHeight(): Promise<number>;
  getBlockByHeight(height: number): Promise<MasterChainBlockEntity | null>;
  getBlockByHash(block_hash: string): Promise<MasterChainBlockEntity | null>;
  getLatestBlock(): Promise<MasterChainBlockEntity | null>;
  getBlocks(take: number, skip: number): Promise<MasterChainBlockEntity[]>;
  getBlocksIncludingPartialBlocks(take: number, skip: number): Promise<MasterChainBlockEntity[]>;
  getAllBlocks(): Promise<MasterChainBlockEntity[]>;
}
