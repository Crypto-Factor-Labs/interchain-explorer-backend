import type { PartialBlock } from './partialblock.types.js';
import type { Transaction } from './transaction.types.js';

/**
 * Notes:
 * - Heights are decimal strings; timestamps are milliseconds.
 */

export interface MasterBlockBase {
  version: number;
  format: number;
  blockHash: string;
  height: string;              // decimal string
  timestamp: number;           // ms
  prevBlockHash: string;
  partialBlockRoot: string;
  signatures: readonly string[];
  confirmed: boolean;
  confirmations: readonly string[];
  confirmationsRoot: string;
}

/* ========= Summary (format=1) ========= */

export interface PartialBlockSummary {
  chainId: number;
  blockHash: string;
}

export interface TransactionSummary {
  transactionHash: string;
}

export interface MasterBlockSummary extends MasterBlockBase {
  partialBlocks: PartialBlockSummary[];
  transactions: TransactionSummary[];
}

/* ========= Detailed (format=3) ========= */

export interface MasterBlock extends MasterBlockBase {
  nextBlockHash?: string;
  partialBlocks: PartialBlock[];
  transactions: Transaction[];
  confirmedBy?: string;
}
