const User = require('../models/User');
const FacultyRequest = require('../models/facultyRequest');
const Course = require('../models/Course');
const Section = require('../models/Section');
const bcrypt = require('bcryptjs');
const xlsx = require('xlsx');
const crypto = require('crypto');
const mongoose = require('mongoose'); // Import mongoose
const { sendFacultyCredentials, sendFacultyRejectionEmail } = require('../services/emailService');

// Get all faculty requests
exports.getFacultyRequests = async (req, res) => {
  try {
    const requests = await FacultyRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error('Error fetching faculty requests:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Approve faculty request
exports.approveFacultyRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { approvedAssignments } = req.body; // Array of approved teaching assignments
    
    // Find the faculty request
    const request = await FacultyRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Faculty request not found' });
    }
    
    // Check if request is already processed
    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Request already ${request.status}` });
    }
    
    // Ensure teachingAssignments is not empty to avoid validation errors
    if (!request.teachingAssignments || !Array.isArray(request.teachingAssignments) || request.teachingAssignments.length === 0) {
      return res.status(400).json({ 
        message: 'Faculty request must include at least one teaching assignment with semester and section' 
      });
    }
    
    // If no approved assignments are specified, use all requested assignments
    let assignmentsToApprove = request.teachingAssignments;
    let requestStatus = 'approved';
    
    // If specific assignments are approved, filter them
    if (approvedAssignments && Array.isArray(approvedAssignments) && approvedAssignments.length > 0) {
      // Filter only valid assignments that exist in the original request
      assignmentsToApprove = request.teachingAssignments.filter(assignment => {
        return approvedAssignments.some(approved => 
          approved.semester === assignment.semester && 
          approved.section === assignment.section
        );
      });
      
      // If no assignments were approved or some were rejected, mark as partially approved
      if (assignmentsToApprove.length === 0) {
        return res.status(400).json({ message: 'At least one teaching assignment must be approved' });
      } else if (assignmentsToApprove.length < request.teachingAssignments.length) {
        requestStatus = 'partially_approved';
      }
    }
    
    // Use "quickroll123" as the default password for faculty - this is the correct default password
    const tempPassword = "quickroll123";
    
    // Create new faculty user with a faculty ID
    const facultyId = `F-${Date.now().toString().slice(-6)}`; // Generate a faculty ID
    
    // Hash the password manually to ensure it's stored correctly
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);
    
    const newFaculty = new User({
      name: request.name,
      email: request.email,
      password: hashedPassword, // Use the pre-hashed password to avoid double hashing
      role: 'faculty',
      studentId: 'N/A', // Not applicable for faculty
      facultyId: facultyId,
      course: 'N/A', // Not applicable for faculty
      section: 'N/A', // Not applicable for faculty
      classRollNumber: 'N/A', // Not applicable for faculty
      universityRollNumber: 'N/A', // Not applicable for faculty
      department: request.department,
      // Only use the approved teaching assignments
      teachingAssignments: assignmentsToApprove,
      isVerified: true, // Auto-verify faculty accounts
      passwordChangeRequired: true // Require password change on first login
    });
    
    // Set a flag to skip password hashing in the pre-save hook
    newFaculty.$skipPasswordHashing = true;
    
    // Save the new faculty user
    await newFaculty.save();
    
    // Update request status
    request.status = requestStatus;
    request.processedAt = new Date(); // Add timestamp for automatic deletion
    request.approvedAssignments = assignmentsToApprove; // Store which assignments were approved
    request.processedBy = req.admin ? req.admin.id : 'admin'; // Track who processed the request
    
    // Set expiration date for automatic deletion (24 hours from now)
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 24);
    request.expiresAt = expirationDate;
    
    await request.save();
    
    // Send email with credentials
    try {
      await sendFacultyCredentials(
        newFaculty.email,
        newFaculty.name,
        newFaculty.facultyId,
        tempPassword
      );
      console.log('Faculty credentials email sent successfully to:', newFaculty.email);
    } catch (emailError) {
      console.error('Failed to send faculty credentials email:', emailError);
      // Continue with approval even if email fails
    }
    
    res.json({ 
      message: 'Faculty request approved successfully. Credentials have been sent to the faculty email.',
      faculty: {
        name: newFaculty.name,
        email: newFaculty.email
        // Don't return the password in the response for security
      }
    });
  } catch (error) {
    console.error('Error approving faculty request:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reject faculty request
exports.rejectFacultyRequest = async (req, res) => {
  try {
    const request = await FacultyRequest.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ message: 'Faculty request not found' });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Request is already ${request.status}` });
    }
    
    request.status = 'rejected';
    request.processedAt = new Date(); // Add timestamp for when it was processed
    request.processedBy = req.admin ? req.admin.id : 'admin'; // Track who processed the request
    
    // Set expiration date for automatic deletion (24 hours from now)
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 24);
    request.expiresAt = expirationDate;
    
    await request.save();
    
    // Send rejection email to faculty applicant
    try {
      await sendFacultyRejectionEmail(
        request.email,
        request.name,
        rejectionReason || ''
      );
      console.log('Faculty rejection email sent successfully to:', request.email);
    } catch (emailError) {
      console.error('Failed to send faculty rejection email:', emailError);
      // Continue with rejection even if email fails
    }
    
    res.json({ message: 'Faculty request rejected successfully. Notification has been sent to the applicant.' });
  } catch (error) {
    console.error('Error rejecting faculty request:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Preview student data from Excel file
exports.previewStudentData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Read Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    if (data.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty' });
    }
    
    // Validate required fields in the first row
    const requiredFields = ['name', 'email', 'studentId', 'course', 'section', 'semester', 'classRollNumber', 'universityRollNumber'];
    const firstRow = data[0];
    
    const missingFields = requiredFields.filter(field => !firstRow.hasOwnProperty(field));
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }
    
    // Return preview of first 5 rows (or all if less than 5)
    const previewData = data.slice(0, 5);
    
    res.json({ 
      message: 'File preview generated successfully',
      totalRecords: data.length,
      previewData
    });
  } catch (error) {
    console.error('Error previewing student data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Upload and process student data from Excel file
exports.uploadStudentData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Read Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    if (data.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty' });
    }
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'studentId', 'course', 'section', 'semester', 'classRollNumber', 'universityRollNumber'];
    
    // Process each record
    const results = {
      totalRecords: data.length,
      successCount: 0,
      errorCount: 0,
      errors: []
    };

    // Create a default section ID to use for all students
    // This is a workaround for the duplicate key error issue
    const defaultSectionId = new mongoose.Types.ObjectId();
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // +2 because Excel is 1-indexed and we skip the header row
      
      try {
        // Check for missing fields
        const missingFields = requiredFields.filter(field => !row.hasOwnProperty(field));
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        // Check if email already exists
        const existingUserByEmail = await User.findOne({ email: row.email });
        if (existingUserByEmail) {
          throw new Error(`Email ${row.email} already exists`);
        }
        
        // Check if studentId already exists
        const existingUserByStudentId = await User.findOne({ studentId: row.studentId });
        if (existingUserByStudentId) {
          throw new Error(`Student ID ${row.studentId} already exists`);
        }
        
        // Check if universityRollNumber already exists
        const existingUserByUniversityRoll = await User.findOne({ universityRollNumber: row.universityRollNumber });
        if (existingUserByUniversityRoll) {
          throw new Error(`University Roll Number ${row.universityRollNumber} already exists`);
        }
        
        // Use 'quickroll' as the default password instead of generating a random one
        const defaultPassword = 'quickroll';
        
        // Create new student user with the default sectionId
        const newStudent = new User({
          name: row.name,
          email: row.email,
          password: defaultPassword, // Will be hashed by pre-save hook
          role: 'student', // Always student for this upload
          studentId: row.studentId,
          facultyId: 'N/A', // Not applicable for students
          course: row.course,
          section: row.section,
          semester: row.semester,
          classRollNumber: row.classRollNumber,
          universityRollNumber: row.universityRollNumber,
          photo_url: row.photo_url || '/default-student.png', // Use provided photo URL or default
          sectionId: defaultSectionId, // Use the default section ID
          isVerified: true, // Auto-verify student accounts
          passwordChangeRequired: true, // Always require password change on first login
          sectionsTeaching: [] // Empty for students
        });
        
        // Save the new student user
        await newStudent.save();
        
        // Increment success count
        results.successCount++;
      } catch (error) {
        // Record the error
        results.errorCount++;
        results.errors.push({
          row: rowNum,
          message: error.message
        });
      }
    }
    
    res.json({
      message: 'Student data processed',
      stats: results
    });
  } catch (error) {
    console.error('Error uploading student data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};