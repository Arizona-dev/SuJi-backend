import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum UserRole {
  CUSTOMER = "customer",
  STORE_OWNER = "store_owner",
}

export enum UserType {
  LOCAL = "local",
  GOOGLE = "google",
  APPLE = "apple",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role!: UserRole;

  @Column({
    type: "enum",
    enum: UserType,
    default: UserType.LOCAL,
  })
  type!: UserType;

  @Column({ nullable: true })
  googleId?: string;

  @Column({ nullable: true })
  appleId?: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  // International business fields
  @Column({ nullable: true })
  businessName?: string;

  @Column({
    type: "enum",
    enum: ["sole_proprietorship", "partnership", "llc", "corporation", "other"],
    nullable: true,
  })
  businessType?: string;

  @Column({ type: "json", nullable: true })
  businessAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };

  // Country-specific legal fields (JSON to handle different countries)
  @Column({ type: "json", nullable: true })
  countrySpecificFields?: {
    // French fields
    siren?: string;
    siret?: string;
    frenchBusinessType?:
      | "auto_entrepreneur"
      | "eurl"
      | "sarl"
      | "sas"
      | "sasu"
      | "sa";
    // US fields
    ein?: string;
    // UK fields
    companyNumber?: string;
    ukVatNumber?: string;
    // EU fields
    euVatNumber?: string;
    // Generic international
    taxId?: string;
    businessRegistrationNumber?: string;
    localBusinessType?: string;
  };

  @Column({ nullable: true })
  ownerPhone?: string;

  @Column({ nullable: true })
  ownerDateOfBirth?: Date;

  // Legal consents (CNIL compliance)
  @Column({ default: false })
  acceptedTerms!: boolean;

  @Column({ default: false })
  acceptedPrivacyPolicy!: boolean;

  @Column({ default: false })
  acceptedDataProcessing!: boolean;

  @Column({ nullable: true })
  marketingConsent?: boolean;

  @Column({ nullable: true })
  termsAcceptedAt?: Date;

  @Column({ nullable: true })
  privacyPolicyAcceptedAt?: Date;

  @Column({ nullable: true })
  dataProcessingAcceptedAt?: Date;

  @Column({ nullable: true })
  marketingConsentGivenAt?: Date;

  // Audit fields
  @Column({ nullable: true })
  registrationIpAddress?: string;

  @Column({ nullable: true })
  registrationUserAgent?: string;

  @Column({ default: false })
  isFullyRegistered!: boolean; // True after completing dashboard setup

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
