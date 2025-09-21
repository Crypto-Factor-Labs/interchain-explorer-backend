import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { StatisticsService } from './statistics.service.js';

@Controller('api/statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) { }

  /** 
   * GET /api/statistics
   * returns { avg_block_speed_24hr, avg_block_speed_30d, cfr_price_usd, cfr_tvl_usd }
   */
  @Get()
  async getStatistics() {
    try {
      //console.log('>>> getStatistics');
      return await this.statisticsService.getStatistics();
    } catch (error) {
      console.error('Error retrieving statistics', error);
      return { msg: 'Error retrieving statistics.', error };
    }
  }

  /**
   * GET /api/statistics/cfr-price-history?minutes=60
   * returns an array of { timestamp: Date; price_usd: string }
   */
  @Get('cfr-price-history')
  async getCfrPriceHistory(
    @Query('minutes', new DefaultValuePipe(60), ParseIntPipe) minutes: number,
  ) {
    try {
      return await this.statisticsService.getCfrPriceHistory(minutes);
    } catch (error) {
      console.error('Error fetching CFR price history', error);
      return { msg: 'Error fetching CFR price history.', error };
    }
  }
}
