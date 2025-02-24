import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MasterChainBlockEntity } from '../entities/master-chain-block.entity.js';
import { MasterChainBlockRepository } from './master-chain-block.repository.js';

@Injectable()
export class MasterChainBlockPostgresRepository implements MasterChainBlockRepository {
  constructor(
    @InjectRepository(MasterChainBlockEntity)
    private readonly repository: Repository<MasterChainBlockEntity>,
  ) { }

  async save(block: MasterChainBlockEntity): Promise<void> {
    await this.repository.save({
      height: block.height,
      timestamp: block.timestamp,
      merkle_root: block.merkle_root,
      block_hash: block.block_hash,
      block_mint_transaction: block.block_mint_transaction,
      date_indexed: block.date_indexed,
    });
  }

  async getGreatestHeight(): Promise<number> {
    const block = await this.repository.findOne({
      where: {},
      select: ['height'],
      order: { height: 'DESC' },
    });

    return block ? block.height : -1;
  }
  async getBlockByHeight(height: number): Promise<MasterChainBlockEntity | null> {
    return this.repository.findOne({ where: { height } });
  }

  async getLatestBlock(): Promise<MasterChainBlockEntity | null> {
    return this.repository.findOne({
      where: {},
      order: { height: 'DESC' },
    });
  }

  async getBlocks(take: number, skip: number): Promise<MasterChainBlockEntity[]> {
    return this.repository.find({
      take, // Number of blocks to retrieve
      skip, // Offset for pagination
      order: { height: 'DESC' }, // Order by block height in descending order (latest first)
    });
  }

  async getAllBlocks(): Promise<MasterChainBlockEntity[]> {
    return this.repository.find();
  }
}
