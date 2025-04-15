import { Controller, Get } from '@nestjs/common';
import { StatisticsService } from './statistics.service.js';

@Controller('api/statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) { }

  // Retrieve all statistics
  @Get()
  async getStatistics() {
    try {
      return await this.statisticsService.getStatistics();
    } catch (error) {
      return { msg: 'Error retrieving statistics.', error };
    }
  }

  // Retrieve cfrPriceUSD only
  @Get('cfr-price-usd')
  async getCFRpriceUSD() {
    try {
      return { cfr_price_usd: await this.statisticsService.getCFRpriceUSD() };
    } catch (error) {
      return { msg: 'Error retrieving cfr_price_usd.', error };
    }
  }

  // Retrieve cfrTvlUSD only
  @Get('cfr-tvl-usd')
  async getCFRtvlUSD() {
    try {
      return { cfr_tvl_usd: await this.statisticsService.getCFRtvlUSD() };
    } catch (error) {
      return { msg: 'Error retrieving cfr_tvl_usd.', error };
    }
  }

  // Retrieve AvgBlockSpeed_24hr only
  @Get('avg-block-speed-24hr')
  async getAvgBlockSpeed_24hr() {
    try {
      return { avg_block_speed_24hr: await this.statisticsService.getAvgBlockSpeed_24hr() };
    } catch (error) {
      return { msg: 'Error retrieving avg_block_speed_24hr.', error };
    }
  }

  // Retrieve AvgBlockSpeed_24hr only
  @Get('avg-block-speed-30d')
  async getAvgBlockSpeed_30d() {
    try {
      return { avg_block_speed_30d: await this.statisticsService.getAvgBlockSpeed_30d() };
    } catch (error) {
      return { msg: 'Error retrieving avg_block_speed_30d.', error };
    }
  }

  /* Retrieve total transaction count
  @Get('transaction-count')
  async getTransactionCount() {
    try {
      return { transactionCount: await this.statisticsService.getTransactionCount() };
    } catch (error) {
      return { msg: 'Error retrieving transaction count', error };
    }
  }
  */
}
