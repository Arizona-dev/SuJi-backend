import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStorageFieldsToStores1736500000000 implements MigrationInterface {
  name = "AddStorageFieldsToStores1736500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add storage plan enum type
    await queryRunner.query(`
      CREATE TYPE "stores_storageplan_enum" AS ENUM('free', 'pro')
    `);

    // Add storage fields to stores table
    await queryRunner.query(`
      ALTER TABLE "stores"
      ADD COLUMN "storagePlan" "stores_storageplan_enum" NOT NULL DEFAULT 'free',
      ADD COLUMN "storageUsed" bigint NOT NULL DEFAULT 0,
      ADD COLUMN "storageLimit" bigint NOT NULL DEFAULT 524288000
    `);

    // Add index for storage plan (useful for analytics and queries)
    await queryRunner.query(`
      CREATE INDEX "IDX_stores_storagePlan" ON "stores" ("storagePlan")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX "IDX_stores_storagePlan"`);

    // Drop storage columns
    await queryRunner.query(`
      ALTER TABLE "stores"
      DROP COLUMN "storagePlan",
      DROP COLUMN "storageUsed",
      DROP COLUMN "storageLimit"
    `);

    // Drop enum type
    await queryRunner.query(`DROP TYPE "stores_storageplan_enum"`);
  }
}
