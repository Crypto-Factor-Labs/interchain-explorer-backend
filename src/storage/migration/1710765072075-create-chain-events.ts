import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateChainEvents1710765072075 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgcrypto extension for UUID generation
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.createTable(
      new Table({
        name: 'chain_events',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },

          // Event-level
          { name: 'event_hash', type: 'text', isNullable: true },
          { name: 'event_timestamp', type: 'timestamptz', isNullable: true },
          { name: 'event_block', type: 'text', isNullable: true },
          { name: 'event_block_height', type: 'numeric', precision: 78, scale: 0, isNullable: true },
          { name: 'event_receiver', type: 'text', isNullable: true },
          { name: 'event_sender', type: 'text', isNullable: true },
          { name: 'event_subchain', type: 'text', isNullable: true },
          { name: 'event_data', type: 'text', isNullable: true },

          // Tx-level (optional)
          { name: 'transaction_hash', type: 'text', isNullable: true },
          { name: 'transaction_receiver', type: 'text', isNullable: true },
          { name: 'transaction_sender', type: 'text', isNullable: true },
          { name: 'transaction_subchain', type: 'text', isNullable: true },
          { name: 'transaction_data', type: 'text', isNullable: true },

          // Block-level
          { name: 'block_hash', type: 'text', isNullable: false },
          { name: 'block_height', type: 'numeric', precision: 78, scale: 0, isNullable: false },
          { name: 'block_timestamp', type: 'timestamptz', isNullable: false },
          { name: 'block_subchain', type: 'text', isNullable: true },

          // Metadata
          { name: 'type', type: 'integer', isNullable: true },
          { name: 'encodable_type', type: 'integer', isNullable: true },

          // Exec result (nullable; 0=pending,1=success,2=failed)
          { name: 'result', type: 'smallint', isNullable: true },
        ],
      }),
      true
    );

    // Named indexes
    // Unique index on event_hash when present, to make upsert logic easier
    await queryRunner.createIndex(
      'chain_events',
      new TableIndex({ name: 'ux_chain_events_event_hash', columnNames: ['event_hash'], isUnique: true, }),
    );
    await queryRunner.createIndex(
      'chain_events',
      new TableIndex({ name: 'ix_chain_events_event_block_height', columnNames: ['event_block_height'] })
    );
    await queryRunner.createIndex(
      'chain_events',
      new TableIndex({ name: 'ix_chain_events_tx_hash', columnNames: ['transaction_hash'] })
    );
    await queryRunner.createIndex(
      'chain_events',
      new TableIndex({ name: 'ix_chain_events_block_hash', columnNames: ['block_hash'] })
    );
    await queryRunner.createIndex(
      'chain_events',
      new TableIndex({ name: 'ix_chain_events_block_height', columnNames: ['block_height'] })
    );


    await queryRunner.createIndex(
      'chain_events',
      new TableIndex({ name: 'ix_chain_events_result', columnNames: ['result'] })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('chain_events', 'ux_chain_events_event_hash');
    await queryRunner.dropIndex('chain_events', 'ix_chain_events_event_block_height');
    await queryRunner.dropIndex('chain_events', 'ix_chain_events_tx_hash');
    await queryRunner.dropIndex('chain_events', 'ix_chain_events_block_hash');
    await queryRunner.dropIndex('chain_events', 'ix_chain_events_block_height');
    await queryRunner.dropIndex('chain_events', 'ix_chain_events_result');

    await queryRunner.dropTable('chain_events', true);
  }
}
