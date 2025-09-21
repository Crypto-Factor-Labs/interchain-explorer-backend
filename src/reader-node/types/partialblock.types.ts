import type { ExecutionPartBase, ChainEvent, ChainEventWithResult, } from './common.types.js';

/**
 * Notes:
 * - Heights are decimal strings; timestamps are milliseconds.
 */

export interface PartialBlock {
  version: number;
  format: number;
  chainId: number;
  blockHash: string;
  height: string;                         // decimal string
  nextBlockHash: string;
  prevBlockHash: string;
  executionParts: ExecutionPart[];

  // Optional metadata
  executionPartsRoot?: string;
  published?: boolean;
  confirmed?: boolean;
  confirmedBy?: string;
  confirmations?: readonly string[];
  confirmationExecuted?: boolean;

  // Mempool / indexing context
  mempoolEpoch?: number;
  includedInMasterBlock?: string;         // master block hash
  masterBlockPartialBlockIndex?: number;

  // Events & proofs (links wired later)
  targetChainPublishEvent?: ChainEvent;   // tx that minted the partial block
  mempoolEpochCommitEvent?: ChainEvent;
  mempoolEpochEVMProof?: string;
  mempoolEpochConsensusProof?: string;
}

export interface ExecutionPart extends ExecutionPartBase {
  // Execution result on target chain: 0=pending, 1=success, 2=failed
  targetChainExecutionEvent: ChainEventWithResult;
}
