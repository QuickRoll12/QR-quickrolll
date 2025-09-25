import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const CameraContainer = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const CameraViewfinder = styled.div`
  position: relative;
  width: 100%;
  max-width: 500px;
  height: 375px;
  overflow: hidden;
  border-radius: 10px;
  border: 3px solid #fff;
  background-color: #000;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  
  @media (max-width: 600px) {
    height: 300px;
  }
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Canvas = styled.canvas`
  display: none;
`;

const CapturedImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 20px;
  gap: 15px;
`;

const Button = styled(motion.button)`
  padding: 12px 24px;
  border: none;
  border-radius: 50px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  background-color: ${props => props.primary ? '#4285F4' : '#333'};
  color: white;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const StatusMessage = styled.div`
  color: white;
  margin-bottom: 15px;
  font-size: 18px;
  text-align: center;
  max-width: 80%;
`;

const LoadingSpinner = styled(motion.div)`
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 4px solid white;
  width: 40px;
  height: 40px;
  margin: 20px auto;
`;

const CountdownOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  font-size: 80px;
  color: white;
  font-weight: bold;
`;

const CameraCapture = ({ onClose, onPhotoCapture, department, semester, section }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(null);
  
  // Initialize camera
  useEffect(() => {
    const setupCamera = async () => {
      try {
        setLoading(true);
        
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }, 
          audio: false 
        });
        
        // Store stream reference for cleanup
        streamRef.current = stream;
        
        // Set video source
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Wait for video to be ready
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setCameraReady(true);
            setLoading(false);
          };
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError(`Camera access error: ${err.message || 'Could not access camera'}`);
        setLoading(false);
      }
    };
    
    setupCamera();
    
    // Cleanup function
    return () => {
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);
  
  // Handle taking photo with countdown
  const startPhotoCapture = () => {
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          capturePhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Capture photo from video stream
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to data URL (JPEG format with 90% quality)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
  };
  
  // Reset and retake photo
  const retakePhoto = () => {
    setCapturedImage(null);
  };
  
  // Confirm and submit photo
  const confirmPhoto = async () => {
    if (!capturedImage) return;
    
    try {
      setLoading(true);
      
      // Call the callback with the captured image
      await onPhotoCapture(capturedImage);
      
      // Close the camera component
      onClose();
    } catch (err) {
      console.error('Error submitting photo:', err);
      setError(`Failed to submit photo: ${err.message || 'Unknown error'}`);
      setLoading(false);
    }
  };
  
  return (
    <CameraContainer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {error ? (
        <>
          <StatusMessage>{error}</StatusMessage>
          <Button onClick={onClose}>Close</Button>
        </>
      ) : (
        <>
          <StatusMessage>
            {loading ? 'Processing...' : 
             capturedImage ? 'Review your photo' : 
             'Position your face clearly in the frame'}
          </StatusMessage>
          
          <CameraViewfinder>
            {!capturedImage && (
              <Video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
              />
            )}
            
            {capturedImage && (
              <CapturedImage 
                src={capturedImage} 
                alt="Captured" 
              />
            )}
            
            <Canvas ref={canvasRef} />
            
            {countdown !== null && (
              <CountdownOverlay>{countdown}</CountdownOverlay>
            )}
          </CameraViewfinder>
          
          {loading ? (
            <LoadingSpinner 
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          ) : (
            <ButtonContainer>
              {capturedImage ? (
                <>
                  <Button onClick={retakePhoto}>Retake</Button>
                  <Button primary onClick={confirmPhoto}>Confirm</Button>
                </>
              ) : (
                <>
                  <Button onClick={onClose}>Cancel</Button>
                  <Button 
                    primary 
                    onClick={startPhotoCapture}
                    disabled={!cameraReady}
                  >
                    Take Photo
                  </Button>
                </>
              )}
            </ButtonContainer>
          )}
        </>
      )}
    </CameraContainer>
  );
};

export default CameraCapture;