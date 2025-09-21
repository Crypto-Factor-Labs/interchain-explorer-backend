import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MasterChainBlockEntity } from '../entities/master-chain-block.entity.js';
import { MasterChainBlockRepository } from './master-chain-block.repository.js';
import BN from 'bn.js';

@Injectable()
export class MasterChainBlockPostgresRepository implements MasterChainBlockRepository {

  constructor(
    @InjectRepository(MasterChainBlockEntity)
    private readonly repository: Repository<MasterChainBlockEntity>,
  ) { }

  async save(block: MasterChainBlockEntity): Promise<void> {
    await this.repository.save({
      height: block.height,
      block_hash: block.block_hash,
      timestamp: block.timestamp,
      merkle_root: block.merkle_root,
      block_mint_transaction: block.block_mint_transaction,
      indexed_at: block.indexed_at,
    });
  }

  async getGreatestHeight(): Promise<BN> {
    const block = await this.repository.findOne({
      where: {},
      select: ['height'],
      order: { height: 'DESC' },
    });

    return block ? block.height : new BN(-1);
  }

  async getBlockByHeight(height: BN): Promise<MasterChainBlockEntity | null> {
    return this.repository.findOne({ where: { height } });
  }

  async getBlockByHash(block_hash: string): Promise<MasterChainBlockEntity | null> {
    return this.repository.findOne({ where: { block_hash } });
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

  async getBlocksIncludingPartialBlocks(take: number, skip: number): Promise<MasterChainBlockEntity[]> {
    return this.repository.find({
      take, // Number of blocks to retrieve
      skip, // Offset for pagination
      order: { height: 'DESC' }, // Order by block height in descending order (latest first)
      relations: ['partialBlocks'], // Load the related PartialChainBlockEntity records
    });
  }

  async getAllBlocks(): Promise<MasterChainBlockEntity[]> {
    return this.repository.find();
  }

  async getAvgBlockSpeed_24hr(): Promise<string> {
    return await this.getAvgBlockSpeed('24 hours');
  }

  async getAvgBlockSpeed_30d(): Promise<string> {
    return await this.getAvgBlockSpeed('30 days');
  }

  async getAvgBlockSpeed(period: string): Promise<string> {
    const result = await this.repository.query(`
        SELECT
          CASE
            WHEN AVG(EXTRACT(EPOCH FROM (b.timestamp - a.timestamp))) IS NULL THEN 'N/A'
            ELSE
              CONCAT(
                FLOOR(AVG(EXTRACT(EPOCH FROM (b.timestamp - a.timestamp))) / 60), 'm ',
                LPAD(ROUND(AVG(EXTRACT(EPOCH FROM (b.timestamp - a.timestamp))) % 60)::TEXT, 2, '0'), 's'
              )
          END AS avg_block_speed
        FROM master_chain_blocks a
        JOIN master_chain_blocks b ON a.height = b.height - 1
        WHERE a.timestamp >= NOW() - INTERVAL '${period}'
          AND b.timestamp >= NOW() - INTERVAL '${period}';
      `);

    return result[0].avg_block_speed;
  }
}
