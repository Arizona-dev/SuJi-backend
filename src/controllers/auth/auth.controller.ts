import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { DataSource } from "typeorm";
import passport from "passport";
import {
  AuthService,
  LoginRequest,
  CustomerRegisterRequest,
  StoreOwnerRegisterRequest,
} from "../../services/auth/auth.service";
import { logger } from "../../utils/logger";
import { AppDataSource } from "../../config/database";

export class AuthController {
  private authService: AuthService;

  constructor(dataSource: DataSource = AppDataSource) {
    this.authService = new AuthService(dataSource);
  }

  async customerLogin(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { email, password }: LoginRequest = req.body;

      const result = await this.authService.login({ email, password });

      res.json({
        message: "Login successful",
        ...result,
      });
    } catch (error) {
      logger.error("Customer login error:", error);
      res.status(401).json({
        message: error instanceof Error ? error.message : "Login failed",
      });
    }
  }

  async customerRegister(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { email, password, firstName, lastName }: CustomerRegisterRequest =
        req.body;

      const result = await this.authService.registerCustomer({
        email,
        password,
        firstName,
        lastName,
      });

      res.status(201).json({
        message: "Registration successful",
        ...result,
      });
    } catch (error) {
      logger.error("Customer registration error:", error);
      const statusCode =
        error instanceof Error && error.message === "Email already registered"
          ? 409
          : 500;
      res.status(statusCode).json({
        message: error instanceof Error ? error.message : "Registration failed",
      });
    }
  }

  async storeOwnerLogin(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { email, password }: LoginRequest = req.body;

      const result = await this.authService.login({ email, password });

      res.json({
        message: "Login successful",
        ...result,
      });
    } catch (error) {
      logger.error("Store owner login error:", error);
      res.status(401).json({
        message: error instanceof Error ? error.message : "Login failed",
      });
    }
  }

  async storeOwnerRegister(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      // Additional validation logic
      const {
        businessAddress,
        ownerDateOfBirth,
        acceptedTerms,
        acceptedPrivacyPolicy,
        acceptedDataProcessing,
        countrySpecificFields,
      } = req.body;

      // Validate business address fields
      if (
        !businessAddress.street ||
        businessAddress.street.trim().length === 0
      ) {
        res.status(400).json({
          message: "Validation failed",
          errors: [
            {
              msg: "Street address is required",
              param: "businessAddress.street",
            },
          ],
        });
        return;
      }

      if (!businessAddress.city || businessAddress.city.trim().length === 0) {
        res.status(400).json({
          message: "Validation failed",
          errors: [{ msg: "City is required", param: "businessAddress.city" }],
        });
        return;
      }

      if (
        !businessAddress.postalCode ||
        businessAddress.postalCode.trim().length === 0
      ) {
        res.status(400).json({
          message: "Validation failed",
          errors: [
            {
              msg: "Postal code is required",
              param: "businessAddress.postalCode",
            },
          ],
        });
        return;
      }

      if (
        !businessAddress.country ||
        businessAddress.country.length !== 2 ||
        !/^[A-Z]{2}$/.test(businessAddress.country)
      ) {
        res.status(400).json({
          message: "Validation failed",
          errors: [
            {
              msg: "Country must be a valid 2-letter ISO code",
              param: "businessAddress.country",
            },
          ],
        });
        return;
      }

      // Validate age (18+)
      const birthYear = new Date(ownerDateOfBirth).getFullYear();
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;

      if (age < 18) {
        res.status(400).json({
          message: "Validation failed",
          errors: [{ msg: "Must be 18 or older", param: "ownerDateOfBirth" }],
        });
        return;
      }

      // Validate legal consents
      if (acceptedTerms !== true) {
        res.status(400).json({
          message: "Validation failed",
          errors: [{ msg: "Terms must be accepted", param: "acceptedTerms" }],
        });
        return;
      }

      if (acceptedPrivacyPolicy !== true) {
        res.status(400).json({
          message: "Validation failed",
          errors: [
            {
              msg: "Privacy policy must be accepted",
              param: "acceptedPrivacyPolicy",
            },
          ],
        });
        return;
      }

      if (acceptedDataProcessing !== true) {
        res.status(400).json({
          message: "Validation failed",
          errors: [
            {
              msg: "Data processing consent must be accepted",
              param: "acceptedDataProcessing",
            },
          ],
        });
        return;
      }

      // Validate country-specific fields if provided
      if (countrySpecificFields) {
        if (
          countrySpecificFields.siren &&
          !/^\d{9}$/.test(countrySpecificFields.siren)
        ) {
          res.status(400).json({
            message: "Validation failed",
            errors: [
              {
                msg: "SIREN must be 9 digits",
                param: "countrySpecificFields.siren",
              },
            ],
          });
          return;
        }

        if (
          countrySpecificFields.siret &&
          !/^\d{14}$/.test(countrySpecificFields.siret)
        ) {
          res.status(400).json({
            message: "Validation failed",
            errors: [
              {
                msg: "SIRET must be 14 digits",
                param: "countrySpecificFields.siret",
              },
            ],
          });
          return;
        }

        if (
          countrySpecificFields.frenchBusinessType &&
          !["auto_entrepreneur", "eurl", "sarl", "sas", "sasu", "sa"].includes(
            countrySpecificFields.frenchBusinessType
          )
        ) {
          res.status(400).json({
            message: "Validation failed",
            errors: [
              {
                msg: "Invalid French business type",
                param: "countrySpecificFields.frenchBusinessType",
              },
            ],
          });
          return;
        }

        if (
          countrySpecificFields.ein &&
          !/^\d{2}-\d{7}$/.test(countrySpecificFields.ein)
        ) {
          res.status(400).json({
            message: "Validation failed",
            errors: [
              {
                msg: "EIN must be in format XX-XXXXXXX",
                param: "countrySpecificFields.ein",
              },
            ],
          });
          return;
        }
      }

      const registrationData: StoreOwnerRegisterRequest = {
        ...req.body,
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
      };

      const result = await this.authService.registerStoreOwner(
        registrationData
      );

      res.status(201).json({
        message: "Registration successful",
        ...result,
      });
    } catch (error) {
      logger.error("Store owner registration error:", error);
      const statusCode =
        error instanceof Error && error.message === "Email already registered"
          ? 409
          : 500;
      res.status(statusCode).json({
        message: error instanceof Error ? error.message : "Registration failed",
      });
    }
  }

  googleOAuth(req: Request, res: Response, next: NextFunction): void {
    // Check if Google strategy is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      res.status(501).json({ message: "Google OAuth not implemented yet" });
      return;
    }
    
    passport.authenticate("google", {
      scope: ["profile", "email"],
    })(req, res, next);
  }

  async googleOAuthCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    passport.authenticate("google", { session: false }, async (err: any, user: any) => {
      try {
        if (err || !user) {
          logger.error("Google OAuth callback error:", err);
          return res.redirect(
            `${process.env.FRONTEND_URL}/auth/error?message=OAuth failed`
          );
        }

        // Generate JWT token
        const token = await this.authService.generateToken(user);
        
        // Redirect to frontend with token
        res.redirect(
          `${process.env.FRONTEND_URL}/auth/success?token=${token}&type=${user.role}`
        );
      } catch (error) {
        logger.error("Google OAuth callback error:", error);
        res.redirect(
          `${process.env.FRONTEND_URL}/auth/error?message=OAuth failed`
        );
      }
    })(req, res, next);
  }

  appleOAuth(req: Request, res: Response, next: NextFunction): void {
    // Check if Apple strategy is configured
    if (!process.env.APPLE_CLIENT_ID || !process.env.APPLE_PRIVATE_KEY) {
      res.status(501).json({ message: "Apple OAuth not implemented yet" });
      return;
    }
    
    passport.authenticate("apple", {
      scope: ["name", "email"],
    })(req, res, next);
  }

  async appleOAuthCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    passport.authenticate("apple", { session: false }, async (err: any, user: any) => {
      try {
        if (err || !user) {
          logger.error("Apple OAuth callback error:", err);
          return res.redirect(
            `${process.env.FRONTEND_URL}/auth/error?message=OAuth failed`
          );
        }

        // Generate JWT token
        const token = await this.authService.generateToken(user);
        
        // Redirect to frontend with token
        res.redirect(
          `${process.env.FRONTEND_URL}/auth/success?token=${token}&type=${user.role}`
        );
      } catch (error) {
        logger.error("Apple OAuth callback error:", error);
        res.redirect(
          `${process.env.FRONTEND_URL}/auth/error?message=OAuth failed`
        );
      }
    })(req, res, next);
  }
}
