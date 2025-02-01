import { Controller, Get } from '@nestjs/common';
import { MasterChainService } from './master-chain.service';

@Controller('api/master-chain')
export class MasterChainController {
  constructor(private readonly masterChainService: MasterChainService) { }

  @Get('latest-block')
  async getLatestBlock() {
    return this.masterChainService.getLatestBlock();
  }

  // Additional endpoints for MasterChain functionality
}
