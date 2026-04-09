import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Summarizer from './components/Summarizer';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  return (
    <Router>
      <div className="app-container">
        <Navbar token={token} setToken={setToken} />
        <Routes>
          <Route path="/" element={<Summarizer token={token} />} />
          <Route path="/login" element={<Login setToken={setToken} />} />
          <Route path="/register" element={<Register setToken={setToken} />} />
          <Route path="/dashboard" element={<Dashboard token={token} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
