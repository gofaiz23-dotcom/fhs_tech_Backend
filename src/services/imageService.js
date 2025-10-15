import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ImageService {
  // Download image from URL and save to uploads/images folder
  static async downloadImage(imageUrl, productSku) {
    return new Promise((resolve, reject) => {
      try {
        // Validate URL
        if (!imageUrl || !imageUrl.startsWith('http')) {
          reject(new Error('Invalid image URL'));
          return;
        }

        console.log(`🖼️ Starting download: ${imageUrl} for product: ${productSku}`);

        // Create filename with UUID-based unique naming to prevent conflicts
        const urlParts = imageUrl.split('/');
        const originalFilename = urlParts[urlParts.length - 1];
        const fileExtension = path.extname(originalFilename) || '.jpg';
        
        // Create images directory if not exists with proper permissions
        const imagesDir = path.join(__dirname, '../../uploads/images');
        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true, mode: 0o755 });
          console.log(`📁 Created images directory: ${imagesDir}`);
        }
        
        // Ensure directory is writable
        try {
          fs.accessSync(imagesDir, fs.constants.W_OK);
        } catch (error) {
          reject(new Error(`Images directory is not writable: ${imagesDir}`));
          return;
        }

        // Generate unique filename with enhanced collision detection
        let filename, filePath;
        let attempts = 0;
        const maxAttempts = 10;
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        
        do {
          const uuid = uuidv4();
          // Triple uniqueness: UUID + timestamp + random number
          filename = `dl_${uuid}_${timestamp}_${random}${fileExtension}`;
          filePath = path.join(imagesDir, filename);
          attempts++;
        } while (fs.existsSync(filePath) && attempts < maxAttempts);
        
        if (attempts >= maxAttempts) {
          // Ultimate fallback with process ID and additional randomness
          const processId = process.pid;
          const additionalRandom = Math.round(Math.random() * 1E12);
          filename = `dl_${timestamp}_${processId}_${additionalRandom}${fileExtension}`;
          filePath = path.join(imagesDir, filename);
          console.log(`⚠️ Used fallback filename generation for downloaded image: ${filename}`);
        }
        console.log(`💾 Saving to: ${filePath}`);

        // Choose protocol
        const protocol = imageUrl.startsWith('https:') ? https : http;

        // Download file
        const file = fs.createWriteStream(filePath);
        
        protocol.get(imageUrl, (response) => {
          console.log(`📡 Response status: ${response.statusCode} for ${imageUrl}`);
          
          if (response.statusCode !== 200) {
            file.close();
            fs.unlink(filePath, () => {});
            reject(new Error(`Failed to download image: ${response.statusCode}`));
            return;
          }

          response.pipe(file);

          file.on('finish', () => {
            file.close();
            console.log(`✅ Successfully downloaded: ${filename}`);
            
            // Wait a moment for file system to sync
            setTimeout(() => {
              // Verify file exists and has content
              if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                if (stats.size > 0) {
                  console.log(`🔍 File verified: ${filename} (${stats.size} bytes) at ${filePath}`);
                  
                  // Set proper file permissions for permanent storage
                  try {
                    fs.chmodSync(filePath, 0o644);
                  } catch (permError) {
                    console.warn(`⚠️ Could not set file permissions: ${permError.message}`);
                  }
                  
                  resolve({
                    success: true,
                    localPath: filePath,
                    filename: filename,
                    url: `/uploads/images/${filename}`,
                    originalUrl: imageUrl,
                    size: stats.size,
                    permanent: true // Flag to indicate this is permanent storage
                  });
                } else {
                  console.error(`❌ Downloaded file is empty: ${filename}`);
                  fs.unlink(filePath, () => {});
                  reject(new Error('Downloaded file is empty'));
                }
              } else {
                console.error(`❌ File was not created: ${filePath}`);
                reject(new Error('File was not created'));
              }
            }, 100); // Small delay to ensure file system sync
          });

          file.on('error', (err) => {
            console.error(`❌ File write error: ${err.message}`);
            fs.unlink(filePath, () => {}); // Delete partial file
            reject(err);
          });
        }).on('error', (err) => {
          console.error(`❌ Download error: ${err.message}`);
          reject(err);
        });

        // Set timeout
        setTimeout(() => {
          file.destroy();
          fs.unlink(filePath, () => {});
          reject(new Error('Download timeout after 30 seconds'));
        }, 30000); // 30 seconds timeout

      } catch (error) {
        console.error(`❌ Image download error: ${error.message}`);
        reject(error);
      }
    });
  }

  // Download multiple images
  static async downloadMultipleImages(imageUrls, productSku) {
    const results = {
      successful: [],
      failed: []
    };

    console.log(`📊 Starting download of ${imageUrls.length} images for product: ${productSku}`);

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i].trim();
      console.log(`📥 Downloading image ${i + 1}/${imageUrls.length}: ${imageUrl}`);
      
      try {
        const result = await this.downloadImage(imageUrl, productSku);
        results.successful.push({
          originalUrl: imageUrl,
          ...result
        });
        console.log(`✅ Successfully downloaded image ${i + 1}/${imageUrls.length}`);
      } catch (error) {
        results.failed.push({
          originalUrl: imageUrl,
          error: error.message
        });
        console.error(`❌ Failed to download image ${i + 1}/${imageUrls.length}: ${error.message}`);
      }
    }

    console.log(`📊 Download complete: ${results.successful.length} successful, ${results.failed.length} failed`);
    return results;
  }

  // Process comma-separated image URLs
  static async processImageUrls(imageUrlsString, productSku) {
    if (!imageUrlsString || imageUrlsString.trim() === '') {
      return { successful: [], failed: [] };
    }

    const urls = imageUrlsString.split(',').map(url => url.trim()).filter(url => url);
    return await this.downloadMultipleImages(urls, productSku);
  }

  // Delete image file
  static deleteImage(filename) {
    try {
      const filePath = path.join(__dirname, '../../uploads/images', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  // Get image info
  static getImageInfo(filename) {
    try {
      const filePath = path.join(__dirname, '../../uploads/images', filename);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return {
          exists: true,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      }
      return { exists: false };
    } catch (error) {
      console.error('Error getting image info:', error);
      return { exists: false, error: error.message };
    }
  }

  // Check if image already exists for a product
  static checkExistingImages(productSku) {
    try {
      const imagesDir = path.join(__dirname, '../../uploads/images');
      if (!fs.existsSync(imagesDir)) {
        return [];
      }

      const files = fs.readdirSync(imagesDir);
      const existingImages = files.filter(file => file.startsWith(`${productSku}_`));
      
      return existingImages.map(filename => ({
        filename: filename,
        url: `/uploads/images/${filename}`,
        path: path.join(imagesDir, filename)
      }));
    } catch (error) {
      console.error('Error checking existing images:', error);
      return [];
    }
  }

  // Ensure directory exists
  static ensureDirectoryExists() {
    try {
      const imagesDir = path.join(__dirname, '../../uploads/images');
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true, mode: 0o755 });
        console.log(`📁 Created images directory: ${imagesDir}`);
      }
      return imagesDir;
    } catch (error) {
      console.error('Error creating directory:', error);
      throw error;
    }
  }

  // Verify image persistence - check if image files still exist
  static verifyImagePersistence(productSku) {
    try {
      const imagesDir = path.join(__dirname, '../../uploads/images');
      if (!fs.existsSync(imagesDir)) {
        return { exists: false, error: 'Images directory does not exist' };
      }

      const files = fs.readdirSync(imagesDir);
      const productImages = files.filter(file => 
        file.startsWith(`${productSku}_`) || 
        file.startsWith('img_') || 
        file.startsWith('dl_')
      );
      
      const verificationResults = productImages.map(filename => {
        const filePath = path.join(imagesDir, filename);
        const exists = fs.existsSync(filePath);
        const stats = exists ? fs.statSync(filePath) : null;
        
        return {
          filename,
          exists,
          size: stats ? stats.size : 0,
          modified: stats ? stats.mtime : null,
          url: `/uploads/images/${filename}`
        };
      });

      return {
        exists: true,
        productSku,
        totalImages: productImages.length,
        images: verificationResults,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error verifying image persistence:', error);
      return { exists: false, error: error.message };
    }
  }
}

export default ImageService;
