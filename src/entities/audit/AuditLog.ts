import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export enum AuditAction {
  USER_REGISTRATION = "user_registration",
  STORE_REGISTRATION = "store_registration",
  TERMS_ACCEPTANCE = "terms_acceptance",
  PRIVACY_POLICY_ACCEPTANCE = "privacy_policy_acceptance",
  DATA_PROCESSING_CONSENT = "data_processing_consent",
  MARKETING_CONSENT = "marketing_consent",
  DOCUMENT_UPLOAD = "document_upload",
  BUSINESS_VERIFICATION = "business_verification",
}

export enum AuditEntityType {
  USER = "user",
  STORE = "store",
  BUSINESS_DOCUMENT = "business_document",
}

@Entity("audit_logs")
@Index(["entityType", "entityId"])
@Index(["userId"])
@Index(["timestamp"])
@Index(["action"])
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "enum",
    enum: AuditEntityType,
  })
  entityType!: AuditEntityType;

  @Column()
  entityId!: string;

  @Column({
    type: "enum",
    enum: AuditAction,
  })
  action!: AuditAction;

  @Column({ type: "json", nullable: true })
  oldValues?: Record<string, any>;

  @Column({ type: "json", nullable: true })
  newValues?: Record<string, any>;

  @Column({ type: "json", nullable: true })
  metadata?: Record<string, any>;

  @Column()
  ipAddress!: string;

  @Column()
  userAgent!: string;

  @Column({ nullable: true })
  userId?: string;

  @CreateDateColumn()
  timestamp!: Date;
}
