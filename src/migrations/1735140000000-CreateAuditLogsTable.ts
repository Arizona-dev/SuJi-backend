import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAuditLogsTable1735140000000 implements MigrationInterface {
  name = "CreateAuditLogsTable1735140000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "audit_logs_entitytype_enum" AS ENUM('user', 'store', 'business_document')
        `);
    await queryRunner.query(`
            CREATE TYPE "audit_logs_action_enum" AS ENUM(
                'user_registration',
                'store_registration',
                'terms_acceptance',
                'privacy_policy_acceptance',
                'data_processing_consent',
                'marketing_consent',
                'document_upload',
                'business_verification'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "audit_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "entityType" "audit_logs_entitytype_enum" NOT NULL,
                "entityId" character varying NOT NULL,
                "action" "audit_logs_action_enum" NOT NULL,
                "oldValues" json,
                "newValues" json,
                "metadata" json,
                "ipAddress" character varying NOT NULL,
                "userAgent" character varying NOT NULL,
                "userId" character varying,
                "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_4e7c27c3e8e1c9c8b8b8b8b8b8b" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_audit_logs_entity_type_entity_id" ON "audit_logs" ("entityType", "entityId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_audit_logs_user_id" ON "audit_logs" ("userId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_audit_logs_timestamp" ON "audit_logs" ("timestamp")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_action"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_timestamp"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_user_id"`);
    await queryRunner.query(
      `DROP INDEX "IDX_audit_logs_entity_type_entity_id"`
    );
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "audit_logs_action_enum"`);
    await queryRunner.query(`DROP TYPE "audit_logs_entitytype_enum"`);
  }
}
