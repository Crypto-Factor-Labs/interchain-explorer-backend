import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PartialChainBlockEntity } from '../entities/partial-chain-block.entity.js';
import { PartialChainBlockRepository } from './partial-chain-block.repository.js';

@Injectable()
export class PartialChainBlockPostgresRepository implements PartialChainBlockRepository {
  constructor(
    @InjectRepository(PartialChainBlockEntity)
    private readonly repository: Repository<PartialChainBlockEntity>,
  ) { }

  async save(block: PartialChainBlockEntity): Promise<void> {
    await this.repository.save({
      chain_id: block.chain_id,
      height: block.height,
      block_hash: block.block_hash,
      master_block_hash: block.master_block_hash,
      mempool_epoch: block.mempool_epoch,
      txn_root: block.txn_root,
      source_txn_hash: block.source_txn_hash,
      commit_txn_hash: block.commit_txn_hash,
      commit_proof: block.commit_proof,
      confirmed: block.confirmed,
      created_at: block.created_at
    });
  }

  async getBlockByHash(block_hash: string): Promise<PartialChainBlockEntity | null> {
    return this.repository.findOne({ where: { block_hash } });
  }

}
