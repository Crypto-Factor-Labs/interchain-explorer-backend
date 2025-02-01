import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';  // For using environment variables for DB config
import { DatabaseModule } from './database/database.module';
import { MasterChainModule } from './master-chain/master-chain.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),  // Load environment variables
    DatabaseModule,     // Database configuration and entities
    MasterChainModule,  // MasterChain Business Logic and Controller
    // Add other feature modules here as needed (e.g., PartialChainModule)
  ],
})
export class AppModule { }


/* Original
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule {}
 */