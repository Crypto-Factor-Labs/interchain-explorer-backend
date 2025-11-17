export type EventKind =
  // tx-level (once per Tx)
  | 'tx.push'
  | 'tx.state_validation'
  // partial-block level (once per PB)
  | 'pb.commit'
  | 'pb.publish'
  // execution-part level (per EP)
  | 'ep.commit'
  | 'ep.publish'
  | 'ep.scheduling'
  | 'ep.execution'

export interface FingerprintInput {
  kind: EventKind;
  transactionHash: string;     // for PB-events, use the PartialBlock hash
  partIndex?: number | null;   // ep.* only
  isRevert?: boolean;          // ep.* only
  chainId?: number | null;     // optional, stabilizes uniqueness
}

/**
 * Deterministic fingerprint:
 *  tx.* → "<kind>|<txHash>|0|0"
 *  pb.* → "<kind>|<txHash>|0|0"
 *  ep.* → "<kind>|<txHash>|<partOrd>|<chainIdOr0>"
 * where partOrd = isRevert ? -1 : (partIndex ?? 0)
 */
export function computeEventFingerprint(input: FingerprintInput): string {
  const tx = String(input.transactionHash ?? '').trim().toLowerCase();
  const isEp = input.kind.startsWith('ep.');
  const partIdx = isEp ? (input?.isRevert ? -1 : (Number.isInteger(input?.partIndex) ? (input!.partIndex as number) : 0)) : 0;
  const cid = isEp ? (input.chainId ?? 0) : 0;
  return `${input.kind}|${tx}|${partIdx}|${cid}`;
}

/** Treat empty/zero hashes as null. */
export function normalizeEventHash(h?: string | null): string | null {
  const x = (h ?? '').trim().toLowerCase();
  if (!x) return null;
  const zeros64 = '0'.repeat(64);
  if (x === zeros64 || x === `0x${zeros64}`) return null;
  return x;
}
