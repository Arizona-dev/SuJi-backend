import request from "supertest";
import { TestDataSource } from "../../config/test-database";
import { OrderStatus } from "../../entities/orders/Order";
import { startTestServer, stopTestServer } from "../test-server";

let app: any;
let testServer: any;

describe("Core API E2E Tests", () => {
  let customerToken: string = "";
  let storeOwnerToken: string = "";
  let storeId: string = "";
  let menuId: string = "";
  let menuItemId: string = "";
  let ingredientId: string = "";
  let orderId: string = "";

  beforeAll(async () => {
    // Ensure test database is initialized
    if (!TestDataSource.isInitialized) {
      await TestDataSource.initialize();
    }

    // Start test server
    const serverSetup = await startTestServer();
    app = serverSetup.app;
    testServer = serverSetup.server;
  }, 30000);

  afterAll(async () => {
    // Stop test server
    await stopTestServer();

    if (TestDataSource.isInitialized) {
      await TestDataSource.destroy();
    }
  }, 30000);

  describe("Authentication", () => {
    it("should register and login users", async () => {
      // Register customer
      const customerResponse = await request(app)
        .post("/api/auth/customer/register")
        .send({
          email: "customer@test.com",
          password: "password123",
          firstName: "John",
          lastName: "Doe",
        })
        .expect(201);

      expect(customerResponse.body.message).toBe("Registration successful");
      expect(customerResponse.body.user.email).toBe("customer@test.com");
      expect(customerResponse.body.token).toBeDefined();
      customerToken = customerResponse.body.token;

      // Register store owner
      const storeResponse = await request(app)
        .post("/api/auth/store/register")
        .send({
          email: "store@test.com",
          password: "password123",
          storeName: "Test Store",
          businessName: "Test Business LLC",
          businessType: "llc",
          businessAddress: {
            street: "123 Main St",
            city: "Paris",
            postalCode: "75001",
            country: "FR",
          },
          ownerFirstName: "Jane",
          ownerLastName: "Smith",
          ownerPhone: "+33123456789",
          ownerDateOfBirth: "1980-01-01",
          acceptedTerms: true,
          acceptedPrivacyPolicy: true,
          acceptedDataProcessing: true,
        })
        .expect(201);

      expect(storeResponse.body.message).toBe("Registration successful");
      expect(storeResponse.body.user.email).toBe("store@test.com");
      expect(storeResponse.body.store.name).toBe("Test Store");
      expect(storeResponse.body.token).toBeDefined();
      storeOwnerToken = storeResponse.body.token;
      storeId = storeResponse.body.store.id;

      // Login customer
      const customerLoginResponse = await request(app)
        .post("/api/auth/customer/login")
        .send({
          email: "customer@test.com",
          password: "password123",
        })
        .expect(200);

      expect(customerLoginResponse.body.message).toBe("Login successful");
      expect(customerLoginResponse.body.token).toBeDefined();
      customerToken = customerLoginResponse.body.token;

      // Login store owner
      const storeOwnerLoginResponse = await request(app)
        .post("/api/auth/store/login")
        .send({
          email: "store@test.com",
          password: "password123",
        })
        .expect(200);

      expect(storeOwnerLoginResponse.body.message).toBe("Login successful");
      expect(storeOwnerLoginResponse.body.token).toBeDefined();
      storeOwnerToken = storeOwnerLoginResponse.body.token;
    });
  });

  describe("Stores API", () => {
    it("should get all stores (may be empty)", async () => {
      const response = await request(app).get("/api/stores").expect(200);

      expect(response.body.message).toBe("Stores retrieved successfully");
      expect(Array.isArray(response.body.data)).toBe(true);
      // Note: count may be 0 if no stores exist
      expect(typeof response.body.count).toBe("number");
    });

    it("should return 404 for non-existent store", async () => {
      const response = await request(app)
        .get(`/api/stores/123e4567-e89b-12d3-a456-426614174000`) // Valid UUID format but doesn't exist
        .expect(404);

      expect(response.body.message).toBe("Store not found");
    });

    it("should return 404 when updating non-existent store", async () => {
      const response = await request(app)
        .put(`/api/stores/123e4567-e89b-12d3-a456-426614174000`)
        .set("Authorization", `Bearer invalid-token`)
        .send({
          description: "Updated store description",
          phone: "+33123456789",
        })
        .expect(404);

      expect(response.body.message).toBe("Store not found");
    });

    it("should return 404 when toggling holiday mode for non-existent store", async () => {
      const response = await request(app)
        .put(`/api/stores/123e4567-e89b-12d3-a456-426614174000/holiday`)
        .set("Authorization", `Bearer invalid-token`)
        .send({
          isHoliday: true,
          holidayMessage: "Closed for holidays",
        })
        .expect(404);

      expect(response.body.message).toBe("Store not found");
    });
  });

  describe("Menus API", () => {
    it("should return 404 when creating menu for non-existent store", async () => {
      const response = await request(app)
        .post("/api/menus")
        .set("Authorization", `Bearer invalid-token`)
        .send({
          name: "Main Menu",
          description: "Our main menu",
          storeId: "123e4567-e89b-12d3-a456-426614174000",
        })
        .expect(404);

      expect(response.body.message).toBe("Store not found");
    });

    it("should create an ingredient", async () => {
      const response = await request(app)
        .post("/api/menus/ingredients")
        .set("Authorization", `Bearer ${storeOwnerToken}`)
        .send({
          name: "Tomato",
          description: "Fresh tomatoes",
          storeId: storeId,
        })
        .expect(201);

      expect(response.body.data.name).toBe("Tomato");
      ingredientId = response.body.data.id;
    });

    it("should return 400 when creating menu item with invalid menuId", async () => {
      const response = await request(app)
        .post("/api/menus/items")
        .set("Authorization", `Bearer ${storeOwnerToken}`)
        .send({
          name: "Margherita Pizza",
          description: "Classic margherita pizza",
          price: 12.99,
          menuId: "invalid-menu-id",
          ingredientIds: ["invalid-ingredient-id"],
        })
        .expect(400);

      expect(response.body.message).toBe("Validation failed");
    });

    it("should get menu for store (may be empty)", async () => {
      const response = await request(app)
        .get(`/api/menus/store/123e4567-e89b-12d3-a456-426614174000`)
        .expect(200);

      expect(response.body.message).toBe("Menu retrieved successfully");
      expect(Array.isArray(response.body.data)).toBe(true);
      // Menu may be empty if no menu was created
    });

    it("should get ingredients for store (may be empty)", async () => {
      const response = await request(app)
        .get(`/api/menus/ingredients/123e4567-e89b-12d3-a456-426614174000`)
        .set("Authorization", `Bearer invalid-token`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(typeof response.body.count).toBe("number");
      // Ingredients may be empty if none were created
    });

    it("should return 404 when disabling non-existent ingredient", async () => {
      const response = await request(app)
        .put(
          `/api/menus/ingredients/123e4567-e89b-12d3-a456-426614174000/disable`
        )
        .set("Authorization", `Bearer invalid-token`)
        .send({
          until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        })
        .expect(404);

      expect(response.body.message).toBe("Ingredient not found");
    });

    it("should return 404 when enabling non-existent ingredient", async () => {
      const response = await request(app)
        .put(
          `/api/menus/ingredients/123e4567-e89b-12d3-a456-426614174000/enable`
        )
        .set("Authorization", `Bearer invalid-token`)
        .expect(404);

      expect(response.body.message).toBe("Ingredient not found");
    });
  });

  describe("Orders API", () => {
    it("should return 400 when creating order with invalid data", async () => {
      const response = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer invalid-token`)
        .send({
          storeId: "invalid-store-id",
          customerId: "customer-id-from-token", // This would come from JWT
          scheduledTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
          items: [
            {
              menuItemId: "invalid-menu-item-id",
              quantity: 2,
              customizations: { extraCheese: true },
            },
          ],
          chefNotes: "Please make it extra crispy",
        })
        .expect(400);

      expect(response.body.message).toBe("Validation failed");
    });

    it("should get orders for store (may be empty)", async () => {
      const response = await request(app)
        .get(`/api/orders/store/123e4567-e89b-12d3-a456-426614174000`)
        .set("Authorization", `Bearer invalid-token`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(typeof response.body.count).toBe("number");
      // Orders may be empty if none were created
    });

    it("should return 404 for non-existent order", async () => {
      const response = await request(app)
        .get(`/api/orders/123e4567-e89b-12d3-a456-426614174000`)
        .expect(404);

      expect(response.body.message).toBe("Order not found");
    });

    it("should return 404 when updating non-existent order status", async () => {
      const response = await request(app)
        .put(`/api/orders/123e4567-e89b-12d3-a456-426614174000/status`)
        .set("Authorization", `Bearer invalid-token`)
        .send({
          status: OrderStatus.CONFIRMED,
        })
        .expect(404);

      expect(response.body.message).toBe("Order not found");
    });

    it("should get order history (may be empty)", async () => {
      const response = await request(app)
        .get(`/api/orders/history/store/123e4567-e89b-12d3-a456-426614174000`)
        .set("Authorization", `Bearer invalid-token`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.summary).toBeDefined();
      expect(typeof response.body.summary.totalRevenue).toBe("number");
      expect(typeof response.body.summary.orderCount).toBe("number");
    });

    it("should export order history as CSV (may be empty)", async () => {
      const response = await request(app)
        .get(`/api/orders/history/export/123e4567-e89b-12d3-a456-426614174000`)
        .set("Authorization", `Bearer invalid-token`)
        .expect(200);

      expect(response.headers["content-type"]).toContain("text/csv");
      // CSV may contain headers even if no data
      expect(typeof response.text).toBe("string");
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for non-existent store", async () => {
      await request(app)
        .get("/api/stores/123e4567-e89b-12d3-a456-426614174000")
        .expect(404);
    });

    it("should return 404 for non-existent store (even with invalid auth)", async () => {
      await request(app)
        .put(`/api/stores/123e4567-e89b-12d3-a456-426614174000`)
        .set("Authorization", `Bearer invalid-token`)
        .send({ name: "Unauthorized Update" })
        .expect(404);
    });

    it("should return 400 for invalid data", async () => {
      await request(app)
        .post("/api/auth/customer/register")
        .send({
          email: "invalid-email",
          password: "123", // Too short
        })
        .expect(400);
    });
  });
});
