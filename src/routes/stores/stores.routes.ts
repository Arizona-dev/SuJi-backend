import { Router } from "express";
import { body } from "express-validator";
import { StoresController } from "../../controllers/stores/stores.controller";
import { DataSource } from "typeorm";

export function createStoreRoutes(dataSource?: DataSource): Router {
  const router: Router = Router();
  const storesController = new StoresController(dataSource);

/**
 * @swagger
 * /api/stores:
 *   get:
 *     summary: Get all stores
 *     tags: [Stores]
 *     responses:
 *       200:
 *         description: Stores retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Store'
 *                 count:
 *                   type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", storesController.getStores.bind(storesController));

/**
 * @swagger
 * /api/stores/{id}:
 *   get:
 *     summary: Get store by ID
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Store retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Store'
 *       404:
 *         description: Store not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", storesController.getStoreById.bind(storesController));

/**
 * @swagger
 * /api/stores:
 *   post:
 *     summary: Create a new store
 *     tags: [Stores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - ownerId
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               address:
 *                 type: string
 *                 maxLength: 200
 *               phone:
 *                 type: string
 *                 maxLength: 20
 *               email:
 *                 type: string
 *                 format: email
 *               openingHours:
 *                 type: object
 *                 description: Opening hours for each day of the week
 *               timezone:
 *                 type: string
 *                 default: "Europe/Paris"
 *               ownerId:
 *                 type: string
 *                 description: ID of the store owner
 *     responses:
 *       201:
 *         description: Store created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     store:
 *                       $ref: '#/components/schemas/Store'
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/",
  [
    body("name").trim().isLength({ min: 1, max: 100 }),
    body("description").optional().trim().isLength({ max: 500 }),
    body("address").optional().trim().isLength({ max: 200 }),
    body("phone").optional().trim().isLength({ max: 20 }),
    body("email").optional().isEmail().normalizeEmail(),
    body("openingHours").optional().isObject(),
    body("timezone").optional().isString(),
    body("ownerId").isUUID(),
  ],
  storesController.createStore.bind(storesController)
);

/**
 * @swagger
 * /api/stores/{id}:
 *   put:
 *     summary: Update store information
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               address:
 *                 type: string
 *                 maxLength: 200
 *               phone:
 *                 type: string
 *                 maxLength: 20
 *               email:
 *                 type: string
 *                 format: email
 *               openingHours:
 *                 type: object
 *                 description: Opening hours for each day of the week
 *               timezone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Store updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Store'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Store not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  "/:id",
  [
    body("name").optional().trim().isLength({ min: 1, max: 100 }),
    body("description").optional().trim().isLength({ max: 500 }),
    body("address").optional().trim().isLength({ max: 200 }),
    body("phone").optional().trim().isLength({ max: 20 }),
    body("email").optional().isEmail().normalizeEmail(),
    body("openingHours").optional().isObject(),
    body("timezone").optional().isString(),
  ],
  storesController.updateStore.bind(storesController)
);

/**
 * @swagger
 * /api/stores/{id}/holiday:
 *   put:
 *     summary: Toggle holiday mode for a store
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               holidayMessage:
 *                 type: string
 *                 maxLength: 200
 *                 description: Optional message to display when store is on holiday
 *     responses:
 *       200:
 *         description: Holiday mode toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     isHoliday:
 *                       type: boolean
 *                     holidayMessage:
 *                       type: string
 *                       nullable: true
 *       404:
 *         description: Store not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  "/:id/holiday",
  [body("holidayMessage").optional().trim().isLength({ max: 200 })],
  storesController.toggleHolidayMode.bind(storesController)
);

/**
 * @swagger
 * /api/stores/{id}:
 *   delete:
 *     summary: Delete (deactivate) a store
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Store deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Store not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
  router.delete("/:id", storesController.deleteStore.bind(storesController));

  return router;
}

// For backward compatibility
const defaultRouter = createStoreRoutes();
export default defaultRouter;
