import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminFacultyRequests.css';

// Use environment variable directly instead of importing from config
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const AdminFacultyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [selectedAssignments, setSelectedAssignments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${BACKEND_URL}/api/admin/faculty-requests`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching faculty requests:', error);
      setError('Failed to load faculty requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openApprovalModal = (request) => {
    setCurrentRequest(request);
    setSelectedAssignments([...request.teachingAssignments]); // Start with all assignments selected
    setShowApprovalModal(true);
  };

  const closeApprovalModal = () => {
    setShowApprovalModal(false);
    setCurrentRequest(null);
    setSelectedAssignments([]);
  };

  const toggleAssignment = (assignment) => {
    const isSelected = selectedAssignments.some(
      item => item.semester === assignment.semester && item.section === assignment.section
    );

    if (isSelected) {
      // Remove from selected
      setSelectedAssignments(selectedAssignments.filter(
        item => !(item.semester === assignment.semester && item.section === assignment.section)
      ));
    } else {
      // Add to selected
      setSelectedAssignments([...selectedAssignments, assignment]);
    }
  };

  const selectAllAssignments = () => {
    if (currentRequest) {
      setSelectedAssignments([...currentRequest.teachingAssignments]);
    }
  };

  const deselectAllAssignments = () => {
    setSelectedAssignments([]);
  };

  const handleApprove = async (requestId) => {
    try {
      setActionLoading(requestId);
      const token = localStorage.getItem('token');
      
      await axios.post(`${BACKEND_URL}/api/admin/approve-faculty/${requestId}`, {
        approvedAssignments: selectedAssignments
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Determine if it's a partial or full approval
      const isPartialApproval = currentRequest && 
        selectedAssignments.length < currentRequest.teachingAssignments.length;
      
      // Update the request status in the UI
      setRequests(requests.map(req => 
        req._id === requestId ? { 
          ...req, 
          status: isPartialApproval ? 'partially_approved' : 'approved',
          approvedAssignments: selectedAssignments 
        } : req
      ));
      
      setNotification({
        message: `Faculty account ${isPartialApproval ? 'partially' : ''} approved successfully. Credentials have been sent via email.`,
        type: 'success'
      });
      
      // Close the modal
      closeApprovalModal();
      
      // Clear notification after 5 seconds
      setTimeout(() => {
        setNotification({ message: '', type: '' });
      }, 5000);
    } catch (error) {
      console.error('Error approving faculty request:', error);
      setNotification({
        message: error.response?.data?.message || 'Failed to approve faculty request.',
        type: 'error'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId) => {
    try {
      setActionLoading(requestId);
      const token = localStorage.getItem('token');
      
      await axios.post(`${BACKEND_URL}/api/admin/reject-faculty/${requestId}`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Update the request status in the UI
      setRequests(requests.map(req => 
        req._id === requestId ? { ...req, status: 'rejected' } : req
      ));
      
      setNotification({
        message: 'Faculty request rejected successfully.',
        type: 'success'
      });
      
      // Clear notification after 5 seconds
      setTimeout(() => {
        setNotification({ message: '', type: '' });
      }, 5000);
    } catch (error) {
      console.error('Error rejecting faculty request:', error);
      setNotification({
        message: error.response?.data?.message || 'Failed to reject faculty request.',
        type: 'error'
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Format date for better readability
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="faculty-requests-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading faculty requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="faculty-requests-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchRequests} className="retry-button">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="faculty-requests-container">
      <div className="faculty-requests-header">
        <button className="back-to-dashboard-btn" onClick={() => navigate('/admin/dashboard')}>
          ← Back to Dashboard
        </button>
        <h2>Faculty Account Requests</h2>
      </div>
      
      <div className="admin-actions">
        <button 
          onClick={() => navigate('/admin/upload-data')} 
          className="upload-data-button"
        >
          <i className="fas fa-upload"></i> Upload Student Data
        </button>
      </div>
      
      {notification.message && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      {requests.length === 0 ? (
        <div className="no-requests">
          <p>No faculty account requests found.</p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map(request => (
            <div key={request._id} className={`request-card ${request.status}`}>
              <div className="request-header">
                <h3>{request.name}</h3>
                <span className={`status-badge ${request.status}`}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
              </div>
              
              <div className="request-details">
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{request.email}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Department:</span>
                  <span className="detail-value">{request.department}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Teaching Assignments:</span>
                  <span className="detail-value">
                    {request.teachingAssignments && request.teachingAssignments.length > 0 ? (
                      <div className="sections-tags">
                        {request.teachingAssignments.map((assignment, index) => (
                          <span key={index} className="section-tag-admin">
                            Sem {assignment.semester} - {assignment.section}
                          </span>
                        ))}
                      </div>
                    ) : (
                      'None specified'
                    )}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Submitted:</span>
                  <span className="detail-value">{formatDate(request.createdAt)}</span>
                </div>
              </div>
              
              <div className="id-card-preview">
                <h4>ID Card Photo</h4>
                <img src={request.photoUrl} alt="Faculty ID Card" />
              </div>
              
              {request.status === 'pending' && (
                <div className="request-actions">
                  <button 
                    onClick={() => openApprovalModal(request)} 
                    className="approve-button"
                    disabled={actionLoading === request._id}
                  >
                    {actionLoading === request._id ? 'Processing...' : 'Review & Approve'}
                  </button>
                  <button 
                    onClick={() => handleReject(request._id)} 
                    className="reject-button"
                    disabled={actionLoading === request._id}
                  >
                    {actionLoading === request._id ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    
      {/* Custom Approval Modal */}
      {showApprovalModal && (
        <div className="custom-modal-overlay" onClick={closeApprovalModal}>
          <div 
            className="custom-modal" 
            onClick={(e) => e.stopPropagation()} 
            aria-labelledby="approval-modal-title"
            role="dialog"
            aria-modal="true"
          >
            <div className="custom-modal-header">
              <h3 id="approval-modal-title">Review Teaching Assignments</h3>
              <button 
                type="button" 
                className="custom-modal-close" 
                onClick={closeApprovalModal}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            
            <div className="custom-modal-body">
              {currentRequest && (
                <div>
                  <div className="faculty-info-card">
                    <div className="faculty-info-header">
                      <h4>Faculty Information</h4>
                    </div>
                    <div className="faculty-info-content">
                      <div className="info-row">
                        <div className="info-label">Name:</div>
                        <div className="info-value">{currentRequest.name}</div>
                      </div>
                      <div className="info-row">
                        <div className="info-label">Email:</div>
                        <div className="info-value">{currentRequest.email}</div>
                      </div>
                      <div className="info-row">
                        <div className="info-label">Department:</div>
                        <div className="info-value">{currentRequest.department}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="assignment-selection">
                    <h5>Select Teaching Assignments to Approve:</h5>
                    <div className="selection-controls">
                      <button onClick={selectAllAssignments} className="select-all-btn">Select All</button>
                      <button onClick={deselectAllAssignments} className="deselect-all-btn">Deselect All</button>
                    </div>
                    
                    <div className="assignments-list">
                      {currentRequest.teachingAssignments.map((assignment, index) => {
                        const isSelected = selectedAssignments.some(
                          item => item.semester === assignment.semester && item.section === assignment.section
                        );
                        
                        return (
                          <div key={index} className={`assignment-item ${isSelected ? 'selected' : ''}`}>
                            <label className="assignment-checkbox">
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={() => toggleAssignment(assignment)}
                              />
                              <span className="checkbox-text">
                                Semester {assignment.semester} - Section {assignment.section}
                              </span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="warning-message">
                    {selectedAssignments.length === 0 && (
                      <p className="text-danger">Please select at least one teaching assignment to approve.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="custom-modal-footer">
              <button onClick={closeApprovalModal} className="cancel-btn">Cancel</button>
              <button 
                onClick={() => currentRequest && handleApprove(currentRequest._id)} 
                className="confirm-approve-btn"
                disabled={selectedAssignments.length === 0 || actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Approve Selected'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFacultyRequests;