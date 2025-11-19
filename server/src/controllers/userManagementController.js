const User = require('../models/User');

// ==================== USER MANAGEMENT APIS ====================

// Get all students with filters, search, and pagination
exports.getStudents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 15,
      search = '',
      course = '',
      semester = '',
      section = ''
    } = req.query;

    // Build query
    const query = { role: 'student' };

    // Add filters
    if (course) query.course = course;
    if (semester) query.semester = parseInt(semester);
    if (section) query.section = section;

    // Add search (studentId, name, email)
    if (search) {
      query.$or = [
        { studentId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination
    const students = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await User.countDocuments(query);

    res.json({
      students,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        recordsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all faculty with filters, search, and pagination
exports.getFaculty = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 15,
      search = '',
      course = ''
    } = req.query;

    // Build query
    const query = { role: 'faculty' };

    // Add filters
    if (course) query.course = course;

    // Add search (facultyId, name, email)
    if (search) {
      query.$or = [
        { facultyId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination
    const faculty = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await User.countDocuments(query);

    res.json({
      faculty,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        recordsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching faculty:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password').lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user by ID
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow password updates through this endpoint
    delete updates.password;
    delete updates.role; // Prevent role changes

    // Get current user to check role
    const currentUser = await User.findById(id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate unique fields based on role
    if (updates.email) {
      const existingUser = await User.findOne({
        email: updates.email,
        _id: { $ne: id }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    // Only check studentId if user is a student and studentId is being updated
    if (currentUser.role === 'student' && updates.studentId) {
      const existingUser = await User.findOne({
        studentId: updates.studentId,
        _id: { $ne: id }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Student ID already exists' });
      }
    }

    // Only check facultyId if user is a faculty and facultyId is being updated
    if (currentUser.role === 'faculty' && updates.facultyId) {
      const existingUser = await User.findOne({
        facultyId: updates.facultyId,
        _id: { $ne: id }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Faculty ID already exists' });
      }
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete user by ID
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get filter options (departments, semesters, sections)
exports.getFilterOptions = async (req, res) => {
  try {
    const { role } = req.query;

    if (role === 'student') {
      const courses = await User.distinct('course', { role: 'student' });
      const semesters = await User.distinct('semester', { role: 'student' });
      const sections = await User.distinct('section', { role: 'student' });

      res.json({
        courses: courses.filter(c => c).sort(),
        semesters: semesters.filter(s => s).sort((a, b) => a - b),
        sections: sections.filter(s => s).sort()
      });
    } else if (role === 'faculty') {
      const courses = await User.distinct('course', { role: 'faculty' });

      res.json({
        courses: courses.filter(c => c).sort()
      });
    } else {
      res.status(400).json({ message: 'Role parameter required (student or faculty)' });
    }
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Export users to CSV
exports.exportUsers = async (req, res) => {
  try {
    const { role, course, semester, section } = req.query;

    // Build query
    const query = {};
    if (role) query.role = role;
    if (course) query.course = course;
    if (semester) query.semester = parseInt(semester);
    if (section) query.section = section;

    // Fetch users
    const users = await User.find(query).select('-password').lean();

    // Convert to CSV format
    let csv = '';

    if (role === 'student') {
      csv = 'Student ID,Name,Email,Course,Semester,Section,Roll Number,Verified,Created At\n';
      users.forEach(user => {
        csv += `${user.studentId || ''},${user.name || ''},${user.email || ''},${user.course || ''},${user.semester || ''},${user.section || ''},${user.classRollNumber || ''},${user.isVerified ? 'Yes' : 'No'},${user.createdAt || ''}\n`;
      });
    } else if (role === 'faculty') {
      csv = 'Faculty ID,Name,Email,Course,Verified,Created At\n';
      users.forEach(user => {
        csv += `${user.facultyId || ''},${user.name || ''},${user.email || ''},${user.course || ''},${user.isVerified ? 'Yes' : 'No'},${user.createdAt || ''}\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${role || 'users'}_export_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
