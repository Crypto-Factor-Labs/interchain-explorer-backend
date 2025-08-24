import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { TransactionService } from './transaction.service.js';
import { HashParamPipe } from '../common/pipes/hash-param.pipe.js';

@Controller('api/masterchain')
export class TransactionController {
  constructor(private readonly txService: TransactionService) { }

  // Retrieve a single transaction by its hash.
  // GET /api/masterchain/transaction/:hash
  @Get('transaction/:hash')
  async getOne(@Param('hash', new HashParamPipe()) hash: string) {
    const tx = await this.txService.findOneByHash(hash);
    if (!tx) throw new NotFoundException('Transaction not found');
    return tx;
  }

  // Retrieve a list of transactions with pagination and optional filters.
  // GET /api/masterchain/transactions?nr=10&skip=0&includeParts=true&sender=...&operator=...
  @Get('transactions')
  async getTransactions(
    @Query('nr') nr: number,
    @Query('skip') skip: number = 0,
    @Query('includeParts') includeParts?: string | boolean,
    @Query('sender') sender?: string,
    @Query('operator') operator?: string,
  ) {
    if (!nr || nr <= 0) return { msg: 'Invalid number of transactions to retrieve.' };
    const include = includeParts === true || includeParts === 'true' || includeParts === '1';

    return this.txService.list({
      take: Number(nr),
      skip: Number(skip),
      includeParts: include,
      sender,
      operator,
    });
  }

  // Count total transactions, optionally filtered by sender and operator.
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
