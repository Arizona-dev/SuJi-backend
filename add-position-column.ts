import "reflect-metadata";
import { AppDataSource } from "./src/data-source";

async function addPositionColumn() {
  try {
    await AppDataSource.initialize();
    console.log("Data Source has been initialized!");

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    // Check if column already exists
    const checkColumn = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'menu_items' AND column_name = 'position'
    `);

    if (checkColumn.length > 0) {
      console.log("Position column already exists!");
      await queryRunner.release();
      await AppDataSource.destroy();
      return;
    }

    // Add position column
    console.log("Adding position column to menu_items table...");
    await queryRunner.query(`
      ALTER TABLE "menu_items"
      ADD COLUMN "position" integer NOT NULL DEFAULT 0
    `);
    console.log("Position column added successfully!");

    // Add index
    console.log("Adding index for categoryId and position...");
    await queryRunner.query(`
      CREATE INDEX "IDX_menu_items_categoryId_position" ON "menu_items" ("categoryId", "position")
    `);
    console.log("Index added successfully!");

    await queryRunner.release();
    await AppDataSource.destroy();
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

addPositionColumn();
