const express = require('express');
const router = express.Router();
const User = require('../models/User');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Middleware to ensure admin role - matches the approach in adminRoutes.js
const ensureAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Get all departments (unique values from faculty users)
router.get('/departments', ensureAdmin, async (req, res) => {
  try {
    // Find all faculty users and get unique departments
    const faculties = await User.find({ role: 'faculty' });
    
    // Extract unique departments
    const departments = [...new Set(faculties.map(faculty => faculty.department))].filter(Boolean);
    
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get faculties by department
router.get('/faculties', ensureAdmin, async (req, res) => {
  try {
    const { department } = req.query;
    
    if (!department) {
      return res.status(400).json({ message: 'Department is required' });
    }
    
    // Find all faculty users in the specified department
    const faculties = await User.find({ 
      role: 'faculty',
      department
    }).select('name email facultyId department teachingAssignments');
    
    res.json(faculties);
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add teaching assignment to faculty
router.post('/faculty/:id/assignment', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { semester, section } = req.body;
    
    // Validate inputs
    if (!semester || !section) {
      return res.status(400).json({ message: 'Semester and section are required' });
    }
    
    // Find the faculty user
    const faculty = await User.findOne({ _id: id, role: 'faculty' });
    
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }
    
    // Check if assignment already exists
    const assignmentExists = faculty.teachingAssignments.some(
      assignment => assignment.semester === semester && assignment.section === section
    );
    
    if (assignmentExists) {
      return res.status(400).json({ message: 'This assignment already exists for this faculty' });
    }
    
    // Add the new assignment
    const newAssignment = { 
      _id: new mongoose.Types.ObjectId(), // Generate a new ID for the assignment
      semester, 
      section 
    };
    
    faculty.teachingAssignments.push(newAssignment);
    await faculty.save();
    
    res.json(faculty);
  } catch (error) {
    console.error('Error adding assignment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove teaching assignment from faculty
router.delete('/faculty/:id/assignment/:assignmentId', ensureAdmin, async (req, res) => {
  try {
    const { id, assignmentId } = req.params;
    
    // Find the faculty user
    const faculty = await User.findOne({ _id: id, role: 'faculty' });
    
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }
    
    // Check if assignment exists
    const assignmentIndex = faculty.teachingAssignments.findIndex(
      assignment => assignment._id.toString() === assignmentId
    );
    
    if (assignmentIndex === -1) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    
    // Remove the assignment
    faculty.teachingAssignments.splice(assignmentIndex, 1);
    await faculty.save();
    
    res.json(faculty);
  } catch (error) {
    console.error('Error removing assignment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
