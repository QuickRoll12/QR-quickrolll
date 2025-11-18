const User = require('../models/User');
const FacultyRequest = require('../models/facultyRequest');
const Course = require('../models/Course');
const Section = require('../models/Section');
const bcrypt = require('bcryptjs');
const xlsx = require('xlsx');
const crypto = require('crypto');
const mongoose = require('mongoose'); // Import mongoose
const { sendFacultyCredentials, sendFacultyRejectionEmail } = require('../services/emailService');
const { downloadFile, deleteFile, generatePresignedViewUrl } = require('../config/s3');

// Get all faculty requests
exports.getFacultyRequests = async (req, res) => {
  try {
    const requests = await FacultyRequest.find().sort({ createdAt: -1 });
    
    // Generate presigned URLs for S3 images
    const requestsWithPresignedUrls = await Promise.all(
      requests.map(async (request) => {
        const requestObj = request.toObject();
        
        // Check if this is an S3 URL
        if (requestObj.photoUrl && requestObj.photoUrl.includes('.s3.') && requestObj.photoUrl.includes('amazonaws.com')) {
          try {
            // Extract S3 key from URL: https://bucket.s3.region.amazonaws.com/key
            const urlParts = requestObj.photoUrl.split('amazonaws.com/');
            if (urlParts.length > 1) {
              const s3Key = urlParts[1];
              
              // Generate presigned URL (1 hour expiry)
              const presignedUrl = await generatePresignedViewUrl(s3Key, 3600);
              requestObj.photoUrl = presignedUrl;
            }
          } catch (error) {
            console.error('Error generating presigned URL:', error.message);
            // Keep the original photoUrl as fallback
          }
        }
        
        return requestObj;
      })
    );
    
    res.json(requestsWithPresignedUrls);
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
        'We can not verify your information properly, please send a new request with correct information.'
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
    // Handle both S3 approach (with s3Key) and traditional approach (with file upload)
    const { s3Key } = req.body;
    let fileBuffer;
    
    if (s3Key) {
      // New S3 approach: download file from S3
      console.log('Using S3 approach - downloading file:', s3Key);
      fileBuffer = await downloadFile(s3Key);
    } else if (req.file && req.file.buffer) {
      // Traditional approach: use uploaded file buffer
      console.log('Using traditional approach - processing uploaded file');
      fileBuffer = req.file.buffer;
    } else {
      return res.status(400).json({ message: 'No file uploaded or S3 key provided' });
    }
    
    // Read Excel file from buffer
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
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
    
    // If using S3 approach, delete the temporary file after preview
    if (s3Key) {
      try {
        await deleteFile(s3Key);
        console.log('Temporary S3 file deleted after preview:', s3Key);
      } catch (deleteError) {
        console.error('Error deleting temporary S3 file:', deleteError);
        // Don't fail the request if cleanup fails
      }
    }
    
    res.json({ 
      message: 'File preview generated successfully',
      totalRecords: data.length,
      previewData
    });
  } catch (error) {
    console.error('Error previewing student data:', error);
    
    // Cleanup S3 file even on error
    if (s3Key) {
      try {
        await deleteFile(s3Key);
        console.log('Temporary S3 file deleted after error:', s3Key);
      } catch (deleteError) {
        console.error('Error deleting temporary S3 file on error:', deleteError);
      }
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

exports.uploadStudentData = async (req, res) => {
  let s3KeyToDelete = null;

  try {
    // --- STEP 1: Get File Buffer (No change) ---
    const { s3Key } = req.body;
    let fileBuffer;
    
    if (s3Key) {
      s3KeyToDelete = s3Key;
      try {
        fileBuffer = await downloadFile(s3Key);
      } catch (downloadError) {
        console.error('❌ Failed to download file from S3:', downloadError);
        throw new Error('Failed to download file from S3: ' + downloadError.message);
      }
    } else if (req.file && req.file.buffer) {
      fileBuffer = req.file.buffer;
    } else {
      return res.status(400).json({ message: 'No file uploaded or S3 key provided' });
    }

    // --- STEP 2: Parse Excel (No change) ---
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty' });
    }

    // --- STEP 3: OPTIMIZATION - First Pass & In-Memory Validation ---
    const requiredFields = ['name', 'email', 'studentId', 'course', 'section', 'semester', 'classRollNumber', 'universityRollNumber'];
    
    const results = {
      totalRecords: data.length,
      successCount: 0,
      errorCount: 0,
      errors: []
    };
    
    // To check for duplicates *within the file*
    const emailsInFile = new Set();
    const studentIdsInFile = new Set();
    const univRollsInFile = new Set();

    // To check for duplicates *in the database*
    const emailsToQuery = [];
    const studentIdsToQuery = [];
    const univRollsToQuery = [];

    // Rows that pass the first-pass in-memory validation
    const rowsToProcess = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel row number
      
      // 1. Check for missing fields
      const missingFields = requiredFields.filter(field => !row.hasOwnProperty(field));
      if (missingFields.length > 0) {
        results.errors.push({ row: rowNum, message: `Missing required fields: ${missingFields.join(', ')}` });
        continue; // Skip this row
      }

      // 2. Check for duplicates *within the file*
      if (emailsInFile.has(row.email)) {
        results.errors.push({ row: rowNum, message: `Duplicate email in file: ${row.email}` });
        continue;
      }
      if (studentIdsInFile.has(row.studentId)) {
        results.errors.push({ row: rowNum, message: `Duplicate Student ID in file: ${row.studentId}` });
        continue;
      }
      if (univRollsInFile.has(row.universityRollNumber)) {
        results.errors.push({ row: rowNum, message: `Duplicate University Roll Number in file: ${row.universityRollNumber}` });
        continue;
      }

      // If valid so far, add to sets and arrays for DB checking
      emailsInFile.add(row.email);
      studentIdsInFile.add(row.studentId);
      univRollsInFile.add(row.universityRollNumber);
      
      emailsToQuery.push(row.email);
      studentIdsToQuery.push(row.studentId);
      univRollsToQuery.push(row.universityRollNumber);

      rowsToProcess.push({ row, rowNum });
    }
    
    // --- STEP 4: OPTIMIZATION - Bulk Database Validation ---
    
    // Run all 3 queries in parallel
    const [existingEmails, existingStudentIds, existingUnivRolls] = await Promise.all([
      User.find({ email: { $in: emailsToQuery } }, 'email').lean(),
      User.find({ studentId: { $in: studentIdsToQuery } }, 'studentId').lean(),
      User.find({ universityRollNumber: { $in: univRollsToQuery } }, 'universityRollNumber').lean()
    ]);

    // Convert arrays to Sets for fast O(1) lookup
    const existingEmailSet = new Set(existingEmails.map(u => u.email));
    const existingStudentIdSet = new Set(existingStudentIds.map(u => u.studentId));
    const existingUnivRollSet = new Set(existingUnivRolls.map(u => u.universityRollNumber));

    // --- STEP 5: OPTIMIZATION - Final Processing & Row-by-Row Save ---

    const defaultSectionId = new mongoose.Types.ObjectId();
    const defaultPassword = 'quickroll';
    
    // Loop only over the rows that passed the first validation
    for (const { row, rowNum } of rowsToProcess) {
      try {
        // 1. Check against bulk DB results (now an in-memory check)
        if (existingEmailSet.has(row.email)) {
          throw new Error(`Email ${row.email} already exists in database`);
        }
        if (existingStudentIdSet.has(row.studentId)) {
          throw new Error(`Student ID ${row.studentId} already exists in database`);
        }
        if (existingUnivRollSet.has(row.universityRollNumber)) {
          throw new Error(`University Roll Number ${row.universityRollNumber} already exists in database`);
        }
        
        // 2. All checks passed, create and save the new student
        const newStudent = new User({
          name: row.name,
          email: row.email,
          password: defaultPassword, // Will be hashed by pre-save hook
          role: 'student',
          studentId: row.studentId,
          facultyId: 'N/A',
          course: row.course,
          section: row.section,
          semester: row.semester,
          classRollNumber: row.classRollNumber,
          universityRollNumber: row.universityRollNumber,
          photo_url: row.photo_url || '/default-student.png',
          sectionId: defaultSectionId,
          isVerified: true,
          passwordChangeRequired: true,
          sectionsTeaching: []
        });

        await newStudent.save(); // This is the only 'await' in the loop
        
        results.successCount++;
        
      } catch (error) {
        // Record any error from the DB checks or the .save() operation
        results.errors.push({
          row: rowNum,
          message: error.message
        });
      }
    }
    
    // --- STEP 6: Final Tally & S3 Cleanup (Modified) ---

    // Final error count is just the length of the errors array
    results.errorCount = results.errors.length;

    console.log(`\n✅ Processing complete!`);
    console.log(`📊 Summary: ${results.successCount} successful, ${results.errorCount} errors out of ${results.totalRecords} total records\n`);

    if (s3Key) {
      try {
        await deleteFile(s3Key);
        console.log('🗑️  Temporary S3 file deleted after processing:', s3Key);
      } catch (deleteError) {
        console.error('Error deleting temporary S3 file:', deleteError);
      }
    }
    
    res.json({
      message: 'Student data processed',
      stats: results
    });

  } catch (error) {
    console.error('Error uploading student data:', error);

    // Identical error cleanup (No change)
    if (s3KeyToDelete) { // Use the variable from the top
      try {
        await deleteFile(s3KeyToDelete);
        console.log('Temporary S3 file deleted after error:', s3KeyToDelete);
      } catch (deleteError) {
        console.error('Error deleting temporary S3 file on error:', deleteError);
      }
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};