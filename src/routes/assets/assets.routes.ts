import { Router } from "express";
import { body } from "express-validator";
import { AssetsController } from "../../controllers/assets/assets.controller";
import { uploadAsset } from "../../config/multer";
import { verifyStoreAccess, verifyAssetAccess } from "../../middleware/assetAuthorization";
import { DataSource } from "typeorm";

export function createAssetRoutes(dataSource?: DataSource): Router {
  const router: Router = Router();
  const assetsController = new AssetsController(dataSource);

  /**
   * @swagger
   * /api/assets/store/{storeId}:
   *   get:
   *     summary: Get all assets for a store
   *     tags: [Assets]
   *     parameters:
   *       - in: path
   *         name: storeId
   *         required: true
   *         schema:
   *           type: string
   *         description: Store ID
   *     responses:
   *       200:
   *         description: Assets retrieved successfully
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
   *                     $ref: '#/components/schemas/Asset'
   *                 count:
   *                   type: integer
   *       404:
   *         description: Store not found
   *       500:
   *         description: Server error
   */
  router.get(
    "/store/:storeId",
    verifyStoreAccess,
    assetsController.getAssets.bind(assetsController)
  );

  /**
   * @swagger
   * /api/assets:
   *   post:
   *     summary: Upload a new asset
   *     tags: [Assets]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - file
   *               - storeId
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Image file (JPEG, PNG, WebP, max 5MB)
   *               storeId:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the store
   *               tags:
   *                 type: string
   *                 description: JSON array of tags for the asset
   *     responses:
   *       201:
   *         description: Asset uploaded successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 data:
   *                   $ref: '#/components/schemas/Asset'
   *       400:
   *         description: Invalid input data or file
   *       404:
   *         description: Store not found
   *       500:
   *         description: Server error
   */
  router.post(
    "/",
    uploadAsset,
    verifyStoreAccess,
    [body("storeId").isUUID()],
    assetsController.uploadAsset.bind(assetsController)
  );

  /**
   * @swagger
   * /api/assets/{id}:
   *   put:
   *     summary: Update asset metadata
   *     tags: [Assets]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Asset ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Tags for the asset
   *               usageCount:
   *                 type: integer
   *                 description: Number of times this asset is used
   *     responses:
   *       200:
   *         description: Asset updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 data:
   *                   $ref: '#/components/schemas/Asset'
   *       400:
   *         description: Invalid input data
   *       404:
   *         description: Asset not found
   *       500:
   *         description: Server error
   */
  router.put(
    "/:id",
    verifyAssetAccess,
    [
      body("tags").optional().isArray(),
      body("usageCount").optional().isInt({ min: 0 }),
    ],
    assetsController.updateAsset.bind(assetsController)
  );

  /**
   * @swagger
   * /api/assets/{id}:
   *   delete:
   *     summary: Delete an asset
   *     tags: [Assets]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Asset ID
   *     responses:
   *       200:
   *         description: Asset deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *       404:
   *         description: Asset not found
   *       500:
   *         description: Server error
   */
  router.delete(
    "/:id",
    verifyAssetAccess,
    assetsController.deleteAsset.bind(assetsController)
  );

  return router;
}

// For backward compatibility
const defaultRouter = createAssetRoutes();
export default defaultRouter;
