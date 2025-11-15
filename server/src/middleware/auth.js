const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new Error('User not found');
    }

    // 🔍 DEBUG: Log user data loaded from database
    console.log('🔍 AUTH MIDDLEWARE - User loaded from DB:', {
      id: user._id?.toString(),
      studentId: user.studentId,
      classRollNumber: user.classRollNumber,
      semester: user.semester,
      section: user.section,
      course: user.course,
      role: user.role
    });

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

module.exports = auth;
