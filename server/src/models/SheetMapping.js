const mongoose = require('mongoose');

const sheetMappingSchema = new mongoose.Schema({
  department: {
    type: String,
    required: true
  },
  semester: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true
  },
  spreadsheetId: {
    type: String,
    required: true
  },
  sheetId: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Compound index for unique department-semester-section combination
sheetMappingSchema.index({ department: 1, semester: 1, section: 1 }, { unique: true });

const SheetMapping = mongoose.model('SheetMapping', sheetMappingSchema);
module.exports = SheetMapping;