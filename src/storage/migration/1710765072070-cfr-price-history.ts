import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCfrPriceHistoryTable_1710765072070 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'cfr_price_history',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'timestamp',
            type: 'timestamptz',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'price_usd',
            type: 'numeric',
            precision: 18,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'tvl_usd',
            type: 'numeric',
            precision: 18,
            scale: 8,
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'cfr_price_history',
      new TableIndex({
        name: 'idx_cfr_price_history_timestamp',
        columnNames: ['timestamp'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('cfr_price_history', 'idx_cfr_price_history_timestamp');
    await queryRunner.dropTable('cfr_price_history', true);
  }
}
