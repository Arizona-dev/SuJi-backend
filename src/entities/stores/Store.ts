import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Menu } from "../menus/Menu";
import { Order } from "../orders/Order";

@Entity("stores")
export class Store {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ type: "json", nullable: true })
  openingHours?: Record<string, { open: string; close: string }>;

  @Column({ nullable: true })
  timezone?: string;

  @Column({ default: false })
  isHoliday!: boolean;

  @Column({ nullable: true })
  holidayMessage?: string;

  @Column({ default: true })
  isActive!: boolean;

  // International legal compliance - business registration details
  @Column({ nullable: true })
  legalBusinessName?: string;

  @Column({
    type: "enum",
    enum: ["sole_proprietorship", "partnership", "llc", "corporation", "other"],
    nullable: true,
  })
  legalBusinessType?: string;

  @Column({ type: "json", nullable: true })
  legalAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };

  // Country-specific legal fields
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

  // Document uploads (for post-registration completion)
  @Column({ type: "json", nullable: true })
  businessDocuments?: {
    registrationCertificate?: string; // File path/URL
    sirenCertificate?: string;
    taxCertificate?: string;
    identityDocument?: string; // Owner's ID
    proofOfAddress?: string;
    bankDetails?: string;
  };

  @Column({ type: "json", nullable: true })
  documentVerificationStatus?: {
    registrationCertificate: "pending" | "verified" | "rejected";
    sirenCertificate: "pending" | "verified" | "rejected";
    taxCertificate: "pending" | "verified" | "rejected";
    identityDocument: "pending" | "verified" | "rejected";
    proofOfAddress: "pending" | "verified" | "rejected";
    bankDetails: "pending" | "verified" | "rejected";
  };

  @Column({ nullable: true })
  verificationNotes?: string;

  @Column({ default: false })
  isLegallyVerified!: boolean; // True after all documents verified

  @Column({ nullable: true })
  verifiedAt?: Date;

  @Column({ nullable: true })
  verifiedBy?: string; // Admin user ID who verified

  @OneToMany(() => Menu, (menu) => menu.store)
  menus!: Menu[];

  @OneToMany(() => Order, (order) => order.store)
  orders!: Order[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
