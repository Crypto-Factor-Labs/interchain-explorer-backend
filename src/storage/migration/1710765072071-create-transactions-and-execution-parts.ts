import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, } from 'typeorm';

export class CreateTransactionsAndExecutionParts1710765072071 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // transactions
    await queryRunner.createTable(
      new Table({
        name: 'transactions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'transaction_hash', type: 'text', isNullable: false },
          { name: 'source_sender', type: 'text', isNullable: false },
          { name: 'source_chain_id', type: 'integer', isNullable: false },
          { name: 'source_chain_mempool_epoch', type: 'integer', isNullable: false },
          { name: 'state_validator', type: 'text', isNullable: true },
          { name: 'state', type: 'smallint', isNullable: false },
          { name: 'included_in_master_block', type: 'text', isNullable: true },
          { name: 'master_block_tx_index', type: 'integer', isNullable: false },
          { name: 'source_push_tx_hash', type: 'text', isNullable: true },
          { name: 'state_validation_tx_hash', type: 'text', isNullable: true },
          { name: 'state_validation_result', type: 'smallint', isNullable: true },
          { name: 'result', type: 'smallint', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()', isNullable: false },
          { name: 'updated_at', type: 'timestamptz', default: 'now()', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'ux_transactions_tx_hash',
        columnNames: ['transaction_hash'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'ix_transactions_included_in_master_block',
        columnNames: ['included_in_master_block'],
      }),
    );

    // execution_parts
    await queryRunner.createTable(
      new Table({
        name: 'execution_parts',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'hash', type: 'text', isNullable: false },
          { name: 'transaction_id', type: 'uuid', isNullable: false },
          { name: 'transaction_hash', type: 'text', isNullable: false },
          { name: 'part_index', type: 'integer', isNullable: true },
          { name: 'is_revert', type: 'boolean', default: 'false', isNullable: false },
          { name: 'chain_id', type: 'integer', isNullable: false },
          { name: 'operator_address', type: 'text', isNullable: false },
          { name: 'sender_address', type: 'text', isNullable: false },
          { name: 'included_in_partial_block', type: 'text', isNullable: true },
          { name: 'partial_block_part_index', type: 'integer', isNullable: true },
          { name: 'target_exec_tx_hash', type: 'text', isNullable: true },
          { name: 'target_exec_result', type: 'smallint', isNullable: true },
          { name: 'target_sched_tx_hash', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()', isNullable: false },
          { name: 'updated_at', type: 'timestamptz', default: 'now()', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'execution_parts',
      new TableForeignKey({
        columnNames: ['transaction_id'],
        referencedTableName: 'transactions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // partial unique indexes for exec parts
    await queryRunner.createIndex(
      'execution_parts',
      new TableIndex({
        name: 'ux_exec_parts_txhash_partindex_norevert',
        columnNames: ['transaction_hash', 'part_index'],
        isUnique: true,
        where: 'is_revert = false',
      }),
    );

    await queryRunner.createIndex(
      'execution_parts',
      new TableIndex({
        name: 'ux_exec_parts_txhash_revert',
        columnNames: ['transaction_hash'],
        isUnique: true,
        where: 'is_revert = true',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'execution_parts',
      'ux_exec_parts_txhash_revert',
    );
    await queryRunner.dropIndex(
      'execution_parts',
      'ux_exec_parts_txhash_partindex_norevert',
    );

    // drop FK first
    const table = await queryRunner.getTable('execution_parts');
    const fk = table?.foreignKeys.find((f) =>
      f.columnNames.includes('transaction_id'),
    );
    if (fk) await queryRunner.dropForeignKey('execution_parts', fk);

    await queryRunner.dropTable('execution_parts');

    await queryRunner.dropIndex('transactions', 'ix_transactions_included_in_master_block');
    await queryRunner.dropIndex('transactions', 'ux_transactions_tx_hash');
    await queryRunner.dropTable('transactions');
  }
}
