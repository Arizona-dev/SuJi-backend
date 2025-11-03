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
      Order: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          orderNumber: {
            type: "string",
          },
          status: {
            type: "string",
            enum: [
              "pending",
              "confirmed",
              "preparing",
              "ready",
              "completed",
              "cancelled",
            ],
          },
          totalAmount: {
            type: "number",
            format: "decimal",
          },
          discountAmount: {
            type: "number",
            format: "decimal",
          },
          scheduledTime: {
            type: "string",
            format: "date-time",
          },
          chefNotes: {
            type: "string",
          },
          storeId: {
            type: "string",
            format: "uuid",
          },
          customerId: {
            type: "string",
            format: "uuid",
          },
          items: {
            type: "array",
            items: {
              $ref: "#/components/schemas/OrderItem",
            },
          },
          payments: {
            type: "array",
            items: {
              $ref: "#/components/schemas/Payment",
            },
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
      OrderItem: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          name: {
            type: "string",
          },
          price: {
            type: "number",
            format: "decimal",
          },
          quantity: {
            type: "integer",
          },
          customizations: {
            type: "object",
          },
          orderId: {
            type: "string",
            format: "uuid",
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
      Payment: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          amount: {
            type: "number",
            format: "decimal",
          },
          method: {
            type: "string",
            enum: [
              "stripe",
              "swile",
              "edenred",
              "sodexo",
              "apetiz",
              "up_dejeuner",
              "cash",
            ],
          },
          status: {
            type: "string",
            enum: ["pending", "completed", "failed", "refunded"],
          },
          transactionId: {
            type: "string",
          },
          externalId: {
            type: "string",
          },
          orderId: {
            type: "string",
            format: "uuid",
          },
          metadata: {
            type: "object",
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
