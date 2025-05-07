import { DataSourceOptions } from "typeorm";
import { IndexerLockEntity } from './storage/entities/indexer-lock.entity.js';
import { MasterChainBlockEntity } from './storage/entities/master-chain-block.entity.js';
import { PartialChainBlockEntity } from './storage/entities/partial-chain-block.entity.js';
import { CfrPriceHistoryEntity } from "./storage/entities/cfr-price-history.entity.js";
import { join } from 'path';
import * as dotenv from "dotenv";
dotenv.config();

export const DATA_SOURCE_OPTIONS: DataSourceOptions = {
  migrationsTableName: 'migrations',
  type: "postgres",
  host: process.env["DB_HOST"]!,
  port: parseInt(process.env["DB_PORT"] || "5432"),
  username: process.env["DB_USERNAME"]!,
  password: process.env["DB_PASSWORD"]!,
  database: process.env["DB_NAME"]!,
  synchronize: false,
  logging: false,
  //logging: ['query', 'error'],
  entities: [IndexerLockEntity, MasterChainBlockEntity, PartialChainBlockEntity, CfrPriceHistoryEntity],
  // Execute the migrations in lexicograpic order of the filenames in dist/storage/migration/
  migrations: [
    join(process.cwd(), 'dist', 'storage', 'migration', '*.js')],
  migrationsRun: true,
};
