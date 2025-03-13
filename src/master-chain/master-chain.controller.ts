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

  // Retrieve a block by its height or its hash
  @Get('block')
  async getBlock(
    @Query('height_or_hash') id: string
  ) {
    // Validate the identifier
    if (!id) {
      return { msg: 'Provide a block height or hash as identifier.' };
    }

    let block;

    // Check if the identifier is a number (height) or string (hash)
    const isHeight = !isNaN(Number(id));
    if (isHeight) {
      block = await this.masterChainService.getBlockByHeight(Number(id));
    } else {
      block = await this.masterChainService.getBlockByHash(id);
    }

    if (!block) {
      return { msg: `No block found with ${isHeight ? 'height' : 'hash'} ${id}` };
    }

    return block;
  }

  // Retrieve X blocks, after skipping a number of blocks first
  @Get('blocks')
  async getBlocks(
    @Query('nr') nr: number, // Number of blocks to retrieve
    @Query('skip') skip: number = 0, // Optional pagination offset (default to 0)
    @Query('includePartialBlocks') includePartialBlocks: boolean = false, // Optional include PartialBlocks
  ) {
    // Validate `nr` parameter
    if (!nr || nr <= 0) {
      return { msg: 'Invalid number of blocks to retrieve' };
    }

    // Use parameter `includePartialBlocks` to determine which call to make
    if (includePartialBlocks)
      return await this.masterChainService.getBlocksIncludingPartialBlocks(nr, skip);
    else
      return await this.masterChainService.getBlocks(nr, skip);
  }

  // Retrieve all blocks
  @Get('all-blocks')
  async getAllBlocks() {
    return this.masterChainService.getAllBlocks();
  }
}
