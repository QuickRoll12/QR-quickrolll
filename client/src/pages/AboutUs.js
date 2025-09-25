import React from 'react';
import { Container, Grid, Card, CardContent, Typography, Box, Avatar, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';
import EmailIcon from '@mui/icons-material/Email';
import CodeIcon from '@mui/icons-material/Code';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  transition: 'all 0.3s ease-in-out',
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  borderRadius: '16px',
  padding: theme.spacing(3),
  '&:hover': {
    transform: 'translateY(-10px)',
    boxShadow: theme.shadows[8],
  },
  '@media (max-width: 600px)': {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
  }
}));

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: 150,
  height: 150,
  marginBottom: theme.spacing(2),
  border: '4px solid #1976d2',
  boxShadow: '0 8px 16px rgba(25, 118, 210, 0.2)',
  fontSize: '3rem',
  background: 'linear-gradient(135deg, #1976d2 0%, #21CBF3 100%)',
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: '0 12px 20px rgba(25, 118, 210, 0.3)',
  },
  '& img': {
    objectFit: 'cover',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
  },
  '@media (max-width: 600px)': {
    width: 120,
    height: 120,
    fontSize: '2.5rem',
    border: '3px solid #1976d2',
  }
}));

const SocialIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.main,
  padding: theme.spacing(1),
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    color: theme.palette.primary.dark,
    transform: 'translateY(-2px)',
  },
  '@media (max-width: 600px)': {
    padding: theme.spacing(0.5),
  }
}));

const SocialIcons = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
  '@media (max-width: 600px)': {
    gap: theme.spacing(0.5),
  }
}));

const founderData = [
  {
    name: "Himanshu Rawat",
    role: "Technical Lead",
    image: '/Himanshu_rawat.png',
    bio: "With strong problem-solving skills and an optimized approach, I drive the technical vision of QuickRoll, ensuring seamless attendance tracking for educational institutions.",
    social: {
      linkedin: "https://www.linkedin.com/in/himanshurawat12",
      github: "https://github.com/HimanshuRawat143",
      email: "mailto:himu35311@gmail.com",
      leetcode: "https://leetcode.com/u/Himanshu_Rawat_12/"
    }
  },
  {
    name: "Ayush Bhatt",
    role: "Concept Designer & RnD Lead",
    image: '/Ayush_bhatt.png',
    bio: "As a Concept Designer & RnD Lead, I drive conceptual ideation, innovation and strategy for a seamless and reliable attendance mechanism.",
    social: {
      linkedin: "https://www.linkedin.com/in/ayush-bhatt-162734305/",
      github: "https://github.com/AyushBhatt2312",
      email: "mailto:ayushbhatt231205@gmail.com",
      leetcode: "https://leetcode.com/u/Ayushbhatt23/"
    }
  },
  {
    name: "Abhishek Negi",
    role: "FAQ Insights & Analyst",
    image: '/Abhishek_negi.jpg',
    bio: "As an FAQ Insights & Analyst with strong communication skills, I specialize in simplifying complex queries into clear, effective solutions through research and strategic analysis.",
    social: {
      linkedin: "https://www.linkedin.com/in/abhishek-negi-300b862b4",
      github: "https://github.com/AbhishekNgi",
      email: "mailto:aabhinegi05@gmail.com",
      leetcode: "https://leetcode.com/u/Abhishek2007/"
    }
  },
  {
    name: "Ashutosh Rauthan",
    role: "Simulation & Testing Analyst",
    image: '/Ashutosh_rauthan.jpg',
    bio: "I analyzed various real-life proxy marking methods, helping us identify and resolve potential loopholes in advance to ensure a more reliable and efficient attendance system.",
    social: {
      linkedin: "https://linkedin.com/in/ashutosh-rauthan-277404339",
      github: "https://github.com/AshutoshRauthan",
      email: "mailto:rauthanashutosh2023@gmail.com",
      leetcode: "https://leetcode.com/u/AshutoshRauthan/"
    }
  }
];

const AboutUs = () => {
  return (
    <Box sx={{ 
      minHeight: '100vh',
      pt: { xs: 4, sm: 6, md: 8 },
      pb: { xs: 8, sm: 10 },
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
    }}>
      <Container maxWidth="lg">
        <Typography 
          variant="h2" 
          component="h1" 
          align="center" 
          gutterBottom
          sx={{
            mb: { xs: 4, sm: 6 },
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #1976d2, #21CBF3)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Meet Our Team
        </Typography>

        <Grid container spacing={4} sx={{ mb: { xs: 4, sm: 6 } }}>
          {founderData.map((founder, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <StyledCard elevation={3}>
                <StyledAvatar
                  src={founder.image}
                  alt={founder.name}
                />
                <CardContent sx={{ textAlign: 'center', p: 0 }}>
                  <Typography variant="h5" component="h2" gutterBottom>
                    {founder.name}
                  </Typography>
                  <Typography 
                    variant="subtitle1" 
                    color="primary" 
                    gutterBottom
                    sx={{ fontWeight: 'bold' }}
                  >
                    {founder.role}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      lineHeight: 1.6
                    }}
                  >
                    {founder.bio}
                  </Typography>
                  <SocialIcons>
                    <SocialIconButton 
                      href={founder.social.linkedin} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      aria-label="LinkedIn"
                    >
                      <LinkedInIcon />
                    </SocialIconButton>
                    <SocialIconButton 
                      href={founder.social.github} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      aria-label="GitHub"
                    >
                      <GitHubIcon />
                    </SocialIconButton>
                    <SocialIconButton 
                      href={founder.social.email}
                      aria-label="Email"
                    >
                      <EmailIcon />
                    </SocialIconButton>
                    <SocialIconButton 
                      href={founder.social.leetcode} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      aria-label="LeetCode"
                    >
                      <CodeIcon />
                    </SocialIconButton>
                  </SocialIcons>
                </CardContent>
              </StyledCard>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ 
          mt: { xs: 4, sm: 6 }, 
          mb: { xs: 6, sm: 8 },
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          p: { xs: 3, sm: 4 },
          boxShadow: 3
        }}>
          <Typography 
            variant="h4" 
            gutterBottom
            sx={{
              fontSize: { xs: '1.5rem', sm: '2rem' },
              fontWeight: 'bold',
              color: '#1976d2'
            }}
          >
            About QuickRoll
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              maxWidth: '800px', 
              mx: 'auto',
              fontSize: { xs: '1rem', sm: '1.1rem' },
              lineHeight: 1.8
            }}
          >
            QuickRoll is a modern attendance management system designed to streamline the process of tracking student attendance in educational institutions. Our platform combines cutting-edge technology with user-friendly design to create an efficient and reliable solution for both faculty and students. With real-time tracking, intuitive interfaces, and comprehensive reporting, QuickRoll makes attendance management simpler and more effective than ever before.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default AboutUs;
