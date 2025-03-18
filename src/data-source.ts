import { DataSourceOptions } from "typeorm";
import { IndexerLock } from './storage/entities/indexer-lock.entity.js';
import { MasterChainBlockEntity } from './storage/entities/master-chain-block.entity.js';
import { PartialChainBlockEntity } from './storage/entities/partial-chain-block.entity.js';
import { CreateInterchainSchema_1710765072069 } from "./storage/migration/create-interchain-schema-1710765072069.js";
import * as dotenv from "dotenv";
dotenv.config();

export const DATA_SOURCE_OPTIONS: DataSourceOptions = {
  migrationsTableName: 'migrations',
  type: "postgres",
  host: process.env["DB_HOST"]!,
  port: parseInt(process.env["DB_PORT"] || "5432"),
  username: process.env["DB_USERNAME"]!,
  password: process.env["DB_PASSWORD"]!,
  database: process.env["DB_DATABASE"]!,
  synchronize: false,
  logging: false,
  entities: [IndexerLock, MasterChainBlockEntity, PartialChainBlockEntity],
  migrations: [CreateInterchainSchema_1710765072069],
  migrationsRun: true,
};
