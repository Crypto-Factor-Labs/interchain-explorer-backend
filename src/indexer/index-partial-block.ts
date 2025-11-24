import BN from 'bn.js';
import type { EntityManager } from 'typeorm';
import type { PartialBlock } from '../reader-node/types/partialblock.types.js';
import { normalizeChainEvent, normalizeHeight, txHashFromEvent } from '../reader-node/ingest-helpers.js';
import { PartialChainBlockEntity } from '../storage/entities/partial-chain-block.entity.js';
import { insertChainEvent } from './index-chain-event.js';

export async function indexPartialBlock(
  block: PartialBlock,
  masterBlockHash: string,
  manager: EntityManager,
): Promise<void> {
  const commitEvt = normalizeChainEvent(block.mempoolEpochCommitEvent);
  const publishEvt = normalizeChainEvent(block.targetChainPublishEvent);

  const entity = new PartialChainBlockEntity();
  entity.chain_id = block.chainId;
  entity.height = new BN(normalizeHeight(block.height) ?? String(block.height), 10);
  entity.block_hash = block.blockHash;
  entity.master_block_hash = masterBlockHash;
  entity.mempool_epoch = block.mempoolEpoch ?? 0;
  entity.txn_root = block.executionPartsRoot ?? '';
  entity.source_txn_hash = block.executionParts?.[0]?.transactionHash ?? '';
  entity.commit_txn_hash = txHashFromEvent(commitEvt) ?? '';
  entity.commit_proof = block.mempoolEpochConsensusProof ?? '';
  entity.confirmed = block.confirmed ?? false;
  entity.indexed_at = new Date();

  // Save the block to storage in the same transaction as the MasterBlock
  await manager.save(entity);

  // Insert the PartialBlock-level commit event so EPs can link to it
  if (commitEvt) {
    await insertChainEvent(
      manager,
      commitEvt,
      // Use the blockHash in the fingerprint so EPs can find it via included_in_partial_block
      { kind: 'pb.commit', transactionHash: block.blockHash },
      null,
    );
  }

  // Insert the PartialBlock-level publish event so EPs can link to it
  if (publishEvt) {
    await insertChainEvent(
      manager,
      publishEvt,
      // Use the blockHash in the fingerprint so EPs can find it via included_in_partial_block
      { kind: 'pb.publish', transactionHash: block.blockHash },
      null,
    );
  }
}
