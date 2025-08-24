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
      .where('t.transaction_hash = :hash', { hash });

    if (includeParts) {
      qb.leftJoinAndSelect('t.executionParts', 'p')
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

    // 1) page IDs only (correct pagination)
    const idQb = this.txRepo.createQueryBuilder('t').select('t.id', 'id');

    if (sender) idQb.andWhere('t.source_sender = :sender', { sender });

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

    idQb.orderBy('t.id', 'DESC').offset(skip).limit(take);
    const rows = await idQb.getRawMany<{ id: string }>();
    if (rows.length === 0) return { total: await this.countTotal({ sender, operator }), items: [] };

    const ids = rows.map(r => r.id);

    // 2) fetch page
    const pageQb = this.txRepo.createQueryBuilder('t')
      .where('t.id = ANY(:ids)', { ids })
      .orderBy('t.id', 'DESC');

    if (includeParts) {
      pageQb.leftJoinAndSelect('t.executionParts', 'p')
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
}
