const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'faculty'],
    required: true
  },
  studentId: {
    type: String,
    required: true
  },
  facultyId: {
    type: String,
    sparse: true // Only required for faculty
  },
  course: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true
  },
  semester: {
    type: String,
    required: function() {
      return this.role === 'student';
    }
  },
  classRollNumber: {
    type: String,
    required: true,
    set: function(value) {
      // Convert to string first (in case it's a number)
      value = value.toString();
      // Add leading zero if it's a single digit
      if (value.length === 1) {
        return '0' + value;
      }
      return value;
    }
  },
  universityRollNumber: {
    type: String,
    required: true
  },
  photo_url: {
    type: String,
    default: '/default-student.png' // Default placeholder image
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    required: function() {
      return this.role === 'student'; // Only required for students, not for faculty
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationExpires: Date,
  passwordChangeRequired: {
    type: Boolean,
    default: true
  },
  department: {
    type: String,
    required: function() {
      return this.role === 'faculty';
    }
  },
  // Field removed as it's no longer needed
  // New field for teaching assignments with semester-section combinations
  teachingAssignments: {
    type: [{
      semester: {
        type: String,
        required: true
      },
      section: {
        type: String,
        required: true
      }
    }],
    validate: {
      validator: function(v) {
        // Only required for faculty role
        if (this.role === 'faculty') {
          return v && v.length > 0;
        }
        return true;
      },
      message: 'Faculty must have at least one teaching assignment'
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Skip password hashing if flag is set (for pre-hashed passwords)
  if (this.$skipPasswordHashing) {
    delete this.$skipPasswordHashing; // Remove the flag
    return next();
  }
  
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;