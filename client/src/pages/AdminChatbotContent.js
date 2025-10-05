import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Paper, Grid, CircularProgress, Chip, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

// Hidden file input component
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

// Progress bar component
const ProgressContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: 8,
  backgroundColor: theme.palette.grey[200],
  borderRadius: 4,
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(1),
  position: 'relative',
}));

const ProgressBar = styled(Box)(({ width }) => ({
  height: '100%',
  width: `${width}%`,
  backgroundColor: '#1976d2',
  borderRadius: 4,
  transition: 'width 0.3s ease',
}));

const AdminChatbotContent = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [directInput, setDirectInput] = useState('');
  const [directTitle, setDirectTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const categories = [
    { id: 'general', name: 'General Information' },
    { id: 'academics', name: 'Academic Programs' },
    { id: 'facilities', name: 'Campus Facilities' },
    { id: 'faculty', name: 'Faculty Information' },
    { id: 'events', name: 'Events & Activities' },
    { id: 'policies', name: 'Policies & Procedures' },
  ];

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);      
      const response = await axios.get('/api/chatbot/admin/documents');
      setDocuments(response.data.documents || []);
    } catch (err) {
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('documents', files[i]);
    }
    formData.append('category', selectedCategory);

    try {
      const response = await axios.post('/api/chatbot/admin/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });
      fetchDocuments();
    } catch (err) {
      setError(`Failed to upload document: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDirectInputSubmit = async () => {
    if (!directInput.trim() || !directTitle.trim()) {
      setError('Title and content are required');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await axios.post('/api/chatbot/admin/documents/text', {
        title: directTitle,
        content: directInput,
        category: selectedCategory,
      });
      
      clearInterval(interval);
      setUploadProgress(100);
      
      setDirectInput('');
      setDirectTitle('');
      
      fetchDocuments();
    } catch (err) {
      setError(`Failed to submit text content: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      setError(null);
      const response = await axios.delete(`/api/chatbot/admin/documents/${documentId}`);
      fetchDocuments();
    } catch (err) {
      setError(`Failed to delete document: ${err.response?.data?.error || err.message}`);
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : categoryId;
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Chatbot Knowledge Base Management
      </Typography>
      
      <Typography variant="body1" paragraph>
        Add university-specific content to train the chatbot. Upload documents or directly input text.
      </Typography>

      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#fdeded' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Upload Documents
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Upload PDF, DOCX, or TXT files containing university information.
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Category
              </Typography>
              <TextField
                select
                fullWidth
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                SelectProps={{
                  native: true,
                }}
                variant="outlined"
                size="small"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </TextField>
            </Box>

            <Button
              component="label"
              variant="contained"
              startIcon={<CloudUploadIcon />}
              disabled={isUploading}
              fullWidth
            >
              {isUploading ? 'Uploading...' : 'Select Files'}
              <VisuallyHiddenInput
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={handleFileUpload}
              />
            </Button>

            {isUploading && (
              <Box sx={{ mt: 2 }}>
                <ProgressContainer>
                  <ProgressBar width={uploadProgress} />
                </ProgressContainer>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2">{uploadProgress}%</Typography>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Direct Text Input
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Directly enter text content for the chatbot to learn from.
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Category
              </Typography>
              <TextField
                select
                fullWidth
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                SelectProps={{
                  native: true,
                }}
                variant="outlined"
                size="small"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </TextField>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Title
              </Typography>
              <TextField
                fullWidth
                placeholder="Enter a descriptive title"
                value={directTitle}
                onChange={(e) => setDirectTitle(e.target.value)}
                variant="outlined"
                size="small"
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Content
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={6}
                placeholder="Enter information about the university..."
                value={directInput}
                onChange={(e) => setDirectInput(e.target.value)}
                variant="outlined"
              />
            </Box>

            <Button
              variant="contained"
              onClick={handleDirectInputSubmit}
              disabled={isUploading || !directInput.trim() || !directTitle.trim()}
              fullWidth
            >
              Submit Content
            </Button>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Uploaded Knowledge Base Content
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : documents.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No documents have been uploaded yet
            </Typography>
          </Box>
        ) : (
          <Box>
            {documents.map((doc) => (
              <Paper 
                key={doc._id || `doc-${Math.random()}`} 
                sx={{ 
                  p: 2, 
                  mb: 2, 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  '&:hover': {
                    boxShadow: 3,
                  },
                }}
              >
                <Box>
                  <Typography variant="subtitle1">{doc.title || doc.filename}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                    <Chip
                      label={getCategoryName(doc.category)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={doc.type || 'Text'}
                      size="small"
                      variant="outlined"
                    />
                    {doc.createdAt && (
                      <Chip
                        label={new Date(doc.createdAt).toLocaleDateString()}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
                <IconButton
                  color="error"
                  onClick={() => handleDeleteDocument(doc._id)}
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default AdminChatbotContent;
