import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { CfrPriceHistoryEntity } from '../entities/cfr-price-history.entity.js';

@Injectable()
export class CfrPriceHistoryRepository {
  constructor(
    @InjectRepository(CfrPriceHistoryEntity)
    private readonly repo: Repository<CfrPriceHistoryEntity>,
  ) { }

  /**
   * Insert a new price point.
   */
  async add(priceUsd: string | number, tvlUsd: string | number, timestamp: Date = new Date()): Promise<CfrPriceHistoryEntity> {
    const entry = this.repo.create({
      priceUsd: priceUsd.toString(),
      tvlUsd: tvlUsd.toString(),
      timestamp,
    });
    return this.repo.save(entry);
  }

  /**
   * Fetch points newer than `minutes` ago, ordered ascending.
   */
  async findRecent(minutes: number): Promise<CfrPriceHistoryEntity[]> {
    const cutoff = new Date(Date.now() - minutes * 60_000);
    return this.repo.find({
      where: {
        timestamp: MoreThan(cutoff),
      },
      order: { timestamp: 'ASC' },
    });
  }

  /**
   * Fetch the latest single point.
   */
  async findLatest(): Promise<CfrPriceHistoryEntity | null> {
    return this.repo.findOne({
      where: {},
      order: { timestamp: 'DESC' },
    });
  }
}
