import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Download image from URL and save to local folder
 * @param {string} imageUrl - URL of the image to download
 * @returns {Promise<string>} - Local path of downloaded image
 */
async function downloadImage(imageUrl) {
  try {
    // Create downloads directory if it doesn't exist
    const downloadDir = path.join(__dirname, '../../uploads/downloaded');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    // Get file extension from URL
    const urlPath = new URL(imageUrl).pathname;
    const ext = path.extname(urlPath) || '.jpg'; // Default to .jpg if no extension
    
    // Generate unique filename
    const filename = `downloaded_${uuidv4()}_${Date.now()}${ext}`;
    const filepath = path.join(downloadDir, filename);

    // Download image
    const response = await axios({
      method: 'get',
      url: imageUrl,
      responseType: 'stream',
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Save to file
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        const localPath = `/uploads/downloaded/${filename}`;
        console.log(`✅ Downloaded image: ${imageUrl} → ${localPath}`);
        resolve(localPath);
      });
      writer.on('error', reject);
    });

  } catch (error) {
    console.error(`❌ Failed to download image: ${imageUrl}`, error.message);
    // Return original URL if download fails
    return imageUrl;
  }
}

/**
 * Download multiple images from URLs
 * @param {string[]} imageUrls - Array of image URLs
 * @returns {Promise<string[]>} - Array of local paths
 */
async function downloadImages(imageUrls) {
  if (!imageUrls || !Array.isArray(imageUrls)) {
    return [];
  }

  const downloadPromises = imageUrls.map(url => downloadImage(url));
  return Promise.all(downloadPromises);
}

/**
 * Process image input - either URL or already uploaded file
 * @param {string} imageInput - URL or local path
 * @returns {Promise<string>} - Local path
 */
async function processImage(imageInput) {
  if (!imageInput) return null;

  // If already a local path, return as-is
  if (imageInput.startsWith('/uploads/')) {
    return imageInput;
  }

  // If it's a URL, download it
  if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
    return await downloadImage(imageInput);
  }

  // If it's a data URI (base64), ignore and return null
  if (imageInput.startsWith('data:image/')) {
    console.log('⚠️ Base64 image detected, skipping');
    return null;
  }

  return imageInput;
}

/**
 * Process multiple image inputs
 * @param {string[]} imageInputs - Array of URLs or local paths
 * @returns {Promise<string[]>} - Array of local paths
 */
async function processImages(imageInputs) {
  if (!imageInputs || !Array.isArray(imageInputs)) {
    return [];
  }

  const processPromises = imageInputs.map(input => processImage(input));
  const results = await Promise.all(processPromises);
  
  // Filter out null values
  return results.filter(path => path !== null);
}

export {
  downloadImage,
  downloadImages,
  processImage,
  processImages
};

