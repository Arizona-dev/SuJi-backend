import "dotenv/config";
import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import passport from "passport";
import "reflect-metadata";

import { AppDataSource } from "./config/database";
import { logger } from "./utils/logger";
import { errorHandler } from "./middlewares/errorHandler";
import { swaggerUi, swaggerSpec } from "./config/swagger";
import { initializePassport } from "./config/passport";
import { IngredientReactivationService } from "./services/cron/ingredient-reactivation.service";

// Import routes
import authRoutes from "./routes/auth/auth.routes";
import storeRoutes from "./routes/stores/stores.routes";
import menuRoutes from "./routes/menus/menus.routes";
import orderRoutes from "./routes/orders/orders.routes";
import paymentRoutes from "./routes/payments/payments.routes";
import inseeRoutes from "./routes/insee/insee.routes";
import assetRoutes from "./routes/assets/assets.routes";
import uploadRoutes from "./routes/upload/upload.routes";

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per 15 minutes (increased for multi-file uploads)
  message: "Too many requests from this IP, please try again later.",
});

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    credentials: true,
  })
);
app.use(compression());
app.use(limiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Initialize Passport
app.use(passport.initialize());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Swagger documentation (development only)
if (process.env.NODE_ENV !== "production") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  logger.info("Swagger documentation available at /api-docs");
}

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/insee", inseeRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/upload", uploadRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global ingredient reactivation service instance
let ingredientReactivationService: IngredientReactivationService;

// Start server function (only called when not in test environment)
export async function startServer() {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    logger.info("Database connection established successfully");

    // Initialize Passport configuration
    initializePassport();
    logger.info("Passport OAuth strategies initialized");

    // Initialize ingredient reactivation cron jobs
    ingredientReactivationService = new IngredientReactivationService();
    await ingredientReactivationService.initialize();
    logger.info("Ingredient reactivation cron jobs initialized");

    const server = app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      logger.info("SIGTERM signal received: closing HTTP server");
      server.close(async () => {
        logger.info("HTTP server closed");
        if (ingredientReactivationService) {
          await ingredientReactivationService.shutdown();
        }
        await AppDataSource.destroy();
        process.exit(0);
      });
    });

    process.on("SIGINT", async () => {
      logger.info("SIGINT signal received: closing HTTP server");
      server.close(async () => {
        logger.info("HTTP server closed");
        if (ingredientReactivationService) {
          await ingredientReactivationService.shutdown();
        }
        await AppDataSource.destroy();
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error("Error starting server:", error);
    process.exit(1);
  }
}

// Export the app for testing
export default app;

// Only start server automatically if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
