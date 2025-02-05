import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';          // Storage
import { MasterChainService } from './master-chain.service';        // Business Logic and Data Interactions
import { MasterChainController } from './master-chain.controller';  // API-routes

@Module({
  imports: [StorageModule],
  providers: [MasterChainService],
  controllers: [MasterChainController],
  exports: [MasterChainService],
})
export class MasterChainModule { }
