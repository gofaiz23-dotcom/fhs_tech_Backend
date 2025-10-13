import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

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

        // Create filename
        const urlParts = imageUrl.split('/');
        const originalFilename = urlParts[urlParts.length - 1];
        const fileExtension = path.extname(originalFilename) || '.jpg';
        const filename = `${productSku}-${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
        
        // Create images directory if not exists
        const imagesDir = path.join(__dirname, '../../uploads/images');
        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true });
        }

        const filePath = path.join(imagesDir, filename);

        // Choose protocol
        const protocol = imageUrl.startsWith('https:') ? https : http;

        // Download file
        const file = fs.createWriteStream(filePath);
        
        protocol.get(imageUrl, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download image: ${response.statusCode}`));
            return;
          }

          response.pipe(file);

          file.on('finish', () => {
            file.close();
            resolve({
              success: true,
              localPath: filePath,
              filename: filename,
              url: `/uploads/images/${filename}`
            });
          });

          file.on('error', (err) => {
            fs.unlink(filePath, () => {}); // Delete partial file
            reject(err);
          });
        }).on('error', (err) => {
          reject(err);
        });

        // Set timeout
        setTimeout(() => {
          file.destroy();
          fs.unlink(filePath, () => {});
          reject(new Error('Download timeout'));
        }, 30000); // 30 seconds timeout

      } catch (error) {
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

    for (const imageUrl of imageUrls) {
      try {
        const result = await this.downloadImage(imageUrl.trim(), productSku);
        results.successful.push({
          originalUrl: imageUrl,
          ...result
        });
      } catch (error) {
        results.failed.push({
          originalUrl: imageUrl,
          error: error.message
        });
      }
    }

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
}

export default ImageService;
