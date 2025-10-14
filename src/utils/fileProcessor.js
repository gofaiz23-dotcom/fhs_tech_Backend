import XLSX from 'xlsx';
import csv from 'csv-parser';
import path from 'path';
import { Readable } from 'stream';

class FileProcessor {
  // Normalize header names to handle various formats
  static normalizeHeader(header) {
    if (!header) return '';
    
    // Convert to lowercase and remove extra spaces
    let normalized = header.toLowerCase().trim();
    
    // Replace various separators with underscores
    normalized = normalized
      .replace(/[,\s-]+/g, '_')  // Replace commas, spaces, hyphens with underscores
      .replace(/_+/g, '_')       // Replace multiple underscores with single underscore
      .replace(/^_|_$/g, '');    // Remove leading/trailing underscores
    
    // Handle specific field mappings
    const fieldMappings = {
      // Group SKU variations
      'group_sku': 'groupSku',
      'group_sk_u': 'groupSku',
      'groupsku': 'groupSku',
      'group': 'groupSku',
      
      // Sub SKU variations
      'sub_sku': 'subSku',
      'sub_sk_u': 'subSku',
      'subsku': 'subSku',
      'sub': 'subSku',
      
      // Brand Name variations
      'brand_name': 'brandName',
      'brandname': 'brandName',
      'brand': 'brandName',
      
      // Brand Real Price variations
      'brand_real_price': 'brandRealPrice',
      'brandrealprice': 'brandRealPrice',
      'brand_realprice': 'brandRealPrice',
      'brandprice': 'brandRealPrice',
      'real_price': 'brandRealPrice',
      'realprice': 'brandRealPrice',
      
      // MSRP variations
      'msrp': 'msrp',
      'manufacturer_suggested_retail_price': 'msrp',
      'suggested_price': 'msrp',
      
      // Brand Miscellaneous variations
      'brand_miscellaneous': 'brandMiscellaneous',
      'brandmiscellaneous': 'brandMiscellaneous',
      'miscellaneous': 'brandMiscellaneous',
      'misc': 'brandMiscellaneous',
      
      // Collection Name variations
      'collection_name': 'collectionName',
      'collectionname': 'collectionName',
      'collection': 'collectionName',
      'collections': 'collectionName',
      
      // Ship Types variations
      'ship_types': 'shipTypes',
      'shiptypes': 'shipTypes',
      'shipping_types': 'shipTypes',
      'shippingtypes': 'shipTypes',
      'ship': 'shipTypes',
      
      // Single Set Item variations
      'single_set_item': 'singleSetItem',
      'singlesetitem': 'singleSetItem',
      'single_setitem': 'singleSetItem',
      'single_set': 'singleSetItem',
      'singleset': 'singleSetItem',
      'set_item': 'singleSetItem',
      'setitem': 'singleSetItem',
      
      // Main Image URL variations
      'main_image_url': 'mainImageUrl',
      'mainimageurl': 'mainImageUrl',
      'main_imageurl': 'mainImageUrl',
      'main_image': 'mainImageUrl',
      'mainimage': 'mainImageUrl',
      'image_url': 'mainImageUrl',
      'imageurl': 'mainImageUrl',
      
      // Gallery Images variations
      'gallery_images': 'galleryImages',
      'galleryimages': 'galleryImages',
      'gallery_image': 'galleryImages',
      'galleryimage': 'galleryImages',
      'gallery': 'galleryImages',
      'images': 'galleryImages'
    };
    
    // Return mapped field or original normalized name
    return fieldMappings[normalized] || normalized;
  }

  // Process Excel file from buffer (.xlsx, .xls)
  static async processExcelBuffer(buffer) {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0]; // Get first sheet
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // Use first row as header
        defval: '' // Default value for empty cells
      });
      
      if (data.length === 0) {
        throw new Error('Excel file is empty');
      }
      
      // First row is headers, rest is data
      const headers = data[0].map(header => FileProcessor.normalizeHeader(String(header).trim()));
      const rows = data.slice(1);
      
      // Convert to objects
      const result = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] ? String(row[index]).trim() : '';
        });
        return obj;
      }).filter(obj => {
        // Filter out empty rows
        return Object.values(obj).some(value => value !== '');
      });
      
      return result;
    } catch (error) {
      throw new Error(`Excel processing error: ${error.message}`);
    }
  }
  
  // Process CSV file from buffer
  static async processCSVBuffer(buffer) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      const stream = Readable.from(buffer.toString());
      
      stream
        .pipe(csv({
          mapHeaders: ({ header }) => header.toLowerCase().trim()
        }))
        .on('data', (data) => {
          // Clean up data and remove empty rows
          const cleanData = {};
          let hasData = false;
          
          Object.keys(data).forEach(key => {
            const value = String(data[key]).trim();
            cleanData[key] = value;
            if (value !== '') hasData = true;
          });
          
          if (hasData) {
            results.push(cleanData);
          }
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(new Error(`CSV processing error: ${error.message}`));
        });
    });
  }
  
  // Main file processor - works with memory buffer
  static async processFileBuffer(buffer, filename) {
    const extension = path.extname(filename).toLowerCase();
    
    let data;
    
    if (extension === '.csv') {
      data = await this.processCSVBuffer(buffer);
    } else if (extension === '.xlsx' || extension === '.xls') {
      data = await this.processExcelBuffer(buffer);
    } else {
      throw new Error('Unsupported file format');
    }
    
    return data;
  }
  
  // Validate brand data
  static validateBrandData(data) {
    const errors = [];
    const validData = [];
    
    data.forEach((item, index) => {
      const row = index + 2; // +2 because index starts at 0 and we skip header
      
      if (!item.name || item.name.trim() === '') {
        errors.push(`Row ${row}: Brand name is required`);
        return;
      }
      
      validData.push({
        name: item.name.trim(),
        description: item.description ? item.description.trim() : null
      });
    });
    
    return { validData, errors };
  }
  
  // Validate marketplace data
  static validateMarketplaceData(data) {
    const errors = [];
    const validData = [];
    
    data.forEach((item, index) => {
      const row = index + 2;
      
      if (!item.name || item.name.trim() === '') {
        errors.push(`Row ${row}: Marketplace name is required`);
        return;
      }
      
      validData.push({
        name: item.name.trim(),
        description: item.description ? item.description.trim() : null
      });
    });
    
    return { validData, errors };
  }
  
  // Validate shipping company data
  static validateShippingData(data) {
    const errors = [];
    const validData = [];
    
    data.forEach((item, index) => {
      const row = index + 2;
      
      if (!item.name || item.name.trim() === '') {
        errors.push(`Row ${row}: Shipping company name is required`);
        return;
      }
      
      validData.push({
        name: item.name.trim(),
        description: item.description ? item.description.trim() : null
      });
    });
    
    return { validData, errors };
  }

  // Validate product data
  static validateProductData(data) {
    const validData = [];
    const errors = [];
    
    data.forEach((item, index) => {
      const row = index + 1;
      
      // Required fields validation
      if (!item.title || item.title.trim() === '') {
        errors.push(`Row ${row}: Product title is required`);
        return;
      }
      
      if (!item.groupSku || item.groupSku.trim() === '') {
        errors.push(`Row ${row}: Group SKU is required and must be unique`);
        return;
      }
      
      if (!item.subSku || item.subSku.trim() === '') {
        errors.push(`Row ${row}: Sub SKU is required`);
        return;
      }
      
      if (!item.brandId && !item.brandName) {
        errors.push(`Row ${row}: Brand ID or Brand Name is required`);
        return;
      }

      // Brand Real Price is mandatory
      if (item.brandRealPrice === undefined || item.brandRealPrice === null || item.brandRealPrice === '') {
        errors.push(`Row ${row}: Brand Real Price is mandatory`);
        return;
      }
      
      // MSRP is mandatory
      if (item.msrp === undefined || item.msrp === null || item.msrp === '') {
        errors.push(`Row ${row}: MSRP is mandatory`);
        return;
      }
      
      // Extract attributes (all fields except the main product fields and pricing fields)
      const attributes = {};
      const pricingFields = ['brandRealPrice', 'brandMiscellaneous', 'msrp', 'shippingPrice', 'commissionPrice', 'profitMarginPrice', 'ecommerceMiscellaneous'];
      const mainFields = ['title', 'groupSku', 'subSku', 'brandId', 'brandName', 'category', 'collectionName', 'shipTypes', 'singleSetItem'];
      
      // Collect all gallery images from different columns
      let allGalleryImages = [];
      
      Object.keys(item).forEach(key => {
        if (!mainFields.includes(key) && !pricingFields.includes(key)) {
          // Handle image fields specially
          if (key === 'mainImageUrl') {
            attributes[key] = item[key];
          } else if (key === 'galleryImages' || key.startsWith('galleryImage')) {
            // Handle gallery images (both single column and multiple columns)
            if (item[key] && item[key].trim() !== '') {
              if (typeof item[key] === 'string') {
                // If it's a string (comma-separated URLs), split and add to gallery
                const urls = item[key].split(',').map(url => url.trim()).filter(url => url);
                allGalleryImages = [...allGalleryImages, ...urls];
              } else if (Array.isArray(item[key])) {
                // If it's already an array, add to gallery
                allGalleryImages = [...allGalleryImages, ...item[key]];
              }
            }
          } else {
            attributes[key] = item[key];
          }
        }
      });
      
      // Set the combined gallery images
      if (allGalleryImages.length > 0) {
        attributes.galleryImages = allGalleryImages;
      }
      
      // Filter out empty/null values from attributes
      Object.keys(attributes).forEach(key => {
        const value = attributes[key];
        if (value === null || value === undefined || value === '' || 
            (Array.isArray(value) && value.length === 0) ||
            (typeof value === 'object' && Object.keys(value).length === 0)) {
          delete attributes[key];
        }
      });
      
      validData.push({
        brandId: item.brandId,
        brandName: item.brandName,
        title: item.title.trim(),
        groupSku: item.groupSku.trim(),
        subSku: item.subSku.trim(),
        category: item.category ? item.category.trim() : '',
        collectionName: item.collectionName ? item.collectionName.trim() : '',
        shipTypes: item.shipTypes ? item.shipTypes.trim() : '',
        singleSetItem: item.singleSetItem ? item.singleSetItem.trim() : '',
        // Brand Pricing (brandRealPrice and msrp are mandatory, others default to 0)
        brandRealPrice: parseFloat(item.brandRealPrice),
        brandMiscellaneous: parseFloat(item.brandMiscellaneous) || 0,
        msrp: parseFloat(item.msrp),
        // Ecommerce Pricing (All default to 0 - will be set via separate API)
        shippingPrice: 0,
        commissionPrice: 0,
        profitMarginPrice: 0,
        ecommerceMiscellaneous: 0,
        attributes: attributes
      });
    });
    
    return { validData, errors };
  }
}

export default FileProcessor;
