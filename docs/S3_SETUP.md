# S3 File Upload Configuration

## Overview
The asset management system has been configured to use AWS S3 for file storage, making it compatible with horizontally scaled deployments.

## Required Environment Variables

Add these to your `.env` file:

```env
# AWS S3 Configuration
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_S3_BUCKET=suji-assets

# AWS CloudFront (optional but recommended for production)
AWS_CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net
```

## Required NPM Packages

Install the AWS SDK v3:

```bash
npm install @aws-sdk/client-s3
```

## S3 Bucket Setup

1. Create an S3 bucket named `suji-assets` (or your custom name)
2. Configure bucket permissions:
   - Public read access for uploaded files (ACL: public-read)
   - Block public write access
3. Enable CORS if accessing from browser:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

## CloudFront CDN Setup (Recommended for Production)

CloudFront provides:
- ✅ Faster global delivery via CDN
- ✅ HTTPS support
- ✅ Custom domain (e.g., `cdn.suji.fr`)
- ✅ Cost savings on S3 bandwidth
- ✅ Better performance for click & collect shop

### Step 1: Create CloudFront Distribution

1. Go to AWS CloudFront Console
2. Create new distribution
3. **Origin Settings:**
   - Origin domain: Select your S3 bucket `suji-assets.s3.eu-west-3.amazonaws.com`
   - Origin path: Leave empty
   - Name: `suji-assets-origin`
   - Origin access: Public (or use OAC for better security)

4. **Default Cache Behavior:**
   - Viewer protocol policy: **Redirect HTTP to HTTPS**
   - Allowed HTTP methods: **GET, HEAD, OPTIONS**
   - Cache policy: **CachingOptimized** (or create custom)
   - Origin request policy: **CORS-S3Origin**

5. **Distribution Settings:**
   - Price class: **Use all edge locations** (or choose based on your region)
   - Alternate domain names (CNAME): `cdn.suji.fr` (optional)
   - SSL certificate: Request/import custom SSL certificate for custom domain
   - Default root object: Leave empty

6. Click **Create Distribution**

### Step 2: Configure Custom Domain (Optional)

1. Request SSL certificate in **AWS Certificate Manager** (ACM):
   - Region: **us-east-1** (required for CloudFront)
   - Domain: `cdn.suji.fr`
   - Validation: DNS validation

2. Add CNAME record in your DNS:
   ```
   Type: CNAME
   Name: cdn
   Value: d1234567890.cloudfront.net (your CloudFront domain)
   TTL: 300
   ```

3. Add the custom domain to CloudFront distribution settings

### Step 3: Update Environment Variables

```env
# Without custom domain
AWS_CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net

# With custom domain
AWS_CLOUDFRONT_DOMAIN=cdn.suji.fr
```

### Step 4: Test

After deployment completes (15-30 minutes):

```bash
# Test image access
curl -I https://d1234567890.cloudfront.net/assets/store-id/image.jpg

# Should return:
# HTTP/2 200
# content-type: image/jpeg
# x-cache: Hit from cloudfront
```

### CloudFront Benefits for Click & Collect

- **Public Menu Images:** Product photos load fast for customers browsing
- **Global CDN:** Low latency worldwide
- **HTTPS:** Secure image delivery
- **Cost-effective:** Cheaper than direct S3 for high traffic
- **Cache Control:** Images cached at edge locations

## File Structure in S3

Files are organized by store:
```
s3://suji-assets/
  └── assets/
      └── {storeId}/
          ├── {timestamp}-{random}.jpg
          ├── {timestamp}-{random}.png
          └── ...
```

## API Changes

### Upload Menu Item Image
**Endpoint:** `POST /api/upload/menu-item`

**Breaking Change:** Now requires `storeId` in form data:
```typescript
const formData = new FormData();
formData.append('image', file);
formData.append('storeId', storeId); // NEW REQUIRED FIELD
```

### Upload Asset
**Endpoint:** `POST /api/assets`

Form data:
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('storeId', storeId);
formData.append('tags', JSON.stringify(['tag1', 'tag2'])); // Optional
```

## Security Features

- **File type validation:** Only JPEG, PNG, WebP allowed
- **File size limit:** 5MB maximum
- **Store isolation:** Files organized by storeId
- **Access control:** Middleware verifies store ownership
- **Secure deletion:** Files deleted from S3 when asset is removed

## Migration Notes

- Local `uploads/` directory is no longer used
- Static file serving removed from Express
- All existing image URLs will need to be migrated to S3
- File URLs now use S3 format: `https://suji-assets.s3.eu-west-3.amazonaws.com/assets/...`

## Files Modified

1. **src/config/s3.ts** - S3 client configuration
2. **src/config/multer.ts** - Changed to memory storage
3. **src/services/s3/s3.service.ts** - S3 upload/delete operations
4. **src/controllers/assets/assets.controller.ts** - Uses S3 service
5. **src/routes/upload/upload.routes.ts** - Requires storeId, uploads to S3
6. **src/index.ts** - Removed static file serving

## Testing

Test with curl:
```bash
# Upload menu item image
curl -X POST http://localhost:3000/api/upload/menu-item \
  -F "image=@test.jpg" \
  -F "storeId=your-store-uuid"

# Upload asset
curl -X POST http://localhost:3000/api/assets \
  -F "file=@test.jpg" \
  -F "storeId=your-store-uuid" \
  -F 'tags=["product","menu"]'
```
