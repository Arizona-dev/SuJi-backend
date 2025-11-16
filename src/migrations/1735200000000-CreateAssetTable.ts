import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAssetTable1735200000000 implements MigrationInterface {
  name = "CreateAssetTable1735200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create assets table
    await queryRunner.query(`
      CREATE TABLE "assets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "storeId" uuid NOT NULL,
        "filename" character varying NOT NULL,
        "url" character varying NOT NULL,
        "mimeType" character varying NOT NULL,
        "size" bigint NOT NULL,
        "tags" text,
        "usageCount" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assets" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key from assets to stores
    await queryRunner.query(`
      ALTER TABLE "assets"
      ADD CONSTRAINT "FK_assets_storeId"
      FOREIGN KEY ("storeId")
      REFERENCES "stores"("id")
      ON DELETE CASCADE
    `);

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX "IDX_assets_storeId" ON "assets" ("storeId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_assets_createdAt" ON "assets" ("createdAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_assets_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_assets_storeId"`);

    // Drop foreign key
    await queryRunner.query(`
      ALTER TABLE "assets"
      DROP CONSTRAINT "FK_assets_storeId"
    `);

    // Drop assets table
    await queryRunner.query(`DROP TABLE "assets"`);
  }
}
