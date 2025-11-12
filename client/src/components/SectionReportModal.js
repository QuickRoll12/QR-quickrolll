import React, { useState } from 'react';
import axios from 'axios';
import Toast from './Toast';
import '../styles/SectionReportModal.css';

const SectionReportModal = ({ isOpen, onClose, reportData, loading, error, recordId, onRecordUpdate }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [localReportData, setLocalReportData] = useState(null);
  const [movingStudents, setMovingStudents] = useState(new Set());
  const [toasts, setToasts] = useState([]);

  // Sync local data with props
  React.useEffect(() => {
    if (reportData) {
      setLocalReportData(JSON.parse(JSON.stringify(reportData))); // Deep copy
    }
  }, [reportData]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getAttendanceIcon = (status) => {
    switch (status) {
      case 'Present':
        return <i className="fas fa-check-circle" style={{ color: '#4caf50' }}></i>;
      case 'Absent':
        return <i className="fas fa-times-circle" style={{ color: '#f44336' }}></i>;
      default:
        return <i className="fas fa-question-circle" style={{ color: '#ff9800' }}></i>;
    }
  };

  const copyToClipboard = (text, type) => {
    console.log('📋 Copying to clipboard:', text, type);
    navigator.clipboard.writeText(text).then(() => {
      console.log('📋 Copy successful, showing toast');
      showToast(`${type} copied to clipboard`, 'success');
    }).catch(err => {
      console.error('📋 Copy failed:', err);
      showToast(`Failed to copy ${type}`, 'error');
    });
  };

  // Toast management
  const showToast = (message, type = 'success') => {
    console.log('🍞 Showing toast:', message, type);
    const id = Date.now();
    const newToast = { id, message, type };
    setToasts(prev => {
      console.log('🍞 Current toasts:', prev);
      console.log('🍞 Adding toast:', newToast);
      return [...prev, newToast];
    });
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Move student functionality
  const moveStudent = async (student, fromStatus, toStatus) => {
    const studentKey = `${student.givenRollNumber}`;
    
    // Prevent multiple moves of the same student
    if (movingStudents.has(studentKey)) {
      return;
    }

    // Add to moving set
    setMovingStudents(prev => new Set([...prev, studentKey]));

    // Optimistic update - update UI immediately
    const previousData = JSON.parse(JSON.stringify(localReportData));
    updateLocalData(student, fromStatus, toStatus);

    try {
      const token = localStorage.getItem('token');
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

      const response = await axios.post(
        `${BACKEND_URL}/api/attendance/records/${recordId}/move-student`,
        {
          givenRollNumber: student.givenRollNumber,
          fromStatus,
          toStatus
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        // Update parent component with new record data
        if (onRecordUpdate) {
          onRecordUpdate(response.data.data);
        }
        
        showToast(`Roll ${student.classRollNumber} moved to ${toStatus}`, 'success');
      } else {
        throw new Error(response.data.message || 'Failed to move student');
      }
    } catch (error) {
      console.error('Error moving student:', error);
      
      // Rollback optimistic update
      setLocalReportData(previousData);
      
      showToast(
        error.response?.data?.message || `Failed to move roll ${student.classRollNumber}`,
        'error'
      );
    } finally {
      // Remove from moving set
      setMovingStudents(prev => {
        const newSet = new Set(prev);
        newSet.delete(studentKey);
        return newSet;
      });
    }
  };

  // Update local data optimistically
  const updateLocalData = (student, fromStatus, toStatus) => {
    if (!localReportData) return;

    const updatedData = { ...localReportData };
    
    // Find the section containing this student
    const section = updatedData.sections.find(sec => 
      sec[fromStatus].some(s => s.givenRollNumber === student.givenRollNumber)
    );
    
    if (!section) return;

    // Remove from source array
    section[fromStatus] = section[fromStatus].filter(s => s.givenRollNumber !== student.givenRollNumber);
    
    // Add to destination array
    const updatedStudent = { ...student, attendanceStatus: toStatus === 'present' ? 'Present' : 'Absent' };
    section[toStatus].push(updatedStudent);
    
    // Sort destination array
    section[toStatus].sort((a, b) => parseInt(a.classRollNumber || 0) - parseInt(b.classRollNumber || 0));
    
    // Update section stats
    section.stats[fromStatus] = section[fromStatus].length;
    section.stats[toStatus] = section[toStatus].length;
    section.stats.percentage = section.stats.total > 0 
      ? Math.round((section.stats.present / section.stats.total) * 100) 
      : 0;
    
    // Update overall stats
    updatedData.overall.totalPresent = updatedData.sections.reduce((sum, sec) => sum + sec.stats.present, 0);
    updatedData.overall.totalAbsent = updatedData.sections.reduce((sum, sec) => sum + sec.stats.absent, 0);
    updatedData.overall.percentage = updatedData.overall.totalStudents > 0 
      ? Math.round((updatedData.overall.totalPresent / updatedData.overall.totalStudents) * 100) 
      : 0;
    
    setLocalReportData(updatedData);
  };

  return (
    <>
      <div className="section-report-modal-overlay" onClick={handleOverlayClick}>
        <div className="section-report-modal">
          <div className="modal-header">
            <div className="header-content">
              <h2>
                <i className="fas fa-chart-bar"></i>
                Section-wise Attendance Report
              </h2>
              {reportData && (
                <p className="report-info">
                  <i className="fas fa-calendar-alt"></i>
                  Class: {reportData.className} | Generated: {formatDate(new Date())}
                </p>
              )}
            </div>
            <button className="close-btn" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="modal-body">
            {loading && (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <h3>Generating Section Report...</h3>
                <p>Please wait while we process the attendance data</p>
              </div>
            )}

            {error && (
              <div className="error-state">
                <i className="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>{error}</p>
              </div>
            )}

            {localReportData && !loading && !error && (
              <>
                {/* Overall Statistics */}
                <div className="overall-stats">
                  <h3>
                    <i className="fas fa-chart-pie"></i>
                    Overall Statistics
                  </h3>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon">
                        <i className="fas fa-users"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{localReportData.overall.totalStudents}</div>
                        <div className="stat-label">Total Students</div>
                      </div>
                    </div>
                    <div className="stat-card present">
                      <div className="stat-icon">
                        <i className="fas fa-check-circle"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{localReportData.overall.totalPresent}</div>
                        <div className="stat-label">Present</div>
                      </div>
                    </div>
                    <div className="stat-card absent">
                      <div className="stat-icon">
                        <i className="fas fa-times-circle"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{localReportData.overall.totalAbsent}</div>
                        <div className="stat-label">Absent</div>
                      </div>
                    </div>
                    <div className="stat-card percentage">
                      <div className="stat-icon">
                        <i className="fas fa-percentage"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{localReportData.overall.percentage}%</div>
                        <div className="stat-label">Attendance</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section Tabs */}
                <div className="section-tabs">
                  <div className="tab-headers">
                    {localReportData.sections.map((section, index) => (
                      <button
                        key={section.sectionName}
                        className={`tab-header ${activeTab === index ? 'active' : ''}`}
                        onClick={() => setActiveTab(index)}
                      >
                        <span className="tab-title">{section.sectionName}</span>
                        <span className="tab-stats">
                          {section.stats.present}/{section.stats.total}
                          <span className="tab-percentage">({section.stats.percentage}%)</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Active Tab Content */}
                  {localReportData.sections[activeTab] && (
                    <div className="tab-content">
                      <div className="section-header">
                        <h3>
                          <i className="fas fa-graduation-cap"></i>
                          Section {localReportData.sections[activeTab].sectionName}
                        </h3>
                        <div className="section-actions">
                          <button
                            className="copy-btn"
                            onClick={() => {
                              const presentList = localReportData.sections[activeTab].present
                                .map(s => s.classRollNumber)
                                .join(', ');
                              copyToClipboard(presentList, 'Present students');
                            }}
                          >
                            <i className="fas fa-copy"></i> Copy Present
                          </button>
                          <button
                            className="copy-btn"
                            onClick={() => {
                              const absentList = localReportData.sections[activeTab].absent
                                .map(s => s.classRollNumber)
                                .join(', ');
                              copyToClipboard(absentList, 'Absent students');
                            }}
                          >
                            <i className="fas fa-copy"></i> Copy Absent
                          </button>
                        </div>
                      </div>

                      <div className="attendance-lists">
                        {/* Present Students */}
                        <div className="attendance-list present-list">
                          <h4>
                            <i className="fas fa-check-circle"></i>
                            Present Students ({localReportData.sections[activeTab].stats.present})
                          </h4>
                          <div className="student-grid">
                            {localReportData.sections[activeTab].present.length > 0 ? (
                              localReportData.sections[activeTab].present.map((student, index) => {
                                const isMoving = movingStudents.has(`${student.givenRollNumber}`);
                                return (
                                  <div key={index} className={`student-card present ${isMoving ? 'moving' : ''}`}>
                                    <div className="student-info">
                                      <div className="student-roll">{student.classRollNumber}</div>
                                      <div className="student-name">{student.studentName}</div>
                                    </div>
                                    <div className="student-actions">
                                      <button
                                        className="move-btn move-to-absent"
                                        onClick={() => moveStudent(student, 'present', 'absent')}
                                        disabled={isMoving}
                                        title="Move to Absent"
                                      >
                                        {isMoving ? (
                                          <i className="fas fa-spinner fa-spin"></i>
                                        ) : (
                                          <i className="fas fa-arrow-right"></i>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="empty-list">
                                <i className="fas fa-inbox"></i>
                                <p>No students present</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Absent Students */}
                        <div className="attendance-list absent-list">
                          <h4>
                            <i className="fas fa-times-circle"></i>
                            Absent Students ({localReportData.sections[activeTab].stats.absent})
                          </h4>
                          <div className="student-grid">
                            {localReportData.sections[activeTab].absent.length > 0 ? (
                              localReportData.sections[activeTab].absent.map((student, index) => {
                                const isMoving = movingStudents.has(`${student.givenRollNumber}`);
                                return (
                                  <div key={index} className={`student-card absent ${isMoving ? 'moving' : ''}`}>
                                    <div className="student-info">
                                      <div className="student-roll">{student.classRollNumber}</div>
                                      <div className="student-name">{student.studentName}</div>
                                    </div>
                                    <div className="student-actions">
                                      <button
                                        className="move-btn move-to-present"
                                        onClick={() => moveStudent(student, 'absent', 'present')}
                                        disabled={isMoving}
                                        title="Move to Present"
                                      >
                                        {isMoving ? (
                                          <i className="fas fa-spinner fa-spin"></i>
                                        ) : (
                                          <i className="fas fa-arrow-left"></i>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="empty-list">
                                <i className="fas fa-inbox"></i>
                                <p>No students absent</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Not Marked Students (if any) */}
                      {localReportData.sections[activeTab].notMarked.length > 0 && (
                        <div className="attendance-list not-marked-list">
                          <h4>
                            <i className="fas fa-question-circle"></i>
                            Not Marked ({localReportData.sections[activeTab].stats.notMarked})
                          </h4>
                          <div className="student-grid">
                            {localReportData.sections[activeTab].notMarked.map((student, index) => (
                              <div key={index} className="student-card not-marked">
                                <div className="student-info">
                                  <div className="student-roll">{student.classRollNumber}</div>
                                  <div className="student-name">{student.studentName}</div>
                                </div>
                                <div className="attendance-status">
                                  {getAttendanceIcon(student.attendanceStatus)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button className="close-footer-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
      
      {/* Toast Notifications - Outside modal for proper positioning */}
      {isOpen && (
        <div className="toast-container">
          {toasts.map(toast => {
            console.log('🍞 Rendering toast:', toast);
            return (
              <Toast
                key={toast.id}
                message={toast.message}
                type={toast.type}
                onClose={() => removeToast(toast.id)}
              />
            );
          })}
        </div>
      )}
    </>
  );
};

export default SectionReportModal;
