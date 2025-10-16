import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
const imagesDir = path.join(__dirname, '../../uploads/images');

// Create uploads directories
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
}

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
  console.log('📁 Created images directory:', imagesDir);
}

// Configure multer for disk storage (CSV/Excel files)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const fileName = file.fieldname + '-' + uniqueSuffix + fileExtension;
    cb(null, fileName);
  }
});

// Helper function to generate unique filename with collision detection
const generateUniqueFilename = (fieldname, originalname) => {
  const fileExtension = path.extname(originalname);
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  let filename, filePath;
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    const uuid = uuidv4();
    // Triple uniqueness: UUID + timestamp + random number
    filename = `${fieldname}_${uuid}_${timestamp}_${random}${fileExtension}`;
    filePath = path.join(imagesDir, filename);
    attempts++;
  } while (fs.existsSync(filePath) && attempts < maxAttempts);
  
  if (attempts >= maxAttempts) {
    // Ultimate fallback with process ID and additional randomness
    const processId = process.pid;
    const additionalRandom = Math.round(Math.random() * 1E12);
    filename = `${fieldname}_${timestamp}_${processId}_${additionalRandom}${fileExtension}`;
    console.log(`⚠️ Used fallback filename generation for: ${originalname}`);
  }
  
  console.log(`📁 Generated unique filename: ${filename} for: ${originalname}`);
  return filename;
};

// Configure multer for image storage with UUID-based unique naming
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure directory exists with proper permissions
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true, mode: 0o755 });
    }
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    const fileName = generateUniqueFilename(file.fieldname, file.originalname);
    cb(null, fileName);
  }
});

// Also keep memory storage for processing
const memoryStorage = multer.memoryStorage();

// File filter to accept only Excel and CSV files
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/csv'
  ];
  
  const allowedExtensions = ['.xlsx', '.xls', '.csv'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'), false);
  }
};

// Image file filter
const imageFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, GIF, WebP) are allowed'), false);
  }
};

// Configure multer for disk storage (stores file + provides buffer)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Helper function for file uploads (Excel/CSV) with enhanced uniqueness
const generateUniqueFileFilename = (fieldname, originalname) => {
  const fileExtension = path.extname(originalname);
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const uuid = uuidv4();
  
  // Quadruple uniqueness: UUID + timestamp + random + process ID
  const fileName = `${fieldname}_${uuid}_${timestamp}_${random}_${process.pid}${fileExtension}`;
  
  console.log(`📄 Generated unique file filename: ${fileName} for: ${originalname}`);
  return fileName;
};

// Configure multer for disk storage with memory buffer (hybrid approach)
const hybridStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const fileName = generateUniqueFileFilename(file.fieldname, file.originalname);
    cb(null, fileName);
  }
});

// Hybrid upload that stores to disk AND provides memory buffer
const hybridUpload = multer({
  storage: hybridStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Custom middleware to add memory buffer to disk storage
const addMemoryBuffer = (req, res, next) => {
  if (req.file) {
    // Read the file from disk into memory buffer
    fs.readFile(req.file.path, (err, data) => {
      if (err) {
        console.error('Error reading file to buffer:', err);
        return next(err);
      }
      req.file.buffer = data;
      next();
    });
  } else {
    next();
  }
};

// Configure multer for memory storage (for processing)
const memoryUpload = multer({
  storage: memoryStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Configure multer for image uploads - NO SIZE LIMIT
const imageUpload = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit per image (increased for high-quality images)
  }
});

// Single file upload middleware (stores to disk + provides buffer)
export const uploadSingle = upload.single('file');

// Hybrid upload middleware (stores to disk AND provides memory buffer)
export const uploadSingleHybrid = [hybridUpload.single('file'), addMemoryBuffer];

// Memory upload middleware (for processing only)
export const uploadMemory = memoryUpload.single('file');

// Image upload middleware
export const uploadImage = imageUpload.single('image');

// Multiple image upload middleware - UNLIMITED images
export const uploadImages = imageUpload.array('images'); // NO LIMIT - Upload as many as you want!

// Combined upload middleware - supports file (Excel/CSV) + images at the same time
export const uploadFileAndImages = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === 'file') {
        cb(null, uploadsDir);
      } else if (file.fieldname === 'images' || file.fieldname === 'mainImage') {
        cb(null, imagesDir);
      } else {
        cb(null, uploadsDir);
      }
    },
    filename: (req, file, cb) => {
      if (file.fieldname === 'file') {
        const fileName = generateUniqueFileFilename(file.fieldname, file.originalname);
        cb(null, fileName);
      } else if (file.fieldname === 'images' || file.fieldname === 'mainImage') {
        const fileName = generateUniqueFilename(file.fieldname, file.originalname);
        cb(null, fileName);
      } else {
        cb(null, file.originalname);
      }
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'file') {
      // Excel/CSV files
      fileFilter(req, file, cb);
    } else if (file.fieldname === 'images' || file.fieldname === 'mainImage') {
      // Image files
      imageFilter(req, file, cb);
    } else {
      cb(null, true);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
}).fields([
  { name: 'file', maxCount: 1 },
  { name: 'mainImage', maxCount: 1 },
  { name: 'images', maxCount: 50 }
]);

// Conditional upload middleware - handles both JSON and Form Data
export const conditionalImageUpload = (req, res, next) => {
  // Check if request is JSON
  if (req.get('Content-Type') && req.get('Content-Type').includes('application/json')) {
    // Skip multer for JSON requests
    return next();
  } else {
    // Use multer for form data requests
    return uploadImages(req, res, next);
  }
};

// Handle multer errors
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'File size should not exceed 10MB'
      });
    }
    return res.status(400).json({
      error: 'File upload error',
      message: error.message
    });
  }
  
  if (error) {
    return res.status(400).json({
      error: 'File upload error',
      message: error.message
    });
  }
  
  next();
};
