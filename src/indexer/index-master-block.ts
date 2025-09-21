import BN from 'bn.js';
import type { DataSource } from 'typeorm';
import type { MasterBlock } from '../reader-node/types/masterblock.types.js';
import type { PartialBlock } from '../reader-node/types/partialblock.types.js';
import type { Transaction as Tx } from '../reader-node/types/transaction.types.js';

import { toMs, normalizeHeight } from '../reader-node/ingest-helpers.js';
import { MasterChainBlockEntity } from '../storage/entities/master-chain-block.entity.js';
import { indexPartialBlock } from './index-partial-block.js';
import { indexTransaction } from './index-transaction.js';

type ReaderNode = {
  fetchPartialBlock: (chainId: number, blockHash: string) => Promise<PartialBlock>;
  fetchTransaction: (txHash: string) => Promise<Tx>;
};

type Logger = { warn?: (msg: string) => void; error?: (msg: string, err?: any) => void };

export async function indexMasterBlock(
  block: MasterBlock,
  deps: { dataSource: DataSource; rnService: ReaderNode; logger?: Logger },
): Promise<void> {
  const { dataSource, rnService, logger } = deps;

  await dataSource.manager.transaction(async (manager) => {
    try {
      // Persist MasterBlock
      const mb = new MasterChainBlockEntity();
      mb.height = new BN(normalizeHeight(block.height) ?? String(block.height), 10);
      mb.block_hash = block.blockHash;
      mb.timestamp = new Date(toMs(block.timestamp) ?? block.timestamp);
      mb.merkle_root = block.partialBlockRoot;
      mb.block_mint_transaction = block.transactions?.[0]?.transactionHash ?? '';
      mb.tx_count = block.transactions?.length ?? 0;
      mb.indexed_at = new Date();
      await manager.save(mb);

      // Index PartialBlocks
      for (const pbSummary of block.partialBlocks) {
        const fullPb = await rnService.fetchPartialBlock(pbSummary.chainId, pbSummary.blockHash);
        await indexPartialBlock(fullPb, mb.block_hash, manager);
      }

      // Index Transactions
      if (block.transactions?.length) {
        for (const [i, txLite] of block.transactions.entries()) {
          const isFull = (txLite as Tx).executionParts && Array.isArray((txLite as Tx).executionParts);
          const txFull: Tx = isFull ? (txLite as Tx) : await rnService.fetchTransaction(txLite.transactionHash);

          const includedIn = txFull.includedInMasterBlock || block.blockHash;
          if (txFull.includedInMasterBlock && txFull.includedInMasterBlock !== block.blockHash) {
            logger?.warn?.(
              `Tx ${txFull.transactionHash} includedInMasterBlock=${txFull.includedInMasterBlock} != current ${block.blockHash}`,
            );
          }
          await indexTransaction(
            {
              ...txFull,
              includedInMasterBlock: includedIn,
              masterBlockTransactionIndex: txFull.masterBlockTransactionIndex ?? i,
            },
            manager,
          );
        }
      }
    } catch (err) {
      logger?.error?.(`Failed to index MasterBlock ${block.height}`, err);
      throw err; // Rollback
    }
  });
}
