import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class ReplaceTxHashesWithEventHashes1710765072076 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Add new event-hash columns
    await queryRunner.addColumns('execution_parts', [
      new TableColumn({ name: 'target_sched_event_hash', type: 'text', isNullable: true }),
      new TableColumn({ name: 'target_publish_event_hash', type: 'text', isNullable: true }),
      new TableColumn({ name: 'target_exec_event_hash', type: 'text', isNullable: true }),
      new TableColumn({ name: 'mempool_commit_event_hash', type: 'text', isNullable: true }),
      new TableColumn({ name: 'mempool_epoch_consensus_proof', type: 'text', isNullable: true }),
      new TableColumn({ name: 'mempool_epoch_evm_proof', type: 'text', isNullable: true }),
    ]);

    // 2) Indexes on new columns
    await queryRunner.createIndex('execution_parts',
      new TableIndex({ name: 'ix_execution_parts_target_sched_event_hash', columnNames: ['target_sched_event_hash'] }));
    await queryRunner.createIndex('execution_parts',
      new TableIndex({ name: 'ix_execution_parts_target_publish_event_hash', columnNames: ['target_publish_event_hash'] }));
    await queryRunner.createIndex('execution_parts',
      new TableIndex({ name: 'ix_execution_parts_target_exec_event_hash', columnNames: ['target_exec_event_hash'] }));
    await queryRunner.createIndex('execution_parts',
      new TableIndex({ name: 'ix_execution_parts_mempool_commit_event_hash', columnNames: ['mempool_commit_event_hash'] }));

    // 3) Drop old tx-hash columns (no backfill)
    await queryRunner.query(`ALTER TABLE execution_parts DROP COLUMN IF EXISTS target_exec_tx_hash;`);
    await queryRunner.query(`ALTER TABLE execution_parts DROP COLUMN IF EXISTS target_sched_tx_hash;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate old tx-hash columns
    await queryRunner.addColumns('execution_parts', [
      new TableColumn({ name: 'target_exec_tx_hash', type: 'text', isNullable: true }),
      new TableColumn({ name: 'target_sched_tx_hash', type: 'text', isNullable: true }),
    ]);

    // Drop indexes on event-hash cols
    await queryRunner.dropIndex('execution_parts', 'ix_execution_parts_mempool_commit_event_hash');
    await queryRunner.dropIndex('execution_parts', 'ix_execution_parts_target_exec_event_hash');
    await queryRunner.dropIndex('execution_parts', 'ix_execution_parts_target_publish_event_hash');
    await queryRunner.dropIndex('execution_parts', 'ix_execution_parts_target_sched_event_hash');

    // Drop event-hash columns
    await queryRunner.query(`ALTER TABLE execution_parts DROP COLUMN IF EXISTS mempool_commit_event_hash;`);
    await queryRunner.query(`ALTER TABLE execution_parts DROP COLUMN IF EXISTS target_exec_event_hash;`);
    await queryRunner.query(`ALTER TABLE execution_parts DROP COLUMN IF EXISTS target_publish_event_hash;`);
    await queryRunner.query(`ALTER TABLE execution_parts DROP COLUMN IF EXISTS target_sched_event_hash;`);
  }
}
