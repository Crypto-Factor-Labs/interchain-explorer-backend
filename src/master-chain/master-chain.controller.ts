import { Controller, Get, Query } from '@nestjs/common';
import { MasterChainService } from './master-chain.service.js';

@Controller('api/masterchain')
export class MasterChainController {
  constructor(private readonly masterChainService: MasterChainService) { }

  // Retrieve the latest block
  @Get('latest-block')
  async getLatestBlock() {
    return this.masterChainService.getLatestBlock();
  }

  // Retrieve X blocks, after skipping a number of blocks first
  @Get('blocks')
  async getBlocks(
    @Query('nr') nr: number, // Number of blocks to retrieve
    @Query('skip') skip: number = 0, // Optional pagination offset (default to 0)
  ) {
    // Validate 'nr' parameter
    if (!nr || nr <= 0) {
      return { msg: 'Invalid number of blocks to retrieve' };
    }

    return await this.masterChainService.getBlocks(nr, skip);
  }

  // Retrieve all blocks
  @Get('all-blocks')
  async getAllBlocks() {
    return this.masterChainService.getAllBlocks();
  }
}
