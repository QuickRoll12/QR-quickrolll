const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    rollNumber: String,
    date: Date,
    status: String
});

module.exports = mongoose.model('Attendance', AttendanceSchema);