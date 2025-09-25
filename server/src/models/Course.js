const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

// Remove any existing indexes that might be causing issues
courseSchema.index({ name: 1 }, { unique: true });
// Explicitly drop the problematic index if it exists
if (mongoose.connection.readyState === 1) {
  mongoose.connection.collection('courses').dropIndex('courseId_1')
    .then(() => console.log('Dropped courseId_1 index'))
    .catch(err => {
      // Index might not exist, which is fine
      if (err.code !== 27) {
        console.error('Error dropping index:', err);
      }
    });
}

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;