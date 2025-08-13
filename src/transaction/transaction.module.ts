import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller.js';
import { TransactionService } from './transaction.service.js';

@Module({
  controllers: [TransactionController],
  providers: [TransactionService],
})
export class TransactionModule { }
