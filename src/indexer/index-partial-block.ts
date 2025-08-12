import BN from 'bn.js';
import type { EntityManager } from 'typeorm';
import type { PartialBlock } from '../reader-node/types/partialblock.types.js';
import { normalizeChainEvent, normalizeHeight, txHashFromEvent } from '../reader-node/ingest-helpers.js';
import { PartialChainBlockEntity } from '../storage/entities/partial-chain-block.entity.js';

export async function indexPartialBlock(
  block: PartialBlock,
  masterBlockHash: string,
  manager: EntityManager,
): Promise<void> {
  const publishEvt = normalizeChainEvent(block.targetChainPublishEvent);

  const entity = new PartialChainBlockEntity();
  entity.chain_id = block.chainId;
  entity.height = new BN(normalizeHeight(block.height) ?? String(block.height), 10);
  entity.block_hash = block.blockHash;
  entity.master_block_hash = masterBlockHash;
  entity.mempool_epoch = block.mempoolEpoch ?? 0;
  entity.txn_root = block.executionPartsRoot ?? '';
  entity.source_txn_hash = block.executionParts?.[0]?.transactionHash ?? '';
  entity.commit_txn_hash = txHashFromEvent(publishEvt) ?? '';
  entity.commit_proof = block.mempoolEpochConsensusProof ?? '';
  entity.confirmed = block.confirmed ?? false;
  entity.indexed_at = new Date();

  // Save the block to storage in the same transaction as the MasterBlock
  await manager.save(entity);
}
