import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPositionToMenuItem1737100000000 implements MigrationInterface {
  name = "AddPositionToMenuItem1737100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add position column to menu_items table
    await queryRunner.query(`
      ALTER TABLE "menu_items"
      ADD COLUMN "position" integer NOT NULL DEFAULT 0
    `);

    // Add index for efficient ordering queries within categories
    await queryRunner.query(`
      CREATE INDEX "IDX_menu_items_categoryId_position" ON "menu_items" ("categoryId", "position")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX "IDX_menu_items_categoryId_position"`);

    // Drop position column
    await queryRunner.query(`
      ALTER TABLE "menu_items"
      DROP COLUMN "position"
    `);
  }
}
