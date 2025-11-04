import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const SOCKET_SERVER_URL = 'http://localhost:5000';

function App() {
  const [username, setUsername] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const socketRef = useRef();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(SOCKET_SERVER_URL);

    // Set up event listeners
    socketRef.current.on('newMessage', (message) => {
      setMessages(prevMessages => [...prevMessages, message]);
    });

    socketRef.current.on('userList', (userList) => {
      setUsers(userList);
    });

    socketRef.current.on('notification', (notification) => {
      setMessages(prevMessages => [...prevMessages, {
        username: 'System',
        text: `${notification.username} ${notification.type === 'user-joined' ? 'joined' : 'left'} the chat`,
        isSystem: true
      }]);
    });

    socketRef.current.on('userTyping', ({ username, isTyping: typing }) => {
      setTypingUsers(prev => 
        typing 
          ? [...new Set([...prev, username])] 
          : prev.filter(user => user !== username)
      );
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (currentMessage.trim() === '') return;
    
    if (!username) {
      socketRef.current.emit('join', currentMessage);
      setUsername(currentMessage);
    } else {
      socketRef.current.emit('sendMessage', currentMessage);
    }
    setCurrentMessage('');
    setIsTyping(false);
    socketRef.current.emit('typing', false);
  };

  const handleTyping = (e) => {
    setCurrentMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing', true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  return (
    <div className="app">
      <div className="chat-container">
        <div className="users-panel">
          <h3>Online Users ({users.length})</h3>
          <ul>
            {users.map((user, index) => (
              <li key={index}>{user.username}</li>
            ))}
          </ul>
        </div>
        
        <div className="chat-window">
          <div className="messages">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.username === username ? 'own-message' : ''} ${message.isSystem ? 'system-message' : ''}`}
              >
                {!message.isSystem && (
                  <span className="message-username">
                    {message.username}:
                  </span>
                )}
                <span className="message-text">{message.text}</span>
                {message.timestamp && (
                  <span className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
            
            {typingUsers.length > 0 && (
              <div className="typing-indicator">
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="message-form">
            <input
              type="text"
              value={currentMessage}
              onChange={handleTyping}
              onKeyDown={handleKeyDown}
              placeholder={username ? 'Type a message...' : 'Enter your username...'}
              className="message-input"
            />
            <button type="submit" className="send-button">
              {username ? 'Send' : 'Join'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
