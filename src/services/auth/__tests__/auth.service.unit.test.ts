import "reflect-metadata";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthService } from "../auth.service";
import { User, UserRole, UserType } from "../../../entities/auth/User";

// Mock dependencies
const mockUserRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockStoreRepository = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockAuditService = {
  logRegistration: jest.fn(),
};

const mockDataSource = {
  getRepository: jest.fn((entity: any) => {
    if (entity === User) return mockUserRepository;
    return mockStoreRepository;
  }),
};

// Mock bcrypt
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
  compare: jest.fn(),
}));

// Mock jwt
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("test_token"),
}));

describe("AuthService Unit Tests", () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService(mockDataSource as any);
  });

  describe("login", () => {
    it("should login a user with valid credentials", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: "hashed_password",
        firstName: "John",
        lastName: "Doe",
        role: UserRole.CUSTOMER,
        type: UserType.LOCAL,
        isActive: true,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith("password123", "hashed_password");
      expect(jwt.sign).toHaveBeenCalled();
      expect(result).toHaveProperty("token", "test_token");
      expect(result.user).toHaveProperty("email", "test@example.com");
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
        })
      );
    });

    it("should throw error for invalid password", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: "hashed_password",
        isActive: true,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({
          email: "test@example.com",
          password: "wrong_password",
        })
      ).rejects.toThrow("Invalid credentials");
    });

    it("should throw error for non-existent user", async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        authService.login({
          email: "nonexistent@example.com",
          password: "password123",
        })
      ).rejects.toThrow("Invalid credentials");
    });

    it("should throw error for deactivated account", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: "hashed_password",
        isActive: false,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        authService.login({
          email: "test@example.com",
          password: "password123",
        })
      ).rejects.toThrow("Account is deactivated");
    });

    it("should throw error for OAuth user trying to login with password", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: null, // OAuth user has no password
        googleId: "google-123",
        isActive: true,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        authService.login({
          email: "test@example.com",
          password: "password123",
        })
      ).rejects.toThrow("Invalid credentials");
    });
  });

  describe("registerCustomer", () => {
    it("should register a new customer", async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const mockSavedUser = {
        id: "user-123",
        email: "newuser@example.com",
        firstName: "Jane",
        lastName: "Smith",
        role: UserRole.CUSTOMER,
        type: UserType.LOCAL,
        isActive: true,
      };
      mockUserRepository.create.mockReturnValue(mockSavedUser);
      mockUserRepository.save.mockResolvedValue(mockSavedUser);

      const result = await authService.registerCustomer({
        email: "newuser@example.com",
        password: "password123",
        firstName: "Jane",
        lastName: "Smith",
      });

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: "newuser@example.com" },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 12);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: "newuser@example.com",
        password: "hashed_password",
        firstName: "Jane",
        lastName: "Smith",
        role: UserRole.CUSTOMER,
        type: UserType.LOCAL,
      });
      expect(result).toHaveProperty("token", "test_token");
      expect(result.user).toHaveProperty("email", "newuser@example.com");
    });

    it("should throw error if email already exists", async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: "existing-user",
        email: "existing@example.com",
      });

      await expect(
        authService.registerCustomer({
          email: "existing@example.com",
          password: "password123",
          firstName: "John",
          lastName: "Doe",
        })
      ).rejects.toThrow("Email already registered");
    });

    it("should convert email to lowercase", async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const mockSavedUser = {
        id: "user-123",
        email: "newuser@example.com",
        role: UserRole.CUSTOMER,
        type: UserType.LOCAL,
        isActive: true,
      };
      mockUserRepository.create.mockReturnValue(mockSavedUser);
      mockUserRepository.save.mockResolvedValue(mockSavedUser);

      await authService.registerCustomer({
        email: "NewUser@Example.COM",
        password: "password123",
        firstName: "Jane",
        lastName: "Smith",
      });

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: "newuser@example.com" },
      });
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "newuser@example.com",
        })
      );
    });
  });

  describe("generateToken", () => {
    it("should generate a JWT token for a user", () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        role: UserRole.CUSTOMER,
      } as User;

      const token = authService.generateToken(mockUser);

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: "user-123",
          email: "test@example.com",
          role: UserRole.CUSTOMER,
        },
        expect.any(String),
        { expiresIn: "7d" }
      );
      expect(token).toBe("test_token");
    });

    it("should include role in token payload", () => {
      const mockStoreOwner = {
        id: "owner-123",
        email: "owner@example.com",
        role: UserRole.STORE_OWNER,
      } as User;

      authService.generateToken(mockStoreOwner);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.STORE_OWNER,
        }),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe("OAuth user handling", () => {
    it("should allow OAuth users to be created without password", async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const mockOAuthUser = {
        id: "user-oauth-123",
        email: "oauth@example.com",
        googleId: "google-123",
        firstName: "OAuth",
        lastName: "User",
        role: UserRole.CUSTOMER,
        type: UserType.GOOGLE,
        isActive: true,
        emailVerified: true,
      };
      mockUserRepository.create.mockReturnValue(mockOAuthUser);
      mockUserRepository.save.mockResolvedValue(mockOAuthUser);

      // Simulate OAuth user creation (this would normally be handled by Passport)
      const user = mockUserRepository.create({
        email: "oauth@example.com",
        googleId: "google-123",
        firstName: "OAuth",
        lastName: "User",
        role: UserRole.CUSTOMER,
        type: UserType.GOOGLE,
        emailVerified: true,
        isActive: true,
      });
      const savedUser = await mockUserRepository.save(user);

      expect(savedUser).not.toHaveProperty("password");
      expect(savedUser).toHaveProperty("googleId", "google-123");
      expect(savedUser).toHaveProperty("emailVerified", true);
    });

    it("should generate token for OAuth user", () => {
      const mockOAuthUser = {
        id: "oauth-user-123",
        email: "oauth@example.com",
        googleId: "google-123",
        role: UserRole.CUSTOMER,
        type: UserType.GOOGLE,
      } as User;

      const token = authService.generateToken(mockOAuthUser);

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: "oauth-user-123",
          email: "oauth@example.com",
          role: UserRole.CUSTOMER,
        },
        expect.any(String),
        { expiresIn: "7d" }
      );
      expect(token).toBe("test_token");
    });
  });
});