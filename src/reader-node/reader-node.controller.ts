import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ReaderNodeService } from './reader-node.service.js';
import type { MasterBlockSummary, MasterBlock } from '../types/masterblock.types.js';
import BN from 'bn.js';

@Controller('reader-node')
export class ReaderNodeController {
  constructor(private readonly readerNodeService: ReaderNodeService) { }

  // GET /reader-node/master-block/summary (format=1)
  // Fetch the summary of the latest MasterBlock (format=1)
  @Get('master-block/summary')
  async getMasterBlockSummary(): Promise<MasterBlockSummary> {
    return this.readerNodeService.fetchMasterBlockSummary();
  }

  // GET /reader-node/master-block/:height (format=3)
  // Fetch a full MasterBlock by height
  @Get('master-block/:height')
  async getMasterBlock(
    @Param('height', ParseIntPipe) height: number,
  ): Promise<MasterBlock> {
    return this.readerNodeService.fetchMasterBlock(new BN(height));
  }
}
