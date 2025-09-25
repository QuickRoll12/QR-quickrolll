import React, { useEffect, useState } from 'react';
import { Typography, Box } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';

// A more subtle and professional initial glow animation
const professionalGlow = keyframes`
  0% { 
    filter: brightness(0.7) blur(2px); 
    opacity: 0.7;
    transform: scale(0.95);
  }
  30% { 
    filter: brightness(1.4) blur(0px); 
    opacity: 1;
    transform: scale(1.03);
  }
  40% { 
    filter: brightness(1.5) blur(0px); 
    opacity: 1;
    transform: scale(1.05);
  }
  50% { 
    filter: brightness(1.6) blur(0px); 
    opacity: 1;
    transform: scale(1.05);
  }
  70% { 
    filter: brightness(1.4) blur(0px); 
    opacity: 1;
    transform: scale(1.03);
  }
  100% { 
    filter: brightness(1) blur(0px); 
    opacity: 1;
    transform: scale(1);
  }
`;

const float = keyframes`
  0% {
    transform: translateY(0px) rotateY(0deg);
    text-shadow: 0 5px 15px rgba(0,0,0,0.3);
  }
  33% {
    transform: translateY(-7px) rotateY(3deg);
    text-shadow: 0 25px 15px rgba(0,0,0,0.2);
  }
  66% {
    transform: translateY(-3px) rotateY(-2deg);
    text-shadow: 0 15px 10px rgba(0,0,0,0.25);
  }
  100% {
    transform: translateY(0px) rotateY(0deg);
    text-shadow: 0 5px 15px rgba(0,0,0,0.3);
  }
`;

const pulse = keyframes`
  0% { filter: brightness(1) contrast(1); }
  50% { filter: brightness(1.1) contrast(1.05); }
  100% { filter: brightness(1) contrast(1); }
`;

// Elegant background shimmer effect
const shimmer = keyframes`
  0% {
    background-position: -100% center;
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
  100% {
    background-position: 200% center;
    opacity: 0.7;
  }
`;

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  perspective: '1200px',
  padding: '0.5rem',
  position: 'relative',
  
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '105%',
    height: '105%',
    transform: 'translate(-50%, -50%)',
    background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
    borderRadius: '50%',
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
  
  '&:hover::before': {
    opacity: 1,
  }
}));

// Elegant glow background
const GlowEffect = styled(Box)(({ active }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: '140%',
  height: '160%',
  transform: 'translate(-50%, -50%)',
  background: 'linear-gradient(90deg, rgba(25, 118, 210, 0), rgba(33, 203, 243, 0.4), rgba(0, 212, 255, 0.3), rgba(25, 118, 210, 0))',
  backgroundSize: '200% 100%',
  borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
  opacity: 0,
  animation: active ? `${shimmer} 3s ease-in-out forwards` : 'none',
  filter: 'blur(10px)',
  zIndex: -1,
}));

const LogoText = styled(Typography)(({ theme, animationState, size }) => ({
  fontWeight: 800,
  background: 'linear-gradient(45deg, #1976d2, #21CBF3, #00d4ff, #1976d2)',
  backgroundSize: '300% 300%',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  letterSpacing: '0.5px',
  animation: animationState
    ? `${float} 4s ease-in-out infinite, ${pulse} 8s infinite`
    : `${professionalGlow} 3s ease-out`,
  transition: 'all 0.3s ease-in-out',
  position: 'relative',
  textShadow: '0 5px 25px rgba(33, 203, 243, 0.3)',
  
  '&:hover': {
    letterSpacing: '1px',
    filter: 'brightness(1.2)',
  },
  
  '@media (max-width: 600px)': {
    fontSize: size === 'h2' ? '2.5rem' : 
             size === 'h3' ? '2rem' : 
             size === 'h4' ? '1.5rem' : 
             size === 'h5' ? '1.25rem' : '1rem',
  }
}));

// Subtle spotlight effect
const Spotlight = styled(Box)(({ active }) => ({
  position: 'absolute',
  top: '0',
  left: '0',
  width: '100%',
  height: '100%',
  background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0) 60%)',
  opacity: 0,
  mixBlendMode: 'overlay',
  pointerEvents: 'none',
  animation: active ? 'spotlight 3s ease-out forwards' : 'none',
  '@keyframes spotlight': {
    '0%': { opacity: 0 },
    '50%': { opacity: 0.7 },
    '100%': { opacity: 0 }
  }
}));

// Subtle highlight that appears on animation completion
const Highlight = styled(Box)(({ show }) => ({
  position: 'absolute',
  top: '-10%',
  right: '-5%',
  width: '15px',
  height: '15px',
  background: 'radial-gradient(circle, #21CBF3 0%, rgba(33, 203, 243, 0) 70%)',
  borderRadius: '50%',
  opacity: show ? 0.8 : 0,
  transition: 'opacity 0.5s ease',
  filter: 'blur(3px)',
}));

const Logo = ({ size = 'h2', variant = 'default' }) => {
  const [animationState, setAnimationState] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [initialAnimation, setInitialAnimation] = useState(true);

  useEffect(() => {
    const animationTimer = setTimeout(() => {
      setAnimationState(true);
      setInitialAnimation(false);
    }, 3000); // Switch to floating animation after glow effect ends
    
    const highlightTimer = setTimeout(() => {
      setShowHighlight(true);
    }, 3300);

    return () => {
      clearTimeout(animationTimer);
      clearTimeout(highlightTimer);
    };
  }, []);

  // Determine text based on variant
  const logoVariants = {
    default: 'QuickRoll',
    compact: 'QR',
    full: 'QuickRoll Pro'
  };
  
  const logoText = logoVariants[variant] || logoVariants.default;

  return (
    <LogoContainer>
      <GlowEffect active={initialAnimation} />
      <Spotlight active={initialAnimation} />
      <LogoText 
        variant={size} 
        component="span"
        animationState={animationState}
        size={size}
      >
        {logoText}
      </LogoText>
      <Highlight show={showHighlight} />
    </LogoContainer>
  );
};

export default Logo;