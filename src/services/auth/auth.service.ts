import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { DataSource, Repository } from "typeorm";
import { AppDataSource } from "../../config/database";
import { User, UserRole, UserType } from "../../entities/auth/User";
import { Store } from "../../entities/stores/Store";
import { AuditService } from "../audit/audit.service";
import { logger } from "../../utils/logger";

export interface AuthResponse {
  token: string;
  user: Partial<User>;
  store?: Partial<Store>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CustomerRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface StoreOwnerRegisterRequest {
  email: string;
  password: string;
  storeName: string;
  // International business fields (required for all)
  businessName: string;
  businessType: 'sole_proprietorship' | 'partnership' | 'llc' | 'corporation' | 'other';
  businessAddress: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  ownerFirstName: string;
  ownerLastName: string;
  ownerPhone: string;
  ownerDateOfBirth: Date;
  // Legal consents (required for all jurisdictions)
  acceptedTerms: boolean;
  acceptedPrivacyPolicy: boolean;
  acceptedDataProcessing: boolean;
  marketingConsent?: boolean;
  // Country-specific fields (optional)
  countrySpecificFields?: {
    // French fields
    siren?: string;
    siret?: string;
    frenchBusinessType?: 'auto_entrepreneur' | 'eurl' | 'sarl' | 'sas' | 'sasu' | 'sa';
    // US fields
    ein?: string; // Employer Identification Number
    // UK fields
    companyNumber?: string;
    ukVatNumber?: string;
    // EU fields
    euVatNumber?: string;
    // Generic
    taxId?: string;
    businessRegistrationNumber?: string;
  };
  ipAddress: string;
  userAgent: string;
}

export class AuthService {
  private userRepository: Repository<User>;
  private storeRepository: Repository<Store>;
  private auditService: AuditService;

  constructor(dataSource: DataSource = AppDataSource) {
    this.userRepository = dataSource.getRepository(User);
    this.storeRepository = dataSource.getRepository(Store);
    this.auditService = new AuditService(dataSource);
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const { email, password } = credentials;

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.password) {
      throw new Error("Invalid credentials");
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }

    if (!user.isActive) {
      throw new Error("Account is deactivated");
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const token = this.generateToken(user);

    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      type: user.type,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    };

    return {
      token,
      user: userResponse,
    };
  }

  async registerCustomer(data: CustomerRegisterRequest): Promise<AuthResponse> {
    const { email, password, firstName, lastName } = data;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = this.userRepository.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role: UserRole.CUSTOMER,
      type: UserType.LOCAL,
    });

    const savedUser = await this.userRepository.save(user);
    const token = this.generateToken(savedUser);

    logger.info(`New customer registered: ${savedUser.email}`);

    return {
      token,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role,
        type: savedUser.type,
        isActive: savedUser.isActive,
      },
    };
  }

  async registerStoreOwner(
    data: StoreOwnerRegisterRequest
  ): Promise<AuthResponse> {
    const {
      email,
      password,
      storeName,
      businessName,
      businessType,
      businessAddress,
      ownerFirstName,
      ownerLastName,
      ownerPhone,
      ownerDateOfBirth,
      acceptedTerms,
      acceptedPrivacyPolicy,
      acceptedDataProcessing,
      marketingConsent,
      countrySpecificFields,
      ipAddress,
      userAgent,
    } = data;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Validate age (minimum 18 for most jurisdictions)
    const age = new Date().getFullYear() - new Date(ownerDateOfBirth).getFullYear();
    if (age < 18) {
      throw new Error("You must be at least 18 years old to register");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with international compliance fields
    const user = this.userRepository.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName: ownerFirstName,
      lastName: ownerLastName,
      role: UserRole.STORE_OWNER,
      type: UserType.LOCAL,
      // International business fields
      businessName,
      businessType,
      businessAddress,
      countrySpecificFields,
      ownerPhone,
      ownerDateOfBirth,
      // Consents (required for all jurisdictions)
      acceptedTerms,
      acceptedPrivacyPolicy,
      acceptedDataProcessing,
      marketingConsent,
      termsAcceptedAt: acceptedTerms ? new Date() : undefined,
      privacyPolicyAcceptedAt: acceptedPrivacyPolicy ? new Date() : undefined,
      dataProcessingAcceptedAt: acceptedDataProcessing ? new Date() : undefined,
      marketingConsentGivenAt: marketingConsent ? new Date() : undefined,
      // Audit fields
      registrationIpAddress: ipAddress,
      registrationUserAgent: userAgent,
      isFullyRegistered: false, // Will be true after dashboard completion
    });

    const savedUser = await this.userRepository.save(user);

    // Create store with initial business info
    const store = this.storeRepository.create({
      name: storeName,
      legalBusinessName: businessName,
      legalBusinessType: businessType,
      legalAddress: businessAddress,
      countrySpecificFields,
      // Document verification status - all pending initially
      documentVerificationStatus: {
        registrationCertificate: 'pending',
        sirenCertificate: 'pending',
        taxCertificate: 'pending',
        identityDocument: 'pending',
        proofOfAddress: 'pending',
        bankDetails: 'pending',
      },
    });

    const savedStore = await this.storeRepository.save(store);

    // Audit logging for compliance
    await this.auditService.logUserRegistration(savedUser.id, data, ipAddress, userAgent);
    await this.auditService.logStoreRegistration(savedStore.id, {
      name: storeName,
      businessName,
      businessType,
      businessAddress,
      countrySpecificFields,
    }, savedUser.id, ipAddress, userAgent);

    // Log individual consents for audit trail
    if (acceptedTerms) {
      await this.auditService.logConsentAcceptance(savedUser.id, 'terms', true, ipAddress, userAgent);
    }
    if (acceptedPrivacyPolicy) {
      await this.auditService.logConsentAcceptance(savedUser.id, 'privacy', true, ipAddress, userAgent);
    }
    if (acceptedDataProcessing) {
      await this.auditService.logConsentAcceptance(savedUser.id, 'data_processing', true, ipAddress, userAgent);
    }
    if (marketingConsent) {
      await this.auditService.logConsentAcceptance(savedUser.id, 'marketing', true, ipAddress, userAgent);
    }

    const token = this.generateToken(savedUser);

    logger.info(
      `New store owner registered (French compliance): ${savedUser.email} with store: ${savedStore.name}`
    );

    return {
      token,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role,
        type: savedUser.type,
        isActive: savedUser.isActive,
        isFullyRegistered: savedUser.isFullyRegistered,
      },
      store: {
        id: savedStore.id,
        name: savedStore.name,
        isActive: savedStore.isActive,
        isLegallyVerified: savedStore.isLegallyVerified,
      },
    };
  }

  private generateToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const secret = process.env.JWT_SECRET || "default-secret-key";

    return jwt.sign(payload, secret, { expiresIn: "7d" });
  }

  async validateToken(token: string): Promise<User | null> {
    try {
      const secret = process.env.JWT_SECRET || "default-secret-key";
      const payload = jwt.verify(token, secret) as any;

      const user = await this.userRepository.findOne({
        where: { id: payload.userId, isActive: true },
      });

      return user || null;
    } catch (error) {
      return null;
    }
  }
}
