const { google } = require('googleapis');
const SheetMapping = require('../models/SheetMapping');

// Set Node.js options to handle legacy OpenSSL key formats
// This helps with the 'error:1E08010C:DECODER routines::unsupported' error
try {
  process.env.NODE_OPTIONS = process.env.NODE_OPTIONS || '';
  if (!process.env.NODE_OPTIONS.includes('--openssl-legacy-provider')) {
    process.env.NODE_OPTIONS += ' --openssl-legacy-provider';
  }
} catch (error) {
  console.warn('Could not set NODE_OPTIONS for OpenSSL legacy provider:', error);
}

// Initialize the Google Sheets API client
const initializeSheets = () => {
  try {
    // Check if credentials are available
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.error('Google Sheets API credentials are missing');
      return null;
    }

    // Process the private key to handle potential formatting issues
    let privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    // For Render and similar platforms where the key might be stored with actual newlines
    // We don't need to do any replacement, as the key is already properly formatted
    console.log('Using service account:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
    console.log('Private key format check - contains actual newlines:', privateKey.includes('\n') === false && privateKey.includes('\r\n') === false);
    
    // Create JWT client using service account credentials
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    // Create Google Sheets API client
    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error('Error initializing Google Sheets API:', error);
    return null;
  }
};

// Get sheet mapping for a specific department, semester, and section
const getSheetMapping = async (department, semester, section) => {
  try {
    const mapping = await SheetMapping.findOne({ department, semester, section });
    if (!mapping) {
      throw new Error(`No sheet mapping found for ${department} ${semester} ${section}`);
    }
    return mapping;
  } catch (error) {
    console.error('Error getting sheet mapping:', error);
    throw error;
  }
};

// Read data from a Google Sheet
const readSheetData = async (sheets, spreadsheetId, sheetId) => {
  try {
    // Get all data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetId,
    });

    return response.data.values || [];
  } catch (error) {
    console.error('Error reading sheet data:', error);
    throw error;
  }
};

// Update attendance data in a Google Sheet
const updateAttendanceSheet = async (department, semester, section, attendanceData) => {
  try {
    // Initialize Google Sheets API
    const sheets = initializeSheets();
    if (!sheets) {
      throw new Error('Failed to initialize Google Sheets API');
    }

    // Get sheet mapping
    const mapping = await getSheetMapping(department, semester, section);
    const { spreadsheetId, sheetId } = mapping;

    // Read current sheet data
    const sheetData = await readSheetData(sheets, spreadsheetId, sheetId);

    // Process sheet data
    const updatedData = processAttendanceData(sheetData, attendanceData);

    // Write updated data back to the sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: sheetId,
      valueInputOption: 'RAW',
      resource: {
        values: updatedData,
      },
    });

    return { success: true, message: 'Attendance updated in Google Sheet' };
  } catch (error) {
    console.error('Error updating attendance sheet:', error);
    throw error;
  }
};

// Process attendance data and prepare for sheet update
const processAttendanceData = (sheetData, attendanceData) => {
  // Current date in format DD/MM/YYYY
  const today = new Date();
  const dateString = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  // If sheet is empty, create a new sheet with headers
  if (!sheetData || sheetData.length === 0) {
    return [
      ['', ''], // A1, B1 empty
      ['', ''], // A2, B2 empty
      ['', ''], // A3, B3 empty
      ['Gmail', dateString], // A4, B4 headers
      ...Object.keys(attendanceData).map(gmail => [gmail, attendanceData[gmail]]) // Student data
    ];
  }

  // Find the Gmail header row (should be row 4, index 3)
  const headerRowIndex = 3; // 0-based index for row 4
  
  // Ensure we have at least 4 rows
  while (sheetData.length <= headerRowIndex) {
    sheetData.push([]);
  }
  
  // Ensure the first column of header row is 'Gmail'
  if (!sheetData[headerRowIndex][0]) {
    sheetData[headerRowIndex][0] = 'Gmail';
  }

  // Check if today's date column already exists
  let dateColumnIndex = sheetData[headerRowIndex].findIndex(header => header === dateString);
  
  // If date doesn't exist, add it as a new column
  if (dateColumnIndex === -1) {
    dateColumnIndex = sheetData[headerRowIndex].length;
    sheetData[headerRowIndex][dateColumnIndex] = dateString;
  }

  // Process each student in the attendance data
  Object.entries(attendanceData).forEach(([gmail, status]) => {
    // Find if student already exists in the sheet
    let studentRowIndex = sheetData.findIndex((row, index) => 
      index > headerRowIndex && row[0] === gmail
    );
    
    // If student doesn't exist, add a new row
    if (studentRowIndex === -1) {
      studentRowIndex = sheetData.length;
      const newRow = Array(sheetData[headerRowIndex].length).fill('0'); // Initialize with zeros
      newRow[0] = gmail; // Set Gmail
      sheetData.push(newRow);
    }
    
    // Update attendance status for today
    sheetData[studentRowIndex][dateColumnIndex] = status.toString();
  });

  return sheetData;
};

module.exports = {
  updateAttendanceSheet,
  getSheetMapping,
  initializeSheets
};