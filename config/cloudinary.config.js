import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import path from 'path';
import os from 'os';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use disk storage for Vercel serverless compatibility
const getUploadDir = () => {
  // Try multiple temp directories for better compatibility
  const tempDirs = [
    os.tmpdir(),
    '/tmp',
    path.join(process.cwd(), 'tmp')
  ];
  
  for (const dir of tempDirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Test if we can write to this directory
      const testFile = path.join(dir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return dir;
    } catch (err) {
      console.log(`Cannot use temp dir ${dir}:`, err.message);
    }
  }
  
  // Fallback to current directory
  return process.cwd();
};

const uploadDir = path.join(getUploadDir(), 'uploads');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  console.log("Upload directory initialized:", uploadDir);
} catch (err) {
  console.error("Error creating upload directory:", err);
}

const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadMultiple = multer({ 
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
}).array('images', 5);

// Also support single file upload with 'image' field name for backward compatibility
const uploadSingle = multer({ 
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
}).single('image');

const uploadToCloudinary = async (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'restyle-products' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    
    // Handle both buffer (memory) and file path (disk) cases
    if (file.buffer) {
      uploadStream.end(file.buffer);
    } else if (file.path) {
      const fileStream = fs.createReadStream(file.path);
      fileStream.pipe(uploadStream);
      fileStream.on('error', (err) => {
        console.error('File stream error:', err);
        reject(err);
      });
    } else {
      reject(new Error('No file buffer or path available'));
    }
  });
};

// Cleanup function to remove temp files
const cleanupTempFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Error cleaning up temp file:', err);
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};

export { upload, uploadMultiple, uploadSingle, uploadToCloudinary, deleteFromCloudinary, cleanupTempFile };
