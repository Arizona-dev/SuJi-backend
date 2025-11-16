import { PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET, generateAssetKey, getPublicUrl } from "../../config/s3";
import { logger } from "../../utils/logger";

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

export class S3Service {
  async uploadFile(
    file: Express.Multer.File,
    storeId: string
  ): Promise<UploadResult> {
    try {
      const key = generateAssetKey(storeId, file.originalname);

      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // No ACL - bucket policy will handle public access
      });

      await s3Client.send(command);

      const url = getPublicUrl(key);

      logger.info(`File uploaded to S3: ${key}`);

      return {
        url,
        key,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      logger.error("S3 upload error:", error);
      throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      });

      await s3Client.send(command);

      logger.info(`File deleted from S3: ${key}`);
    } catch (error) {
      logger.error("S3 delete error:", error);
      throw new Error(`Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Extract key from S3 URL
  extractKeyFromUrl(url: string): string | null {
    try {
      const urlPattern = new RegExp(`https://${S3_BUCKET}\\.s3\\.[^/]+\\.amazonaws\\.com/(.+)`);
      const match = url.match(urlPattern);
      return match ? match[1] : null;
    } catch (error) {
      logger.error("Error extracting key from URL:", error);
      return null;
    }
  }
}
