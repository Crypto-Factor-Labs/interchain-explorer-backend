import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';          // Storage
import { MasterChainService } from './master-chain.service.js';        // Business Logic and Data Interactions
import { MasterChainController } from './master-chain.controller.js';  // API-routes

@Module({
  imports: [StorageModule],
  providers: [MasterChainService],
  controllers: [MasterChainController],
  exports: [MasterChainService],
})
export class MasterChainModule { }
