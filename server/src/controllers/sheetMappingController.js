const SheetMapping = require('../models/SheetMapping');
const { initializeSheets } = require('../services/googleSheetsService');

// Create a new sheet mapping
exports.createSheetMapping = async (req, res) => {
  try {
    const { department, semester, section, spreadsheetId, sheetId } = req.body;

    // Validate required fields
    if (!department || !semester || !section || !spreadsheetId || !sheetId) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if mapping already exists
    const existingMapping = await SheetMapping.findOne({ department, semester, section });
    if (existingMapping) {
      return res.status(400).json({ message: 'Mapping already exists for this department, semester, and section' });
    }

    // Verify spreadsheet access
    const sheets = initializeSheets();
    if (!sheets) {
      return res.status(500).json({ message: 'Failed to initialize Google Sheets API' });
    }

    try {
      // Try to access the spreadsheet to verify permissions
      await sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId
      });
    } catch (error) {
      console.error('Error accessing spreadsheet:', error);
      return res.status(400).json({ 
        message: 'Could not access the specified spreadsheet. Please check the spreadsheet ID and ensure the service account has access.',
        error: error.message
      });
    }

    // Create new mapping
    const newMapping = new SheetMapping({
      department,
      semester,
      section,
      spreadsheetId,
      sheetId
    });

    await newMapping.save();

    res.status(201).json({
      message: 'Sheet mapping created successfully',
      mapping: newMapping
    });
  } catch (error) {
    console.error('Error creating sheet mapping:', error);
    res.status(500).json({ message: 'Error creating sheet mapping', error: error.message });
  }
};

// Get all sheet mappings
exports.getAllSheetMappings = async (req, res) => {
  try {
    const mappings = await SheetMapping.find();
    res.status(200).json(mappings);
  } catch (error) {
    console.error('Error getting sheet mappings:', error);
    res.status(500).json({ message: 'Error getting sheet mappings', error: error.message });
  }
};

// Get sheet mapping by department, semester, and section
exports.getSheetMapping = async (req, res) => {
  try {
    const { department, semester, section } = req.params;
    
    const mapping = await SheetMapping.findOne({ department, semester, section });
    
    if (!mapping) {
      return res.status(404).json({ message: 'Sheet mapping not found' });
    }
    
    res.status(200).json(mapping);
  } catch (error) {
    console.error('Error getting sheet mapping:', error);
    res.status(500).json({ message: 'Error getting sheet mapping', error: error.message });
  }
};

// Update a sheet mapping
exports.updateSheetMapping = async (req, res) => {
  try {
    const { department, semester, section } = req.params;
    const { spreadsheetId, sheetId } = req.body;

    // Validate required fields
    if (!spreadsheetId || !sheetId) {
      return res.status(400).json({ message: 'Spreadsheet ID and Sheet ID are required' });
    }

    // Find and update the mapping
    const mapping = await SheetMapping.findOneAndUpdate(
      { department, semester, section },
      { spreadsheetId, sheetId },
      { new: true, runValidators: true }
    );

    if (!mapping) {
      return res.status(404).json({ message: 'Sheet mapping not found' });
    }

    res.status(200).json({
      message: 'Sheet mapping updated successfully',
      mapping
    });
  } catch (error) {
    console.error('Error updating sheet mapping:', error);
    res.status(500).json({ message: 'Error updating sheet mapping', error: error.message });
  }
};

// Delete a sheet mapping
exports.deleteSheetMapping = async (req, res) => {
  try {
    const { department, semester, section } = req.params;
    
    const mapping = await SheetMapping.findOneAndDelete({ department, semester, section });
    
    if (!mapping) {
      return res.status(404).json({ message: 'Sheet mapping not found' });
    }
    
    res.status(200).json({
      message: 'Sheet mapping deleted successfully',
      mapping
    });
  } catch (error) {
    console.error('Error deleting sheet mapping:', error);
    res.status(500).json({ message: 'Error deleting sheet mapping', error: error.message });
  }
};