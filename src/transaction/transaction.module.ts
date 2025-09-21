import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { TransactionController } from './transaction.controller.js';
import { TransactionService } from './transaction.service.js';

@Module({
  imports: [StorageModule], // Import the StorageModule to access repositories
  controllers: [TransactionController],
  providers: [TransactionService],
})
export class TransactionModule { }
