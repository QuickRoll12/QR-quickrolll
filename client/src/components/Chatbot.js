import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiSend, FiX, FiMessageCircle } from 'react-icons/fi';
import axios from 'axios';

const ChatbotContainer = styled.div`
  position: fixed;
  bottom: 70px; /* Position above the footer */
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const ChatButton = styled(motion.button)`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4361ee, #3a0ca3);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  font-size: 1.5rem;
  
  &:focus {
    outline: none;
  }
`;

const ChatWindow = styled(motion.div)`
  width: 350px;
  height: 500px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 5px 25px rgba(0, 0, 0, 0.2);
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  @media (max-width: 480px) {
    width: 300px;
    height: 450px;
  }
`;

const ChatHeader = styled.div`
  background: linear-gradient(135deg, #4361ee, #3a0ca3);
  color: white;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 500;
  }
  
  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    
    img {
      width: 28px;
      height: 28px;
      border-radius: 50%;
    }
  }
  
  .close-btn {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 50%;
    transition: background 0.2s;
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    
    &:focus {
      outline: none;
    }
  }
`;

const MessageContainer = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c5c5c5;
    border-radius: 10px;
  }
`;

const Message = styled.div`
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 18px;
  position: relative;
  align-self: ${props => props.sender === 'user' ? 'flex-end' : 'flex-start'};
  background: ${props => props.sender === 'user' ? 'linear-gradient(135deg, #4361ee, #3a0ca3)' : '#f0f2f5'};
  color: ${props => props.sender === 'user' ? 'white' : '#333'};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  
  p {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.4;
    white-space: pre-wrap;
  }
  
  small {
    display: block;
    font-size: 0.7rem;
    opacity: 0.7;
    margin-top: 4px;
    text-align: right;
  }
`;

const BotMessage = styled.div`
  max-width: 80%;
  align-self: flex-start;
  
  p {
    background: #f0f2f5;
    color: #333;
    padding: 10px 14px;
    border-radius: 18px;
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.4;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
`;

const SuggestedQuestions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
`;

const SuggestedQuestion = styled.button`
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 18px;
  padding: 8px 12px;
  font-size: 0.85rem;
  color: #4361ee;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
  
  &:hover {
    background: #f5f7ff;
  }
  
  &:focus {
    outline: none;
    border-color: #4361ee;
  }
`;

const InputContainer = styled.div`
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
`;

const ChatInput = styled.input`
  flex: 1;
  border: 1px solid #e0e0e0;
  border-radius: 24px;
  padding: 10px 16px;
  font-size: 0.95rem;
  transition: border 0.2s;
  
  &:focus {
    outline: none;
    border-color: #4361ee;
  }
`;

const SendButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4361ee, #3a0ca3);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s;
  
  &:hover {
    transform: scale(1.05);
  }
  
  &:focus {
    outline: none;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  svg {
    font-size: 1.2rem;
  }
`;

const TypingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 14px;
  background: #f0f2f5;
  border-radius: 18px;
  width: fit-content;
  
  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #aaa;
    display: block;
    animation: typing 1.4s infinite both;
    
    &:nth-child(2) {
      animation-delay: 0.2s;
    }
    
    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
  
  @keyframes typing {
    0% {
      opacity: 0.4;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.2);
    }
    100% {
      opacity: 0.4;
      transform: scale(1);
    }
  }
`;

const ChatRedirectPage = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7ff 0%, #e8eaff 100%);
`;

const ChatPageContainer = styled.div`
  width: 100%;
  max-width: 800px;
  height: 80vh;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  @media (max-width: 850px) {
    height: 90vh;
    max-width: 95%;
  }
`;

const ChatPageHeader = styled.div`
  background: linear-gradient(135deg, #4361ee, #3a0ca3);
  color: white;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  h2 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 500;
  }
  
  .back-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    cursor: pointer;
    font-size: 1rem;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 8px;
    transition: background 0.2s;
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    &:focus {
      outline: none;
    }
  }
`;

const ChatPageMessages = styled.div`
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c5c5c5;
    border-radius: 10px;
  }
`;

const ChatPageInput = styled.div`
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  
  input {
    flex: 1;
    border: 1px solid #e0e0e0;
    border-radius: 24px;
    padding: 12px 20px;
    font-size: 1rem;
    transition: border 0.2s;
    
    &:focus {
      outline: none;
      border-color: #4361ee;
    }
  }
  
  button {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4361ee, #3a0ca3);
    color: white;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s;
    font-size: 1.3rem;
    
    &:hover {
      transform: scale(1.05);
    }
    
    &:focus {
      outline: none;
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
`;

// Main Chatbot Component
const Chatbot = ({ redirectToChat = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Scroll to bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    // If this is the first time opening the chat, show welcome message
    if (isOpen && messages.length === 0) {
      const greeting = `👋 Hi ${user?.name || 'there'}! How can I help you today?`;
      setMessages([{ text: greeting, sender: 'bot', timestamp: new Date() }]);
    }
  }, [isOpen, messages.length, user]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    // Add user message
    const userMessage = { text: input, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Show typing indicator
    setIsTyping(true);
    
    try {
      // Call API
      const response = await axios.post('/api/chatbot', {
        query: input,
        userId: user?._id
      });
      
      // Add bot response
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          text: response.data.response,
          sender: 'bot',
          timestamp: new Date()
        }]);
      }, 500 + Math.random() * 1000); // Simulate network delay for natural feel
    } catch (error) {
      console.error('Chatbot error:', error);
      
      // Add error message
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          text: "I'm having trouble connecting right now. Please try again later.",
          sender: 'bot',
          timestamp: new Date(),
          error: true
        }]);
      }, 500);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleQuestionClick = (question) => {
    setInput(question);
    handleSend();
  };

  const handleChatButtonClick = () => {
    if (redirectToChat) {
      navigate('/chat');
    } else {
      setIsOpen(!isOpen);
    }
  };

  // If this is the full chat page
  if (redirectToChat) {
    return (
      <ChatRedirectPage>
        <ChatPageContainer>
          <ChatPageHeader>
            <div className="logo">
              <h2>Campus Assistant</h2>
            </div>
            <button className="back-btn" onClick={() => navigate(-1)}>
              <FiX /> Close Chat
            </button>
          </ChatPageHeader>
          
          <ChatPageMessages>
            {messages.length === 0 && (
              <BotMessage>
                <p>👋 Hi {user?.name || 'there'}! How can I help you today?</p>
                <SuggestedQuestions>
                  <SuggestedQuestion onClick={() => handleQuestionClick("Where is the computer lab located?")}>
                    Where is the computer lab located?
                  </SuggestedQuestion>
                  <SuggestedQuestion onClick={() => handleQuestionClick("How do I contact the exam department?")}>
                    How do I contact the exam department?
                  </SuggestedQuestion>
                  <SuggestedQuestion onClick={() => handleQuestionClick("What events are happening this week?")}>
                    What events are happening this week?
                  </SuggestedQuestion>
                </SuggestedQuestions>
              </BotMessage>
            )}
            
            {messages.map((msg, index) => (
              <Message key={index} sender={msg.sender}>
                <p>{msg.text}</p>
                <small>{new Date(msg.timestamp).toLocaleTimeString()}</small>
              </Message>
            ))}
            
            {isTyping && (
              <BotMessage>
                <TypingIndicator>
                  <span></span><span></span><span></span>
                </TypingIndicator>
              </BotMessage>
            )}
            
            <div ref={messagesEndRef} />
          </ChatPageMessages>
          
          <ChatPageInput>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about the university..."
            />
            <button onClick={handleSend} disabled={!input.trim() || isTyping}>
              <FiSend />
            </button>
          </ChatPageInput>
        </ChatPageContainer>
      </ChatRedirectPage>
    );
  }

  // Regular floating chatbot
  return (
    <ChatbotContainer>
      <AnimatePresence>
        {isOpen && (
          <ChatWindow
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <ChatHeader>
              <div className="logo">
                <img src="/logo192.png" alt="Logo" />
                <h3>Campus Assistant</h3>
              </div>
              <button className="close-btn" onClick={() => setIsOpen(false)}>
                <FiX />
              </button>
            </ChatHeader>
            
            <MessageContainer>
              {messages.map((msg, index) => (
                <Message key={index} sender={msg.sender}>
                  <p>{msg.text}</p>
                  <small>{new Date(msg.timestamp).toLocaleTimeString()}</small>
                </Message>
              ))}
              
              {isTyping && (
                <BotMessage>
                  <TypingIndicator>
                    <span></span><span></span><span></span>
                  </TypingIndicator>
                </BotMessage>
              )}
              
              {messages.length === 1 && messages[0].sender === 'bot' && (
                <SuggestedQuestions>
                  <SuggestedQuestion onClick={() => handleQuestionClick("Where is the computer lab located?")}>
                    Where is the computer lab located?
                  </SuggestedQuestion>
                  <SuggestedQuestion onClick={() => handleQuestionClick("How do I contact the exam department?")}>
                    How do I contact the exam department?
                  </SuggestedQuestion>
                </SuggestedQuestions>
              )}
              
              <div ref={messagesEndRef} />
            </MessageContainer>
            
            <InputContainer>
              <ChatInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
              />
              <SendButton onClick={handleSend} disabled={!input.trim() || isTyping}>
                <FiSend />
              </SendButton>
            </InputContainer>
          </ChatWindow>
        )}
      </AnimatePresence>
      
      <ChatButton
        onClick={handleChatButtonClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isOpen ? <FiX /> : <FiMessageCircle />}
      </ChatButton>
    </ChatbotContainer>
  );
};

export default Chatbot;