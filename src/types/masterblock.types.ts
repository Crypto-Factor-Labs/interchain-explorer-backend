// Common base fields for MasterBlock
export interface MasterBlockBase {
  version: number;
  format: number;
  blockHash: string;
  height: number;
  timestamp: number;
  prevBlockHash: string;
  partialBlockRoot: string;
  signatures: string[];
  confirmed: boolean;
  confirmations: string[];
  confirmationsRoot: string;
}

/*
 * Structures for MasterBlockSummary (format=1)
 */


// Partial summary of a PartialBlock (lightweight for summary endpoint)
export interface PartialBlockSummary {
  chainId: number;
  blockHash: string;
}

// Summary of a Transaction (lightweight for summary endpoint)
export interface TransactionSummary {
  transactionHash: string;
}

// Summary of a MasterBlock (format=1)
export interface MasterBlockSummary extends MasterBlockBase {
  partialBlocks: PartialBlockSummary[];  // lightweight partial blocks
  transactions: TransactionSummary[];    // lightweight transactions
}

/*
 * Detailed structures for full MasterBlock (format=3)
 */

// Event emitted on target chain during execution
export interface BlockchainEvent {
  type: number;
  blockHash: string;
  blockHeight: string;
  blockTimestamp: number;
  transactionHash: string;
  transactionSender: string;
  transactionReceiver: string;
  transactionData: string;
  [key: string]: any; // for optional additional fields
}

export interface TargetChainExecutionEvent {
  result: number;
  blockchainEvent: BlockchainEvent;
}

// Detailed Execution Part inside PartialBlock or Transaction
export interface ExecutionPart {
  format: number;
  version: number;
  transactionExecutionPartIndex: number;
  transactionHash: string;
  chainId: number;
  executionSignature: string;
  hash: string;
  operatorAddress: string;
  senderAddress: string;
  txnType: number;
  includedInPartialBlock: string;
  partialBlockPartIndex: number;
  targetChainExecutionEvent?: TargetChainExecutionEvent;
}

// Full PartialBlock with execution parts
export interface PartialBlock {
  version: number;
  format: number;
  chainId: number;
  blockHash: string;
  height: number;
  nextBlockHash?: string;
  prevBlockHash?: string;
  executionParts: ExecutionPart[];
  mempoolEpoch?: number;
  sourceTxnHash?: string;
  txnRoot?: string;
  commitTxnHash?: string;
  commitProof?: string;
  confirmed?: boolean;
}

// Execution Part inside Transaction (can be same as above)
export interface TransactionExecutionPart extends ExecutionPart { }

// Full Transaction with execution parts
export interface Transaction {
  version: number;
  format: number;
  transactionHash: string;
  nonce: string;
  sourceSender: string;
  sourceChainId: number;
  sourceChainMempoolEpoch: string;
  stateValidator?: string;
  executionParts: TransactionExecutionPart[];
}

// Full detailed MasterBlock (format=3)
export interface MasterBlock extends MasterBlockBase {
  nextBlockHash?: string;
  partialBlocks: PartialBlock[];  // full detail partial blocks
  transactions: Transaction[];    // full detail transactions
  confirmedBy?: string;
}
