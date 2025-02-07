import { MasterChainBlockEntity } from '../entities/master-chain-block.entity.js';

// Define a NestJS token for dependency injection
export const MASTER_CHAIN_BLOCK_REPOSITORY = Symbol('MasterChainBlockRepository');

export interface MasterChainBlockRepository {
  save(block: MasterChainBlockEntity): Promise<void>;
  getGreatestHeight(): Promise<number>;
  getBlockByHeight(height: number): Promise<MasterChainBlockEntity | null>;
  getLatestBlock(): Promise<MasterChainBlockEntity | null>;
  getAllBlocks(): Promise<MasterChainBlockEntity[]>;
}
