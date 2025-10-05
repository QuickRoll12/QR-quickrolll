import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/StudentAttendance.css';

const StudentAttendanceSummary = () => {
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAttendanceSummary = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('Authentication required');
        }

        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/student/attendance/summary`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        setAttendanceSummary(response.data);
        setLoading(false);
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to fetch attendance data');
        setLoading(false);
      }
    };

    fetchAttendanceSummary();
  }, []);

  const handleRowClick = (facultyId) => {
    navigate(`/student/attendance/details/${facultyId}`);
  };

  // Function to determine attendance status color
  const getAttendanceStatusColor = (percentage) => {
    if (percentage < 75) return 'attendance-danger';
    if (percentage < 85) return 'attendance-warning';
    return 'attendance-success';
  };

  if (loading) {
    return (
      <div className="attendance-container">
        <h2>Attendance Summary</h2>
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="attendance-container">
        <h2>Attendance Summary</h2>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const handleBackClick = () => {
    navigate('/student');
  };

  return (
    <div className="attendance-container">
      <div className="attendance-header">
        <button className="back-button prominent-back" onClick={handleBackClick}>
          <span className="back-arrow">&larr;</span> Back to Dashboard
        </button>
        <h2>Attendance Summary</h2>
      </div>
      
      {attendanceSummary.length === 0 ? (
        <div className="no-data-message">No attendance records found for the last 30 days.</div>
      ) : (
        <div className="table-responsive">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Faculty Name</th>
                <th>Present Days</th>
                <th>Total Days</th>
                <th>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {attendanceSummary.map((faculty) => (
                <tr 
                  key={faculty.facultyId} 
                  onClick={() => handleRowClick(faculty.facultyId)}
                  className="clickable-row"
                >
                  <td>{faculty.facultyName}</td>
                  <td>{faculty.presentDays}</td>
                  <td>{faculty.totalDays}</td>
                  <td className={getAttendanceStatusColor(faculty.attendancePercentage)}>
                    {faculty.attendancePercentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="attendance-legend">
        <div className="legend-item">
          <span className="legend-color attendance-success"></span>
          <span>Good (≥85%)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color attendance-warning"></span>
          <span>Warning (75-84%)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color attendance-danger"></span>
          <span>Critical (&lt;75%)</span>
        </div>
      </div>
      
      <div className="attendance-info">
        <p>Click on any row to view detailed attendance history.</p>
      </div>
    </div>
  );
};

export default StudentAttendanceSummary;
