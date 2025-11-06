import type { ExecutionPartEntity } from '../storage/entities/execution-part.entity.js';
import type { ChainEventEntity } from '../storage/entities/chain-event.entity.js';
import type { ChainEvents, ChainEventDto, ChainEventStatus, } from '../types/chain-events.types.js';
import { TransactionStateEnum } from '../common/transaction-state.enum.js';

const toIso = (ms?: number | null) => (ms != null ? new Date(ms).toISOString() : undefined);
const tsOf = (ce?: ChainEventEntity | null) => ce?.eventTimestamp ?? ce?.blockTimestamp ?? null;

const pickMeta = (ce?: ChainEventEntity | null) => ({
  timestamp: toIso(tsOf(ce)),
  txHash: ce?.transactionHash || undefined,
});

export function buildChainEventsForEP(
  ep: ExecutionPartEntity,
  ceByHash: Map<string, ChainEventEntity>, // preloaded by WHERE event_hash IN (...)
  txState: number,
): ChainEvents {
  // Fetch events by hash
  const commit = ep.mempoolCommitEventHash
    ? ceByHash.get(ep.mempoolCommitEventHash) ?? null
    : null;
  const publish = ep.targetPublishEventHash
    ? ceByHash.get(ep.targetPublishEventHash) ?? null
    : null;
  const schedule = ep.targetSchedulingEventHash
    ? ceByHash.get(ep.targetSchedulingEventHash) ?? null
    : null;
  const execute = ep.targetExecutionEventHash
    ? ceByHash.get(ep.targetExecutionEventHash) ?? null
    : null;

  // Presence flags (normalize to booleans)
  const hasCommit = !!commit || !!ep.mempoolEpochConsensusProof || !!ep.mempoolEpochEVMProof;
  const hasPublish = !!publish;
  const hasSchedule = !!schedule;
  const hasExecute = !!execute || ep.targetExecutionResult != null; // tolerate missing CE when result exists

  // --- Step 1: Commit ---
  // If any later step exists, commit must have succeeded.
  let s1Status: ChainEventStatus;
  if (hasCommit || hasPublish || hasSchedule || hasExecute) {
    s1Status = 'success';
  } else if (txState === TransactionStateEnum.EXECUTING) {
    s1Status = 'in_progress';
  } else {
    s1Status = 'pending';
  }

  const step1: ChainEventDto = {
    name: 'Commit',
    status: s1Status,
    ...pickMeta(commit ?? undefined),
  };

  // --- Step 2: Publish ---
  // Once Step 1 is success, Step 2 is in_progress until its event (or later steps) exist.
  let s2Status: ChainEventStatus;
  if (hasPublish || hasSchedule || hasExecute) {
    s2Status = 'success';
  } else if (s1Status === 'success') {
    s2Status = 'in_progress';
  } else {
    s2Status = 'pending';
  }

  const step2: ChainEventDto = {
    name: 'Publish',
    status: s2Status,
    ...pickMeta(publish ?? undefined),
  };

  // --- Step 3: Schedule ---
  // Once Step 2 is success, Step 3 is in_progress until its event (or later steps) exist.
  let s3Status: ChainEventStatus;
  if (hasSchedule || hasExecute) {
    s3Status = 'success';
  } else if (s2Status === 'success') {
    s3Status = 'in_progress';
  } else {
    s3Status = 'pending';
  }

  const step3: ChainEventDto = {
    name: 'Schedule',
    status: s3Status,
    ...pickMeta(schedule ?? undefined),
  };

  // --- Step 4: Execute ---
  // Driven by result (0/1/2) or presence of the execute event.
  let s4Status: ChainEventStatus = 'pending';
  const execRes = ep.targetExecutionResult; // 0=pending, 1=success, 2=failed
  if (execRes === 1 || (!!execute && execRes == null)) {
    s4Status = 'success';
  } else if (execRes === 0) {
    s4Status = 'in_progress';
  } else if (execRes === 2) {
    s4Status = 'failed';
  } else if (s3Status === 'success') {
    // Be optimistic and show in_progress after schedule:
    s4Status = 'in_progress';
  }

  const step4: ChainEventDto = {
    name: 'Execute',
    status: s4Status,
    ...pickMeta(execute ?? undefined),
  };

  return [step1, step2, step3, step4];
}
