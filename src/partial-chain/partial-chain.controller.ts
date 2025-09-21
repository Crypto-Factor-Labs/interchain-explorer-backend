import { Controller, Get, Query } from '@nestjs/common';
import { PartialChainService } from './partial-chain.service.js';

@Controller('api/partialchain')
export class PartialChainController {
  constructor(private readonly partialChainService: PartialChainService) { }

  // Retrieve a block by its hash
  @Get('block')
  async getBlock(
    @Query('hash') hash: string
  ) {
    if (!hash) {
      return { msg: 'Provide a block hash.' };
    }

    const block = await this.partialChainService.getBlockByHash(hash);

    if (!block) {
      return { msg: `No block found with hash ${hash}` };
    }

    return block;
  }

}
