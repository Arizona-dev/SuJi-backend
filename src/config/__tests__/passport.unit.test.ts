import "reflect-metadata";
import passport from "passport";
import { configurePassport } from "../passport";
import { User, UserRole, UserType } from "../../entities/auth/User";

// Mock passport
jest.mock("passport", () => ({
  use: jest.fn(),
  serializeUser: jest.fn(),
  deserializeUser: jest.fn(),
}));

// Mock passport strategies
jest.mock("passport-google-oauth20", () => ({
  Strategy: jest.fn(),
}));

jest.mock("passport-apple", () => ({
  Strategy: jest.fn(),
}));

describe("Passport Configuration Unit Tests", () => {
  let mockDataSource: any;
  let mockUserRepository: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(),
    };

    mockDataSource = {
      getRepository: jest.fn(() => mockUserRepository),
    };

    // Set required environment variables
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
    process.env.GOOGLE_CALLBACK_URL =
      "http://localhost:3000/api/auth/google/callback";
    process.env.APPLE_CLIENT_ID = "test-apple-client-id";
    process.env.APPLE_TEAM_ID = "test-apple-team-id";
    process.env.APPLE_KEY_ID = "test-apple-key-id";
    process.env.APPLE_PRIVATE_KEY = "test-apple-private-key";
    process.env.APPLE_CALLBACK_URL =
      "http://localhost:3000/api/auth/apple/callback";
  });

  afterEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_CALLBACK_URL;
    delete process.env.APPLE_CLIENT_ID;
    delete process.env.APPLE_TEAM_ID;
    delete process.env.APPLE_KEY_ID;
    delete process.env.APPLE_PRIVATE_KEY;
    delete process.env.APPLE_CALLBACK_URL;
  });

  describe("configurePassport", () => {
    it("should configure Google and Apple strategies", () => {
      configurePassport(mockDataSource);

      expect(passport.use).toHaveBeenCalledTimes(2);
      expect(passport.serializeUser).toHaveBeenCalledTimes(1);
      expect(passport.deserializeUser).toHaveBeenCalledTimes(1);
    });

    it("should get User repository from dataSource", () => {
      configurePassport(mockDataSource);

      expect(mockDataSource.getRepository).toHaveBeenCalledWith(User);
    });
  });

  describe("User serialization", () => {
    it("should serialize user by id", () => {
      configurePassport(mockDataSource);

      const serializeCallback = (passport.serializeUser as jest.Mock).mock
        .calls[0][0];
      const doneMock = jest.fn();
      const mockUser = { id: "user-123", email: "test@example.com" };

      serializeCallback(mockUser, doneMock);

      expect(doneMock).toHaveBeenCalledWith(null, "user-123");
    });

    it("should deserialize user by id", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        role: UserRole.CUSTOMER,
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      configurePassport(mockDataSource);

      const deserializeCallback = (passport.deserializeUser as jest.Mock).mock
        .calls[0][0];
      const doneMock = jest.fn();

      await deserializeCallback("user-123", doneMock);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
      expect(doneMock).toHaveBeenCalledWith(null, mockUser);
    });

    it("should handle deserialization errors", async () => {
      const error = new Error("Database error");
      mockUserRepository.findOne.mockRejectedValue(error);

      configurePassport(mockDataSource);

      const deserializeCallback = (passport.deserializeUser as jest.Mock).mock
        .calls[0][0];
      const doneMock = jest.fn();

      await deserializeCallback("user-123", doneMock);

      expect(doneMock).toHaveBeenCalledWith(error, null);
    });
  });

  describe("Environment configuration", () => {
    it("should use environment variables for OAuth configuration", () => {
      const GoogleStrategy = require("passport-google-oauth20").Strategy;
      const AppleStrategy = require("passport-apple").Strategy;

      configurePassport(mockDataSource);

      // Check Google Strategy was called with correct config
      expect(GoogleStrategy).toHaveBeenCalledWith(
        expect.objectContaining({
          clientID: "test-google-client-id",
          clientSecret: "test-google-client-secret",
          callbackURL: "http://localhost:3000/api/auth/google/callback",
        }),
        expect.any(Function)
      );

      // Check Apple Strategy was called with correct config
      expect(AppleStrategy).toHaveBeenCalledWith(
        expect.objectContaining({
          clientID: "test-apple-client-id",
          teamID: "test-apple-team-id",
          keyID: "test-apple-key-id",
          privateKeyString: "test-apple-private-key",
          callbackURL: "http://localhost:3000/api/auth/apple/callback",
        }),
        expect.any(Function)
      );
    });

    it("should use default values when environment variables are not set", () => {
      delete process.env.GOOGLE_CALLBACK_URL;
      delete process.env.APPLE_CALLBACK_URL;

      const GoogleStrategy = require("passport-google-oauth20").Strategy;
      const AppleStrategy = require("passport-apple").Strategy;

      configurePassport(mockDataSource);

      expect(GoogleStrategy).toHaveBeenCalledWith(
        expect.objectContaining({
          callbackURL: "/api/auth/google/callback",
        }),
        expect.any(Function)
      );

      expect(AppleStrategy).toHaveBeenCalledWith(
        expect.objectContaining({
          callbackURL: "/api/auth/apple/callback",
        }),
        expect.any(Function)
      );
    });
  });

  describe("OAuth strategy behavior", () => {
    it("should create new user for Google OAuth", async () => {
      const GoogleStrategy = require("passport-google-oauth20").Strategy;
      mockUserRepository.findOne
        .mockResolvedValueOnce(null) // No existing user with googleId
        .mockResolvedValueOnce(null); // No existing user with email

      const mockNewUser = {
        id: "user-new-123",
        email: "newuser@gmail.com",
        googleId: "google-123",
      };
      mockUserRepository.save.mockResolvedValue(mockNewUser);

      configurePassport(mockDataSource);

      const strategyCallback = GoogleStrategy.mock.calls[0][1];
      const doneMock = jest.fn();
      const profile = {
        id: "google-123",
        emails: [{ value: "newuser@gmail.com" }],
        name: { givenName: "John", familyName: "Doe" },
        photos: [{ value: "http://photo.url" }],
      };

      await strategyCallback(
        "access-token",
        "refresh-token",
        profile,
        doneMock
      );

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { googleId: "google-123" },
      });
      expect(doneMock).toHaveBeenCalledWith(null, expect.any(Object));
    });

    it("should link Google account to existing email user", async () => {
      const GoogleStrategy = require("passport-google-oauth20").Strategy;
      const existingUser = {
        id: "user-existing-123",
        email: "existing@gmail.com",
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(null) // No user with googleId
        .mockResolvedValueOnce(existingUser); // Existing user with email

      mockUserRepository.save.mockResolvedValue({
        ...existingUser,
        googleId: "google-123",
      });

      configurePassport(mockDataSource);

      const strategyCallback = GoogleStrategy.mock.calls[0][1];
      const doneMock = jest.fn();
      const profile = {
        id: "google-123",
        emails: [{ value: "existing@gmail.com" }],
        name: { givenName: "John", familyName: "Doe" },
      };

      await strategyCallback(
        "access-token",
        "refresh-token",
        profile,
        doneMock
      );

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          googleId: "google-123",
        })
      );
      expect(doneMock).toHaveBeenCalledWith(null, expect.any(Object));
    });

    it("should handle Apple OAuth with email", async () => {
      const AppleStrategy = require("passport-apple").Strategy;
      mockUserRepository.findOne
        .mockResolvedValueOnce(null) // No existing user with appleId
        .mockResolvedValueOnce(null); // No existing user with email

      const mockNewUser = {
        id: "user-apple-123",
        email: "user@icloud.com",
        appleId: "apple-sub-123",
      };
      mockUserRepository.save.mockResolvedValue(mockNewUser);

      configurePassport(mockDataSource);

      const strategyCallback = AppleStrategy.mock.calls[0][1];
      const doneMock = jest.fn();
      const profile = {
        id: "apple-sub-123",
        email: "user@icloud.com",
        name: { firstName: "Jane", lastName: "Smith" },
      };
      const idToken = {
        email: "user@icloud.com",
        sub: "apple-sub-123",
      };

      await strategyCallback(
        "access-token",
        "refresh-token",
        idToken,
        profile,
        doneMock
      );

      expect(doneMock).toHaveBeenCalledWith(null, expect.any(Object));
    });

    it("should handle Apple OAuth error when no email provided", async () => {
      const AppleStrategy = require("passport-apple").Strategy;
      mockUserRepository.findOne.mockResolvedValue(null);

      configurePassport(mockDataSource);

      const strategyCallback = AppleStrategy.mock.calls[0][1];
      const doneMock = jest.fn();
      const profile = { id: "apple-sub-123" };
      const idToken = { sub: "apple-sub-123" };

      await strategyCallback(
        "access-token",
        "refresh-token",
        idToken,
        profile,
        doneMock
      );

      expect(doneMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Email not provided by Apple",
        }),
        false
      );
    });
  });
});
