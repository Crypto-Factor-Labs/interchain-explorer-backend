import { In, EntityManager } from 'typeorm';
import type { ExecutionPartEntity } from '../storage/entities/execution-part.entity.js';
import { ChainEventEntity } from '../storage/entities/chain-event.entity.js';

// Collect all unique, non-null event hashes from a list of EPs
export function collectEventHashesFromEPs(eps: ExecutionPartEntity[]): string[] {
  const set = new Set<string>();

  for (const ep of eps) {
    if (ep.targetPublishEventHash) set.add(ep.targetPublishEventHash);
    if (ep.mempoolCommitEventHash) set.add(ep.mempoolCommitEventHash);
    if (ep.targetSchedulingEventHash) set.add(ep.targetSchedulingEventHash);
    if (ep.targetExecutionEventHash) set.add(ep.targetExecutionEventHash);
  }

  return [...set];
}

// Load a map of eventHash → ChainEventEntity for the given hashes
export async function loadChainEventsMap(
  manager: EntityManager,
  hashes: string[],
): Promise<Map<string, ChainEventEntity>> {
  if (!hashes.length) return new Map();

  const repo = manager.getRepository(ChainEventEntity);
  const rows = await repo.find({ where: { eventHash: In(hashes) } });
  const map = new Map<string, ChainEventEntity>();

  for (const row of rows)
    if (row.eventHash) map.set(row.eventHash, row);

  return map;
}
