import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';       // Database
import { MasterChainService } from './master-chain.service';        // Business Logic and Data Interactions
import { MasterChainController } from './master-chain.controller';  // API-routes

@Module({
  imports: [DatabaseModule],
  providers: [MasterChainService],
  controllers: [MasterChainController],
})
export class MasterChainModule { }
