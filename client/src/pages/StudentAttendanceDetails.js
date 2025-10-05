import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/StudentAttendance.css';

const StudentAttendanceDetails = () => {
  const [attendanceDetails, setAttendanceDetails] = useState([]);
  const [facultyName, setFacultyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { facultyId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAttendanceDetails = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('Authentication required');
        }

        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/student/attendance/details/${facultyId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        setAttendanceDetails(response.data.attendanceDetails);
        setFacultyName(response.data.facultyName);
        setLoading(false);
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to fetch attendance details');
        setLoading(false);
      }
    };

    fetchAttendanceDetails();
  }, [facultyId]);

  const handleBackClick = () => {
    navigate('/student/attendance/summary');
  };

  if (loading) {
    return (
      <div className="attendance-container">
        <h2>Attendance Details</h2>
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="attendance-container">
        <h2>Attendance Details</h2>
        <div className="error-message">{error}</div>
        <button className="back-button" onClick={handleBackClick}>
          Back to Summary
        </button>
      </div>
    );
  }

  return (
    <div className="attendance-container">
      <div className="attendance-header">
        <button className="back-button prominent-back" onClick={handleBackClick}>
          <span className="back-arrow">&larr;</span> Back to Summary
        </button>
        <h2>Attendance Details: {facultyName}</h2>
      </div>
      
      {attendanceDetails.length === 0 ? (
        <div className="no-data-message">No attendance records found for this faculty.</div>
      ) : (
        <div className="table-responsive">
          <table className="attendance-table details-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceDetails.map((record, index) => (
                <tr 
                  key={index} 
                  className={`status-row ${record.status === 'present' ? 'present-row' : 'absent-row'}`}
                >
                  <td>{record.formattedDate}</td>
                  <td>
                    <span className={`status-indicator ${record.status}`}>
                      {record.status === 'present' ? 'Present' : 'Absent'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="attendance-legend">
        <div className="legend-item">
          <span className="legend-color status-indicator present"></span>
          <span>Present</span>
        </div>
        <div className="legend-item">
          <span className="legend-color status-indicator absent"></span>
          <span>Absent</span>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendanceDetails;
