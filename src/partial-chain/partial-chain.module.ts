import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';            // Storage
import { PartialChainService } from './partial-chain.service.js';        // Business Logic and Data Interactions
import { PartialChainController } from './partial-chain.controller.js';  // API-routes

@Module({
  imports: [StorageModule],
  providers: [PartialChainService],
  controllers: [PartialChainController],
  exports: [PartialChainService],
})
export class PartialChainModule { }
