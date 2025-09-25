import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/AdminManageFacultyAssignments.css';

// Use environment variable directly instead of importing from config
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

// Hardcoded options for dropdowns
const sections = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2', 'F1', 'F2', 'G1', 'G2', 'H1', 'H2', 'I1', 'I2', 'J1', 'J2', 'K1', 'K2', 'L1', 'L2','Placement Group 1', 'Placement Group 2', 'Placement Group 3', 'Placement Group 4', 'Placement Group 5'];
const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];

const AdminManageFacultyAssignments = () => {
  const [loading, setLoading] = useState(true);
  const [faculties, setFaculties] = useState([]);
  const [departments] = useState(['BTech', 'BCA', 'BCom', 'BBA', 'Law', 'MCA', 'MBA', 'BPharm', 'BSc']);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [newAssignment, setNewAssignment] = useState({ semester: '', section: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Confirmation modal states
  const [showAddConfirmation, setShowAddConfirmation] = useState(false);
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [assignmentToRemove, setAssignmentToRemove] = useState(null);
  
  const navigate = useNavigate();

  // Fetch departments and faculties on component mount
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (!token || user.role !== 'admin') {
        navigate('/admin/login');
      }
    };
    
    checkAuth();
    // No need to fetch departments as they are hardcoded
    setLoading(false);
  }, [navigate]);
  
  // Clear error and success messages after 10 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Fetch faculties when department changes
  useEffect(() => {
    if (selectedDepartment) {
      fetchFaculties(selectedDepartment);
    } else {
      setFaculties([]);
    }
  }, [selectedDepartment]);

  // Removed fetchDepartments function as we're using hardcoded departments

  const fetchFaculties = async (department) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${BACKEND_URL}/api/admin/faculties`, {
        params: { department },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setFaculties(response.data);
    } catch (error) {
      console.error('Error fetching faculties:', error);
      setError('Failed to load faculties. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentChange = (e) => {
    setSelectedDepartment(e.target.value);
    setSelectedFaculty(null);
  };

  const handleFacultySelect = (faculty) => {
    setSelectedFaculty(faculty);
    setNewAssignment({ semester: '', section: '' });
    setError('');
    setSuccess('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewAssignment(prev => ({ ...prev, [name]: value }));
  };

  // Show add confirmation modal if inputs are valid
  const confirmAddAssignment = () => {
    // Validate inputs
    if (!newAssignment.semester || !newAssignment.section) {
      setError('Please select both semester and section');
      return;
    }
    
    setShowAddConfirmation(true);
  };
  
  // Handle actual assignment addition after confirmation
  const handleAddAssignment = async () => {
    setShowAddConfirmation(false);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${BACKEND_URL}/api/admin/faculty/${selectedFaculty._id}/assignment`,
        newAssignment,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const updatedFaculty = response.data;
      
      // Update the faculty in the list
      setFaculties(faculties.map(f => 
        f._id === updatedFaculty._id ? updatedFaculty : f
      ));
      
      // Update selected faculty
      setSelectedFaculty(updatedFaculty);
      
      // Reset form
      setNewAssignment({ semester: '', section: '' });
      setSuccess('Assignment added successfully');
      setError('');
    } catch (error) {
      console.error('Error adding assignment:', error);
      setError(error.response?.data?.message || 'Failed to add assignment. Please try again.');
    }
  };

  // Show remove confirmation modal
  const confirmRemoveAssignment = (assignmentId) => {
    setAssignmentToRemove(assignmentId);
    setShowRemoveConfirmation(true);
  };
  
  // Handle actual assignment removal after confirmation
  const handleRemoveAssignment = async () => {
    setShowRemoveConfirmation(false);
    
    if (!assignmentToRemove) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.delete(
        `${BACKEND_URL}/api/admin/faculty/${selectedFaculty._id}/assignment/${assignmentToRemove}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const updatedFaculty = response.data;
      
      // Update the faculty in the list
      setFaculties(faculties.map(f => 
        f._id === updatedFaculty._id ? updatedFaculty : f
      ));
      
      // Update selected faculty
      setSelectedFaculty(updatedFaculty);
      
      setSuccess('Assignment removed successfully');
      setError('');
      setAssignmentToRemove(null);
    } catch (error) {
      console.error('Error removing assignment:', error);
      setError(error.response?.data?.message || 'Failed to remove assignment. Please try again.');
      setAssignmentToRemove(null);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredFaculties = faculties.filter(faculty => 
    faculty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faculty.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="manage-faculty-container">
      {/* Add Assignment Confirmation Modal */}
      {showAddConfirmation && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <h3>Confirm Assignment Addition</h3>
            <p>Are you sure you want to add the following teaching assignment?</p>
            <div className="assignment-details">
              <p><strong>Faculty:</strong> {selectedFaculty.name}</p>
              <p><strong>Semester:</strong> {newAssignment.semester}</p>
              <p><strong>Section:</strong> {newAssignment.section}</p>
            </div>
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={() => setShowAddConfirmation(false)}>
                Cancel
              </button>
              <button className="confirm-btn" onClick={handleAddAssignment}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Remove Assignment Confirmation Modal */}
      {showRemoveConfirmation && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <h3>Confirm Assignment Removal</h3>
            <p>Are you sure you want to remove this teaching assignment?</p>
            <div className="assignment-details">
              <p><strong>Faculty:</strong> {selectedFaculty.name}</p>
              <p><strong>Assignment:</strong> {selectedFaculty.teachingAssignments.find(a => a._id === assignmentToRemove)?.semester} - {selectedFaculty.teachingAssignments.find(a => a._id === assignmentToRemove)?.section}</p>
            </div>
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={() => setShowRemoveConfirmation(false)}>
                Cancel
              </button>
              <button className="confirm-btn" onClick={handleRemoveAssignment}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="header">
        <h1>Manage Faculty Assignments</h1>
        <button onClick={() => navigate('/admin/dashboard')} className="back-button">
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </button>
      </div>

      <div className="filters-container">
        <div className="filter-group">
          <label>Department:</label>
          <select 
            value={selectedDepartment} 
            onChange={handleDepartmentChange}
            className="department-select"
          >
            <option value="">Select Department</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {selectedDepartment && (
          <div className="filter-group">
            <label>Search Faculty:</label>
            <input
              type="text"
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={handleSearchChange}
              className="search-input"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : error && !selectedFaculty ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="content-container">
          {selectedDepartment && (
            <div className="faculty-list-container">
              <h2>Faculty Members - {selectedDepartment}</h2>
              {filteredFaculties.length === 0 ? (
                <p className="no-results">No faculty members found in this department</p>
              ) : (
                <div className="faculty-cards">
                  {filteredFaculties.map(faculty => (
                    <div 
                      key={faculty._id} 
                      className={`faculty-card ${selectedFaculty && selectedFaculty._id === faculty._id ? 'selected' : ''}`}
                      onClick={() => handleFacultySelect(faculty)}
                    >
                      <div className="faculty-info">
                        <h3>{faculty.name}</h3>
                        <p><i className="fas fa-envelope"></i> {faculty.email}</p>
                        <p><i className="fas fa-id-badge"></i> {faculty.facultyId || 'No ID'}</p>
                      </div>
                      <div className="assignment-count">
                        <span className="count">{faculty.teachingAssignments.length}</span>
                        <span className="label">Assignments</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedFaculty && (
            <div className="assignments-container">
              <h2>Assignments for {selectedFaculty.name}</h2>
              
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}
              
              <div className="current-assignments">
                <h3>Current Assignments</h3>
                {selectedFaculty.teachingAssignments.length === 0 ? (
                  <p>No teaching assignments</p>
                ) : (
                  <table className="assignments-table">
                    <thead>
                      <tr>
                        <th>Semester</th>
                        <th>Section</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFaculty.teachingAssignments.map((assignment, index) => (
                        <tr key={index}>
                          <td>{assignment.semester}</td>
                          <td>{assignment.section}</td>
                          <td>
                            <button 
                              className="remove-btn"
                              onClick={() => confirmRemoveAssignment(assignment._id)}
                            >
                              <i className="fas fa-trash"></i> Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              
              <div className="add-assignment">
                <h3>Add New Assignment</h3>
                <div className="assignment-form">
                  <div className="form-group">
                    <label>Semester:</label>
                    <select
                      name="semester"
                      value={newAssignment.semester}
                      onChange={handleInputChange}
                      className="dropdown-select"
                    >
                      <option value="">Select Semester</option>
                      {semesters.map(sem => (
                        <option key={sem} value={sem}>{sem}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Section:</label>
                    <select
                      name="section"
                      value={newAssignment.section}
                      onChange={handleInputChange}
                      className="dropdown-select"
                    >
                      <option value="">Select Section</option>
                      {sections.map(sec => (
                        <option key={sec} value={sec}>{sec}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    className={`add-btn ${!newAssignment.semester || !newAssignment.section ? 'disabled-btn' : ''}`}
                    onClick={confirmAddAssignment}
                    disabled={!newAssignment.semester || !newAssignment.section}
                  >
                    <i className="fas fa-plus"></i> Add Assignment
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminManageFacultyAssignments;