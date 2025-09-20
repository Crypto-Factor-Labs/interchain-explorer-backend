import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity } from '../entities/transaction.entity.js';
import { ListResult, ListTxFilters, TransactionRepository } from './transaction.repository.js';

@Injectable()
export class TransactionPostgresRepository implements TransactionRepository {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly txRepo: Repository<TransactionEntity>,
  ) { }

  /**
   * Find a transaction by its hash.
   * @param hash - The transaction hash to search for.
   * @param includeParts - Whether to include execution parts in the result.
   * @returns A promise resolving to the TransactionEntity or null if not found.
   */
  async findOneByHash(hash: string, includeParts = true): Promise<TransactionEntity | null> {
    const qb = this.txRepo.createQueryBuilder('t')
      .where('t.transaction_hash = :hash', { hash })
      .leftJoinAndMapOne('t.masterBlock', 'MasterChainBlockEntity', 'mb',
        'mb.block_hash = t.included_in_master_block')
      .addSelect(['mb.block_hash', 'mb.height']);  // Add the height of the MasterBlock

    if (includeParts) {
      qb.leftJoinAndSelect('t.executionParts', 'p')
        .leftJoinAndMapOne('p.partialBlock', 'PartialChainBlockEntity', 'pb',
          'pb.block_hash = p.included_in_partial_block')
        .addSelect(['pb.block_hash', 'pb.height'])  // Add the height of the MasterBlock
        .orderBy('p.part_index', 'ASC', 'NULLS LAST');
    }
    return qb.getOne();
  }

  /**
   * List transactions with pagination and optional filters.
   * This method supports filtering by sender and operator, which is the reason why a 'list' is used.
   * @param filters - Filters for listing transactions.
   * @returns A promise resolving to a ListResult containing total count and items.
   */
  async list(filters: ListTxFilters): Promise<ListResult<TransactionEntity>> {
    const { take, skip, sender, operator, includeParts } = filters;

    // ────────────────────────────────────────────────────────────────────────────
    // Pagination is done in TWO STEPS for correctness & performance.
    //
    // STEP 1 — IDs-only pagination (CRITICAL for correctness & performance)
    //
    // Why do this first lightweight query first?
    // • Avoid row fan-out: if we joined 1:N relations (e.g. execution_parts) in the
    //   same query, a single tx would produce multiple rows and LIMIT/OFFSET would
    //   slice the *expanded* set. Selecting only parent IDs guarantees we page by
    //   exactly N transactions.
    // • Stable ordering: we compute page boundaries using the final ORDER BY
    //   (mb.height DESC, t.master_block_tx_index DESC, t.id DESC). Step 2 simply
    //   fetches those IDs and re-applies the same ORDER BY, so the page you show
    //   matches the page you paginated.
    // • Faster: this step sorts narrow rows (id + join key) and returns only IDs;
    //   the heavy/wide rows and relation fetch happen only for that small set.
    // • No DISTINCT hacks: avoids DISTINCT ON / window functions to de-dupe after joins.
    //
    // Note: NULLS LAST pushes non-finalized tx (no master block yet) after finalized ones.
    // ────────────────────────────────────────────────────────────────────────────

    const idQb = this.txRepo.createQueryBuilder('t')
      .select('t.id', 'id')
      .leftJoin('master_chain_blocks', 'mb', 'mb.block_hash = t.included_in_master_block');

    if (sender) {
      idQb.andWhere('t.source_sender = :sender', { sender });
    }

    if (operator) {
      idQb.andWhere(
        `EXISTS (
         SELECT 1 FROM execution_parts p
         WHERE p.transaction_id = t.id
           AND p.operator_address = :op
       )`,
        { op: operator },
      );
    }

    idQb
      .orderBy('mb.height', 'DESC', 'NULLS LAST')
      .addOrderBy('t.master_block_tx_index', 'DESC', 'NULLS LAST')
      .addOrderBy('t.id', 'DESC') // deterministic tie-breaker
      .offset(skip)
      .limit(take);

    const rows = await idQb.getRawMany<{ id: string }>();
    if (rows.length === 0) {
      return { total: await this.countTotal({ sender, operator }), items: [] };
    }

    const ids = rows.map(r => r.id);

    // ────────────────────────────────────────────────────────────────────────────
    // STEP 2 — Fetch the page by IDs (optionally include relations)
    //
    // Re-apply the SAME ORDER BY to preserve the order determined in step 1.
    // It's now safe to join 1:N relations (e.g., Execution Parts) because the page
    // boundary has already been fixed to those IDs.
    // ────────────────────────────────────────────────────────────────────────────
    const pageQb = this.txRepo.createQueryBuilder('t')
      .leftJoinAndMapOne(
        't.masterBlock',          // hydrate property "masterBlock" on TransactionEntity
        'MasterChainBlockEntity', // target entity by string
        'mb',
        'mb.block_hash = t.included_in_master_block'
      )

      // Ensure mb columns are selected so the nested object is populated
      .addSelect(['mb.block_hash', 'mb.height'])
      .where('t.id = ANY(:ids)', { ids })
      .orderBy('mb.height', 'DESC', 'NULLS LAST')
      .addOrderBy('t.master_block_tx_index', 'DESC', 'NULLS LAST')
      .addOrderBy('t.id', 'DESC');

    if (includeParts) {
      pageQb
        .leftJoinAndSelect('t.executionParts', 'p')
        .addSelect(['p.id']) // handy for mapper/debug
        .leftJoinAndMapOne(
          'p.partialBlock',  // hydrate each EP with its PartialBlock
          'PartialChainBlockEntity',
          'pb',
          'pb.block_hash = p.included_in_partial_block',
        )
        .addSelect(['mb.block_hash', 'pb.height'])
        .addOrderBy('p.part_index', 'ASC', 'NULLS LAST');
    }

    const items = await pageQb.getMany();
    const total = await this.countTotal({ sender, operator });
    return { total, items };
  }

  /**
   * Count total transactions with optional filters.
   * @param sender - Optional sender address to filter by.
   * @param operator - Optional operator address to filter by.
   * @returns A promise resolving to the total count of transactions.
   */
  async countTotal({ sender, operator }: { sender?: string; operator?: string }): Promise<number> {
    const qb = this.txRepo.createQueryBuilder('t').select('COUNT(*)', 'cnt');
    if (sender) qb.andWhere('t.source_sender = :sender', { sender });
    if (operator) {
      qb.andWhere(
        `EXISTS (
           SELECT 1 FROM execution_parts p
           WHERE p.transaction_id = t.id
             AND p.operator_address = :op
         )`,
        { op: operator },
      );
    }
    const r = await qb.getRawOne<{ cnt: string }>();
    return Number(r?.cnt ?? 0);
  }

  /**
   * Upsert a minimal transaction row by its hash.
   * This is used by the indexer to ensure the transaction exists in the database.
   * @param data - Partial data for the transaction, must include transactionHash.
   * @returns A promise resolving to the upserted TransactionEntity.
   */
  async upsertBasic(data: Partial<TransactionEntity> & { transactionHash: string }): Promise<TransactionEntity> {
    // Find by natural key (unique index ux_transactions_txhash)
    let tx = await this.txRepo.findOne({ where: { transactionHash: data.transactionHash } });
    if (!tx) {
      tx = this.txRepo.create({ transactionHash: data.transactionHash });
    }
    Object.assign(tx, data);
    return this.txRepo.save(tx);
  }

  async getPending(take: number): Promise<TransactionEntity[]> {
    return this.txRepo.createQueryBuilder('tx')
      .where('tx.state < :s', { s: 4 })  // state <= EXECUTING
      .orderBy('tx.id', 'ASC')
      .limit(take)
      .getMany();
  }

  async patchByHash(hash: string, patch: Partial<TransactionEntity>): Promise<void> {
    await this.txRepo.update({ transactionHash: hash }, patch);
  }

}
