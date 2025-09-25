import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Box, Container, Button, Stack, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

const StyledFooter = styled(Box)(({ theme }) => ({
  backgroundColor: '#1976d2',
  color: 'white',
  padding: theme.spacing(1, 0),
  position: 'fixed',
  bottom: 0,
  width: '100%',
  height: '60px',
  zIndex: 100,
  '@media (max-width: 600px)': {
    padding: theme.spacing(0.5, 0),
    height: '50px',
  }
}));

const FooterButton = styled(Button)({
  color: 'white',
  padding: '4px 8px',
  minWidth: 'auto',
  fontSize: '0.875rem',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  '@media (max-width: 600px)': {
    fontSize: '0.75rem',
    padding: '2px 6px',
  }
});

const GehuLinksContainer = styled(Box)({
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  backgroundColor: 'white',
  borderRadius: '8px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
  padding: '20px',
  width: '400px',
  maxWidth: '90%',
  zIndex: 1002,
  opacity: 0,
  visibility: 'hidden',
  transition: 'all 0.3s ease-in-out',
  '&.visible': {
    opacity: 1,
    visibility: 'visible',
  }
});

const CloseButton = styled(IconButton)({
  position: 'absolute',
  top: '8px',
  right: '8px',
  color: '#1976d2',
  '&:hover': {
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
  }
});

const GehuLinkButton = styled(Button)({
  width: '100%',
  marginBottom: '10px',
  padding: '12px',
  backgroundColor: '#1976d2',
  color: 'white',
  '&:hover': {
    backgroundColor: '#1565c0',
  },
  '&:last-child': {
    marginBottom: 0,
  }
});

const Overlay = styled(Box)({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 1001,
  opacity: 0,
  visibility: 'hidden',
  transition: 'opacity 0.3s ease-in-out',
  '&.visible': {
    opacity: 1,
    visibility: 'visible',
  }
});

const Footer = () => {
  const [showGehuLinks, setShowGehuLinks] = useState(false);

  const handleContactAdmin = (e) => {
    e.preventDefault();
    window.location.href = `mailto:${process.env.REACT_APP_ADMIN_EMAIL}?subject=Contact%20Request&body=Hello%20Admin,%0A%0A`;
  };

  const handleGehuLinksClick = (e) => {
    e.preventDefault();
    setShowGehuLinks(true);
  };

  const handleCloseGehuLinks = (e) => {
    e.preventDefault();
    setShowGehuLinks(false);
  };

  const gehuLinks = [
    { name: 'GEHU Website', url: 'https://www.gehu.ac.in' },
    { name: 'PYQ', url: 'https://gehuhaldwani.in/pyqs/' },
    { name: 'GEU WEBSITE', url: 'https://geu.ac.in/' },
    { name: 'NOTICE', url: 'http://btechcsegehu.in/notices-2/' },
    { name: 'EXAM PORTAL', url: 'https://gehu.ac.in/dehradun/exam-portal/' }
  ];

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setShowGehuLinks(false);
      }
    };

    if (showGehuLinks) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showGehuLinks]);

  return (
    <>
      <StyledFooter>
        <Container maxWidth="lg">
          <Stack 
            direction="row" 
            spacing={2} 
            justifyContent="center" 
            alignItems="center"
            height="100%"
            sx={{ pb: 3 }}
          >
            <FooterButton component={Link} to="/">
              Home
            </FooterButton>
            <FooterButton component={Link} to="/about">
              About Us
            </FooterButton>
            <FooterButton onClick={handleContactAdmin}>
              Contact Us
            </FooterButton>
            <FooterButton onClick={handleGehuLinksClick}>
              GEHU LINKS
            </FooterButton>
            <FooterButton onClick={() => window.open("https://student.gehu.ac.in", "_blank")}>
              GEHU ERP
            </FooterButton>
          </Stack>
        </Container>
      </StyledFooter>

      <Overlay 
        className={showGehuLinks ? 'visible' : ''} 
        onClick={handleCloseGehuLinks}
      />
      
      <GehuLinksContainer className={showGehuLinks ? 'visible' : ''}>
        <CloseButton 
          onClick={handleCloseGehuLinks}
          aria-label="close"
        >
          <CloseIcon />
        </CloseButton>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#1976d2' }}>GEHU Links</h2>
        {gehuLinks.map((link, index) => (
          <GehuLinkButton
            key={index}
            onClick={() => {
              window.open(link.url, '_blank');
              setShowGehuLinks(false);
            }}
          >
            {link.name}
          </GehuLinkButton>
        ))}
      </GehuLinksContainer>
    </>
  );
};

export default Footer;