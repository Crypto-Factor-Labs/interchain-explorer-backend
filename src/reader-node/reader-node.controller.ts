import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ReaderNodeService } from './reader-node.service.js';
import type { MasterBlockSummary, MasterBlock } from './types/masterblock.types.js';
import type { Transaction } from './types/transaction.types.js';
import { HashParamPipe } from '../common/pipes/hash-param.pipe.js';
import BN from 'bn.js';

@Controller('reader-node')
export class ReaderNodeController {
  constructor(private readonly readerNodeService: ReaderNodeService) { }

  // GET /reader-node/master-block/latest (format=1)
  // Fetch the summary of the latest MasterBlock
  @Get('master-block/latest')
  async getLatestMasterBlock(): Promise<MasterBlockSummary> {
    return this.readerNodeService.fetchLatestMasterBlock();
  }

  // GET /reader-node/master-block/:height (format=3)
  // Fetch a full MasterBlock by height
  @Get('master-block/:height')
  async getMasterBlock(
    @Param('height', ParseIntPipe) height: number,
  ): Promise<MasterBlock> {
    return this.readerNodeService.fetchMasterBlockByHeight(new BN(height));
  }

  // GET /reader-node/master-block/:height (format=3)
  // Fetch a full MasterBlock by height (digits-only).
  // NOTE: ParseIntPipe will cap at JS safe int; consider switching to a digits-only string pipe later.
  @Get('master-block/:height(\\d+)')
  async getMasterBlockByHeight(@Param('height') height: string): Promise<MasterBlock> {
    return this.readerNodeService.fetchMasterBlockByHeight(height);
  }

  // GET /reader-node/master-block/:hash (format=3)
  // Fetch a full MasterBlock by hash (0x… or 64 hex chars), validated + normalized by the pipe.
  @Get('master-block/:hash(0x[0-9a-fA-F]+|[0-9a-fA-F]{64})')
  async getMasterBlockByHash(
    @Param('hash', new HashParamPipe()) hash: string): Promise<MasterBlock> {
    return this.readerNodeService.fetchMasterBlockByHash(hash);
  }

  // GET /reader-node/transaction:txHash (format=3)
  @Get('transaction/:txHash(0x[0-9a-fA-F]+|[0-9a-fA-F]{64})')
  async getTransaction(
    @Param('txHash', new HashParamPipe()) txHash: string): Promise<Transaction> {
    return this.readerNodeService.fetchTransaction(txHash);
  }
}
