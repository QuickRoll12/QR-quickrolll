import React, { useState } from 'react';
import '../styles/SectionReportModal.css';

const SectionReportModal = ({ isOpen, onClose, reportData, loading, error }) => {
  const [activeTab, setActiveTab] = useState(0);

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
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here
      console.log(`${type} copied to clipboard`);
    });
  };

  return (
    <div className="section-report-modal-overlay" onClick={handleOverlayClick}>
      <div className="section-report-modal">
        <div className="modal-header">
          <div className="header-content">
            <h2>
              <i className="fas fa-chart-bar"></i>
              Section-wise Attendance Report
            </h2>
            {reportData && (
              <div className="report-info">
                <span className="section-name">Class: {reportData.sectionName}</span>
                <span className="processed-time">Generated: {formatDate(reportData.processedAt)}</span>
              </div>
            )}
          </div>
          <button className="close-button" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="loading-state">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Processing attendance data...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <i className="fas fa-exclamation-triangle"></i>
              <h3>Error</h3>
              <p>{error}</p>
            </div>
          )}

          {reportData && !loading && !error && (
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
                      <div className="stat-value">{reportData.overall.totalStudents}</div>
                      <div className="stat-label">Total Students</div>
                    </div>
                  </div>
                  <div className="stat-card present">
                    <div className="stat-icon">
                      <i className="fas fa-check-circle"></i>
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{reportData.overall.totalPresent}</div>
                      <div className="stat-label">Present</div>
                    </div>
                  </div>
                  <div className="stat-card absent">
                    <div className="stat-icon">
                      <i className="fas fa-times-circle"></i>
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{reportData.overall.totalAbsent}</div>
                      <div className="stat-label">Absent</div>
                    </div>
                  </div>
                  <div className="stat-card percentage">
                    <div className="stat-icon">
                      <i className="fas fa-percentage"></i>
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{reportData.overall.percentage}%</div>
                      <div className="stat-label">Attendance</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section Tabs */}
              <div className="section-tabs">
                <div className="tab-headers">
                  {reportData.sections.map((section, index) => (
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
                {reportData.sections[activeTab] && (
                  <div className="tab-content">
                    <div className="section-header">
                      <h3>
                        <i className="fas fa-graduation-cap"></i>
                        Section {reportData.sections[activeTab].sectionName}
                      </h3>
                      <div className="section-actions">
                        <button
                          className="copy-btn"
                          onClick={() => {
                            const presentList = reportData.sections[activeTab].present
                              .map(s => `${s.classRollNumber} - ${s.studentName}`)
                              .join('\n');
                            copyToClipboard(presentList, 'Present students');
                          }}
                        >
                          <i className="fas fa-copy"></i> Copy Present
                        </button>
                        <button
                          className="copy-btn"
                          onClick={() => {
                            const absentList = reportData.sections[activeTab].absent
                              .map(s => `${s.classRollNumber} - ${s.studentName}`)
                              .join('\n');
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
                          Present Students ({reportData.sections[activeTab].stats.present})
                        </h4>
                        <div className="student-grid">
                          {reportData.sections[activeTab].present.length > 0 ? (
                            reportData.sections[activeTab].present.map((student, index) => (
                              <div key={index} className="student-card present">
                                <div className="student-info">
                                  <div className="student-roll">{student.classRollNumber}</div>
                                  <div className="student-name">{student.studentName}</div>
                                  <div className="student-university">{student.universityRoll}</div>
                                </div>
                                <div className="attendance-status">
                                  {getAttendanceIcon(student.attendanceStatus)}
                                </div>
                              </div>
                            ))
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
                          Absent Students ({reportData.sections[activeTab].stats.absent})
                        </h4>
                        <div className="student-grid">
                          {reportData.sections[activeTab].absent.length > 0 ? (
                            reportData.sections[activeTab].absent.map((student, index) => (
                              <div key={index} className="student-card absent">
                                <div className="student-info">
                                  <div className="student-roll">{student.classRollNumber}</div>
                                  <div className="student-name">{student.studentName}</div>
                                  <div className="student-university">{student.universityRoll}</div>
                                </div>
                                <div className="attendance-status">
                                  {getAttendanceIcon(student.attendanceStatus)}
                                </div>
                              </div>
                            ))
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
                    {reportData.sections[activeTab].notMarked.length > 0 && (
                      <div className="attendance-list not-marked-list">
                        <h4>
                          <i className="fas fa-question-circle"></i>
                          Not Marked ({reportData.sections[activeTab].stats.notMarked})
                        </h4>
                        <div className="student-grid">
                          {reportData.sections[activeTab].notMarked.map((student, index) => (
                            <div key={index} className="student-card not-marked">
                              <div className="student-info">
                                <div className="student-roll">{student.classRollNumber}</div>
                                <div className="student-name">{student.studentName}</div>
                                <div className="student-university">{student.universityRoll}</div>
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
  );
};

export default SectionReportModal;
