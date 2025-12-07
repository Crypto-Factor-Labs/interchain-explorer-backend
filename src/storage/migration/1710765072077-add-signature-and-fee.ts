import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSignatureAndFee1710765072077 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "execution_parts"
      ADD COLUMN "execution_signature" text
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD COLUMN "fee_per_unit" NUMERIC(78,0)
    `);
  }


  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions"
      DROP COLUMN "fee_per_unit"
    `);

    await queryRunner.query(`
      ALTER TABLE "execution_parts"
      DROP COLUMN "execution_signature"
    `);
  }
}
