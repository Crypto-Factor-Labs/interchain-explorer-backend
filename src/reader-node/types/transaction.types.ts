import type { ExecutionPartBase, ChainEvent, ChainEventWithResult, TriState, } from './common.types.js';

/**
 * Notes:
 * - Heights are decimal strings; timestamps are milliseconds.
 * - Optional fields only (no `| null`).
 */

export interface Transaction {
  version: number;
  format: number;
  transactionHash: string;
  nonce: string;
  sourceSender: string;
  sourceChainId: number;
  sourceChainMempoolEpoch: number;
  stateValidator: string;
  executionParts: ExecutionPart[];
  revertExecutionPart?: ExecutionPart;
  state: TriState;
  includedInMasterBlock: string;
  masterBlockTransactionIndex: number;

  // Events we keep for linking/inspection
  sourceChainPushEvent?: ChainEvent;
  stateValidationEvent?: ChainEventWithResult;

  // Top-level result/status
  result: TriState;
  encodableType: number;
}

export interface ExecutionPart extends ExecutionPartBase {
  // Scheduling / publish events (no result)
  targetChainSchedulingEvent?: ChainEvent;
  targetChainPublishEvent?: ChainEvent;

  // Actual execution event (with result)
  targetChainExecutionEvent?: ChainEventWithResult;

  // Mempool proofs (optional)
  mempoolEpochCommitEvent?: ChainEvent;
  mempoolEpochConsensusProof?: string;
  mempoolEpochEVMProof?: string;
}
