import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddDeletedAtToMenuItem1737000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "menu_items",
      new TableColumn({
        name: "deletedAt",
        type: "timestamp",
        isNullable: true,
        default: null,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("menu_items", "deletedAt");
  }
}
