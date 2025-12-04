import type { ExecutionPartEntity } from '../entities/execution-part.entity.js';
import type { TransactionEntity } from '../entities/transaction.entity.js';

export const EXEC_PART_REPO = 'EXEC_PART_REPO';

export interface UpsertPartInput {
  transaction: TransactionEntity;  // persisted tx (has id)
  transactionHash: string;         // duplicate guard / lookup
  partIndex: number | null;        // null for revert
  isRevert: boolean;
  // optional columns (set only if your table has them)
  chainId?: number;
  operatorAddress?: string;
  senderAddress?: string;
  includedInPartialBlock?: string;
  executionSignature?: string;
}

export interface ExecutionPartRepository {
  findByTxAndIndex(hash: string, index: number): Promise<ExecutionPartEntity | null>;
  findRevertByTx(hash: string): Promise<ExecutionPartEntity | null>;
  upsert(input: UpsertPartInput): Promise<ExecutionPartEntity>;
}
