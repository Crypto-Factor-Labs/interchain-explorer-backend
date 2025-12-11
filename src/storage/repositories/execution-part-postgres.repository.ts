import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExecutionPartEntity } from '../entities/execution-part.entity.js';
import type { ExecutionPartRepository, UpsertPartInput } from './execution-part.repository.js';

@Injectable()
export class ExecutionPartPostgresRepository implements ExecutionPartRepository {
  constructor(
    @InjectRepository(ExecutionPartEntity)
    private readonly repo: Repository<ExecutionPartEntity>,
  ) { }

  /**
   * Find an execution part by transaction hash and part index.
   * @param hash - The transaction hash to search for.
   * @param index - The part index to search for.
   * @returns A promise resolving to the ExecutionPartEntity or null if not found.
   */
  async findByTxAndIndex(hash: string, index: number): Promise<ExecutionPartEntity | null> {
    return this.repo.findOne({
      where: {
        transactionHash: hash,
        partIndex: index,
        isRevert: false,
      },
    });
  }

  /**
   * Find a revert execution part by transaction hash.
   * @param hash - The transaction hash to search for.
   * @returns A promise resolving to the ExecutionPartEntity or null if not found.
   */
  async findRevertByTx(hash: string): Promise<ExecutionPartEntity | null> {
    return this.repo.findOne({
      where: {
        transactionHash: hash,
        isRevert: true,
      },
    });
  }

  /**
   * Upsert an execution part.
   * If a part with the same transaction hash and index exists, it will be updated.
   * Otherwise, a new part will be created.
   * @param input - The input data for the execution part.
   * @returns A promise resolving to the upserted ExecutionPartEntity.
   */
  async upsert(input: UpsertPartInput): Promise<ExecutionPartEntity> {
    const { transaction, transactionHash, partIndex, isRevert } = input;

    const existing = isRevert
      ? await this.findRevertByTx(transactionHash)
      : (partIndex != null ? await this.findByTxAndIndex(transactionHash, partIndex) : null);

    const row = existing ?? this.repo.create();

    // Required fields
    row.transactionId = transaction.id;
    row.transaction = transaction;
    row.transactionHash = transactionHash;
    row.partIndex = isRevert ? null : partIndex!;
    row.isRevert = isRevert;

    // Optional fields (only assigned if provided; ignored if not present in the table)
    if ('chainId' in input) (row as any).chain_id = input.chainId;
    if ('operatorAddress' in input) (row as any).operator_address = input.operatorAddress;
    if ('senderAddress' in input) (row as any).sender_address = input.senderAddress;
    if ('includedInPartialBlock' in input) (row as any).included_in_partial_block = input.includedInPartialBlock;
    if ('executionSignature' in input) (row as any).execution_signature = input.executionSignature;

    return this.repo.save(row);
  }
}
