import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCategoryTable1731716400000 implements MigrationInterface {
  name = "CreateCategoryTable1731716400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create categories table
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying,
        "position" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "menuId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_categories" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key from categories to menus
    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD CONSTRAINT "FK_categories_menuId"
      FOREIGN KEY ("menuId")
      REFERENCES "menus"("id")
      ON DELETE CASCADE
    `);

    // Add categoryId to menu_items
    await queryRunner.query(`
      ALTER TABLE "menu_items"
      ADD COLUMN "categoryId" uuid
    `);

    // Migrate existing category data
    // 1. Get unique categories from menu_items grouped by menuId
    await queryRunner.query(`
      INSERT INTO "categories" ("name", "menuId", "position")
      SELECT DISTINCT
        "category" as "name",
        "menuId",
        ROW_NUMBER() OVER (PARTITION BY "menuId" ORDER BY MIN("createdAt")) - 1 as "position"
      FROM "menu_items"
      WHERE "category" IS NOT NULL AND "category" != ''
      GROUP BY "category", "menuId"
    `);

    // 2. Update menu_items with categoryId
    await queryRunner.query(`
      UPDATE "menu_items" mi
      SET "categoryId" = c."id"
      FROM "categories" c
      WHERE mi."category" = c."name"
      AND mi."menuId" = c."menuId"
      AND mi."category" IS NOT NULL
    `);

    // Add foreign key from menu_items to categories
    await queryRunner.query(`
      ALTER TABLE "menu_items"
      ADD CONSTRAINT "FK_menu_items_categoryId"
      FOREIGN KEY ("categoryId")
      REFERENCES "categories"("id")
      ON DELETE SET NULL
    `);

    // Drop old category column
    await queryRunner.query(`
      ALTER TABLE "menu_items"
      DROP COLUMN "category"
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_categories_menuId" ON "categories" ("menuId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_categories_position" ON "categories" ("menuId", "position")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back category column
    await queryRunner.query(`
      ALTER TABLE "menu_items"
      ADD COLUMN "category" character varying
    `);

    // Restore category data from categories table
    await queryRunner.query(`
      UPDATE "menu_items" mi
      SET "category" = c."name"
      FROM "categories" c
      WHERE mi."categoryId" = c."id"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_categories_position"`);
    await queryRunner.query(`DROP INDEX "IDX_categories_menuId"`);

    // Drop foreign key and categoryId column
    await queryRunner.query(`
      ALTER TABLE "menu_items"
      DROP CONSTRAINT "FK_menu_items_categoryId"
    `);

    await queryRunner.query(`
      ALTER TABLE "menu_items"
      DROP COLUMN "categoryId"
    `);

    // Drop categories table
    await queryRunner.query(`
      ALTER TABLE "categories"
      DROP CONSTRAINT "FK_categories_menuId"
    `);

    await queryRunner.query(`DROP TABLE "categories"`);
  }
}
