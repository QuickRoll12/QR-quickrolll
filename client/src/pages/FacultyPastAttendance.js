import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/FacultyPastAttendance.css';

const FacultyPastAttendance = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const navigate = useNavigate();
  // New state variables for edit functionality
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [rollNumberToAdd, setRollNumberToAdd] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [presentStudents, setPresentStudents] = useState([]);
  const [absentStudents, setAbsentStudents] = useState([]);
  
  // 📊 REPORT GENERATION STATE
  const [showReportModal, setShowReportModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [rollNumbers, setRollNumbers] = useState('');
  const [attendanceMode, setAttendanceMode] = useState('present'); // 'present' or 'absent'
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');
  const [generatedReports, setGeneratedReports] = useState(null);

  useEffect(() => {
    fetchAttendanceRecords();
  }, []);

  useEffect(() => {
    // Apply filters whenever filter values or records change
    applyFilters();
  }, [records, dateFilter, sectionFilter, departmentFilter]);

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const url = `${BACKEND_URL}/api/attendance/records`;
      
      const response = await axios.get(
        url,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setRecords(response.data);
      setFilteredRecords(response.data);
      setError('');
    } catch (error) {
      setError(`Failed to fetch attendance records: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...records];
    
    // Apply date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filterDate.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate.getTime() === filterDate.getTime();
      });
    }
    
    // Apply section filter
    if (sectionFilter) {
      filtered = filtered.filter(record => 
        record.section.toLowerCase().includes(sectionFilter.toLowerCase())
      );
    }
    
    // Apply department filter
    if (departmentFilter) {
      filtered = filtered.filter(record => 
        record.department.toLowerCase().includes(departmentFilter.toLowerCase())
      );
    }
    
    // If no filters, show only last 5 days
    if (!dateFilter && !sectionFilter && !departmentFilter) {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= fiveDaysAgo;
      });
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    setFilteredRecords(filtered);
  };

  const resetFilters = () => {
    setDateFilter('');
    setSectionFilter('');
    setDepartmentFilter('');
    setFilteredRecords(records);
  };

  const handleViewDetails = (record) => {
    setSelectedRecord(record);
  };

  const closeDetails = () => {
    setSelectedRecord(null);
  };

  const handleDownloadPDF = async (recordId) => {
    try {
      setDownloadLoading(true);
      const token = localStorage.getItem('token');
      
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const url = `${BACKEND_URL}/api/attendance/records/${recordId}/download-pdf`;
      
      // Use fetch for blob response
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      // Get the blob from response
      const blob = await response.blob();
      
      // Create a URL for the blob
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Get record details for filename
      const record = records.find(r => r._id === recordId);
      const dateStr = new Date(record.date).toISOString().split('T')[0];
      
      // Set download filename
      link.download = `attendance_${record.department}_${record.section}_${dateStr}.pdf`;
      
      // Append to body, click and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      window.URL.revokeObjectURL(downloadUrl);
      
      setError('');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError(`Failed to download PDF: ${error.message || 'Unknown error'}`);
    } finally {
      setDownloadLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Function to copy roll numbers to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        showSuccessMessage('Roll numbers copied to clipboard!');
      })
      .catch((error) => {
        console.error('Error copying to clipboard:', error);
        showErrorMessage('Failed to copy to clipboard');
      });
  };

  // Function to handle copying present roll numbers
  const handleCopyPresent = (record) => {
    if (!record.presentStudents || record.presentStudents.length === 0) {
      showErrorMessage('No present students to copy');
      return;
    }
    
    const rollNumbers = record.presentStudents.sort().join(', ');
    copyToClipboard(rollNumbers);
  };

  // Function to handle copying absent roll numbers
  const handleCopyAbsent = (record) => {
    if (!record.absentees || record.absentees.length === 0) {
      showErrorMessage('No absent students to copy');
      return;
    }
    
    const rollNumbers = record.absentees.sort().join(', ');
    copyToClipboard(rollNumbers);
  };

  // Function to handle sending an email report with formatted HTML content
  const handleEmailReport = (record) => {
    // Calculate attendance rate
    const attendanceRate = ((record.presentCount / record.totalStudents) * 100).toFixed(2);
    
    // Create HTML email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h1 style="color: #2196f3; text-align: center;">Attendance Report</h1>
        <p style="text-align: center; color: #757575;">Generated on ${formatDate(record.date)}</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        
        <h2 style="color: #333;">Session Details</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Department:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${record.department}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Section:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${record.section}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Date:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${formatDate(record.date)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Faculty:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${record.facultyName}</td>
          </tr>
        </table>
        
        <h2 style="color: #333;">Attendance Summary</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Total Students:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${record.totalStudents}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Present:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${record.presentCount}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Absent:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${record.totalStudents - record.presentCount}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Attendance Rate:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${attendanceRate}%</td>
          </tr>
        </table>
        
        <p style="margin-top: 30px; color: #757575; font-size: 14px; text-align: center;">
          This is an automated email sent by the QuickRoll Attendance System.<br>
        </p>
      </div>
    `;
    
    // Create a plain text version for email clients that don't support HTML
    const plainText = `Attendance Report

Generated on ${formatDate(record.date)}

Session Details:
- Department: ${record.department}
- Section: ${record.section}
- Date: ${formatDate(record.date)}
- Faculty: ${record.facultyName || 'N/A'}

Attendance Summary:
- Total Students: ${record.totalStudents}
- Present: ${record.presentCount}
- Absent: ${record.totalStudents - record.presentCount}
- Attendance Rate: ${attendanceRate}%

This is an automated email sent by the QuickRoll Attendance System.`;
    
    // Encode the plain text for the mailto link
    const encodedPlainText = encodeURIComponent(plainText);
    
    // Open the default email client with the pre-filled email
    window.open(`mailto:?subject=Attendance Report - ${record.department} ${record.section}&body=${encodedPlainText}`);
    
    // Show success message
    showSuccessMessage('Email template prepared');
  };

  // Function to show success message
  const showSuccessMessage = (message) => {
    const messageElement = document.createElement('div');
    messageElement.className = 'success-message';
    messageElement.textContent = message;
    document.body.appendChild(messageElement);
    
    setTimeout(() => {
      messageElement.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      messageElement.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(messageElement);
      }, 300);
    }, 3000);
  };

  // Function to show error message
  const showErrorMessage = (message) => {
    const messageElement = document.createElement('div');
    messageElement.className = 'error-message';
    messageElement.textContent = message;
    document.body.appendChild(messageElement);
    
    setTimeout(() => {
      messageElement.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      messageElement.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(messageElement);
      }, 300);
    }, 3000);
  };

  // Function to open edit modal
  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setPresentStudents([...record.presentStudents]);
    setAbsentStudents([...record.absentees]);
    setShowEditModal(true);
    setEditError('');
    setEditSuccess('');
  };

  // Function to close edit modal
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingRecord(null);
    setRollNumberToAdd('');
    setEditError('');
    setEditSuccess('');
  };

  // Function to move student from absent to present
  const moveToPresent = (rollNumber) => {
    // Check if roll number is already in present list
    if (presentStudents.includes(rollNumber)) {
      setEditError(`Roll number ${rollNumber} is already marked present`);
      return;
    }

    // Remove from absent and add to present (with sorting)
    setAbsentStudents(absentStudents.filter(roll => roll !== rollNumber).sort());
    setPresentStudents([...presentStudents, rollNumber].sort());
    setEditSuccess(`Moved ${rollNumber} to present list`);
    setTimeout(() => setEditSuccess(''), 2000);
  };

  // Function to move student from present to absent
  const moveToAbsent = (rollNumber) => {
    // Check if roll number is already in absent list
    if (absentStudents.includes(rollNumber)) {
      setEditError(`Roll number ${rollNumber} is already marked absent`);
      return;
    }

    // Remove from present and add to absent (with sorting)
    setPresentStudents(presentStudents.filter(roll => roll !== rollNumber).sort());
    setAbsentStudents([...absentStudents, rollNumber].sort());
    setEditSuccess(`Moved ${rollNumber} to absent list`);
    setTimeout(() => setEditSuccess(''), 2000);
  };

  // Handle adding multiple roll numbers to present list (comma-separated)
  const handleAddRollNumber = () => {
    if (!rollNumberToAdd.trim()) {
      setEditError('Please enter roll number(s)');
      return;
    }

    // Split by comma and process each roll number
    const rollNumbers = rollNumberToAdd.split(',').map(roll => roll.trim()).filter(roll => roll);
    
    if (rollNumbers.length === 0) {
      setEditError('Please enter valid roll number(s)');
      return;
    }

    const totalStudentsNum = parseInt(editingRecord.totalStudents || 0, 10);
    const validRollNumbers = [];
    const errors = [];
    const movedFromAbsent = [];
    const alreadyPresent = [];

    // Process each roll number
    for (let rollNumber of rollNumbers) {
      // Check if it's a number
      if (!/^\d+$/.test(rollNumber)) {
        errors.push(`${rollNumber} must contain only digits`);
        continue;
      }
      
      // Format single digit roll numbers with leading zero
      let formattedRollNumber = rollNumber;
      if (formattedRollNumber.length === 1) {
        formattedRollNumber = `0${formattedRollNumber}`;
      }
      
      // Validate roll number value
      const rollNumberNum = parseInt(formattedRollNumber, 10);
      
      if (rollNumberNum <= 0) {
        errors.push(`${formattedRollNumber} must be greater than 0`);
        continue;
      }
      
      if (totalStudentsNum > 0 && rollNumberNum > totalStudentsNum) {
        errors.push(`${formattedRollNumber} must be ≤ total students (${totalStudentsNum})`);
        continue;
      }

      // Check if already in present list
      if (presentStudents.includes(formattedRollNumber)) {
        alreadyPresent.push(formattedRollNumber);
        continue;
      }

      // Check if in absent list (will be moved)
      if (absentStudents.includes(formattedRollNumber)) {
        movedFromAbsent.push(formattedRollNumber);
      }
      
      validRollNumbers.push(formattedRollNumber);
    }

    // Show errors if any
    if (errors.length > 0) {
      setEditError(errors.join('; '));
      return;
    }

    // Process valid roll numbers
    if (validRollNumbers.length > 0) {
      // Remove from absent list if they exist there
      const updatedAbsentStudents = absentStudents.filter(roll => !validRollNumbers.includes(roll));
      
      // Add to present list and sort
      const updatedPresentStudents = [...presentStudents, ...validRollNumbers].sort();
      
      setAbsentStudents(updatedAbsentStudents);
      setPresentStudents(updatedPresentStudents);
      
      // Show success message
      let successMessage = `Added ${validRollNumbers.length} student(s) to present list`;
      if (movedFromAbsent.length > 0) {
        successMessage += ` (moved ${movedFromAbsent.length} from absent)`;
      }
      if (alreadyPresent.length > 0) {
        successMessage += ` (${alreadyPresent.length} already present)`;
      }
      
      setEditSuccess(successMessage);
      setTimeout(() => setEditSuccess(''), 3000);
      
      setRollNumberToAdd('');
      setEditError('');
    } else if (alreadyPresent.length > 0) {
      setEditError(`Roll number(s) already in present list: ${alreadyPresent.join(', ')}`);
    }
  };

  // Remove a roll number completely (not in present or absent)
  const removeRollNumber = (rollNumber) => {
    setPresentStudents(presentStudents.filter(rn => rn !== rollNumber));
    setAbsentStudents(absentStudents.filter(rn => rn !== rollNumber));
    setEditSuccess(`Roll number ${rollNumber} removed from attendance record`);
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setEditSuccess('');
    }, 3000);
  };

  // Function to save attendance changes
  const saveAttendanceChanges = async () => {
    if (!editingRecord) return;

    try {
      setEditLoading(true);
      setEditError('');
      
      const token = localStorage.getItem('token');
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      
      // Calculate the new present count
      const presentCount = presentStudents.length;
      
      const response = await axios.put(
        `${BACKEND_URL}/api/attendance/records/${editingRecord._id}`,
        {
          presentStudents,
          absentees: absentStudents,
          presentCount
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        // Update the record in the local state
        const updatedRecords = records.map(record => 
          record._id === editingRecord._id 
            ? { 
                ...record, 
                presentStudents, 
                absentees: absentStudents,
                presentCount
              } 
            : record
        );
        
        setRecords(updatedRecords);
        setFilteredRecords(
          filteredRecords.map(record => 
            record._id === editingRecord._id 
              ? { 
                  ...record, 
                  presentStudents, 
                  absentees: absentStudents,
                  presentCount
                } 
              : record
          )
        );
        
        setEditSuccess('Attendance record updated successfully');
        setTimeout(() => {
          setShowEditModal(false);
          setEditingRecord(null);
          setEditSuccess('');
        }, 1500);
      }
    } catch (error) {
      console.error('Error updating attendance record:', error);
      setEditError(`Failed to update attendance: ${error.response?.data?.message || error.message}`);
    } finally {
      setEditLoading(false);
    }
  };

  // 📊 REPORT GENERATION FUNCTIONS
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      setReportError('');
    } else {
      setReportError('Please select a valid CSV file');
      setCsvFile(null);
    }
  };

  const resetReportModal = () => {
    setCsvFile(null);
    setRollNumbers('');
    setAttendanceMode('present');
    setReportError('');
    setReportSuccess('');
    setGeneratedReports(null);
    setReportLoading(false);
  };

  const generateCustomReport = async () => {
    if (!csvFile) {
      setReportError('Please upload a CSV file');
      return;
    }

    if (!rollNumbers.trim()) {
      setReportError('Please enter roll numbers');
      return;
    }

    setReportLoading(true);
    setReportError('');
    setReportSuccess('');

    try {
      const formData = new FormData();
      formData.append('csvFile', csvFile);
      formData.append('rollNumbers', rollNumbers.trim());
      formData.append('attendanceMode', attendanceMode);

      const token = localStorage.getItem('token');
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      
      const response = await axios.post(
        `${BACKEND_URL}/api/reports/generate-custom`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setGeneratedReports(response.data.reports);
        setReportSuccess('Reports generated successfully! Click the download links below.');
      } else {
        setReportError(response.data.message || 'Failed to generate reports');
      }
    } catch (error) {
      console.error('Error generating reports:', error);
      setReportError(
        error.response?.data?.message || 
        'Failed to generate reports. Please try again.'
      );
    } finally {
      setReportLoading(false);
    }
  };

  const downloadReport = (reportUrl, filename) => {
    // ✅ Force direct download for Excel files
    const link = document.createElement('a');
    link.href = reportUrl;
    link.download = filename;
    link.setAttribute('target', '_blank'); // Ensure it opens in new tab if needed
    link.setAttribute('rel', 'noopener noreferrer'); // Security
    
    // Force download behavior
    if (filename.endsWith('.xlsx')) {
      link.setAttribute('type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else if (filename.endsWith('.pdf')) {
      link.setAttribute('type', 'application/pdf');
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="past-attendance-container">
      <div className="header">
        <h2>Past Attendance Records</h2>
        <div className="header-buttons">
          <button 
            className="download-report-button"
            onClick={() => {
              resetReportModal();
              setShowReportModal(true);
            }}
          >
            📊 Download Report
          </button>
          <button 
            className="back-button" 
            onClick={() => navigate('/faculty')}
          >
            <span className="back-arrow">&larr;</span> Back to Dashboard
          </button>
        </div>
      </div>

      <div className="filters-container">
        <h3>Filter Records</h3>
        <div className="filters">
          <div className="filter-group">
            <label>Date:</label>
            <input 
              type="date" 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>Section:</label>
            <input 
              type="text" 
              placeholder="Filter by section" 
              value={sectionFilter} 
              onChange={(e) => setSectionFilter(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>Department:</label>
            <input 
              type="text" 
              placeholder="Filter by department" 
              value={departmentFilter} 
              onChange={(e) => setDepartmentFilter(e.target.value)}
            />
          </div>
          
          <button 
            className="reset-button" 
            onClick={resetFilters}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading">
          <i className="fas fa-spinner fa-spin"></i> Loading records...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="no-records">
          <i className="fas fa-folder-open"></i>
          <p>No attendance records found</p>
          {(dateFilter || sectionFilter || departmentFilter) && (
            <p>Try adjusting your filters</p>
          )}
        </div>
      ) : (
        <div className="attendance-records-list">
          {filteredRecords.map((record) => (
            <div key={record._id} className="attendance-card">
              <div className="attendance-header">
                <div className="attendance-title">
                  <h3>{record.department} - {record.section}</h3>
                  <span className="attendance-date">{formatDate(record.date)}</span>
                </div>
                <div className="attendance-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total:</span>
                    <span className="stat-value">{record.totalStudents}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Present:</span>
                    <span className="stat-value">{record.presentCount}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Absent:</span>
                    <span className="stat-value">{record.totalStudents - record.presentCount}</span>
                  </div>
                </div>
              </div>
              
              <div className="attendance-details">
                <div className="student-lists">
                  <div className="present-list">
                    <h4>Present Students</h4>
                    <div className="roll-numbers">
                      {record.presentStudents && record.presentStudents.length > 0 ? (
                        record.presentStudents.sort().map((roll, index) => (
                          <span key={index} className="roll-badge present">{roll}</span>
                        ))
                      ) : (
                        <p className="empty-message">No students present</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="absent-list">
                    <h4>Absent Students</h4>
                    <div className="roll-numbers">
                      {record.absentees && record.absentees.length > 0 ? (
                        record.absentees.sort().map((roll, index) => (
                          <span key={index} className="roll-badge absent">{roll}</span>
                        ))
                      ) : (
                        <p className="empty-message">No students absent</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="attendance-actions">
                <button 
                  className="download-button" 
                  onClick={() => handleDownloadPDF(record._id)}
                  disabled={downloadLoading}
                >
                  <i className="fas fa-download"></i> Download PDF
                </button>
                <button 
                  className="email-button" 
                  onClick={() => handleEmailReport(record)}
                >
                  <i className="fas fa-envelope"></i> Email Report
                </button>
                <button 
                  className="copy-button copy-present" 
                  onClick={() => handleCopyPresent(record)}
                >
                  <i className="fas fa-copy"></i> Copy Present
                </button>
                <button 
                  className="copy-button copy-absent" 
                  onClick={() => handleCopyAbsent(record)}
                >
                  <i className="fas fa-copy"></i> Copy Absent
                </button>
                <button 
                  className="edit-button" 
                  onClick={() => handleEditRecord(record)}
                >
                  <i className="fas fa-edit"></i> Edit Attendance
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Attendance Modal */}
      {showEditModal && editingRecord && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <div className="edit-modal-header">
              <h3>Edit Attendance Record</h3>
              <button className="close-button" onClick={handleCloseEditModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="edit-modal-content">
              <div className="record-info">
                <p><strong>Department:</strong> {editingRecord.department}</p>
                <p><strong>Section:</strong> {editingRecord.section}</p>
                <p><strong>Date:</strong> {formatDate(editingRecord.date)}</p>
                <p><strong>Total Students:</strong> {editingRecord.totalStudents}</p>
              </div>
              
              {editError && <div className="edit-error">{editError}</div>}
              {editSuccess && <div className="edit-success">{editSuccess}</div>}
              
              <div className="add-roll-number">
                <h4>Add Roll Numbers</h4>
                <div className="add-roll-form">
                  <input
                    type="text"
                    value={rollNumberToAdd}
                    onChange={(e) => setRollNumberToAdd(e.target.value)}
                    placeholder="Enter roll number(s) - separate multiple with commas (e.g., 01, 05, 12)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddRollNumber();
                      }
                    }}
                  />
                  <button onClick={handleAddRollNumber}>Add</button>
                </div>
                <p className="add-roll-help">
                  💡 <strong>Tip:</strong> You can add multiple roll numbers at once by separating them with commas
                </p>
              </div>
              
              <div className="edit-lists">
                <div className="edit-present-list">
                  <h4>
                    <i className="fas fa-check-circle" style={{ color: '#4caf50' }}></i>
                    Present Students ({presentStudents.length})
                  </h4>
                  <div className="edit-roll-numbers">
                    {presentStudents.length > 0 ? (
                      presentStudents.sort().map((rollNumber) => (
                        <div key={rollNumber} className="edit-roll-badge present">
                          <span>{rollNumber}</span>
                          <div className="badge-actions">
                            <button 
                              title="Move to absent"
                              onClick={() => moveToAbsent(rollNumber)}
                            >
                              <i className="fas fa-arrow-right"></i>
                            </button>
                            <button 
                              title="Remove from record"
                              className="remove-btn"
                              onClick={() => removeRollNumber(rollNumber)}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="empty-message">No students marked present</p>
                    )}
                  </div>
                </div>

                <div className="edit-absent-list">
                  <h4>
                    <i className="fas fa-times-circle" style={{ color: '#f44336' }}></i>
                    Absent Students ({absentStudents.length})
                  </h4>
                  <div className="edit-roll-numbers">
                    {absentStudents.length > 0 ? (
                      absentStudents.sort().map((rollNumber) => (
                        <div key={rollNumber} className="edit-roll-badge absent">
                          <span>{rollNumber}</span>
                          <div className="badge-actions">
                            <button 
                              title="Move to present"
                              onClick={() => moveToPresent(rollNumber)}
                            >
                              <i className="fas fa-arrow-left"></i>
                            </button>
                            <button 
                              title="Remove from record"
                              className="remove-btn"
                              onClick={() => removeRollNumber(rollNumber)}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="empty-message">No students marked absent</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="edit-modal-footer">
              <button 
                className="cancel-button" 
                onClick={handleCloseEditModal}
              >
                Cancel
              </button>
              <button 
                className="save-button" 
                onClick={saveAttendanceChanges}
                disabled={editLoading}
              >
                {editLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📊 REPORT GENERATION MODAL */}
      {showReportModal && (
        <div className="modal-overlay">
          <div className="modal-content report-modal">
            <div className="modal-header">
              <h3>📊 Generate Custom Attendance Report</h3>
              <button 
                className="close-button" 
                onClick={() => setShowReportModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {reportError && (
                <div className="error-message">
                  <i className="fas fa-exclamation-circle"></i>
                  {reportError}
                </div>
              )}
              
              {reportSuccess && (
                <div className="success-message">
                  <i className="fas fa-check-circle"></i>
                  {reportSuccess}
                </div>
              )}

              <div className="report-sections">
                {/* CSV Upload Section */}
                <div className="report-section">
                  <h4>📁 Upload Student Data (CSV)</h4>
                  <p className="section-description">
                    Upload CSV file with columns: S No., University Roll, Student Name, Real Section, Class Roll Number, Mobile Number, Given Roll number
                  </p>
                  <div className="file-upload-area">
                    <input
                      type="file"
                      id="csvFileInput"
                      accept=".csv"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="csvFileInput" className="file-upload-label">
                      {csvFile ? (
                        <>
                          <i className="fas fa-file-csv"></i>
                          {csvFile.name}
                        </>
                      ) : (
                        <>
                          <i className="fas fa-cloud-upload-alt"></i>
                          Click to upload CSV file
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Roll Numbers Input Section */}
                <div className="report-section">
                  <h4>📝 Enter Roll Numbers</h4>
                  
                  {/* Present/Absent Toggle */}
                  <div className="attendance-mode-toggle">
                    <label className="toggle-label">
                      <span>Mode:</span>
                      <div className="toggle-buttons">
                        <button
                          type="button"
                          className={`toggle-button ${attendanceMode === 'present' ? 'active' : ''}`}
                          onClick={() => setAttendanceMode('present')}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          className={`toggle-button ${attendanceMode === 'absent' ? 'active' : ''}`}
                          onClick={() => setAttendanceMode('absent')}
                        >
                          Absent
                        </button>
                      </div>
                    </label>
                  </div>

                  <p className="section-description">
                    Enter comma-separated {attendanceMode} roll numbers (Given Roll numbers from CSV):
                  </p>
                  <textarea
                    className="roll-numbers-input"
                    placeholder={`Example: 1, 2, 3, 4, 5\n\nEnter the ${attendanceMode} students' Given Roll numbers...`}
                    value={rollNumbers}
                    onChange={(e) => setRollNumbers(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>

              {/* Generated Reports Section */}
              {generatedReports && (
                <div className="generated-reports">
                  <h4>📄 Generated Reports</h4>
                  <div className="download-links">
                    {generatedReports.pdfUrl && (
                      <button
                        className="download-link pdf-download"
                        onClick={() => downloadReport(generatedReports.pdfUrl, 'absentees_report.pdf')}
                      >
                        <i className="fas fa-file-pdf"></i>
                        Download PDF (Absentees List)
                      </button>
                    )}
                    {generatedReports.excelUrl && (
                      <button
                        className="download-link excel-download"
                        onClick={() => downloadReport(generatedReports.excelUrl, 'attendance_report.xlsx')}
                      >
                        <i className="fas fa-file-excel"></i>
                        Download Excel (Full Report)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                className="cancel-button" 
                onClick={() => setShowReportModal(false)}
              >
                Cancel
              </button>
              <button 
                className="generate-button" 
                onClick={generateCustomReport}
                disabled={reportLoading || !csvFile || !rollNumbers.trim()}
              >
                {reportLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Generating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-chart-bar"></i> Generate Reports
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyPastAttendance;