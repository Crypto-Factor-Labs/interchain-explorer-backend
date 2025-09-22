import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { TransactionService } from './transaction.service.js';
import { HashParamPipe } from '../common/pipes/hash-param.pipe.js';

@Controller('api/masterchain')
export class TransactionController {
  constructor(private readonly txService: TransactionService) { }

  // GET /api/masterchain/transaction/:hash
  async getOne(@Param('hash', new HashParamPipe()) hash: string) {
    const tx = await this.txService.findOneByHash(hash);
    if (!tx) throw new NotFoundException('Transaction not found');
    return tx;
  }

  // GET /api/masterchain/transactions?nr=10&skip=0&includeParts=true&includeEvents=true&sender=...&operator=...
  @Get('transactions')
  async getTransactions(
    @Query('nr') nr: number,
    @Query('skip') skip: number = 0,
    @Query('includeParts') includeParts?: string | boolean,
    @Query('includeEvents') includeEvents?: string | boolean,
    @Query('masterBlockHash') masterBlockHash?: string,
    @Query('sender') sender?: string,
    @Query('operator') operator?: string,
  ) {
    if (!nr || Number(nr) <= 0) {
      return { msg: 'Invalid number of transactions to retrieve.' };
    }

    const inclParts = includeParts === true || includeParts === 'true' || includeParts === '1';
    const inclEvents = includeEvents === true || includeEvents === 'true' || includeEvents === '1';

    return this.txService.list({
      take: Number(nr),
      skip: Number(skip),
      includeParts: inclParts,
      includeEvents: inclEvents, // only applied if includeParts is true (service guards it)
      masterBlockHash,
      sender,
      operator,
    });
  }

  // GET /api/masterchain/transactions/count?sender=...&operator=...
  @Get('transactions/count')
  async countTransactions(
    @Query('sender') sender?: string,
    @Query('operator') operator?: string,
  ) {
    const total = await this.txService.countTotal({ sender, operator });
    return { total };
  }
}
