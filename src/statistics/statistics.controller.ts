import { Controller, Get } from '@nestjs/common';
import { StatisticsService } from './statistics.service.js';

@Controller('api/statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) { }

  // Retrieve all statistics
  @Get()
  async getStatistics() {
    try {
      console.log(">>> getStatistics")
      const result = await this.statisticsService.getStatistics();
      console.log(`${result}`)
      return await this.statisticsService.getStatistics();
    } catch (error) {
      return { msg: 'Error retrieving statistics.', error };
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
