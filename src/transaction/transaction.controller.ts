import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { TransactionService } from './transaction.service.js';
import { ListTransactionsDto } from './dto/list-transactions.dto.js';
import { HashParamPipe } from '../common/pipes/hash-param.pipe.js';

@Controller('api/masterchain')
export class TransactionController {
  constructor(private readonly txService: TransactionService) { }

  @Get('transaction/:hash')
  async getOne(@Param('hash', new HashParamPipe()) hash: string) {
    const tx = await this.txService.findOneByHash(hash);
    if (!tx) throw new NotFoundException('Transaction not found');
    return tx;
  }

  @Get('transactions')
  async list(@Query() q: ListTransactionsDto) {
    return this.txService.list(q);
  }
}
