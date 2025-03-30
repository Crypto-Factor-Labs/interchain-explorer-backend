import { Inject } from '@nestjs/common';
import { MasterChainBlockRepository, MC_BLOCK_REPO } from '../storage/repositories/master-chain-block.repository.js';

export class StatisticsService {

  constructor(
    @Inject(MC_BLOCK_REPO)  // Repository for interacting with MasterBlock storage
    private readonly masterBlockRepo: MasterChainBlockRepository,
  ) { }

  async getAvgBlockSpeed_24hr(): Promise<string> {
    const avgBlockSpeed = await this.masterBlockRepo.getAvgBlockSpeed_24hr();
    return avgBlockSpeed;
  }

  // Main method to fetch all statistics in one call
  async getAllStatistics(): Promise<any> {
    const blockSpeed = await this.getAvgBlockSpeed_24hr();
    //const transactionCount = await this.getTransactionCount();

    // Return all statistics in a single object
    return {
      avgBlockSpeed_24hr: blockSpeed,
      //transactionCount: transactionCount,
    };
  }
}