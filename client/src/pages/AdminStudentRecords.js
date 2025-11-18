import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/userManagement.css';

const AdminStudentRecords = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [recordsPerPage, setRecordsPerPage] = useState(15);
  
  // Filters
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('');
  const [semester, setSemester] = useState('');
  const [section, setSection] = useState('');
  
  // Filter options
  const [filterOptions, setFilterOptions] = useState({
    courses: [],
    semesters: [],
    sections: []
  });
  
  // Edit modal
  const [editingStudent, setEditingStudent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Delete confirmation
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Debounce timer
  const [searchDebounce, setSearchDebounce] = useState(null);

  // Get API base URL
  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  // Fetch filter options
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/admin/filter-options?role=student`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFilterOptions(response.data);
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  // Fetch students with debouncing for search
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage,
        limit: recordsPerPage,
        search: search,
        course: course,
        semester: semester,
        section: section
      });

      const response = await axios.get(`${API_URL}/api/admin/students?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStudents(response.data.students);
      setTotalPages(response.data.pagination.totalPages);
      setTotalRecords(response.data.pagination.totalRecords);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  }, [currentPage, recordsPerPage, search, course, semester, section, API_URL]);

  // Fetch students when filters change
  useEffect(() => {
    fetchStudents();
  }, [currentPage, recordsPerPage, course, semester, section]);

  // Debounced search
  useEffect(() => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }

    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchStudents();
      }
    }, 500);

    setSearchDebounce(timer);

    return () => clearTimeout(timer);
  }, [search]);

  // Handle edit
  const handleEdit = (student) => {
    setEditingStudent({ ...student });
    setShowEditModal(true);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/admin/students/${editingStudent._id}`,
        editingStudent,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Student updated successfully');
      setShowEditModal(false);
      fetchStudents();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update student');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = (student) => {
    setDeletingStudent(student);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/api/admin/students/${deletingStudent._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Student deleted successfully');
      setShowDeleteModal(false);
      fetchStudents();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete student');
    } finally {
      setLoading(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        role: 'student',
        course: course,
        semester: semester,
        section: section
      });

      const response = await axios.get(`${API_URL}/api/admin/export-users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `students_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export data');
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearch('');
    setCourse('');
    setSemester('');
    setSection('');
    setCurrentPage(1);
  };

  return (
    <div className="user-management-container">
      <div className="user-management-header">
        <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
          ← Back to Dashboard
        </button>
        <h1>🎓 Student Records Manager</h1>
        <button className="export-btn" onClick={handleExport}>
          📥 Export to CSV
        </button>
      </div>

      {/* Notifications */}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search by Student ID, Name, or Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-row">
          <select
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="filter-select"
          >
            <option value="">All Courses</option>
            {filterOptions.courses.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="filter-select"
          >
            <option value="">All Semesters</option>
            {filterOptions.semesters.map(sem => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </select>

          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="filter-select"
          >
            <option value="">All Sections</option>
            {filterOptions.sections.map(sec => (
              <option key={sec} value={sec}>Section {sec}</option>
            ))}
          </select>

          <button onClick={resetFilters} className="reset-btn">
            🔄 Reset
          </button>
        </div>

        <div className="records-info">
          Showing {students.length} of {totalRecords} students
          <select
            value={recordsPerPage}
            onChange={(e) => {
              setRecordsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="per-page-select"
          >
            <option value="10">10 per page</option>
            <option value="15">15 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <p>No students found</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Student ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Course</th>
                <th>Sem/Sec</th>
                <th>Roll No</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student._id}>
                  <td>{(currentPage - 1) * recordsPerPage + index + 1}</td>
                  <td><strong>{student.studentId}</strong></td>
                  <td>{student.name}</td>
                  <td>{student.email}</td>
                  <td>{student.course}</td>
                  <td>{student.semester}/{student.section}</td>
                  <td>{student.classRollNumber}</td>
                  <td>
                    <span className={`status-badge ${student.isVerified ? 'verified' : 'unverified'}`}>
                      {student.isVerified ? '✓ Verified' : '⚠ Unverified'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleEdit(student)}
                        className="btn-edit"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(student)}
                        className="btn-delete"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            ← Previous
          </button>
          
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Next →
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingStudent && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Edit Student Record</h2>
              <button onClick={() => setShowEditModal(false)} className="modal-close">×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Student ID</label>
                  <input
                    type="text"
                    value={editingStudent.studentId || ''}
                    onChange={(e) => setEditingStudent({...editingStudent, studentId: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={editingStudent.name || ''}
                    onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editingStudent.email || ''}
                    onChange={(e) => setEditingStudent({...editingStudent, email: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Course</label>
                  <select
                    value={editingStudent.course || ''}
                    onChange={(e) => setEditingStudent({...editingStudent, course: e.target.value})}
                    className="form-input"
                  >
                    <option value="">Select Course</option>
                    {filterOptions.courses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Semester</label>
                  <select
                    value={editingStudent.semester || ''}
                    onChange={(e) => setEditingStudent({...editingStudent, semester: Number(e.target.value)})}
                    className="form-input"
                  >
                    <option value="">Select Semester</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Section</label>
                  <input
                    type="text"
                    value={editingStudent.section || ''}
                    onChange={(e) => setEditingStudent({...editingStudent, section: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Roll Number</label>
                  <input
                    type="number"
                    value={editingStudent.classRollNumber || ''}
                    onChange={(e) => setEditingStudent({...editingStudent, classRollNumber: Number(e.target.value)})}
                    className="form-input"
                  />
                </div>

                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={editingStudent.isVerified || false}
                      onChange={(e) => setEditingStudent({...editingStudent, isVerified: e.target.checked})}
                    />
                    Email Verified
                  </label>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setShowEditModal(false)} className="btn-cancel">
                Cancel
              </button>
              <button onClick={handleSaveEdit} className="btn-save" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingStudent && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ Confirm Delete</h2>
              <button onClick={() => setShowDeleteModal(false)} className="modal-close">×</button>
            </div>
            
            <div className="modal-body">
              <p>Are you sure you want to delete this student?</p>
              <div className="delete-info">
                <p><strong>Name:</strong> {deletingStudent.name}</p>
                <p><strong>Student ID:</strong> {deletingStudent.studentId}</p>
                <p><strong>Email:</strong> {deletingStudent.email}</p>
              </div>
              <p className="warning-text">This action cannot be undone!</p>
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setShowDeleteModal(false)} className="btn-cancel">
                Cancel
              </button>
              <button onClick={confirmDelete} className="btn-delete-confirm" disabled={loading}>
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudentRecords;
