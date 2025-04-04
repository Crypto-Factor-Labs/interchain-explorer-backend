import { Inject } from '@nestjs/common';
import { MasterChainBlockRepository, MC_BLOCK_REPO } from '../storage/repositories/master-chain-block.repository.js';
import { GeckoTerminalService } from '../services/gecko-terminal.service.js';

export class StatisticsService {

  constructor(
    @Inject(MC_BLOCK_REPO)  // Repository for interacting with MasterBlock storage
    private readonly masterBlockRepo: MasterChainBlockRepository,

    private readonly geckoTerminalService: GeckoTerminalService, // For fetching the CFR price and TVL
  ) { }

  async getCFRpriceUSD(): Promise<string> {
    const price = await this.geckoTerminalService.getCFRpriceUSD();
    return price?.toFixed(6) ?? 'N/A';
  }

  async getCFRtvlUSD(): Promise<string> {
    const tvl = await this.geckoTerminalService.getCFRtvlUSD();
    const formattedTVL = tvl != null
      ? tvl.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
      : 'N/A';
    return formattedTVL;
  }

  async getAvgBlockSpeed_24hr(): Promise<string> {
    const avgBlockSpeed = await this.masterBlockRepo.getAvgBlockSpeed_24hr();
    return avgBlockSpeed;
  }

  // Main method to fetch all statistics in one call
  async getAllStatistics(): Promise<any> {
    const avgblockSpeed_24hr = await this.getAvgBlockSpeed_24hr();
    const cfrPriceUSD = await this.getCFRpriceUSD();
    const cfrTvlUSD = await this.getCFRtvlUSD();
    //const transactionCount = await this.getTransactionCount();

    // Return all statistics in a single object
    return {
      avgBlockSpeed_24hr: avgblockSpeed_24hr,
      cfrPriceUSD: cfrPriceUSD,
      cfrTvlUSD: cfrTvlUSD,
      //transactionCount: transactionCount,
    };
  }
}