import { Router } from "express";
import { body } from "express-validator";
import { MenusController } from "../../controllers/menus/menus.controller";
import { DataSource } from "typeorm";

export function createMenuRoutes(dataSource?: DataSource): Router {
  const router: Router = Router();
  const menusController = new MenusController(dataSource);

/**
 * @swagger
 * /api/menus/store/{storeId}:
 *   get:
 *     summary: Get menu for a store
 *     tags: [Menus]
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Menu retrieved successfully
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
 *                     $ref: '#/components/schemas/Menu'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/store/:storeId",
  menusController.getMenuForStore.bind(menusController)
);

/**
 * @swagger
 * /api/menus:
 *   post:
 *     summary: Create a new menu
 *     tags: [Menus]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - storeId
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               storeId:
 *                 type: string
 *                 description: ID of the store
 *     responses:
 *       201:
 *         description: Menu created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Menu'
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
router.post(
  "/",
  [
    body("name").trim().isLength({ min: 1, max: 100 }),
    body("description").optional().trim().isLength({ max: 500 }),
    body("storeId").isUUID(),
  ],
  menusController.createMenu.bind(menusController)
);

/**
 * @swagger
 * /api/menus/{id}:
 *   put:
 *     summary: Update menu information
 *     tags: [Menus]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu ID
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
 *     responses:
 *       200:
 *         description: Menu updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Menu'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Menu not found
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
  ],
  menusController.updateMenu.bind(menusController)
);

/**
 * @swagger
 * /api/menus/{id}:
 *   delete:
 *     summary: Delete (deactivate) a menu
 *     tags: [Menus]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu ID
 *     responses:
 *       200:
 *         description: Menu deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Menu not found
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
router.delete("/:id", menusController.deleteMenu.bind(menusController));

// Menu Items routes

/**
 * @swagger
 * /api/menus/items:
 *   post:
 *     summary: Create a new menu item
 *     tags: [Menu Items]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - menuId
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 999999.99
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               menuId:
 *                 type: string
 *                 description: ID of the menu this item belongs to
 *               ingredientIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of ingredient IDs for this menu item
 *     responses:
 *       201:
 *         description: Menu item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/MenuItem'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Menu or ingredients not found
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
  "/items",
  [
    body("name").trim().isLength({ min: 1, max: 100 }),
    body("description").optional().trim().isLength({ max: 500 }),
    body("price").isFloat({ min: 0, max: 999999.99 }),
    body("imageUrl").optional().isURL(),
    body("menuId").isUUID(),
    body("ingredientIds").optional().isArray(),
    body("ingredientIds.*").optional().isUUID(),
  ],
  menusController.createMenuItem.bind(menusController)
);

/**
 * @swagger
 * /api/menus/items/{id}:
 *   put:
 *     summary: Update menu item information
 *     tags: [Menu Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu item ID
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
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 999999.99
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               ingredientIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of ingredient IDs for this menu item
 *     responses:
 *       200:
 *         description: Menu item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/MenuItem'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Menu item or ingredients not found
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
  "/items/:id",
  [
    body("name").optional().trim().isLength({ min: 1, max: 100 }),
    body("description").optional().trim().isLength({ max: 500 }),
    body("price").optional().isFloat({ min: 0, max: 999999.99 }),
    body("imageUrl").optional().isURL(),
    body("ingredientIds").optional().isArray(),
    body("ingredientIds.*").optional().isUUID(),
  ],
  menusController.updateMenuItem.bind(menusController)
);

/**
 * @swagger
 * /api/menus/items/{id}:
 *   delete:
 *     summary: Delete (deactivate) a menu item
 *     tags: [Menu Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu item ID
 *     responses:
 *       200:
 *         description: Menu item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Menu item not found
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
router.delete(
  "/items/:id",
  menusController.deleteMenuItem.bind(menusController)
);

// Ingredients routes

/**
 * @swagger
 * /api/menus/ingredients/{storeId}:
 *   get:
 *     summary: Get ingredients for a store
 *     tags: [Ingredients]
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Ingredients retrieved successfully
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
 *                     $ref: '#/components/schemas/Ingredient'
 *                 count:
 *                   type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/ingredients/:storeId",
  menusController.getIngredientsForStore.bind(menusController)
);

/**
 * @swagger
 * /api/menus/ingredients:
 *   post:
 *     summary: Create a new ingredient
 *     tags: [Ingredients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - storeId
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               storeId:
 *                 type: string
 *                 description: ID of the store
 *     responses:
 *       201:
 *         description: Ingredient created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Ingredient'
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
  "/ingredients",
  [
    body("name").trim().isLength({ min: 1, max: 100 }),
    body("description").optional().trim().isLength({ max: 500 }),
    body("storeId").isUUID(),
  ],
  menusController.createIngredient.bind(menusController)
);

/**
 * @swagger
 * /api/menus/ingredients/{id}/disable:
 *   put:
 *     summary: Disable an ingredient
 *     tags: [Ingredients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ingredient ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               until:
 *                 type: string
 *                 format: date-time
 *                 description: Date until which the ingredient should be disabled (optional)
 *     responses:
 *       200:
 *         description: Ingredient disabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Ingredient'
 *       404:
 *         description: Ingredient not found
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
  "/ingredients/:id/disable",
  [body("until").optional().isISO8601()],
  menusController.disableIngredient.bind(menusController)
);

/**
 * @swagger
 * /api/menus/ingredients/{id}/enable:
 *   put:
 *     summary: Enable an ingredient
 *     tags: [Ingredients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ingredient ID
 *     responses:
 *       200:
 *         description: Ingredient enabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Ingredient'
 *       404:
 *         description: Ingredient not found
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
  "/ingredients/:id/enable",
  menusController.enableIngredient.bind(menusController)
);

/**
 * @swagger
 * /api/menus/ingredients/{id}:
 *   delete:
 *     summary: Delete (deactivate) an ingredient
 *     tags: [Ingredients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ingredient ID
 *     responses:
 *       200:
 *         description: Ingredient deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Ingredient not found
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
  router.delete(
    "/ingredients/:id",
    menusController.deleteIngredient.bind(menusController)
  );

  return router;
}

// For backward compatibility
const defaultRouter = createMenuRoutes();
export default defaultRouter;
