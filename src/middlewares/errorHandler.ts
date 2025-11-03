import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(err);

  // PostgreSQL unique constraint violation (similar to duplicate key)
  if ((err as any).code === "23505") {
    const message = "Duplicate field value entered";
    error = { ...error, message, statusCode: 400 };
  }

  // PostgreSQL foreign key constraint violation
  if ((err as any).code === "23503") {
    const message = "Referenced resource not found";
    error = { ...error, message, statusCode: 404 };
  }

  // PostgreSQL not null constraint violation
  if ((err as any).code === "23502") {
    const message = "Required field is missing";
    error = { ...error, message, statusCode: 400 };
  }

  // PostgreSQL check constraint violation
  if ((err as any).code === "23514") {
    const message = "Invalid data provided";
    error = { ...error, message, statusCode: 400 };
  }

  // TypeORM QueryFailedError (general database error)
  if (err.name === "QueryFailedError") {
    const message = "Database operation failed";
    error = { ...error, message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = { ...error, message, statusCode: 401 };
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = { ...error, message, statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
