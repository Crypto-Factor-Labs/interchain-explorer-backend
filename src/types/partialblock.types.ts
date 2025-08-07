export interface PartialBlock {
  version: number;
  format: number;
  chainId: number;
  blockHash: string;
  height: number;
  nextBlockHash: string;
  prevBlockHash: string;
  executionParts: ExecutionPart[];
  executionPartsRoot?: string;
  published?: boolean;
  confirmed?: boolean;
  confirmedBy?: string;
  confirmations?: string[];
  confirmationExecuted?: boolean;
  mempoolEpoch?: number;
  includedInMasterBlock?: string;
  masterBlockPartialBlockIndex?: number;
  targetChainPublishEvent?: ChainEvent;
  mempoolEpochCommitEvent?: ChainEvent;
  mempoolEpochEVMProof?: string;
  mempoolEpochConsensusProof?: string;
}

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
  targetChainExecutionEvent: ChainEventWithResult;
}

export interface ChainEvent {
  blockSubchain: string;
  blockHash: string;
  blockHeight: string;
  blockTimestamp: number;
  eventSubchain?: string;
  eventBlock?: string;
  eventBlockHeight?: string;
  eventTimestamp?: number;
  eventHash?: string;
  eventReceiver?: string;
  eventSender?: string;
  eventData?: string;
  transactionHash?: string;
  transactionReceiver?: string;
  transactionSender?: string;
  transactionSubchain?: string;
  transactionData?: string;
  type?: number;
}

export interface ChainEventWithResult extends ChainEvent {
  result: number;
}
