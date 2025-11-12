import React, { useEffect, useState } from 'react';
import '../styles/Toast.css';

const Toast = ({ message, type = 'success', duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Show toast with animation
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 10);

    // Start exit animation
    const hideTimer = setTimeout(() => {
      setIsLeaving(true);
    }, duration - 300);

    // Remove toast
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
      onClose && onClose();
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <i className="fas fa-check-circle"></i>;
      case 'error':
        return <i className="fas fa-exclamation-circle"></i>;
      case 'warning':
        return <i className="fas fa-exclamation-triangle"></i>;
      case 'info':
        return <i className="fas fa-info-circle"></i>;
      default:
        return <i className="fas fa-check-circle"></i>;
    }
  };

  if (!isVisible && !isLeaving) return null;

  return (
    <div className={`toast toast-${type} ${isVisible && !isLeaving ? 'toast-show' : ''} ${isLeaving ? 'toast-hide' : ''}`}>
      <div className="toast-icon">
        {getIcon()}
      </div>
      <div className="toast-message">
        {message}
      </div>
    </div>
  );
};

export default Toast;
