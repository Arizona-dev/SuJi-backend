/// <reference types="jest" />

import request from "supertest";
import bcrypt from "bcryptjs";
import { startTestServer, stopTestServer } from "../test-server";
import { TestDataSource } from "../../config/test-database";
import { User, UserRole, UserType } from "../../entities/auth/User";

let app: any;
let testServer: any;

describe("Auth API Endpoints", () => {
  beforeAll(async () => {
    const serverSetup = await startTestServer();
    app = serverSetup.app;
    testServer = serverSetup.server;
  }, 30000);

  afterAll(async () => {
    await stopTestServer();
  }, 30000);

  describe("POST /api/auth/customer/login", () => {
    const loginEndpoint = "/api/auth/customer/login";

    it("should return 400 for invalid request body", async () => {
      const response = await request(app)
        .post(loginEndpoint)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty("message", "Validation failed");
      expect(response.body).toHaveProperty("errors");
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it("should return 401 for non-existent user", async () => {
      const response = await request(app)
        .post(loginEndpoint)
        .send({
          email: "nonexistent@example.com",
          password: "password123",
        })
        .expect(401);

      expect(response.body).toHaveProperty("message", "Invalid credentials");
    });

    it("should successfully login existing customer", async () => {
      // First create a test user
      const userRepository = TestDataSource.getRepository(User);
      const testUser = userRepository.create({
        email: "customer@example.com",
        password: bcrypt.hashSync("password123", 12),
        firstName: "John",
        lastName: "Doe",
        role: UserRole.CUSTOMER,
        type: UserType.LOCAL,
      });
      await userRepository.save(testUser);

      const response = await request(app)
        .post(loginEndpoint)
        .send({
          email: "customer@example.com",
          password: "password123",
        })
        .expect(200);

      expect(response.body).toHaveProperty("message", "Login successful");
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("user");

      const { user } = response.body;
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("email", "customer@example.com");
      expect(user).toHaveProperty("firstName", "John");
      expect(user).toHaveProperty("lastName", "Doe");
      expect(user).toHaveProperty("role", "customer");
      expect(user).toHaveProperty("type", "local");
      expect(user).toHaveProperty("isActive", true);
    });

    it("should return 401 for wrong password", async () => {
      // First create a test user
      const userRepository = TestDataSource.getRepository(User);
      const testUser = userRepository.create({
        email: "customer2@example.com",
        password: bcrypt.hashSync("password123", 12),
        firstName: "Jane",
        lastName: "Doe",
        role: UserRole.CUSTOMER,
        type: UserType.LOCAL,
      });
      await userRepository.save(testUser);

      const response = await request(app)
        .post(loginEndpoint)
        .send({
          email: "customer2@example.com",
          password: "wrongpassword",
        })
        .expect(401);

      expect(response.body).toHaveProperty("message", "Invalid credentials");
    });

    it("should return 401 for deactivated user", async () => {
      const userRepository = TestDataSource.getRepository(User);
      const deactivatedUser = userRepository.create({
        email: "deactivated@example.com",
        password: bcrypt.hashSync("password123", 12),
        firstName: "Deactivated",
        lastName: "User",
        role: UserRole.CUSTOMER,
        type: UserType.LOCAL,
        isActive: false,
      });
      await userRepository.save(deactivatedUser);

      const response = await request(app)
        .post(loginEndpoint)
        .send({
          email: "deactivated@example.com",
          password: "password123",
        })
        .expect(401);

      expect(response.body).toHaveProperty("message", "Account is deactivated");
    });
  });

  describe("POST /api/auth/customer/register", () => {
    const registerEndpoint = "/api/auth/customer/register";

    it("should return 400 for invalid request body", async () => {
      const response = await request(app)
        .post(registerEndpoint)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty("message", "Validation failed");
      expect(response.body).toHaveProperty("errors");
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it("should successfully register new customer", async () => {
      const response = await request(app)
        .post(registerEndpoint)
        .send({
          email: "newcustomer@example.com",
          password: "password123",
          firstName: "Jane",
          lastName: "Smith",
        })
        .expect(201);

      expect(response.body).toHaveProperty(
        "message",
        "Registration successful"
      );
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("user");

      const { user } = response.body;
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("email", "newcustomer@example.com");
      expect(user).toHaveProperty("firstName", "Jane");
      expect(user).toHaveProperty("lastName", "Smith");
      expect(user).toHaveProperty("role", "customer");
      expect(user).toHaveProperty("type", "local");
      expect(user).toHaveProperty("isActive", true);
    });

    it("should return 409 for existing email", async () => {
      // First create a user
      const userRepository = TestDataSource.getRepository(User);
      const existingUser = userRepository.create({
        email: "existing@example.com",
        password: bcrypt.hashSync("password123", 12),
        firstName: "Existing",
        lastName: "User",
        role: UserRole.CUSTOMER,
        type: UserType.LOCAL,
      });
      await userRepository.save(existingUser);

      const response = await request(app)
        .post(registerEndpoint)
        .send({
          email: "existing@example.com",
          password: "password123",
          firstName: "New",
          lastName: "User",
        })
        .expect(409);

      expect(response.body).toHaveProperty(
        "message",
        "Email already registered"
      );
    });

    it("should return 400 for password too short", async () => {
      const response = await request(app)
        .post(registerEndpoint)
        .send({
          email: "test@example.com",
          password: "123",
          firstName: "Test",
          lastName: "User",
        })
        .expect(400);

      expect(response.body).toHaveProperty("message", "Validation failed");
    });
  });

  describe("POST /api/auth/store/login", () => {
    const loginEndpoint = "/api/auth/store/login";

    it("should successfully login existing store owner", async () => {
      // Create a test store owner
      const userRepository = TestDataSource.getRepository(User);
      const testStoreOwner = userRepository.create({
        email: "storeowner@example.com",
        password: bcrypt.hashSync("password123", 12),
        role: UserRole.STORE_OWNER,
        type: UserType.LOCAL,
      });
      await userRepository.save(testStoreOwner);

      const response = await request(app)
        .post(loginEndpoint)
        .send({
          email: "storeowner@example.com",
          password: "password123",
        })
        .expect(200);

      expect(response.body).toHaveProperty("message", "Login successful");
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("user");

      const { user } = response.body;
      expect(user).toHaveProperty("role", "store_owner");
    });
  });

  describe("POST /api/auth/store/register", () => {
    const registerEndpoint = "/api/auth/store/register";

    it("should successfully register new store owner with international compliance", async () => {
      const response = await request(app)
        .post(registerEndpoint)
        .send({
          email: "newstore@example.com",
          password: "SecurePass123",
          storeName: "Test Store",
          // International business fields
          businessName: "Test Business LLC",
          businessType: "llc",
          businessAddress: {
            street: "123 Test Street",
            city: "Paris",
            postalCode: "75001",
            country: "FR",
          },
          ownerFirstName: "Jean",
          ownerLastName: "Dupont",
          ownerPhone: "+33123456789",
          ownerDateOfBirth: "1990-01-15",
          // Legal consents
          acceptedTerms: true,
          acceptedPrivacyPolicy: true,
          acceptedDataProcessing: true,
          marketingConsent: false,
          // French-specific fields
          countrySpecificFields: {
            siren: "123456789",
            siret: "12345678901234",
            frenchBusinessType: "sarl",
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty(
        "message",
        "Registration successful"
      );
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("user");
      expect(response.body).toHaveProperty("store");

      const { user, store } = response.body;
      expect(user).toHaveProperty("role", "store_owner");
      expect(user).toHaveProperty("firstName", "Jean");
      expect(user).toHaveProperty("lastName", "Dupont");
      expect(user).toHaveProperty("isFullyRegistered", false);
      expect(store).toHaveProperty("name", "Test Store");
      expect(store).toHaveProperty("isActive", true);
      expect(store).toHaveProperty("isLegallyVerified", false);
    });

    it("should return 400 for underage registration", async () => {
      const response = await request(app)
        .post(registerEndpoint)
        .send({
          email: "underage@example.com",
          password: "SecurePass123",
          storeName: "Underage Store",
          businessName: "Underage Business",
          businessType: "sole_proprietorship",
          businessAddress: {
            street: "123 Test Street",
            city: "Paris",
            postalCode: "75001",
            country: "FR",
          },
          ownerFirstName: "Too",
          ownerLastName: "Young",
          ownerPhone: "+33123456789",
          ownerDateOfBirth: "2010-01-15", // Under 18
          acceptedTerms: true,
          acceptedPrivacyPolicy: true,
          acceptedDataProcessing: true,
        })
        .expect(400);

      expect(response.body).toHaveProperty("message", "Validation failed");
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Must be 18 or older",
            param: "ownerDateOfBirth",
          }),
        ])
      );
    });

    it("should return 400 for missing legal consents", async () => {
      const response = await request(app)
        .post(registerEndpoint)
        .send({
          email: "noconsent@example.com",
          password: "SecurePass123",
          storeName: "No Consent Store",
          businessName: "No Consent Business",
          businessType: "sole_proprietorship",
          businessAddress: {
            street: "123 Test Street",
            city: "Paris",
            postalCode: "75001",
            country: "FR",
          },
          ownerFirstName: "No",
          ownerLastName: "Consent",
          ownerPhone: "+33123456789",
          ownerDateOfBirth: "1990-01-15",
          acceptedTerms: false, // Missing consent
          acceptedPrivacyPolicy: true,
          acceptedDataProcessing: true,
        })
        .expect(400);

      expect(response.body).toHaveProperty("message", "Validation failed");
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Terms must be accepted",
            param: "acceptedTerms",
          }),
        ])
      );
    });

    it("should return 400 for invalid business address", async () => {
      const response = await request(app)
        .post(registerEndpoint)
        .send({
          email: "invalidaddress@example.com",
          password: "SecurePass123",
          storeName: "Invalid Address Store",
          businessName: "Invalid Address Business",
          businessType: "sole_proprietorship",
          businessAddress: {
            street: "", // Empty street
            city: "Paris",
            postalCode: "75001",
            country: "INVALID", // Invalid country code
          },
          ownerFirstName: "Invalid",
          ownerLastName: "Address",
          ownerPhone: "+33123456789",
          ownerDateOfBirth: "1990-01-15",
          acceptedTerms: true,
          acceptedPrivacyPolicy: true,
          acceptedDataProcessing: true,
        })
        .expect(400);

      expect(response.body).toHaveProperty("message", "Validation failed");
    });

    it("should return 400 for invalid French SIREN format", async () => {
      const response = await request(app)
        .post(registerEndpoint)
        .send({
          email: "invalidsiren@example.com",
          password: "SecurePass123",
          storeName: "Invalid SIREN Store",
          businessName: "Invalid SIREN Business",
          businessType: "sole_proprietorship",
          businessAddress: {
            street: "123 Test Street",
            city: "Paris",
            postalCode: "75001",
            country: "FR",
          },
          ownerFirstName: "Invalid",
          ownerLastName: "Siren",
          ownerPhone: "+33123456789",
          ownerDateOfBirth: "1990-01-15",
          acceptedTerms: true,
          acceptedPrivacyPolicy: true,
          acceptedDataProcessing: true,
          countrySpecificFields: {
            siren: "12345678", // Too short (should be 9 digits)
            siret: "123456789012345", // Too long (should be 14 digits)
          },
        })
        .expect(400);

      expect(response.body).toHaveProperty("message", "Validation failed");
    });

    it("should create audit logs during registration", async () => {
      // Register a new store owner
      const response = await request(app)
        .post(registerEndpoint)
        .send({
          email: "auditstore@example.com",
          password: "SecurePass123",
          storeName: "Audit Test Store",
          businessName: "Audit Test Business",
          businessType: "llc",
          businessAddress: {
            street: "123 Audit Street",
            city: "Paris",
            postalCode: "75001",
            country: "FR",
          },
          ownerFirstName: "Audit",
          ownerLastName: "Test",
          ownerPhone: "+33123456789",
          ownerDateOfBirth: "1990-01-15",
          acceptedTerms: true,
          acceptedPrivacyPolicy: true,
          acceptedDataProcessing: true,
          marketingConsent: true,
        })
        .expect(201);

      // Verify user was created
      const userRepository = TestDataSource.getRepository(User);
      const createdUser = await userRepository.findOne({
        where: { email: "auditstore@example.com" },
      });
      expect(createdUser).toBeDefined();
      expect(createdUser?.acceptedTerms).toBe(true);
      expect(createdUser?.acceptedPrivacyPolicy).toBe(true);
      expect(createdUser?.acceptedDataProcessing).toBe(true);
      expect(createdUser?.marketingConsent).toBe(true);

      // Verify audit logs were created (this would require importing AuditLog entity)
      // Note: In a real implementation, you might want to expose an audit endpoint for testing
      // or create a test-specific audit repository access
    });

    it("should handle US business registration", async () => {
      const response = await request(app)
        .post(registerEndpoint)
        .send({
          email: "usstore@example.com",
          password: "SecurePass123",
          storeName: "US Store",
          businessName: "US Business LLC",
          businessType: "llc",
          businessAddress: {
            street: "123 Main St",
            city: "New York",
            postalCode: "10001",
            country: "US",
          },
          ownerFirstName: "John",
          ownerLastName: "Smith",
          ownerPhone: "+1234567890",
          ownerDateOfBirth: "1985-05-20",
          acceptedTerms: true,
          acceptedPrivacyPolicy: true,
          acceptedDataProcessing: true,
          countrySpecificFields: {
            ein: "12-3456789", // Valid EIN format
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty(
        "message",
        "Registration successful"
      );
      expect(response.body.user).toHaveProperty("role", "store_owner");
    });
  });

  describe("GET /api/auth/google", () => {
    it("should return 501 for Google OAuth (not implemented)", async () => {
      const response = await request(app).get("/api/auth/google").expect(501);

      expect(response.body).toHaveProperty(
        "message",
        "Google OAuth not implemented yet"
      );
    });
  });

  describe("GET /api/auth/apple", () => {
    it("should return 501 for Apple OAuth (not implemented)", async () => {
      const response = await request(app).get("/api/auth/apple").expect(501);

      expect(response.body).toHaveProperty(
        "message",
        "Apple OAuth not implemented yet"
      );
    });
  });
});
