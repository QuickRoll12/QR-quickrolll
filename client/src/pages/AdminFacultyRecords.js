import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/userManagement.css';

const AdminFacultyRecords = () => {
  const [faculty, setFaculty] = useState([]);
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
  const [department, setDepartment] = useState('');
  
  // Filter options
  const [filterOptions, setFilterOptions] = useState({
    departments: []
  });
  
  // Edit modal
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Delete confirmation
  const [deletingFaculty, setDeletingFaculty] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Debounce timer
  const [searchDebounce, setSearchDebounce] = useState(null);

  // Get API base URL
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Fetch filter options
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${API_URL}/api/admin/filter-options?role=faculty`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFilterOptions(response.data);
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  // Fetch faculty with debouncing for search
  const fetchFaculty = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: currentPage,
        limit: recordsPerPage,
        search: search,
        department: department
      });

      const response = await axios.get(`${API_URL}/api/admin/faculty?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFaculty(response.data.faculty);
      setTotalPages(response.data.pagination.totalPages);
      setTotalRecords(response.data.pagination.totalRecords);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch faculty');
    } finally {
      setLoading(false);
    }
  }, [currentPage, recordsPerPage, search, department, API_URL]);

  // Fetch faculty when filters change
  useEffect(() => {
    fetchFaculty();
  }, [currentPage, recordsPerPage, department]);

  // Debounced search
  useEffect(() => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }

    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchFaculty();
      }
    }, 500);

    setSearchDebounce(timer);

    return () => clearTimeout(timer);
  }, [search]);

  // Handle edit
  const handleEdit = (facultyMember) => {
    setEditingFaculty({ ...facultyMember });
    setShowEditModal(true);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(
        `${API_URL}/api/admin/faculty/${editingFaculty._id}`,
        editingFaculty,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Faculty updated successfully');
      setShowEditModal(false);
      fetchFaculty();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update faculty');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = (facultyMember) => {
    setDeletingFaculty(facultyMember);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(
        `${API_URL}/api/admin/faculty/${deletingFaculty._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Faculty deleted successfully');
      setShowDeleteModal(false);
      fetchFaculty();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete faculty');
    } finally {
      setLoading(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        role: 'faculty',
        department: department
      });

      const response = await axios.get(`${API_URL}/api/admin/export-users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `faculty_${Date.now()}.csv`);
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
    setDepartment('');
    setCurrentPage(1);
  };

  return (
    <div className="user-management-container">
      <div className="user-management-header">
        <h1>👨‍🏫 Faculty Records Manager</h1>
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
            placeholder="🔍 Search by Faculty ID, Name, or Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-row">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="filter-select"
          >
            <option value="">All Departments</option>
            {filterOptions.departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <button onClick={resetFilters} className="reset-btn">
            🔄 Reset
          </button>
        </div>

        <div className="records-info">
          Showing {faculty.length} of {totalRecords} faculty members
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
        ) : faculty.length === 0 ? (
          <div className="empty-state">
            <p>No faculty members found</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Faculty ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Assignments</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {faculty.map((facultyMember, index) => (
                <tr key={facultyMember._id}>
                  <td>{(currentPage - 1) * recordsPerPage + index + 1}</td>
                  <td><strong>{facultyMember.facultyId}</strong></td>
                  <td>{facultyMember.name}</td>
                  <td>{facultyMember.email}</td>
                  <td>{facultyMember.department}</td>
                  <td>
                    {facultyMember.teachingAssignments && facultyMember.teachingAssignments.length > 0 ? (
                      <span className="assignments-badge">
                        {facultyMember.teachingAssignments.length} section{facultyMember.teachingAssignments.length > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="no-assignments">None</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${facultyMember.isVerified ? 'verified' : 'unverified'}`}>
                      {facultyMember.isVerified ? '✓ Verified' : '⚠ Unverified'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleEdit(facultyMember)}
                        className="btn-edit"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(facultyMember)}
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
      {showEditModal && editingFaculty && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Edit Faculty Record</h2>
              <button onClick={() => setShowEditModal(false)} className="modal-close">×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Faculty ID</label>
                  <input
                    type="text"
                    value={editingFaculty.facultyId || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, facultyId: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={editingFaculty.name || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, name: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editingFaculty.email || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, email: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Department</label>
                  <select
                    value={editingFaculty.department || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, department: e.target.value})}
                    className="form-input"
                  >
                    <option value="">Select Department</option>
                    {filterOptions.departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={editingFaculty.isVerified || false}
                      onChange={(e) => setEditingFaculty({...editingFaculty, isVerified: e.target.checked})}
                    />
                    Email Verified
                  </label>
                </div>

                {editingFaculty.teachingAssignments && editingFaculty.teachingAssignments.length > 0 && (
                  <div className="form-group full-width">
                    <label>Teaching Assignments</label>
                    <div className="assignments-list">
                      {editingFaculty.teachingAssignments.map((assignment, idx) => (
                        <div key={idx} className="assignment-item">
                          Semester {assignment.semester} - Section {assignment.section}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
      {showDeleteModal && deletingFaculty && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ Confirm Delete</h2>
              <button onClick={() => setShowDeleteModal(false)} className="modal-close">×</button>
            </div>
            
            <div className="modal-body">
              <p>Are you sure you want to delete this faculty member?</p>
              <div className="delete-info">
                <p><strong>Name:</strong> {deletingFaculty.name}</p>
                <p><strong>Faculty ID:</strong> {deletingFaculty.facultyId}</p>
                <p><strong>Email:</strong> {deletingFaculty.email}</p>
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

export default AdminFacultyRecords;
