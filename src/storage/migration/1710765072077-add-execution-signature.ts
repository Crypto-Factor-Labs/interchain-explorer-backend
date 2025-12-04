import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExecutionSignatureToExecutionParts1710765072076 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "execution_parts"
      ADD COLUMN "execution_signature" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "execution_parts"
      DROP COLUMN "execution_signature"
    `);
  }
}
