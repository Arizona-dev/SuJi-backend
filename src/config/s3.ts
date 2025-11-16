import { S3Client } from "@aws-sdk/client-s3";

// Initialize S3 client
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-west-3",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export const S3_BUCKET = process.env.AWS_S3_BUCKET || "suji-assets";
export const S3_REGION = process.env.AWS_REGION || "eu-west-3";
export const CLOUDFRONT_DOMAIN = process.env.AWS_CLOUDFRONT_DOMAIN; // e.g., "d1234567890.cloudfront.net"

// Generate S3 key for assets
export function generateAssetKey(storeId: string, filename: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = filename.split('.').pop();
  return `assets/${storeId}/${timestamp}-${randomString}.${extension}`;
}

// Generate public URL (CloudFront if configured, otherwise S3 direct)
export function getPublicUrl(key: string): string {
  if (CLOUDFRONT_DOMAIN) {
    return `https://${CLOUDFRONT_DOMAIN}/${key}`;
  }
  // Fallback to direct S3 URL
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
}
