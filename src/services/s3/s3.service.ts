import { PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
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

  // Extract key from S3 URL (supports both S3 direct URLs and CloudFront URLs)
  extractKeyFromUrl(url: string): string | null {
    try {
      // Try S3 direct URL pattern: https://bucket.s3.region.amazonaws.com/key
      const s3Pattern = new RegExp(`https://${S3_BUCKET}\\.s3\\.[^/]+\\.amazonaws\\.com/(.+)`);
      const s3Match = url.match(s3Pattern);
      if (s3Match && s3Match[1]) {
        return s3Match[1];
      }

      // Try CloudFront or any other domain pattern: https://domain.com/key
      // This works for CloudFront and any custom domain
      const genericPattern = /https?:\/\/[^/]+\/(.+)/;
      const genericMatch = url.match(genericPattern);
      if (genericMatch && genericMatch[1]) {
        return genericMatch[1];
      }

      logger.error("Could not extract key from URL:", url);
      return null;
    } catch (error) {
      logger.error("Error extracting key from URL:", error);
      return null;
    }
  }

  // Calculate total size of all files in a store's folder
  async calculateFolderSize(storeId: string): Promise<number> {
    try {
      const prefix = `assets/${storeId}/`;
      let totalSize = 0;
      let continuationToken: string | undefined;

      do {
        const command = new ListObjectsV2Command({
          Bucket: S3_BUCKET,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        });

        const response = await s3Client.send(command);

        if (response.Contents) {
          for (const object of response.Contents) {
            totalSize += object.Size || 0;
          }
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      logger.info(`Calculated folder size for store ${storeId}: ${totalSize} bytes`);
      return totalSize;
    } catch (error) {
      logger.error("Error calculating folder size:", error);
      throw new Error(`Failed to calculate folder size: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
