import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { MasterChainBlockRepository, MC_BLOCK_REPO } from '../storage/repositories/master-chain-block.repository.js';
import { CfrPriceHistoryRepository } from '../storage/repositories/cfr-price-history.repository.js';

export interface Statistics {
  avg_block_speed_24hr: string;
  avg_block_speed_30d: string;
  cfr_price_usd: string;
  cfr_tvl_usd: string;
}

@Injectable()
export class StatisticsService {
  private readonly KEY_BLOCK_SPEED = 'stats:block-speed';
  private readonly KEY_CFR_DATA = 'stats:cfr-data';
  private readonly TTL_BLOCK_SPEED = 3600; // seconds (1 h)
  private readonly TTL_CFR_DATA = 60;      // seconds (1 min)

  constructor(
    @Inject(MC_BLOCK_REPO)
    private readonly masterBlockRepo: MasterChainBlockRepository,

    private readonly cfrRepo: CfrPriceHistoryRepository,

    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) { }

  async getStatistics(): Promise<Statistics> {
    // Get both in parallel
    const [block, cfr] = await Promise.all([
      this.getCachedBlockSpeeds(),
      this.getCachedCfrStats(),
    ]);

    return {
      avg_block_speed_24hr: block.avg24,
      avg_block_speed_30d: block.avg30,
      cfr_price_usd: cfr.price,
      cfr_tvl_usd: cfr.tvl,
    };
  }

  private async getCachedBlockSpeeds(): Promise<{ avg24: string; avg30: string }> {
    // Get from cache if available
    const cached = await this.cache.get<{ avg24: string; avg30: string }>(this.KEY_BLOCK_SPEED);
    if (cached) return cached;

    // Get new values and add them to the cache
    const [avg24, avg30] = await Promise.all([
      this.masterBlockRepo.getAvgBlockSpeed_24hr(),
      this.masterBlockRepo.getAvgBlockSpeed_30d(),
    ]);

    const data = { avg24, avg30 };
    await this.cache.set(this.KEY_BLOCK_SPEED, data, { ttl: this.TTL_BLOCK_SPEED });
    return data;
  }

  private async getCachedCfrStats(): Promise<{ price: string; tvl: string }> {
    // Get from cache if available
    const cached = await this.cache.get<{ price: string; tvl: string }>(this.KEY_CFR_DATA);
    if (cached) return cached;

    // Get new values and add them to the cache
    const latest = await this.cfrRepo.findLatest();
    const price = latest?.priceUsd
      ? parseFloat(latest.priceUsd).toFixed(6)
      : 'N/A';
    const tvl = latest?.tvlUsd != null
      ? parseFloat(latest.tvlUsd).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      : 'N/A';

    const data = { price, tvl };
    await this.cache.set(this.KEY_CFR_DATA, data, { ttl: this.TTL_CFR_DATA });
    return data;
  }
}

