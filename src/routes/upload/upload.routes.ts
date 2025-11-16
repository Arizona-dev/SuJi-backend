import { Router, Request, Response } from "express";
import { body } from "express-validator";
import { uploadMenuItemImage } from "../../config/multer";
import { S3Service } from "../../services/s3/s3.service";
import { logger } from "../../utils/logger";

const router: Router = Router();
const s3Service = new S3Service();

/**
 * @swagger
 * /api/upload/menu-item:
 *   post:
 *     summary: Upload a menu item image
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *               - storeId
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, WebP, max 5MB)
 *               storeId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the store
 *     responses:
 *       200:
 *         description: Image uploaded successfully
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
 *                     url:
 *                       type: string
 *                       description: S3 URL of the uploaded image
 *       400:
 *         description: Invalid input or no file uploaded
 *       500:
 *         description: Server error
 */
router.post(
  "/menu-item",
  uploadMenuItemImage,
  [body("storeId").isUUID()],
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({
          message: "No file uploaded",
        });
        return;
      }

      const { storeId } = req.body;

      if (!storeId) {
        res.status(400).json({
          message: "Store ID is required",
        });
        return;
      }

      // Upload to S3
      const uploadResult = await s3Service.uploadFile(req.file, storeId);

      res.json({
        message: "Image uploaded successfully",
        data: { url: uploadResult.url },
      });
    } catch (error) {
      logger.error("Upload menu item image error:", error);
      res.status(500).json({
        message: "Failed to upload image",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
);

export default router;
