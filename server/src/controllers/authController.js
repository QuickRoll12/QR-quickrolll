const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationEmail, sendPasswordResetCode } = require('../services/emailService');
const Course = require('../models/Course');
const Section = require('../models/Section');
const bcrypt = require('bcryptjs');
const FacultyRequest = require('../models/facultyRequest');
const { upload } = require('../config/cloudinary');
const PasswordResetCode = require('../models/PasswordResetCode');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

exports.register = async (req, res) => {
  try {
    console.log("Request: ",req.body);
    const { name, email, password, role, studentId, course, section, semester, classRollNumber, universityRollNumber } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = new User({
      name,
      email,
      password,
      role,
      studentId,
      classRollNumber,
      universityRollNumber,
      course,
      section,
      semester,
      verificationToken,
      verificationExpires
    });

    // Find or create the course
    let foundCourse = await Course.findOne({ name: course });
    if (!foundCourse) {
      foundCourse = new Course({ name: course });
      await foundCourse.save();
    }

    // Find or create the section
    let foundSection = await Section.findOne({ name: section, courseId: foundCourse._id });
    if (!foundSection) {
      foundSection = new Section({ name: section, courseId: foundCourse._id });
      await foundSection.save();
    }

    // Link user to the section
    user.sectionId = foundSection._id;

    // Save the user
    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken);
      console.log('Verification email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue with registration even if email fails
    }

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        course: foundCourse.name,
        section: foundSection.name,
        semester: user.semester,
        classRollNumber: user.classRollNumber,
        universityRollNumber: user.universityRollNumber,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    const user = await User.findOne({
      verificationToken: token,
      verificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      // Send HTML response for error
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification Failed</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .container {
              background-color: white;
              border-radius: 10px;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
              padding: 40px;
              text-align: center;
              max-width: 500px;
              width: 90%;
            }
            .icon {
              font-size: 80px;
              margin-bottom: 20px;
              color: #e53e3e;
            }
            h1 {
              color: #2d3748;
              margin-bottom: 15px;
            }
            p {
              color: #4a5568;
              line-height: 1.6;
              margin-bottom: 25px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              padding: 12px 30px;
              border-radius: 50px;
              font-weight: 600;
              transition: transform 0.3s ease;
            }
            .button:hover {
              transform: translateY(-3px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">❌</div>
            <h1>Verification Failed</h1>
            <p>The verification link is invalid or has expired. Please request a new verification email.</p>
            <a href="${process.env.FRONTEND_URL}/login" class="button">Go to Login</a>
          </div>
        </body>
        </html>
      `);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    // Send HTML response for success
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verified Successfully</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .container {
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            padding: 40px;
            text-align: center;
            max-width: 500px;
            width: 90%;
          }
          .icon {
            font-size: 80px;
            margin-bottom: 20px;
            color: #48bb78;
          }
          h1 {
            color: #2d3748;
            margin-bottom: 15px;
          }
          p {
            color: #4a5568;
            line-height: 1.6;
            margin-bottom: 25px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 50px;
            font-weight: 600;
            transition: transform 0.3s ease;
          }
          .button:hover {
            transform: translateY(-3px);
          }
          .redirect-text {
            margin-top: 20px;
            font-size: 14px;
            color: #718096;
          }
        </style>
        <script>
          // Redirect to login page after 5 seconds
          setTimeout(function() {
            window.location.href = "${process.env.FRONTEND_URL}/login";
          }, 5000);
        </script>
      </head>
      <body>
        <div class="container">
          <div class="icon">✅</div>
          <h1>Email Verified Successfully!</h1>
          <p>Your email has been verified. You can now log in to your account.</p>
          <a href="${process.env.FRONTEND_URL}/login" class="button">Go to Login</a>
          <p class="redirect-text">You will be redirected to the login page in 5 seconds...</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Email verification error:', error);
    // Send HTML response for error
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification Error</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .container {
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            padding: 40px;
            text-align: center;
            max-width: 500px;
            width: 90%;
          }
          .icon {
            font-size: 80px;
            margin-bottom: 20px;
            color: #e53e3e;
          }
          h1 {
            color: #2d3748;
            margin-bottom: 15px;
          }
          p {
            color: #4a5568;
            line-height: 1.6;
            margin-bottom: 25px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 50px;
            font-weight: 600;
            transition: transform 0.3s ease;
          }
          .button:hover {
            transform: translateY(-3px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">❌</div>
          <h1>Verification Error</h1>
          <p>There was an error verifying your email. Please try again or request a new verification email.</p>
          <a href="${process.env.FRONTEND_URL}/login" class="button">Go to Login</a>
        </div>
      </body>
      </html>
    `);
  }
};

exports.login = async (req, res) => {
  try {
    const { identifier, password, deviceId} = req.body;

    // Check if identifier is provided
    if (!identifier) {
      return res.status(400).json({ message: 'Email or Student ID is required' });
    }

    // Find user by email or studentId
    let user;
    // First try to find by StudentId
    user = await User.findOne({ studentId: identifier });
    
    // If not found by StudentId, try to find by email (case insensitive)
    if (!user) {
      user = await User.findOne({ email: identifier.toLowerCase() });
    }
    
    // If still not found, return error
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in',
        isVerified: false
      });
    }

    // ✅ Save deviceId if not already set
    if (deviceId && !user.deviceId) {
      user.deviceId = deviceId;
      await user.save();
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        facultyId: user.facultyId,
        course: user.course,                    // ✅ Required
        department: user.department,
        semester: user.semester,                // ✅ Required
        section: user.section,                  // ✅ Required
        classRollNumber: user.classRollNumber,  // ✅ Required
        universityRollNumber: user.universityRollNumber,
        isVerified: user.isVerified,
        passwordChangeRequired: user.passwordChangeRequired || false
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is a student or faculty
    if (user.role === 'student') {
      // For students, generate a 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store the code in the database
      const passwordResetCode = new PasswordResetCode({
        email,
        code: verificationCode
      });
      
      await passwordResetCode.save();
      
      // Send the verification code via email
      try {
        await sendPasswordResetCode(email, verificationCode);
        return res.json({ 
          message: 'Password reset code sent to your email',
          isStudent: true,
          role: 'student'
        });
      } catch (emailError) {
        console.error('Failed to send password reset code:', emailError);
        return res.status(500).json({ message: 'Failed to send password reset code' });
      }
    } else {
      // For faculty, use the existing token-based approach
      // Generate password reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      // Update user with reset token
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetExpires;
      await user.save();

      // Send password reset email (would implement this in a real app)
      res.json({ 
        message: 'Password reset instructions sent to your email',
        isStudent: false,
        role: 'faculty',
        userId: user._id
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error processing request', error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword, token } = req.body;

    // Check if this is a student reset (with code) or faculty reset (with token)
    if (code) {
      // Student password reset with verification code
      // Find the verification code in the database
      const resetCodeDoc = await PasswordResetCode.findOne({ email, code });
      
      if (!resetCodeDoc) {
        return res.status(400).json({ message: 'Invalid or expired verification code' });
      }
      
      // Find the user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update password and reset passwordChangeRequired flag
      user.password = newPassword;
      user.passwordChangeRequired = false; // Reset the flag
      await user.save();
      
      // Delete the used verification code
      await PasswordResetCode.deleteOne({ _id: resetCodeDoc._id });
      
      return res.json({ message: 'Password reset successful. You can now login with your new password.' });
    } else if (token) {
      // Faculty password reset with token
      // Find user with valid reset token
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      // Update password and reset passwordChangeRequired flag
      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      user.passwordChangeRequired = false; // Reset the flag
      await user.save();

      res.json({ message: 'Password reset successful. You can now login with your new password.' });
    } else {
      return res.status(400).json({ message: 'Missing verification code or token' });
    }
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};

exports.resetFacultyPassword = async (req, res) => {
  try {
    const { 
      userId, 
      email, 
      facultyId, 
      newPassword 
    } = req.body;

    // Find user by ID and email
    const user = await User.findOne({ 
      _id: userId,
      email: email,
      role: 'faculty' 
    });

    if (!user) {
      return res.status(404).json({ message: 'Faculty user not found' });
    }

    // Verify faculty ID
    if (user.facultyId !== facultyId) { 
      return res.status(400).json({ message: 'Verification failed. Please check your Faculty ID.' });
    }

    // Update password without triggering validation for required fields
    // Use findByIdAndUpdate to bypass schema validation
    await User.findByIdAndUpdate(
      userId,
      { password: newPassword },
      { 
        new: true,
        runValidators: false // Skip validation to avoid required field errors
      }
    );

    // Since we bypassed the pre-save hook for password hashing,
    // we need to hash the password manually
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update just the password field
    await User.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { 
        new: true,
        runValidators: false
      }
    );

    // Update passwordChangeRequired flag
    await User.findByIdAndUpdate(
      userId,
      { passwordChangeRequired: false },
      { 
        new: true,
        runValidators: false
      }
    );

    res.json({ message: 'Password reset successful. You can now login with your new password.' });
  } catch (error) {
    console.error('Faculty reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    user.verificationToken = verificationToken;
    user.verificationExpires = verificationExpires;
    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken);
      console.log('Verification email resent to:', email);
      res.json({ message: 'Verification email sent successfully' });
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
      res.status(500).json({ message: 'Failed to send verification email' });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Error resending verification email', error: error.message });
  }
};

// Verify password reset code
exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    // Find the verification code in the database
    const resetCodeDoc = await PasswordResetCode.findOne({ email, code });
    
    if (!resetCodeDoc) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }
    
    // Code is valid
    res.json({ 
      message: 'Verification code is valid',
      valid: true
    });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ message: 'Error verifying code', error: error.message });
  }
};

// Handle faculty account requests
exports.facultyRequest = async (req, res) => {
  try {
    console.log('Faculty request received:', req.body);
    const { name, email, department, photoUrl } = req.body;
    
    // Parse teaching assignments from the request body
    let teachingAssignments = [];
    try {
      if (req.body.teachingAssignments) {
        teachingAssignments = JSON.parse(req.body.teachingAssignments);
      }
    } catch (parseError) {
      console.error('Error parsing teaching assignments:', parseError);
      return res.status(400).json({ message: 'Invalid teaching assignments format' });
    }
    
    // Validate inputs
    if (!name || !email || !department || !photoUrl) {
      console.error('Missing required fields:', { name, email, department, photoUrl });
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Validate teaching assignments
    if (!teachingAssignments || !Array.isArray(teachingAssignments) || teachingAssignments.length === 0) {
      console.error('Invalid teaching assignments:', teachingAssignments);
      return res.status(400).json({ message: 'At least one teaching assignment must be specified' });
    }
    
    // Validate each teaching assignment has semester and section
    const invalidAssignments = teachingAssignments.filter(
      assignment => !assignment.semester || !assignment.section
    );
    
    if (invalidAssignments.length > 0) {
      console.error('Invalid teaching assignments found:', invalidAssignments);
      return res.status(400).json({ message: 'All teaching assignments must include both semester and section' });
    }
    
    // Check if email already exists in users
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Email already registered as a user:', email);
      return res.status(400).json({ message: 'Email already registered as a user' });
    }
    
    // Check if there's already a pending request with this email
    const existingRequest = await FacultyRequest.findOne({ email });
    if (existingRequest) {
      console.log('A request with this email already exists:', email);
      return res.status(400).json({ message: 'A request with this email already exists' });
    }
    
    // Create new faculty request
    const newRequest = new FacultyRequest({
      name,
      email,
      department,
      teachingAssignments, // Only use the new teaching assignments field
      photoUrl
    });
    
    console.log('Saving new faculty request:', newRequest);
    await newRequest.save();
    console.log('Faculty request saved successfully');
    
    // Notify admin (optional - could implement email notification here)
    
    res.status(201).json({ 
      success: true, 
      message: 'Your faculty account request has been submitted successfully. You will receive credentials via email once approved.'
    });
  } catch (error) {
    console.error('Faculty request error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.', error: error.message });
  }
};