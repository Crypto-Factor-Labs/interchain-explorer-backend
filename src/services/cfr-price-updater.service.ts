import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GeckoTerminalService, CFRdata } from './gecko-terminal.service.js';
import { CfrPriceHistoryRepository } from '../storage/repositories/cfr-price-history.repository.js';

@Injectable()
export class PriceUpdaterService {
  private readonly logger = new Logger(PriceUpdaterService.name);

  constructor(
    private readonly gecko: GeckoTerminalService,
    private readonly repo: CfrPriceHistoryRepository,
  ) { }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    // Get the CFR price and TVL from CoinGecko
    const { priceUSD, tvlUSD }: CFRdata = await this.gecko.getCFRdata();

    if (priceUSD == null || tvlUSD == null) {
      this.logger.warn(
        `Skipped saving CFR tick because price=${priceUSD} tvl=${tvlUSD}`
      );
      return;
    }

    // Save to the database
    await this.repo.add(priceUSD, tvlUSD);
    this.logger.debug(`💲 Saved CFR-price $${priceUSD}, TVL $${tvlUSD}`);
  }
}
