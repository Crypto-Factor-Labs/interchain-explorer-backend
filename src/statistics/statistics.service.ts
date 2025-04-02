import { Inject } from '@nestjs/common';
import { MasterChainBlockRepository, MC_BLOCK_REPO } from '../storage/repositories/master-chain-block.repository.js';
import { TokenPriceService } from '../services/token-price.service.js';

export class StatisticsService {

  constructor(
    @Inject(MC_BLOCK_REPO)  // Repository for interacting with MasterBlock storage
    private readonly masterBlockRepo: MasterChainBlockRepository,

    private readonly tokenPriceService: TokenPriceService, // For fetching the CFR price
  ) { }

  async getCFRpriceUSD(): Promise<string> {
    const price = await this.tokenPriceService.getCFRpriceUSD();
    return price?.toFixed(6) ?? 'N/A';
  }

  async getAvgBlockSpeed_24hr(): Promise<string> {
    const avgBlockSpeed = await this.masterBlockRepo.getAvgBlockSpeed_24hr();
    return avgBlockSpeed;
  }

  // Main method to fetch all statistics in one call
  async getAllStatistics(): Promise<any> {
    const avgblockSpeed_24hr = await this.getAvgBlockSpeed_24hr();
    const cfrPriceUSD = await this.getCFRpriceUSD();
    //const transactionCount = await this.getTransactionCount();

    // Return all statistics in a single object
    return {
      avgBlockSpeed_24hr: avgblockSpeed_24hr,
      cfrPriceUSD: cfrPriceUSD,
      //transactionCount: transactionCount,
    };
  }
}