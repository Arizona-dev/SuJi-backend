import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as AppleStrategy, Profile as AppleProfile, VerifyCallback } from "passport-apple";
import { DataSource } from "typeorm";
import { User, UserRole, UserType } from "../entities/auth/User";
import { logger } from "../utils/logger";
import { AppDataSource } from "./database";

export function configurePassport(dataSource: DataSource = AppDataSource): void {
  const userRepository = dataSource.getRepository(User);

  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists
          let user = await userRepository.findOne({
            where: { googleId: profile.id },
          });

          if (!user) {
            // Check if email already exists
            user = await userRepository.findOne({
              where: { email: profile.emails?.[0].value },
            });

            if (user) {
              // Link Google account to existing user
              user.googleId = profile.id;
              user.profilePicture = profile.photos?.[0].value;
              await userRepository.save(user);
            } else {
              // Create new user
              user = userRepository.create({
                googleId: profile.id,
                email: profile.emails?.[0].value,
                firstName: profile.name?.givenName || "",
                lastName: profile.name?.familyName || "",
                profilePicture: profile.photos?.[0].value,
                emailVerified: true,
                role: UserRole.CUSTOMER, // Default to customer, can be changed later
                type: UserType.GOOGLE,
                isActive: true,
              });
              await userRepository.save(user);
            }
          }

          return done(null, user);
        } catch (error) {
          logger.error("Google OAuth error:", error);
          return done(error as Error, false);
        }
      }
    )
  );

  // Apple OAuth Strategy
  passport.use(
    new AppleStrategy(
      {
        clientID: process.env.APPLE_CLIENT_ID || "",
        teamID: process.env.APPLE_TEAM_ID || "",
        keyID: process.env.APPLE_KEY_ID || "",
        privateKeyString: process.env.APPLE_PRIVATE_KEY || "",
        callbackURL: process.env.APPLE_CALLBACK_URL || "/api/auth/apple/callback",
        passReqToCallback: false,
      },
      async (accessToken: string, _refreshToken: string, idToken: any, profile: any, done: any) => {
        try {
          // Extract user info from idToken
          const email = idToken?.email || profile?.email;
          const appleId = profile?.id || idToken?.sub;

          if (!appleId) {
            return done(new Error("Apple ID not provided"), false);
          }

          // Check if user exists
          let user = await userRepository.findOne({
            where: { appleId },
          });

          if (!user && email) {
            // Check if email already exists
            user = await userRepository.findOne({
              where: { email },
            });

            if (user) {
              // Link Apple account to existing user
              user.appleId = appleId;
              await userRepository.save(user);
            } else {
              // Create new user - Apple only provides name on first signup
              user = userRepository.create({
                appleId,
                email,
                firstName: profile?.name?.firstName || "",
                lastName: profile?.name?.lastName || "",
                emailVerified: true,
                role: UserRole.CUSTOMER,
                type: UserType.APPLE,
                isActive: true,
              });
              await userRepository.save(user);
            }
          } else if (!user) {
            // No user and no email
            return done(new Error("Email not provided by Apple"), false);
          }

          return done(null, user);
        } catch (error) {
          logger.error("Apple OAuth error:", error);
          return done(error as Error, false);
        }
      }
    )
  );

  // Serialize/Deserialize user (for session management if needed)
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await userRepository.findOne({ where: { id } });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}

// Initialize passport configuration
export function initializePassport(): void {
  configurePassport();
}