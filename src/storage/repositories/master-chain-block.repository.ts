import { MasterChainBlockEntity } from '../entities/master-chain-block.entity.js';
import BN from 'bn.js';

// Define a NestJS token for dependency injection
export const MC_BLOCK_REPO = Symbol('MC_BlockRepo');

export interface MasterChainBlockRepository {
  save(block: MasterChainBlockEntity): Promise<void>;
  getGreatestHeight(): Promise<BN>;
  getBlockByHeight(height: BN): Promise<MasterChainBlockEntity | null>;
  getBlockByHash(block_hash: string): Promise<MasterChainBlockEntity | null>;
  getLatestBlock(): Promise<MasterChainBlockEntity | null>;
  getBlocks(take: number, skip: number): Promise<MasterChainBlockEntity[]>;
  getBlocksIncludingPartialBlocks(take: number, skip: number): Promise<MasterChainBlockEntity[]>;
  getAvgBlockSpeed_24hr(): Promise<string>;
  getAllBlocks(): Promise<MasterChainBlockEntity[]>;
}
