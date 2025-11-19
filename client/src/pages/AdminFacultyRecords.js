import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaDownload, FaPencilAlt, FaTrash, FaChevronLeft, FaChevronRight, FaTimes, FaCheck, FaExclamationCircle, FaRedo, FaBookOpen } from 'react-icons/fa';

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
          <FaChevronLeft /> Back to Dashboard
        </BackButton>
        <Title>
          <GradientText>Faculty Records</GradientText>
          <Subtitle>Manage teaching staff and assignments</Subtitle>
        </Title>
        <ExportButton onClick={handleExport}>
          <FaDownload /> Export CSV
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
            <FaExclamationCircle /> {error}
          </Alert>
        )}
        {success && (
          <Alert
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            type="success"
          >
            <FaCheck /> {success}
          </Alert>
        )}
      </AnimatePresence>

      <ControlsSection>
        <SearchContainer>
          <FaSearch />
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
            <FaRedo />
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
                          <FaBookOpen /> {facultyMember.teachingAssignments.length} Classes
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
                        <ActionButton onClick={() => handleEdit(facultyMember)} color="#4361ee" title="Edit Faculty">
                          <FaPencilAlt />
                        </ActionButton>
                        <ActionButton onClick={() => handleDelete(facultyMember)} color="#ef233c" title="Delete Faculty">
                          <FaTrash />
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
              <FaChevronLeft />
            </PageButton>
            <PageInfo>Page {currentPage} of {totalPages}</PageInfo>
            <PageButton
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <FaChevronRight />
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
                <CloseButton onClick={() => setShowEditModal(false)}><FaTimes /></CloseButton>
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
                <FaTrash />
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

// Styled Components
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
  background: linear-gradient(135deg, #1e3a8a, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  letter-spacing: -0.5px;
`;

const Subtitle = styled.p`
  color: #4b5563;
  margin: 0.5rem 0 0 0;
  font-size: 0.95rem;
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  color: #374151;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  margin-bottom: 1rem;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);

  &:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
    color: #111827;
    transform: translateY(-1px);
  }
`;

const ExportButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #2563eb;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);

  &:hover {
    background: #1d4ed8;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);
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
    color: #6b7280;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.875rem 1rem 0.875rem 2.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s;
  background: white;
  color: #111827;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
  
  &::placeholder {
    color: #9ca3af;
  }
`;

const FiltersContainer = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const FilterSelect = styled.select`
  padding: 0.875rem 2.5rem 0.875rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  cursor: pointer;
  min-width: 140px;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.7rem center;
  background-size: 1em;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #2563eb;
  }
`;

const ResetButton = styled.button`
  width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: #4b5563;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1.25rem; /* Increased size */

  &:hover {
    color: #2563eb;
    background: #f3f4f6;
    border-color: #2563eb;
    transform: rotate(180deg);
  }
`;

const TableCard = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow: hidden;
  border: 1px solid #e5e7eb;
`;

const TableHeader = styled.div`
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9fafb;
`;

const RecordCount = styled.span`
  color: #374151;
  font-size: 0.9rem;
  font-weight: 600;
`;

const PerPageSelect = styled.select`
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #374151;
  font-size: 0.85rem;
  cursor: pointer;
  background-color: white;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 0.8em;
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
    color: #111827;
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  td {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: middle;
    color: #374151;
    font-size: 0.95rem;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: #f9fafb;
  }
`;

const IdBadge = styled.span`
  font-family: 'Roboto Mono', monospace;
  font-weight: 500;
  color: #111827;
`;

const NameText = styled.div`
  font-weight: 600;
  color: #111827;
`;

const EmailText = styled.div`
  color: #6b7280;
  font-size: 0.85rem;
`;

const CourseTag = styled.span`
  background: #eff6ff;
  color: #1d4ed8;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 500;
  border: 1px solid #dbeafe;
`;

const AssignmentBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #fdf2f8;
  color: #be185d;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 500;
  border: 1px solid #fce7f3;
`;

const NoAssignmentText = styled.span`
  color: #9ca3af;
  font-size: 0.85rem;
  font-style: italic;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  background: ${props => props.verified ? '#ecfdf5' : '#fffbeb'};
  color: ${props => props.verified ? '#047857' : '#b45309'};
  border: 1px solid ${props => props.verified ? '#d1fae5' : '#fef3c7'};
  
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
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${props => props.color === '#ef233c' ? '#fee2e2' : '#dbeafe'};
  border-radius: 8px;
  background: white;
  color: ${props => props.color === '#ef233c' ? '#dc2626' : '#2563eb'};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.color === '#ef233c' ? '#fee2e2' : '#eff6ff'};
    border-color: ${props => props.color === '#ef233c' ? '#fecaca' : '#bfdbfe'};
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.25rem;
  gap: 1rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
`;

const PageButton = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  color: #374151;
  transition: all 0.2s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #f3f4f6;
  }

  &:not(:disabled):hover {
    border-color: #2563eb;
    color: #2563eb;
    background: #eff6ff;
  }
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const PageInfo = styled.span`
  color: #4b5563;
  font-size: 0.9rem;
  font-weight: 500;
`;

const Alert = styled(motion.div)`
  padding: 1rem 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  
  ${props => props.type === 'error' ? `
    background: #fef2f2;
    color: #991b1b;
    border: 1px solid #fecaca;
  ` : `
    background: #ecfdf5;
    color: #065f46;
    border: 1px solid #a7f3d0;
  `}
`;

const LoadingState = styled.div`
  padding: 4rem;
  text-align: center;
  color: #6b7280;
  font-weight: 500;
`;

const EmptyState = styled.div`
  padding: 4rem;
  text-align: center;
  color: #6b7280;
  font-weight: 500;
`;

// Modal Styles
const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled(motion.div)`
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9fafb;
  border-radius: 16px 16px 0 0;

  h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #111827;
    font-weight: 600;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    color: #4b5563;
    background: #f3f4f6;
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
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
  }
`;

const Input = styled.input`
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s;
  color: #111827;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const Select = styled.select`
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  background: white;
  cursor: pointer;
  color: #111827;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const CheckboxGroup = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  background: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #2563eb;
    cursor: pointer;
  }

  label {
    font-size: 0.95rem;
    color: #374151;
    cursor: pointer;
    font-weight: 500;
  }
`;

const AssignmentsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const AssignmentItem = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  display: flex;
  gap: 0.5rem;
  
  .sem { font-weight: 600; color: #374151; }
  .sec { color: #6b7280; }
`;

const ModalFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  background: #f9fafb;
  border-radius: 0 0 16px 16px;
`;

const CancelButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }
`;

const SaveButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  background: #2563eb;
  color: white;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);

  &:hover {
    background: #1d4ed8;
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
    color: #111827;
  }

  p {
    color: #6b7280;
    margin-bottom: 2rem;
    line-height: 1.5;
  }
`;

const DeleteIconWrapper = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #fee2e2;
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  margin: 0 auto 1rem auto;
`;

const DeleteConfirmButton = styled(SaveButton)`
  background: #dc2626;

  &:hover {
    background: #b91c1c;
  }
`;

export default AdminFacultyRecords;
