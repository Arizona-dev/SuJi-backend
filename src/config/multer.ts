import multer from "multer";

// Use memory storage for S3 uploads
// Files are stored in memory as Buffer objects and uploaded to S3
const storage = multer.memoryStorage();

// File filter - only allow images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Export upload for menu items (legacy support)
export const uploadMenuItemImage = upload.single('image');

// Export upload for assets
export const uploadAsset = upload.single('file');
