import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { MasterChainBlock } from './entities/master-chain-block.entity';
// import { PartialChainBlock } from './entities/partial-chain-block.entity';

/* The connection with the database is _configured_ here, by `TypeOrmModule.forRootAsync()` using `useFactory`.
 * By using `DatabaseService` as a provider, its `OnModuleInit()` is triggered when the application is started,
 * in which is checked if the connection can actually be _established_.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),  // Ensure ConfigModule is imported and global
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // Import ConfigModule for dependency injection
      useFactory: async (configService: ConfigService) => {
        const dbPort = configService.get<string>('DB_PORT');
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST'),
          port: dbPort ? +dbPort : 5432,  // Use + to convert the dbPort into a number, using 5432 as fallback
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
          entities: [MasterChainBlock /*, PartialChainBlock*/],
          synchronize: false, // Should be false in production
        };
      },
      inject: [ConfigService], // Inject ConfigService to resolve environment variables
    }),
    TypeOrmModule.forFeature([MasterChainBlock /*, PartialChainBlock*/]),
  ],
  providers: [DatabaseService],
  exports: [TypeOrmModule],
})
export class DatabaseModule { }
