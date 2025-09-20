import type { TransactionEntity } from '../entities/transaction.entity.js';

export interface ListTxFilters {
  sender?: string;
  operator?: string;
  take: number;
  skip: number;
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
  countTotal(filters: Omit<ListTxFilters, 'take' | 'skip' | 'includeParts'>): Promise<number>;

  // Used by the indexer: upsert minimal tx row by hash
  upsertBasic(data: Partial<TransactionEntity> & { transactionHash: string }): Promise<TransactionEntity>;

  getPending(take: number): Promise<TransactionEntity[]>;
  patchByHash(hash: string, patch: Partial<TransactionEntity>): Promise<void>;
}
