import { DataSourceOptions } from "typeorm";
import { IndexerLockEntity } from './storage/entities/indexer-lock.entity.js';
import { MasterChainBlockEntity } from './storage/entities/master-chain-block.entity.js';
import { PartialChainBlockEntity } from './storage/entities/partial-chain-block.entity.js';
import { TransactionEntity } from "./storage/entities/transaction.entity.js";
import { ExecutionPartEntity } from "./storage/entities/execution-part.entity.js";
import { ChainEventEntity } from "./storage/entities/chain-event.entity.js";
import { CfrPriceHistoryEntity } from "./storage/entities/cfr-price-history.entity.js";
import * as dotenv from "dotenv";
import {CreateInterchainSchema_1710765072069} from "./storage/migration/1710765072069-create-interchain-schema.js";
import {CreateCfrPriceHistoryTable_1710765072070} from "./storage/migration/1710765072070-cfr-price-history.js";
import {
    CreateTransactionsAndExecutionParts1710765072071
} from "./storage/migration/1710765072071-create-transactions-and-execution-parts.js";
import {
    MasterBlockHeightsAndTimestamps1710765072072
} from "./storage/migration/1710765072072-masterblock-heights-and-timestamps.js";
import {
    PartialBlockHeightsAndTimestamps1710765072073
} from "./storage/migration/1710765072073-partialblock-heights-and-timestamps.js";
import {
    ExecPartsAndTxHashUniqueIndexes1710765072074
} from "./storage/migration/1710765072074-execparts-and-txhash-unique-indexes.js";
import {CreateChainEvents1710765072075} from "./storage/migration/1710765072075-create-chain-events.js";
import {RefactorChainEvents1710765072076} from "./storage/migration/1710765072076-refactor-chain-events.js";
import {AddSignatureAndFee1710765072077} from "./storage/migration/1710765072077-add-signature-and-fee.js";
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
  entities: [
    IndexerLockEntity,
    MasterChainBlockEntity,
    PartialChainBlockEntity,
    TransactionEntity,
    ExecutionPartEntity,
    ChainEventEntity,
    CfrPriceHistoryEntity,
  ],
  // Execute the migrations in lexicograpic order of the filenames in dist/storage/migration/
  migrations: [
    CreateInterchainSchema_1710765072069,
      CreateCfrPriceHistoryTable_1710765072070,
      CreateTransactionsAndExecutionParts1710765072071,
      MasterBlockHeightsAndTimestamps1710765072072,
      PartialBlockHeightsAndTimestamps1710765072073,
      ExecPartsAndTxHashUniqueIndexes1710765072074,
      CreateChainEvents1710765072075,
      RefactorChainEvents1710765072076,
      AddSignatureAndFee1710765072077
  ],
  migrationsRun: true,
};
