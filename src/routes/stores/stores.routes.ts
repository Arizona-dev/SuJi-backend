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
 * /api/stores/slug/{slug}:
 *   get:
 *     summary: Get store by slug
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Store slug (URL-friendly name)
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
router.get("/slug/:slug", storesController.getStoreBySlug.bind(storesController));

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
    body("phone")
      .optional()
      .trim()
      .isLength({ max: 20 })
      .custom((value) => {
        if (!value) return true; // Allow empty values

        // Remove all spaces, dashes, dots, and parentheses
        const cleanedPhone = value.replace(/[\s\-\.\(\)]/g, '');

        // Check for valid French phone number patterns:
        // - +33XXXXXXXXX (international format, 12 chars)
        // - 0033XXXXXXXXX (international format with 00, 13 chars)
        // - 0XXXXXXXXX (national format, 10 chars)
        const internationalPattern = /^\+33[1-9]\d{8}$/;
        const internationalAltPattern = /^0033[1-9]\d{8}$/;
        const nationalPattern = /^0[1-9]\d{8}$/;

        if (!internationalPattern.test(cleanedPhone) &&
            !internationalAltPattern.test(cleanedPhone) &&
            !nationalPattern.test(cleanedPhone)) {
          throw new Error('Format invalide. Utilisez +33 6 12 34 56 78 ou 06 12 34 56 78');
        }

        return true;
      }),
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
    body("phone")
      .optional()
      .trim()
      .isLength({ max: 20 })
      .custom((value) => {
        if (!value) return true; // Allow empty values

        // Remove all spaces, dashes, dots, and parentheses
        const cleanedPhone = value.replace(/[\s\-\.\(\)]/g, '');

        // Check for valid French phone number patterns:
        // - +33XXXXXXXXX (international format, 12 chars)
        // - 0033XXXXXXXXX (international format with 00, 13 chars)
        // - 0XXXXXXXXX (national format, 10 chars)
        const internationalPattern = /^\+33[1-9]\d{8}$/;
        const internationalAltPattern = /^0033[1-9]\d{8}$/;
        const nationalPattern = /^0[1-9]\d{8}$/;

        if (!internationalPattern.test(cleanedPhone) &&
            !internationalAltPattern.test(cleanedPhone) &&
            !nationalPattern.test(cleanedPhone)) {
          throw new Error('Format invalide. Utilisez +33 6 12 34 56 78 ou 06 12 34 56 78');
        }

        return true;
      }),
    body("email").optional().isEmail().normalizeEmail(),
    body("openingHours").optional().isObject(),
    body("timezone").optional().isString(),
    body("legalAddress").optional().isObject(),
    body("legalAddress.street").optional().trim().isLength({ min: 1, max: 200 }),
    body("legalAddress.city").optional().trim().isLength({ min: 1, max: 100 }),
    body("legalAddress.postalCode")
      .optional()
      .trim()
      .matches(/^\d{5}$/)
      .withMessage("Code postal invalide (doit être 5 chiffres)"),
    body("legalAddress.country").optional().trim().isLength({ min: 1, max: 100 }),
  ],
  storesController.updateStore.bind(storesController)
);

/**
 * @swagger
 * /api/stores/{id}/closure:
 *   put:
 *     summary: Toggle temporary closure for a store
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
 *               closureMessage:
 *                 type: string
 *                 maxLength: 200
 *                 description: Optional message to display when store is temporarily closed (holidays, maintenance, etc.)
 *     responses:
 *       200:
 *         description: Temporary closure toggled successfully
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
 *                     isTemporarilyClosed:
 *                       type: boolean
 *                     closureMessage:
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
  "/:id/closure",
  [body("closureMessage").optional().trim().isLength({ max: 200 })],
  storesController.toggleTemporaryClosure.bind(storesController)
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
