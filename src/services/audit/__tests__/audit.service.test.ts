import { AuditService } from "../audit.service";
import { AuditAction, AuditEntityType } from "../../../entities/audit/AuditLog";
import { AppDataSource } from "../../../config/database";
import { AuditLog } from "../../../entities/audit/AuditLog";

describe("AuditService", () => {
  let auditService: AuditService;

  beforeAll(async () => {
    // Initialize database connection for tests
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    auditService = new AuditService();
  });

  afterAll(async () => {
    // Close database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe("logAction", () => {
    it("should create and save an audit log entry", async () => {
      const testData = {
        entityType: AuditEntityType.USER,
        entityId: "test-user-id",
        action: AuditAction.USER_REGISTRATION,
        oldValues: { status: "inactive" },
        newValues: { status: "active", email: "test@example.com" },
        metadata: { source: "registration_form" },
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
        userId: "test-user-id",
      };

      await auditService.logAction(testData);

      // Verify the log was saved
      const savedLog = await AppDataSource.getRepository(AuditLog).findOne({
        where: {
          entityType: testData.entityType,
          entityId: testData.entityId,
          action: testData.action,
        },
        order: { timestamp: "DESC" },
      });

      expect(savedLog).toBeDefined();
      expect(savedLog?.entityType).toBe(testData.entityType);
      expect(savedLog?.entityId).toBe(testData.entityId);
      expect(savedLog?.action).toBe(testData.action);
      expect(savedLog?.oldValues).toEqual(testData.oldValues);
      expect(savedLog?.newValues).toEqual(testData.newValues);
      expect(savedLog?.metadata).toEqual(testData.metadata);
      expect(savedLog?.ipAddress).toBe(testData.ipAddress);
      expect(savedLog?.userAgent).toBe(testData.userAgent);
      expect(savedLog?.userId).toBe(testData.userId);
      expect(savedLog?.timestamp).toBeInstanceOf(Date);
    });
  });

  describe("getAuditLogs", () => {
    beforeAll(async () => {
      // Create some test data
      await auditService.logAction({
        entityType: AuditEntityType.USER,
        entityId: "test-user-1",
        action: AuditAction.USER_REGISTRATION,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
      });

      await auditService.logAction({
        entityType: AuditEntityType.USER,
        entityId: "test-user-2",
        action: AuditAction.STORE_REGISTRATION,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
      });
    });

    it("should retrieve audit logs with filters", async () => {
      const logs = await auditService.getAuditLogs(
        AuditEntityType.USER,
        "test-user-1",
        undefined,
        AuditAction.USER_REGISTRATION
      );

      expect(logs).toBeDefined();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].entityType).toBe(AuditEntityType.USER);
      expect(logs[0].entityId).toBe("test-user-1");
      expect(logs[0].action).toBe(AuditAction.USER_REGISTRATION);
    });

    it("should retrieve audit logs with date range", async () => {
      const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      const toDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now

      const logs = await auditService.getAuditLogs(
        undefined,
        undefined,
        undefined,
        undefined,
        fromDate,
        toDate
      );

      expect(logs).toBeDefined();
      expect(logs.length).toBeGreaterThan(0);
      logs.forEach((log) => {
        expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(
          fromDate.getTime()
        );
        expect(log.timestamp.getTime()).toBeLessThanOrEqual(toDate.getTime());
      });
    });
  });

  describe("exportAuditLogsForCNIL", () => {
    it("should export audit logs for CNIL compliance", async () => {
      const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const toDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const logs = await auditService.exportAuditLogsForCNIL(fromDate, toDate);

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe("getAuditStatistics", () => {
    it("should return audit statistics", async () => {
      const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const toDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const stats = await auditService.getAuditStatistics(fromDate, toDate);

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("totalLogs");
      expect(stats).toHaveProperty("logsByAction");
      expect(stats).toHaveProperty("logsByEntityType");
      expect(stats).toHaveProperty("recentLogs");
      expect(typeof stats.totalLogs).toBe("number");
      expect(Array.isArray(stats.recentLogs)).toBe(true);
    });
  });
});
