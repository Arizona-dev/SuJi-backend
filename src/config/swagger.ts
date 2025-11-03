import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "KyuCollect API",
    version: "1.0.0",
    description: "API documentation for KyuCollect - Food Collection Platform",
    contact: {
      name: "KyuCollect Team",
      email: "support@kyucollect.com",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          email: {
            type: "string",
            format: "email",
          },
          firstName: {
            type: "string",
          },
          lastName: {
            type: "string",
          },
          role: {
            type: "string",
            enum: ["customer", "store_owner"],
          },
          type: {
            type: "string",
            enum: ["local", "google", "apple"],
          },
          isActive: {
            type: "boolean",
          },
          lastLoginAt: {
            type: "string",
            format: "date-time",
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
      Store: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          name: {
            type: "string",
          },
          address: {
            type: "string",
          },
          phone: {
            type: "string",
          },
          email: {
            type: "string",
            format: "email",
          },
          isActive: {
            type: "boolean",
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
      Error: {
        type: "object",
        properties: {
          message: {
            type: "string",
          },
          status: {
            type: "integer",
          },
          timestamp: {
            type: "string",
            format: "date-time",
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ["./src/routes/**/*.ts"], // Path to the API routes
};

const swaggerSpec = swaggerJSDoc(options);

export { swaggerUi, swaggerSpec };
