import type { ExecutionPartEntity } from '../storage/entities/execution-part.entity.js';
import type { ChainEventEntity } from '../storage/entities/chain-event.entity.js';
import type { ChainEvents, ChainEventDto, ChainEventStatus, } from '../types/chain-events.types.js';

const toIso = (ms?: number | null) => (ms != null ? new Date(ms).toISOString() : undefined);

const pickTimes = (ce?: ChainEventEntity | null) => ({
  startedAt: toIso(ce?.eventTimestamp ?? ce?.blockTimestamp),
  finishedAt: toIso(ce?.eventTimestamp ?? ce?.blockTimestamp),
});

/**
 * Build the 4-step progress tuple for ONE ExecutionPart.
 * Uses presence of linked ChainEvents + targetExecutionResult (0/1/2).
 */
export function buildChainEventsForEP(
  ep: ExecutionPartEntity,
  ceByHash: Map<string, ChainEventEntity>, // preloaded by WHERE event_hash IN (...)
): ChainEvents {
  const sched = ep.targetSchedulingEventHash
    ? ceByHash.get(ep.targetSchedulingEventHash) ?? null
    : null;
  const publ = ep.targetPublishEventHash
    ? ceByHash.get(ep.targetPublishEventHash) ?? null
    : null;
  const exec = ep.targetExecutionEventHash
    ? ceByHash.get(ep.targetExecutionEventHash) ?? null
    : null;
  const fin = ep.mempoolCommitEventHash
    ? ceByHash.get(ep.mempoolCommitEventHash) ?? null
    : null;

  // Step 1 — Schedule
  const step1: ChainEventDto = {
    name: 'Schedule',
    status: (sched || publ || exec || fin) ? 'success' : 'pending',
    ...pickTimes(sched ?? undefined),
  };

  // Step 2 — Publish
  const step2: ChainEventDto = {
    name: 'Publish',
    status: (publ || exec || fin) ? 'success' : 'pending',
    ...pickTimes(publ ?? undefined),
  };

  // Step 3 — Execute
  let s3Status: ChainEventStatus = 'pending';
  const execRes = ep.targetExecutionResult; // 0=pending, 1=success, 2=failed
  if (execRes === 1) s3Status = 'success';
  else if (execRes === 0) s3Status = 'in_progress';
  else if (execRes === 2) s3Status = 'failed';
  else if (fin) s3Status = 'success'; // finalize implies execute done

  const step3: ChainEventDto = {
    name: 'Execute',
    status: s3Status,
    ...pickTimes(exec ?? undefined),
  };

  // Step 4 — Finalize (commit/proofs)
  let s4Status: ChainEventStatus = 'pending';
  if (step3.status === 'failed') {
    s4Status = 'pending';
  } else if (fin || ep.mempoolEpochConsensusProof || ep.mempoolEpochEVMProof) {
    s4Status = 'success';
  } else if (step3.status === 'success') {
    s4Status = 'in_progress';
  }

  const step4: ChainEventDto = {
    name: 'Finalize',
    status: s4Status,
    ...pickTimes(fin ?? undefined),
  };

  return [step1, step2, step3, step4];
}
