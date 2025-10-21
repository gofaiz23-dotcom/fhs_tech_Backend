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
      'product_sku': 'groupSku',
      'productsku': 'groupSku',
      'Group SKU': 'groupSku',
      'GROUP SKU': 'groupSku',
      
      // Sub SKU variations
      'sub_sku': 'subSku',
      'sub_sk_u': 'subSku',
      'subsku': 'subSku',
      'sub': 'subSku',
      'variant_sku': 'subSku',
      'variantsku': 'subSku',
      'Sub SKU': 'subSku',
      'SUB SKU': 'subSku',
      
      // Brand Name variations
      'brand_name': 'brandName',
      'brandname': 'brandName',
      'brand': 'brandName',
      'manufacturer': 'brandName',
      'company': 'brandName',
      'Brand Name': 'brandName',
      'BRAND NAME': 'brandName',
      
      // Brand Real Price variations
      'brand_real_price': 'brandRealPrice',
      'brandrealprice': 'brandRealPrice',
      'brand_realprice': 'brandRealPrice',
      'brandprice': 'brandRealPrice',
      'real_price': 'brandRealPrice',
      'realprice': 'brandRealPrice',
      'cost_price': 'brandRealPrice',
      'costprice': 'brandRealPrice',
      'wholesale_price': 'brandRealPrice',
      'wholesaleprice': 'brandRealPrice',
      'base_price': 'brandRealPrice',
      'baseprice': 'brandRealPrice',
      'Brand Real Price': 'brandRealPrice',
      'BRAND REAL PRICE': 'brandRealPrice',
      
      // MSRP variations - handle all case combinations
      'msrp': 'msrp',
      'MSRP': 'msrp',
      'Msrp': 'msrp',
      'MSrp': 'msrp',
      'mSRP': 'msrp',
      'MsRP': 'msrp',
      'MSrP': 'msrp',
      'mSrP': 'msrp',
      'manufacturer_suggested_retail_price': 'msrp',
      'suggested_price': 'msrp',
      'manufacturer_suggested_retail': 'msrp',
      'retail_price': 'msrp',
      'manufacturer_price': 'msrp',
      'list_price': 'msrp',
      'suggested_retail_price': 'msrp',
      'suggestedretailprice': 'msrp',
      'retail': 'msrp',
      'price': 'msrp',
      
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
      'series': 'collectionName',
      'line': 'collectionName',
      
      // Ship Types variations
      'ship_types': 'shipTypes',
      'shiptypes': 'shipTypes',
      'shipping_types': 'shipTypes',
      'shippingtypes': 'shipTypes',
      'ship': 'shipTypes',
      'shipping': 'shipTypes',
      'delivery': 'shipTypes',
      
      // Single Set Item variations
      'single_set_item': 'singleSetItem',
      'singlesetitem': 'singleSetItem',
      'single_setitem': 'singleSetItem',
      'single_set': 'singleSetItem',
      'singleset': 'singleSetItem',
      'set_item': 'singleSetItem',
      'setitem': 'singleSetItem',
      'item_type': 'singleSetItem',
      'itemtype': 'singleSetItem',
      'type': 'singleSetItem',
      
      // Title variations
      'title': 'title',
      'product_title': 'title',
      'producttitle': 'title',
      'name': 'title',
      'product_name': 'title',
      'productname': 'title',
      'description': 'title',
      'product_description': 'title',
      'productdescription': 'title',
      'Title': 'title',
      'TITLE': 'title',
      
      // Category variations
      'category': 'category',
      'product_category': 'category',
      'productcategory': 'category',
      'cat': 'category',
      'class': 'category',
      'classification': 'category',
      
      // Main Image URL variations
      'main_image_url': 'mainImageUrl',
      'mainimageurl': 'mainImageUrl',
      'main_imageurl': 'mainImageUrl',
      'main_image': 'mainImageUrl',
      'mainimage': 'mainImageUrl',
      'image_url': 'mainImageUrl',
      'imageurl': 'mainImageUrl',
      'primary_image': 'mainImageUrl',
      'primaryimage': 'mainImageUrl',
      
      // Gallery Images variations
      'gallery_images': 'galleryImages',
      'galleryimages': 'galleryImages',
      'gallery_image': 'galleryImages',
      'galleryimage': 'galleryImages',
      'gallery': 'galleryImages',
      'images': 'galleryImages'
    };
    
    // Return mapped field or original normalized name
    if (fieldMappings[normalized]) {
      return fieldMappings[normalized];
    }
    
    // Fallback: try case-insensitive matching for common fields
    const lowerNormalized = normalized.toLowerCase();
    for (const [key, value] of Object.entries(fieldMappings)) {
      if (key.toLowerCase() === lowerNormalized) {
        return value;
      }
    }
    
    return normalized;
  }

  // Process Excel file from buffer (.xlsx, .xls)
  static async processExcelBuffer(buffer) {
    try {
      // Validate buffer
      if (!buffer || buffer.length === 0) {
        throw new Error('Excel file buffer is empty or invalid');
      }

      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      // Check if workbook has any sheets
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Excel file contains no worksheets');
      }
      
      const sheetName = workbook.SheetNames[0]; // Get first sheet
      const worksheet = workbook.Sheets[sheetName];
      
      // Check if worksheet exists
      if (!worksheet) {
        throw new Error(`Worksheet "${sheetName}" not found in Excel file`);
      }
      
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // Use first row as header
        defval: '' // Default value for empty cells
      });
      
      // Validate data structure
      if (!data || !Array.isArray(data)) {
        throw new Error('Failed to parse Excel file data');
      }
      
      if (data.length === 0) {
        throw new Error('Excel file is empty');
      }
      
      // Check if first row (headers) exists and is valid
      if (!data[0] || !Array.isArray(data[0])) {
        throw new Error('Excel file does not contain valid headers');
      }
      
      // First row is headers, rest is data
      const originalHeaders = data[0].map(header => String(header).trim());
      const headers = originalHeaders.map(header => FileProcessor.normalizeHeader(header));
      const rows = data.slice(1);
      
      console.log('📋 Original Excel headers:', originalHeaders);
      console.log('📋 Normalized headers:', headers);
      console.log('📋 First row data sample:', rows[0]);
      console.log('📋 Second row data sample:', rows[1]);
      
      
      
      // Convert to objects
      const result = rows.map((row, rowIndex) => {
        const obj = {};
        headers.forEach((header, index) => {
          const value = row[index];
          if (value === null || value === undefined) {
            obj[header] = '';
          } else {
            // Handle numeric values (prices, quantities, etc.)
            if (typeof value === 'number') {
              obj[header] = value;
            } else {
              // Handle string values
              let stringValue = String(value).trim();
              
              // Clean up commas in numeric fields (like prices)
              if (header === 'msrp' || header === 'brandRealPrice' || header === 'brandMiscellaneous') {
                // Remove commas from numeric fields
                stringValue = stringValue.replace(/,/g, '');
              }
              
              // Try to convert to number if it looks like a number
              if (stringValue !== '' && !isNaN(stringValue) && !isNaN(parseFloat(stringValue))) {
                obj[header] = parseFloat(stringValue);
              } else {
                obj[header] = stringValue;
              }
            }
          }
        });
        
        
        return obj;
      }).filter(obj => {
        // Filter out empty rows
        return Object.values(obj).some(value => value !== '' && value !== null && value !== undefined);
      });
      
      return result;
    } catch (error) {
      throw new Error(`Excel processing error: ${error.message}`);
    }
  }
  
  // Process CSV file from buffer
  static async processCSVBuffer(buffer) {
    return new Promise((resolve, reject) => {
      try {
        // Validate buffer
        if (!buffer || buffer.length === 0) {
          reject(new Error('CSV file buffer is empty or invalid'));
          return;
        }

        const results = [];
        
        const stream = Readable.from(buffer.toString());
        
        stream
          .pipe(csv({
            mapHeaders: ({ header }) => FileProcessor.normalizeHeader(header)
          }))
          .on('data', (data) => {
            // Clean up data and remove empty rows
            const cleanData = {};
            let hasData = false;
            
            Object.keys(data).forEach(key => {
              const value = data[key];
              if (value === null || value === undefined) {
                cleanData[key] = '';
              } else {
                const stringValue = String(value).trim();
                // Try to convert to number if it looks like a number
                if (stringValue !== '' && !isNaN(stringValue) && !isNaN(parseFloat(stringValue))) {
                  cleanData[key] = parseFloat(stringValue);
                } else {
                  cleanData[key] = stringValue;
                }
                if (cleanData[key] !== '') hasData = true;
              }
            });
            
            if (hasData) {
              results.push(cleanData);
            }
          })
          .on('end', () => {
            if (results.length === 0) {
              reject(new Error('CSV file contains no valid data'));
            } else {
              resolve(results);
            }
          })
          .on('error', (error) => {
            reject(new Error(`CSV processing error: ${error.message}`));
          });
      } catch (error) {
        reject(new Error(`CSV processing error: ${error.message}`));
      }
    });
  }
  
  // Main file processor - works with memory buffer
  static async processFileBuffer(buffer, filename) {
    try {
      // Validate inputs
      if (!buffer || buffer.length === 0) {
        throw new Error('File buffer is empty or invalid');
      }
      
      if (!filename) {
        throw new Error('Filename is required');
      }
      
      const extension = path.extname(filename).toLowerCase();
      
      let data;
      
      if (extension === '.csv') {
        data = await this.processCSVBuffer(buffer);
      } else if (extension === '.xlsx' || extension === '.xls') {
        data = await this.processExcelBuffer(buffer);
      } else {
        throw new Error(`Unsupported file format: ${extension}. Supported formats: .csv, .xlsx, .xls`);
      }
      
      // Validate processed data
      if (!data || !Array.isArray(data)) {
        throw new Error('Failed to process file data');
      }
      
      if (data.length === 0) {
        throw new Error('No valid data found in file');
      }
      
      return data;
    } catch (error) {
      // Re-throw with more context
      if (error.message.includes('Excel processing error') || 
          error.message.includes('CSV processing error') ||
          error.message.includes('Unsupported file format')) {
        throw error; // Re-throw as-is for specific errors
      } else {
        throw new Error(`File processing error: ${error.message}`);
      }
    }
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
      
      // Sub SKU is optional - if not provided, use group SKU as default
      if (!item.subSku || item.subSku.trim() === '') {
        console.log(`Row ${row}: Sub SKU is empty, using Group SKU "${item.groupSku}" as Sub SKU`);
        item.subSku = item.groupSku; // Use group SKU as sub SKU if not provided
      }
      
      if (!item.brandId && !item.brandName) {
        errors.push(`Row ${row}: Brand ID or Brand Name is required`);
        return;
      }

      // Brand Real Price is mandatory - accept decimal values like 59.00
      const brandRealPriceValue = item.brandRealPrice;
      if (brandRealPriceValue === undefined || brandRealPriceValue === null || brandRealPriceValue === '') {
        errors.push(`Row ${row}: Brand Real Price is mandatory`);
        return;
      }
      
      // MSRP is mandatory - accept decimal values like 59.00
      const msrpValue = item.msrp;
      if (msrpValue === undefined || msrpValue === null || msrpValue === '') {
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
        brandRealPrice: item.brandRealPrice !== undefined && item.brandRealPrice !== null && item.brandRealPrice !== '' ? parseFloat(item.brandRealPrice) : undefined,
        brandMiscellaneous: item.brandMiscellaneous !== undefined && item.brandMiscellaneous !== null && item.brandMiscellaneous !== '' ? parseFloat(item.brandMiscellaneous) : 0,
        msrp: item.msrp !== undefined && item.msrp !== null && item.msrp !== '' ? parseFloat(item.msrp) : undefined,
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
