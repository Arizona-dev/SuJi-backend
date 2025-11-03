import {
  Repository,
  DataSource,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
} from "typeorm";
import { AppDataSource } from "../../config/database";
import {
  AuditLog,
  AuditAction,
  AuditEntityType,
} from "../../entities/audit/AuditLog";
import { logger } from "../../utils/logger";

export interface AuditLogEntry {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  userId?: string;
}

export interface CreateAuditLogRequest {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  userId?: string;
}

export class AuditService {
  private auditLogRepository: Repository<AuditLog>;

  constructor(private dataSource: DataSource = AppDataSource) {
    this.auditLogRepository = dataSource.getRepository(AuditLog);
  }

  async logAction(request: CreateAuditLogRequest): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      entityType: request.entityType,
      entityId: request.entityId,
      action: request.action,
      oldValues: request.oldValues,
      newValues: request.newValues,
      metadata: request.metadata,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      userId: request.userId,
    });

    await this.auditLogRepository.save(auditLog);

    // Log to file for compliance (dual logging for redundancy)
    logger.info("AUDIT_LOG", {
      id: auditLog.id,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      action: auditLog.action,
      userId: auditLog.userId,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      timestamp: auditLog.timestamp.toISOString(),
      metadata: auditLog.metadata,
    });
  }

  async logUserRegistration(
    userId: string,
    registrationData: Record<string, any>,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    await this.logAction({
      entityType: AuditEntityType.USER,
      entityId: userId,
      action: AuditAction.USER_REGISTRATION,
      newValues: {
        email: registrationData.email,
        role: registrationData.role,
        businessName: registrationData.businessName,
        businessType: registrationData.businessType,
        siren: registrationData.siren,
        siret: registrationData.siret,
      },
      metadata: {
        registrationType: "store_owner",
        consents: {
          acceptedTerms: registrationData.acceptedTerms,
          acceptedPrivacyPolicy: registrationData.acceptedPrivacyPolicy,
          acceptedDataProcessing: registrationData.acceptedDataProcessing,
          marketingConsent: registrationData.marketingConsent,
        },
        ownerInfo: {
          firstName: registrationData.ownerFirstName,
          lastName: registrationData.ownerLastName,
          dateOfBirth: registrationData.ownerDateOfBirth,
          phone: registrationData.ownerPhone,
        },
      },
      ipAddress,
      userAgent,
    });
  }

  async logStoreRegistration(
    storeId: string,
    storeData: Record<string, any>,
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    await this.logAction({
      entityType: AuditEntityType.STORE,
      entityId: storeId,
      action: AuditAction.STORE_REGISTRATION,
      newValues: {
        name: storeData.name,
        businessName: storeData.businessName,
        businessType: storeData.businessType,
        businessAddress: storeData.businessAddress,
      },
      metadata: {
        siren: storeData.siren,
        siret: storeData.siret,
      },
      ipAddress,
      userAgent,
      userId,
    });
  }

  async logConsentAcceptance(
    userId: string,
    consentType: "terms" | "privacy" | "data_processing" | "marketing",
    accepted: boolean,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const actionMap = {
      terms: AuditAction.TERMS_ACCEPTANCE,
      privacy: AuditAction.PRIVACY_POLICY_ACCEPTANCE,
      data_processing: AuditAction.DATA_PROCESSING_CONSENT,
      marketing: AuditAction.MARKETING_CONSENT,
    };

    await this.logAction({
      entityType: AuditEntityType.USER,
      entityId: userId,
      action: actionMap[consentType],
      newValues: { accepted },
      ipAddress,
      userAgent,
      userId,
    });
  }

  // Get audit logs for compliance reporting (CNIL requirements)
  async getAuditLogs(
    entityType?: AuditEntityType,
    entityId?: string,
    userId?: string,
    action?: AuditAction,
    fromDate?: Date,
    toDate?: Date,
    limit = 1000,
    offset = 0
  ): Promise<AuditLog[]> {
    const where: any = {};

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;
    if (action) where.action = action;

    // Handle date range filtering
    if (fromDate && toDate) {
      where.timestamp = Between(fromDate, toDate);
    } else if (fromDate) {
      where.timestamp = MoreThanOrEqual(fromDate);
    } else if (toDate) {
      where.timestamp = LessThanOrEqual(toDate);
    }

    return await this.auditLogRepository.find({
      where,
      order: { timestamp: "DESC" },
      take: limit,
      skip: offset,
    });
  }

  // Export audit logs for CNIL compliance (French data protection authority)
  async exportAuditLogsForCNIL(
    fromDate: Date,
    toDate: Date
  ): Promise<AuditLog[]> {
    return await this.getAuditLogs(
      undefined,
      undefined,
      undefined,
      undefined,
      fromDate,
      toDate,
      10000
    );
  }

  // Get audit log statistics for reporting
  async getAuditStatistics(
    fromDate?: Date,
    toDate?: Date
  ): Promise<{
    totalLogs: number;
    logsByAction: Record<AuditAction, number>;
    logsByEntityType: Record<AuditEntityType, number>;
    recentLogs: AuditLog[];
  }> {
    const where: any = {};
    if (fromDate && toDate) {
      where.timestamp = Between(fromDate, toDate);
    } else if (fromDate) {
      where.timestamp = MoreThanOrEqual(fromDate);
    } else if (toDate) {
      where.timestamp = LessThanOrEqual(toDate);
    }

    const [totalLogs, logsByAction, logsByEntityType, recentLogs] =
      await Promise.all([
        this.auditLogRepository.count({ where }),
        this.auditLogRepository
          .createQueryBuilder("audit")
          .select("audit.action", "action")
          .addSelect("COUNT(*)", "count")
          .where(where)
          .groupBy("audit.action")
          .getRawMany(),
        this.auditLogRepository
          .createQueryBuilder("audit")
          .select("audit.entityType", "entityType")
          .addSelect("COUNT(*)", "count")
          .where(where)
          .groupBy("audit.entityType")
          .getRawMany(),
        this.auditLogRepository.find({
          where,
          order: { timestamp: "DESC" },
          take: 10,
        }),
      ]);

    const actionStats = logsByAction.reduce((acc, item) => {
      acc[item.action as AuditAction] = parseInt(item.count);
      return acc;
    }, {} as Record<AuditAction, number>);

    const entityTypeStats = logsByEntityType.reduce((acc, item) => {
      acc[item.entityType as AuditEntityType] = parseInt(item.count);
      return acc;
    }, {} as Record<AuditEntityType, number>);

    return {
      totalLogs,
      logsByAction: actionStats,
      logsByEntityType: entityTypeStats,
      recentLogs,
    };
  }
}
