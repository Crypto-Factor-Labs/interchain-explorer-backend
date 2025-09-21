/**
 * Conventions:
 * - All height-like fields are **decimal strings** (hex → decimal at ingest).
 * - All timestamps are **milliseconds**.
 * - Use TriState enums for 0|1|2 statuses.
 */

export type TriState = 0 | 1 | 2;            // pending | success | failed/rollback
export type ExecResult = TriState;
export type ValidationResult = TriState;

export interface ChainEvent {
  // Event-level
  eventHash?: string;
  eventTimestamp?: number;    // ms
  eventBlock?: string;
  eventBlockHeight?: string;  // decimal string
  eventReceiver?: string;
  eventSender?: string;
  eventSubchain?: string;
  eventData?: string;

  // Transaction-level (optional)
  transactionHash?: string;
  transactionReceiver?: string;
  transactionSender?: string;
  transactionSubchain?: string;
  transactionData?: string;

  // Block-level
  blockHash: string;
  blockHeight: string;        // decimal string
  blockTimestamp: number;     // ms
  blockSubchain?: string;

  // Optional metadata
  type?: number;
  encodableType?: number;
}

export interface ChainEventWithResult extends ChainEvent {
  result: ExecResult; // 0=pending, 1=success, 2=failed
}

export interface ExecutionPartBase {
  format: number;
  version: number;
  transactionExecutionPartIndex: number;  // Also known as transactionPartIndex
  transactionHash: string;
  chainId: number;
  executionSignature: string;
  hash: string;
  operatorAddress: string;
  senderAddress: string;
  includedInPartialBlock: string;
  partialBlockPartIndex: number;
  txnType?: number;
}
