import XLSX from 'xlsx';
import csv from 'csv-parser';
import path from 'path';
import { Readable } from 'stream';

class FileProcessor {
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
      const headers = data[0].map(header => String(header).toLowerCase().trim());
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
}

export default FileProcessor;
