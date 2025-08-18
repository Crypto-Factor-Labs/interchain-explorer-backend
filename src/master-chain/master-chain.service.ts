import { Injectable, Inject } from '@nestjs/common';
import { MC_BLOCK_REPO, MasterChainBlockRepository, } from '../storage/repositories/master-chain-block.repository.js';
import { MasterChainBlockEntity } from '../storage/entities/master-chain-block.entity.js';
import { PartialChainBlockEntity } from '../storage/entities/partial-chain-block.entity.js';
import { bnToDec } from '../common/common.utils.js';
import BN from 'bn.js';

@Injectable()
export class MasterChainService {
  constructor(
    @Inject(MC_BLOCK_REPO)  // Inject the storage repository
    private readonly repository: MasterChainBlockRepository,
  ) { }

  /**
   * Retrieve the highest MasterChainBlock height in storage.
   */
  async getLatestHeight(): Promise<string> {
    const height = await this.repository.getGreatestHeight(); // BN
    return bnToDec(height); // decimal string
  }

  /**
   * Retrieve a MasterChainBlock by its height.
   */
  async getBlockByHeight(height: BN) {
    const block = await this.repository.getBlockByHeight(height);
    return block ? this.mapBlock(block) : null;
  }

  /**
   * Retrieve a MasterChainBlock by its hash.
   */
  async getBlockByHash(hash: string) {
    const block = await this.repository.getBlockByHash(hash);
    return block ? this.mapBlock(block) : null;
  }

  /**
   * Retrieve the latest indexed MasterChainBlock.
   */
  async getLatestBlock() {
    const block = await this.repository.getLatestBlock();
    return block ? this.mapBlock(block) : null;
  }

  /**
   * Retrieve X MasterChainBlocks from storage, starting with the latest block.
   * @param nr Number of blocks to fetch
   * @param skip Number of blocks to skip (for pagination)
   */
  async getBlocks(nr: number, skip: number) {
    const blocks = await this.repository.getBlocks(nr, skip);
    return blocks.map(b => this.mapBlock(b));
  }

  /**
   * Retrieve X MasterChainBlocks including the related PartialChainBlocks from storage,
   * starting with the latest block.
   * @param nr Number of blocks to fetch
   * @param skip Number of blocks to skip (for pagination)
   */
  async getBlocksIncludingPartialBlocks(nr: number, skip: number) {
    const blocks = await this.repository.getBlocksIncludingPartialBlocks(nr, skip);
    return blocks.map(b => ({
      ...this.mapBlock(b),
      partialBlocks: (b.partialBlocks ?? [])
        .sort((a, c) => a.chain_id - c.chain_id)
        .map(p => this.mapPartial(p)),
    }));
  }

  /**
   * Retrieve all indexed MasterChainBlocks.
   */
  async getAllBlocks() {
    const blocks = await this.repository.getAllBlocks();
    return blocks.map(b => this.mapBlock(b));
  }

  // ---------- Mappers ----------

  private mapBlock(mb: MasterChainBlockEntity) {
    return {
      height: bnToDec(mb.height), // decimal string
      block_hash: mb.block_hash,
      timestamp: mb.timestamp,
      merkle_root: mb.merkle_root,
      block_mint_transaction: mb.block_mint_transaction,
      indexed_at: mb.indexed_at,
    };
  }

  private mapPartial(pb: PartialChainBlockEntity) {
    return {
      chain_id: pb.chain_id,
      height: bnToDec(pb.height), // decimal string
      block_hash: pb.block_hash,
      master_block_hash: pb.master_block_hash,
      mempool_epoch: pb.mempool_epoch,
      txn_root: pb.txn_root,
      source_txn_hash: pb.source_txn_hash,
      commit_txn_hash: pb.commit_txn_hash,
      commit_proof: pb.commit_proof,
      confirmed: pb.confirmed,
      indexed_at: pb.indexed_at,
    };
  }
}
