import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import { Container, Button, TextField, Paper, Box, Typography, IconButton, Tooltip } from "@mui/material";
import { 
  Send as SendIcon, 
  Mic as MicIcon, 
  Menu as MenuIcon, 
  DarkMode as DarkModeIcon, 
  LightMode as LightModeIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from "@mui/icons-material";
import axios from "axios";
// SVG Components
const PlantLogo = () => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" fill="#2c5f2d">
    <path d="M12,3C10.89,3 10,3.89 10,5V7H14V5C14,3.89 13.11,3 12,3Z" />
  </svg>
);

const WeatherIcon = () => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" fill="#2c5f2d">
    <path d="M6,19A5,5 0 0,1 1,14A5,5 0 0,1 6,9C7,6.65 9.3,5 12,5C15.43,5 18.24,7.66 18.5,11.03L19,11A4,4 0 0,1 23,15A4,4 0 0,1 19,19H6Z" />
  </svg>
);

const CropIcon = () => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" fill="#2c5f2d">
    <path d="M15,4V6H18V4H15M14,8V10H17V8H14M13,12V14H16V12H13M12,16V18H15V16H12Z" />
  </svg>
);

const languages = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी' },
  { code: 'mr', name: 'मराठी' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ' }
];

function HomePage({ currentLang, setCurrentLang }) {
  return (
    <div className="home-container">
      <nav className="nav-bar">
        <div className="logo">AgriSeva</div>
        <select value={currentLang} onChange={(e) => setCurrentLang(e.target.value)} className="language-select">
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>
      </nav>
      <div className="main-content">
        <div className="plant-avatar">
          <Link to="/chatbot">
            <div className="avatar-image">
              <PlantLogo />
            </div>
          </Link>
          <p>नमस्कार! मी तुमचा कृषी सहाय्यक</p>
        </div>
        <div className="features-grid">
          <Link to="/weather" className="feature-card">
            <div className="feature-icon">
              <WeatherIcon />
            </div>
            <span>हवामान अंदाज</span>
          </Link>
          <Link to="/crops" className="feature-card">
            <div className="feature-icon">
              <CropIcon />
            </div>
            <span>पीक शिफारस</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ChatbotPage() {
  const [chatHistory, setChatHistory] = useState(() => {
    const storedHistory = localStorage.getItem("agriChatHistory");
    return storedHistory ? JSON.parse(storedHistory) : {};
  });
  const [chatNames, setChatNames] = useState(() => {
    const storedNames = localStorage.getItem("agriChatNames");
    return storedNames ? JSON.parse(storedNames) : {};
  });
  const [currentChatId, setCurrentChatId] = useState(() => {
    const storedChatId = localStorage.getItem("agriCurrentChatId");
    return storedChatId || `कृषी संवाद 1`;
  });
  const [messages, setMessages] = useState(chatHistory[currentChatId] || []);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    localStorage.setItem("agriChatHistory", JSON.stringify(chatHistory));
    localStorage.setItem("agriChatNames", JSON.stringify(chatNames));
    localStorage.setItem("agriCurrentChatId", currentChatId);
  }, [chatHistory, chatNames, currentChatId]);

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'mr-IN'; // Set language to Marathi
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech synthesis not supported in this browser.');
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    
    try {
        const userMessage = { text: input, sender: 'user' };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setChatHistory({
          ...chatHistory,
          [currentChatId]: updatedMessages,
        });
        setInput('');

        const response = await fetch('http://localhost:5000/api/nvidia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: "user", content: input }]
            })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        if (!response.body) {
            throw new Error('ReadableStream not supported');
        }

        // Create a new message for the bot's response
        const botMessage = { text: '', sender: 'bot' };
        setMessages([...updatedMessages, botMessage]);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(5);
                    if (data === '[DONE]') break;

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.content) {
                            botMessage.text += parsed.content;
                            setMessages([...updatedMessages, { ...botMessage }]);
                        }
                    } catch (e) {
                        console.error('Error parsing chunk:', e);
                    }
                }
            }
        }

        // Save the final conversationssas
        //  to history
        setChatHistory({
          ...chatHistory,
          [currentChatId]: [...updatedMessages, botMessage],
        });

        // Speak the bot's response
        speakText(botMessage.text);

    } catch (error) {
        console.error('Error:', error);
        setMessages(prev => [...prev, { 
            text: "माफ करा, एक त्रुटी आली. कृपया पुन्हा प्रयत्न करा.", 
            sender: 'bot' 
        }]);
    } finally {
        setIsLoading(false);
    }
  };

  const createNewChat = () => {
    const newChatId = `कृषी संवाद ${Object.keys(chatHistory).length + 1}`;
    setCurrentChatId(newChatId);
    setMessages([]);
    setChatHistory({
      ...chatHistory,
      [newChatId]: [],
    });
    setChatNames({
      ...chatNames,
      [newChatId]: newChatId,
    });
  };

  const loadChat = (chatId) => {
    setCurrentChatId(chatId);
    setMessages(chatHistory[chatId] || []);
  };

  const handleEditChatName = (chatId) => {
    const currentName = chatNames[chatId] || chatId;
    const newName = prompt("संवादासाठी नवीन नाव द्या:", currentName);
    if (newName && newName.trim() !== "") {
      setChatNames({
        ...chatNames,
        [chatId]: newName.trim()
      });
    }
  };

  const handleDeleteChat = (chatId) => {
    if (window.confirm("तुम्हाला खात्री आहे की तुम्ही हा संवाद हटवू इच्छिता?")) {
      const newChatHistory = { ...chatHistory };
      delete newChatHistory[chatId];
      setChatHistory(newChatHistory);

      const newChatNames = { ...chatNames };
      delete newChatNames[chatId];
      setChatNames(newChatNames);

      if (currentChatId === chatId) {
        const firstChatId = Object.keys(newChatHistory)[0];
        setCurrentChatId(firstChatId || `कृषी संवाद 1`);
        setMessages(newChatHistory[firstChatId] || []);
      }
    }
  };

  const startListening = () => {
    setIsListening(true);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('या ब्राउझरमध्ये स्पीच रेकग्निशन समर्थित नाही.');
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'mr-IN';  // Set to Marathi
    recognition.interimResults = false;

    recognition.onstart = () => {
      console.log('ऐकत आहे...');
    };

    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript;
      setInput(speechResult);
      handleSend();
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark-mode');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={`chatbot-container ${isDarkMode ? 'dark-mode' : ''}`}>
      <div className="chat-header">
        <div className="header-left">
          <Link to="/" className="back-button">←</Link>
          <IconButton onClick={toggleSidebar} className="menu-button">
            <MenuIcon />
          </IconButton>
          <h2>कृषी मित्र</h2>
        </div>
        <IconButton onClick={toggleTheme} className="theme-toggle">
          {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </div>

      <div className={`chat-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <Button 
          variant="outlined" 
          fullWidth 
          onClick={createNewChat}
          className="new-chat-button"
        >
          + नवीन संवाद
        </Button>
        <div className="chat-history">
          {Object.keys(chatHistory).map((chatId) => (
            <div
              key={chatId}
              className={`chat-history-item ${chatId === currentChatId ? 'active' : ''}`}
            >
              <div 
                className="chat-title"
                onClick={() => loadChat(chatId)}
              >
                {chatNames[chatId] || chatId}
              </div>
              <div className="chat-actions">
                <IconButton 
                  size="small" 
                  onClick={() => handleEditChatName(chatId)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => handleDeleteChat(chatId)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
        {isLoading && (
          <div className="message bot loading">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>

      <div className="input-container">
        <TextField
          fullWidth
          variant="outlined"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="तुमचा संदेश टाइप करा..."
          disabled={isLoading || isListening}
          multiline
          maxRows={4}
        />
        <div className="button-group">
          <IconButton
            onClick={startListening}
            disabled={isLoading || isListening}
            className={`mic-button ${isListening ? 'recording' : ''}`}
          >
            <MicIcon />
          </IconButton>
          <IconButton
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="send-button"
          >
            <SendIcon />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [currentLang, setCurrentLang] = useState('mr');
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage currentLang={currentLang} setCurrentLang={setCurrentLang} />} />
        <Route path="/chatbot" element={<ChatbotPage />} />
      </Routes>
    </Router>
  );
}

export default App;
