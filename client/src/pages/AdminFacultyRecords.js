import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiDownload, FiEdit2, FiTrash2, FiChevronLeft, FiChevronRight, FiX, FiCheck, FiAlertCircle, FiRefreshCw, FiBookOpen } from 'react-icons/fi';

const AdminFacultyRecords = () => {
  const navigate = useNavigate();
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
  const [course, setCourse] = useState('');

  // Filter options
  const [filterOptions, setFilterOptions] = useState({
    courses: []
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
  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  // Fetch filter options
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage,
        limit: recordsPerPage,
        search: search,
        course: course
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
  }, [currentPage, recordsPerPage, search, course, API_URL]);

  // Fetch faculty when filters change
  useEffect(() => {
    fetchFaculty();
  }, [currentPage, recordsPerPage, course]);

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
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        role: 'faculty',
        course: course
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
    setCourse('');
    setCurrentPage(1);
  };

  return (
    <PageContainer>
      <Header>
        <BackButton onClick={() => navigate('/admin/dashboard')}>
          <FiChevronLeft /> Back to Dashboard
        </BackButton>
        <Title>
          <GradientText>Faculty Records</GradientText>
          <Subtitle>Manage teaching staff and assignments</Subtitle>
        </Title>
        <ExportButton onClick={handleExport}>
          <FiDownload /> Export CSV
        </ExportButton>
      </Header>

      <AnimatePresence>
        {error && (
          <Alert
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            type="error"
          >
            <FiAlertCircle /> {error}
          </Alert>
        )}
        {success && (
          <Alert
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            type="success"
          >
            <FiCheck /> {success}
          </Alert>
        )}
      </AnimatePresence>

      <ControlsSection>
        <SearchContainer>
          <FiSearch />
          <SearchInput
            type="text"
            placeholder="Search by ID, Name, or Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </SearchContainer>

        <FiltersContainer>
          <FilterSelect value={course} onChange={(e) => setCourse(e.target.value)}>
            <option value="">All Courses</option>
            {filterOptions.courses.map(c => <option key={c} value={c}>{c}</option>)}
          </FilterSelect>

          <ResetButton onClick={resetFilters} title="Reset Filters">
            <FiRefreshCw />
          </ResetButton>
        </FiltersContainer>
      </ControlsSection>

      <TableCard>
        <TableHeader>
          <RecordCount>Showing {faculty.length} of {totalRecords} records</RecordCount>
          <PerPageSelect
            value={recordsPerPage}
            onChange={(e) => {
              setRecordsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value="10">10 / page</option>
            <option value="15">15 / page</option>
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
          </PerPageSelect>
        </TableHeader>

        <TableWrapper>
          {loading ? (
            <LoadingState>Loading records...</LoadingState>
          ) : faculty.length === 0 ? (
            <EmptyState>No faculty members found matching your criteria</EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Teaching Load</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {faculty.map((facultyMember) => (
                  <tr key={facultyMember._id}>
                    <td><IdBadge>{facultyMember.facultyId}</IdBadge></td>
                    <td><NameText>{facultyMember.name}</NameText></td>
                    <td><EmailText>{facultyMember.email}</EmailText></td>
                    <td><CourseTag>{facultyMember.course}</CourseTag></td>
                    <td>
                      {facultyMember.teachingAssignments && facultyMember.teachingAssignments.length > 0 ? (
                        <AssignmentBadge>
                          <FiBookOpen /> {facultyMember.teachingAssignments.length} Classes
                        </AssignmentBadge>
                      ) : (
                        <NoAssignmentText>No assignments</NoAssignmentText>
                      )}
                    </td>
                    <td>
                      <StatusBadge verified={facultyMember.isVerified}>
                        {facultyMember.isVerified ? 'Verified' : 'Pending'}
                      </StatusBadge>
                    </td>
                    <td>
                      <ActionGroup>
                        <ActionButton onClick={() => handleEdit(facultyMember)} color="#4361ee">
                          <FiEdit2 />
                        </ActionButton>
                        <ActionButton onClick={() => handleDelete(facultyMember)} color="#ef233c">
                          <FiTrash2 />
                        </ActionButton>
                      </ActionGroup>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </TableWrapper>

        {totalPages > 1 && (
          <Pagination>
            <PageButton
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <FiChevronLeft />
            </PageButton>
            <PageInfo>Page {currentPage} of {totalPages}</PageInfo>
            <PageButton
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <FiChevronRight />
            </PageButton>
          </Pagination>
        )}
      </TableCard>

      <AnimatePresence>
        {showEditModal && editingFaculty && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEditModal(false)}
          >
            <ModalContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <h3>Edit Faculty Member</h3>
                <CloseButton onClick={() => setShowEditModal(false)}><FiX /></CloseButton>
              </ModalHeader>
              <ModalBody>
                <FormGrid>
                  <FormGroup>
                    <label>Faculty ID</label>
                    <Input
                      value={editingFaculty.facultyId || ''}
                      onChange={(e) => setEditingFaculty({ ...editingFaculty, facultyId: e.target.value })}
                    />
                  </FormGroup>
                  <FormGroup>
                    <label>Full Name</label>
                    <Input
                      value={editingFaculty.name || ''}
                      onChange={(e) => setEditingFaculty({ ...editingFaculty, name: e.target.value })}
                    />
                  </FormGroup>
                  <FormGroup full>
                    <label>Email Address</label>
                    <Input
                      type="email"
                      value={editingFaculty.email || ''}
                      onChange={(e) => setEditingFaculty({ ...editingFaculty, email: e.target.value })}
                    />
                  </FormGroup>
                  <FormGroup>
                    <label>Department</label>
                    <Select
                      value={editingFaculty.course || ''}
                      onChange={(e) => setEditingFaculty({ ...editingFaculty, course: e.target.value })}
                    >
                      <option value="">Select Department</option>
                      {filterOptions.courses.map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </FormGroup>

                  <CheckboxGroup>
                    <input
                      type="checkbox"
                      checked={editingFaculty.isVerified || false}
                      onChange={(e) => setEditingFaculty({ ...editingFaculty, isVerified: e.target.checked })}
                    />
                    <label>Account Verified</label>
                  </CheckboxGroup>

                  {editingFaculty.teachingAssignments && editingFaculty.teachingAssignments.length > 0 && (
                    <FormGroup full>
                      <label>Current Teaching Assignments</label>
                      <AssignmentsList>
                        {editingFaculty.teachingAssignments.map((assignment, idx) => (
                          <AssignmentItem key={idx}>
                            <span className="sem">Sem {assignment.semester}</span>
                            <span className="sec">Sec {assignment.section}</span>
                          </AssignmentItem>
                        ))}
                      </AssignmentsList>
                    </FormGroup>
                  )}
                </FormGrid>
              </ModalBody>
              <ModalFooter>
                <CancelButton onClick={() => setShowEditModal(false)}>Cancel</CancelButton>
                <SaveButton onClick={handleSaveEdit} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </SaveButton>
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>
        )}

        {showDeleteModal && deletingFaculty && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteModal(false)}
          >
            <DeleteModalContent
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <DeleteIconWrapper>
                <FiTrash2 />
              </DeleteIconWrapper>
              <h3>Delete Faculty Member?</h3>
              <p>Are you sure you want to delete <strong>{deletingFaculty.name}</strong>? This action cannot be undone.</p>
              <ModalFooter>
                <CancelButton onClick={() => setShowDeleteModal(false)}>Cancel</CancelButton>
                <DeleteConfirmButton onClick={confirmDelete} disabled={loading}>
                  {loading ? 'Deleting...' : 'Delete'}
                </DeleteConfirmButton>
              </ModalFooter>
            </DeleteModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </PageContainer>
  );
};

// Styled Components (Reusing most from StudentRecords for consistency)
const PageContainer = styled.div`
  padding: 2rem;
  background: #f8f9fa;
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.div`
  display: flex;
  flex-direction: column;
`;

const GradientText = styled.h1`
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #4361ee, #3a0ca3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
`;

const Subtitle = styled.p`
  color: #6c757d;
  margin: 0.5rem 0 0 0;
  font-size: 0.95rem;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  font-weight: 500;
  transition: color 0.2s;
  padding: 0;
  margin-bottom: 0.5rem;
  width: 100%;

  &:hover {
    color: #4361ee;
  }
`;

const ExportButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  border: 1px solid #e9ecef;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  color: #4361ee;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);

  &:hover {
    background: #f8f9fa;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  }
`;

const ControlsSection = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const SearchContainer = styled.div`
  flex: 1;
  min-width: 300px;
  position: relative;
  
  svg {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: #adb5bd;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.875rem 1rem 0.875rem 2.75rem;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  font-size: 0.95rem;
  transition: all 0.2s;
  background: white;

  &:focus {
    outline: none;
    border-color: #4361ee;
    box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
  }
`;

const FiltersContainer = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const FilterSelect = styled.select`
  padding: 0.875rem 2rem 0.875rem 1rem;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  background: white;
  color: #495057;
  cursor: pointer;
  min-width: 140px;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.7rem center;
  background-size: 1em;

  &:focus {
    outline: none;
    border-color: #4361ee;
  }
`;

const ResetButton = styled.button`
  width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #4361ee;
    background: #f8f9fa;
  }
`;

const TableCard = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  overflow: hidden;
  border: 1px solid #f1f3f5;
`;

const TableHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #f1f3f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const RecordCount = styled.span`
  color: #6c757d;
  font-size: 0.9rem;
  font-weight: 500;
`;

const PerPageSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  color: #495057;
  font-size: 0.85rem;
  cursor: pointer;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th {
    text-align: left;
    padding: 1rem 1.5rem;
    color: #868e96;
    font-weight: 600;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #f1f3f5;
  }

  td {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #f8f9fa;
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: #f8f9fa;
  }
`;

const IdBadge = styled.span`
  background: #e7f5ff;
  color: #1971c2;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-family: 'Roboto Mono', monospace;
  font-size: 0.85rem;
  font-weight: 600;
`;

const NameText = styled.div`
  font-weight: 600;
  color: #343a40;
`;

const EmailText = styled.div`
  color: #868e96;
  font-size: 0.9rem;
`;

const CourseTag = styled.span`
  background: #f3f0ff;
  color: #6741d9;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
`;

const AssignmentBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff0f6;
  color: #c026d3;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
`;

const NoAssignmentText = styled.span`
  color: #adb5bd;
  font-size: 0.85rem;
  font-style: italic;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  background: ${props => props.verified ? '#d3f9d8' : '#fff3bf'};
  color: ${props => props.verified ? '#2b8a3e' : '#f08c00'};
  
  &::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    margin-right: 6px;
  }
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: ${props => `${props.color}15`};
  color: ${props => props.color};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.color};
    color: white;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
  gap: 1rem;
  border-top: 1px solid #f1f3f5;
`;

const PageButton = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  color: #495057;
  transition: all 0.2s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    border-color: #4361ee;
    color: #4361ee;
  }
`;

const PageInfo = styled.span`
  color: #6c757d;
  font-size: 0.9rem;
  font-weight: 500;
`;

const Alert = styled(motion.div)`
  padding: 1rem 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
  
  ${props => props.type === 'error' ? `
    background: #ffe3e3;
    color: #c92a2a;
    border: 1px solid #ffa8a8;
  ` : `
    background: #d3f9d8;
    color: #2b8a3e;
    border: 1px solid #b2f2bb;
  `}
`;

const LoadingState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #adb5bd;
  font-weight: 500;
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #adb5bd;
  font-weight: 500;
`;

// Modal Styles
const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled(motion.div)`
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
`;

const ModalHeader = styled.div`
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #f1f3f5;
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #343a40;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #adb5bd;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;

  &:hover {
    color: #495057;
  }
`;

const ModalBody = styled.div`
  padding: 2rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  ${props => props.full && `grid-column: 1 / -1;`}

  label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #495057;
  }
`;

const Input = styled.input`
  padding: 0.75rem 1rem;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #4361ee;
    box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
  }
`;

const Select = styled.select`
  padding: 0.75rem 1rem;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  font-size: 0.95rem;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #4361ee;
  }
`;

const CheckboxGroup = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #4361ee;
    cursor: pointer;
  }

  label {
    font-size: 0.95rem;
    color: #343a40;
    cursor: pointer;
  }
`;

const AssignmentsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const AssignmentItem = styled.div`
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  display: flex;
  gap: 0.5rem;
  
  .sem { font-weight: 600; color: #495057; }
  .sec { color: #868e96; }
`;

const ModalFooter = styled.div`
  padding: 1.5rem 2rem;
  border-top: 1px solid #f1f3f5;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;

const CancelButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: 1px solid #dee2e6;
  background: white;
  color: #495057;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f8f9fa;
  }
`;

const SaveButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  background: #4361ee;
  color: white;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #3a0ca3;
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const DeleteModalContent = styled(ModalContent)`
  max-width: 400px;
  text-align: center;
  padding: 2rem;
  
  h3 {
    margin: 1rem 0 0.5rem 0;
    color: #343a40;
  }

  p {
    color: #6c757d;
    margin-bottom: 2rem;
  }
`;

const DeleteIconWrapper = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #ffe3e3;
  color: #c92a2a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  margin: 0 auto;
`;

const DeleteConfirmButton = styled(SaveButton)`
  background: #e03131;

  &:hover {
    background: #c92a2a;
  }
`;

export default AdminFacultyRecords;
