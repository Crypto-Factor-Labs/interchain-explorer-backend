import { Controller, Get } from '@nestjs/common';
import { MasterChainService } from './master-chain.service.js';

@Controller('api/masterchain')
export class MasterChainController {
  constructor(private readonly masterChainService: MasterChainService) { }

  @Get('latest-block')
  async getLatestBlock() {
    return this.masterChainService.getLatestBlock();
  }

  @Get('all-blocks')
  async getAllBlocks() {
    return this.masterChainService.getAllBlocks();
  }
  // Additional endpoints for MasterChain functionality
}
