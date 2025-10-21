import type { TransactionEntity } from '../entities/transaction.entity.js';

export interface ListTxFilters {
  take: number;
  skip: number;
  masterBlockHash?: string;
  sender?: string;
  operator?: string;
  includeParts?: boolean;
}

export interface ListResult<T> {
  total: number;
  items: T[];
}

export const TX_REPO = Symbol('Tx_Repo');

export interface TransactionRepository {
  findOneByHash(hash: string, includeParts?: boolean): Promise<TransactionEntity | null>;
  list(filters: ListTxFilters): Promise<ListResult<TransactionEntity>>;
  countSelectedTotal(filters: Omit<ListTxFilters, 'take' | 'skip' | 'includeParts'>): Promise<number>;

  // Used by the indexer: upsert minimal tx row by hash
  upsertBasic(data: Partial<TransactionEntity> & { transactionHash: string }): Promise<TransactionEntity>;

  getPending(take: number): Promise<TransactionEntity[]>;
  patchByHash(hash: string, patch: Partial<TransactionEntity>): Promise<void>;
}
