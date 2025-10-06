/**
 * Utility functions for data import/export
 */

// Convert JSON array to CSV string
export function jsonToCSV(data: any[], columns: string[]): string {
  if (!data || data.length === 0) return '';

  // Create header row
  const header = columns.join(',');
  
  // Create data rows
  const rows = data.map(record => {
    return columns.map(col => {
      const value = record[col];
      
      // Handle different value types
      if (value === null || value === undefined) {
        return '';
      }
      
      // Handle objects/arrays (JSON stringify)
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      
      // Handle strings with commas, quotes, or newlines
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

// Parse CSV string to JSON array
export function csvToJSON(csv: string, columns: string[]): any[] {
  const lines = csv.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) return [];
  
  // Skip header row (assume first row is header)
  const dataLines = lines.slice(1);
  
  return dataLines.map(line => {
    const values = parseCSVLine(line);
    const record: any = {};
    
    columns.forEach((col, index) => {
      if (index < values.length) {
        record[col] = values[index];
      }
    });
    
    return record;
  });
}

// Parse a single CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current);
  
  return result;
}

// Download file in browser
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
