import { Controller, Get } from '@nestjs/common';
import { StatisticsService } from './statistics.service.js';

@Controller('api/statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) { }

  // Retrieve all statistics
  @Get()
  async getAllStatistics() {
    try {
      return await this.statisticsService.getAllStatistics();
    } catch (error) {
      return { msg: 'Error retrieving statistics.', error };
    }
  }

  // Retrieve cfrPriceUSD only
  @Get('cfr-price-usd')
  async getCFRpriceUSD() {
    try {
      return { cfrPriceUSD: await this.statisticsService.getCFRpriceUSD() };
    } catch (error) {
      return { msg: 'Error retrieving cfrPriceUSD.', error };
    }
  }

  // Retrieve AvgBlockSpeed_24hr only
  @Get('avg-block-speed-24hr')
  async getAvgBlockSpeed_24hr() {
    try {
      return { avgBlockSpeed_24hr: await this.statisticsService.getAvgBlockSpeed_24hr() };
    } catch (error) {
      return { msg: 'Error retrieving AvgBlockSpeed_24hr.', error };
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
