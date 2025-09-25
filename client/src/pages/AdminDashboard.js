import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is admin
    const checkAdmin = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!storedUser || !token) {
          navigate('/admin/login');
          return;
        }
        
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role !== 'admin') {
          navigate('/admin/login');
          return;
        }

        setUser(parsedUser);
      } catch (e) {
        console.error('Error checking admin status:', e);
        navigate('/admin/login');
      }
    };
    
    checkAdmin();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/admin/login');
  };

  const navigateTo = (path) => {
    navigate(path);
  };

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="admin-dashboard-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button onClick={handleLogout} className="logout-button">
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>

      <div className="admin-cards">
        <div className="admin-card" onClick={() => navigateTo('/admin/faculty-requests')}>
          <div className="card-icon">
            <i className="fas fa-user-plus"></i>
          </div>
          <div className="card-content">
            <h3>Faculty Requests</h3>
            <p>Manage faculty account requests</p>
          </div>
        </div>
      <div className="admin-card" onClick={() => navigateTo('/admin/manage-faculty-assignments')}>
          <div className="card-icon">
            <i className="fas fa-chalkboard-teacher"></i>
          </div>
          <div className="card-content">
            <h3>Faculty Assignments</h3>
            <p>Manage teaching assignments for faculty members</p>
          </div>
        </div>
        
        <div className="admin-card" onClick={() => navigateTo('/admin/upload-data')}>
          <div className="card-icon">
            <i className="fas fa-upload"></i>
          </div>
          <div className="card-content">
            <h3>Student Data Upload</h3>
            <p>Upload student data from Excel files</p>
          </div>
        </div>

        <div className="admin-card" onClick={() => navigateTo('/admin/suspicious-devices')}>
          <div className="card-icon">
            <i className="fas fa-shield-alt"></i>
          </div>
          <div className="card-content">
            <h3>Suspicious Devices</h3>
            <p>Monitor suspicious login activities</p>
          </div>
        </div>

        <div className="admin-card" onClick={() => navigateTo('/admin/reports')}>
          <div className="card-icon">
            <i className="fas fa-chart-bar"></i>
          </div>
          <div className="card-content">
            <h3>Attendance Reports</h3>
            <p>View and export attendance reports</p>
          </div>
        </div>
        
        <div className="admin-card" onClick={() => navigateTo('/admin/chatbot-content')}>
          <div className="card-icon">
            <i className="fas fa-robot"></i>
          </div>
          <div className="card-content">
            <h3>Chatbot Content</h3>
            <p>Manage university information for the chatbot</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;