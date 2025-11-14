import type { ChainEvent, TriState } from './types/common.types.js';
import BN from 'bn.js';
type BNLike = BN | { toString(radix?: number): string };

// At ingest means: do those conversions before we save or pass the data deeper into the system.

/** Normalize timestamps to ms (seconds or ms in, ms out). */
export const toMs = (v?: number | null): number | undefined => {
  if (v == null) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return undefined; // hide 0/neg/NaN
  return n < 1e12 ? n * 1000 : n;
};

/**
 * Convert hex/decimal input to a decimal string.
 * - Accepts: number | decimal string | hex string (with/without 0x).
 * - Returns: base-10 string (safe up to 256-bit+ via BigInt).
 */
export function toDecimalString(
  v: string | number | bigint | BNLike | undefined | null,
): string | undefined {
  if (v == null) return undefined;

  // BN-like (bn.js) — rely on decimal string output
  if (typeof v === 'object' && 'toString' in v && typeof v.toString === 'function') {
    try {
      return BigInt(v.toString(10)).toString(10);
    } catch {
      return undefined;
    }
  }

  if (typeof v === 'bigint') return v.toString(10);
  if (typeof v === 'number') return BigInt(v).toString(10);

  const s = String(v).trim();
  if (!s) return undefined;

  // hex-ish (with 0x or a-f chars) → parse as hex
  const looksHex = /^0x/i.test(s) || /[a-fA-F]/.test(s);
  const hex = looksHex ? (s.startsWith('0x') || s.startsWith('0X') ? s : '0x' + s) : undefined;

  try {
    return BigInt(hex ?? s).toString(10);
  } catch {
    return undefined;
  }
}

/** Shorthand for height-like fields → decimal string */
export const normalizeHeight = (h: string | number | undefined) =>
  toDecimalString(h);

/**
 * Some event producers nest the actual event under `blockchainEvent`.
 * This resolves the nested vs. flat shape transparently.
 */
export const unwrapBlockchainEvent = (evt?: any): any | undefined =>
  evt?.blockchainEvent ? evt.blockchainEvent : evt;

/** Extract a tx hash from a (possibly nested) event */
export const txHashFromEvent = (evt?: any): string | undefined =>
  unwrapBlockchainEvent(evt)?.transactionHash ?? undefined;

/** Extract a TriState result (0|1|2) from an event, if present */
export const resultFromEvent = (evt?: any): TriState | undefined => {
  const r = evt?.result ?? unwrapBlockchainEvent(evt)?.result;
  return typeof r === 'number' ? (r as TriState) : undefined;
};

/**
 * Normalize any ChainEvent-like payload (flat or nested) into a canonical ChainEvent:
 * - blockHeight / eventBlockHeight → decimal strings
 * - timestamps → milliseconds
 */
export function normalizeChainEvent(evt?: any): ChainEvent | undefined {
  const e = unwrapBlockchainEvent(evt);
  if (!e) return undefined;

  // Required fields in the ChainEvent contract:
  const blockHash = e.blockHash;
  const blockHeight = normalizeHeight(e.blockHeight);
  const blockTimestamp = toMs(e.blockTimestamp);

  if (!blockHash || !blockHeight || blockTimestamp == null) return undefined;

  return {
    blockHash,
    blockHeight,
    blockTimestamp,
    blockSubchain: e.blockSubchain,

    transactionHash: e.transactionHash,
    transactionReceiver: e.transactionReceiver,
    transactionSender: e.transactionSender,
    transactionSubchain: e.transactionSubchain,
    transactionData: e.transactionData,

    eventHash: e.eventHash,
    eventTimestamp: toMs(e.eventTimestamp),
    eventBlock: e.eventBlock,
    eventBlockHeight: normalizeHeight(e.eventBlockHeight),
    eventReceiver: e.eventReceiver,
    eventSender: e.eventSender,
    eventSubchain: e.eventSubchain,
    eventData: e.eventData,

    type: e.type,
    encodableType: e.encodableType,
  };
}
