import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now - date) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return "Uploaded just now";
  if (minutes < 60) return `Uploaded ${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `Uploaded ${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 30) return `Uploaded ${days} day${days !== 1 ? 's' : ''} ago`;
  return `Uploaded on ${date.toLocaleDateString()}`;
};

const DocumentView = ({ token }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatting, setIsChatting] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchDocument = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/documents/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch document details');
        }

        const data = await response.json();
        setDocument(data);
        setChatHistory(data.chatHistory || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id, token, navigate]);

  useEffect(() => {
    // Scroll to bottom of chat when new message is added
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const messageToSend = chatMessage;
    setChatMessage('');
    setIsChatting(true);

    // Optimistic UI update
    setChatHistory(prev => [...prev, { role: 'user', content: messageToSend }]);

    try {
      const response = await fetch(`http://localhost:5000/api/documents/${id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: messageToSend })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }

      setChatHistory(data.chatHistory);
    } catch (err) {
      // Revert or show error
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'bot', content: `Error: ${err.message}` }]);
    } finally {
      setIsChatting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ marginTop: '3rem' }}>
        <div className="spinner"></div>
        <p>Loading document...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="dashboard-container">
        <div className="error-message">{error || 'Document not found'}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="document-view-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      <button className="btn btn-secondary" onClick={() => navigate('/dashboard')} style={{ marginBottom: '1.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
        &larr; Back to Dashboard
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '2rem', alignItems: 'stretch' }}>

        {/* Left Column: Summary */}
        <div className="summary-section result-card" style={{ margin: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="result-header">
            <h2>📄 {document.originalName}</h2>
          </div>
          <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '1rem' }}>
            👉 {timeAgo(document.createdAt)}
          </p>
          <div className="summary-content" style={{ flex: 1, overflowY: 'auto' }}>
            {document.summary}
          </div>
        </div>

        {/* Right Column: Q&A Chat */}
        <div className="chat-section result-card" style={{ margin: 0, height: '600px', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
          <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>Ask Questions</h2>

          <div className="chat-history" style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {chatHistory.length === 0 ? (
              <div style={{ color: '#888', textAlign: 'center', marginTop: '2rem' }}>
                <p>Hello! Im ready to answer questions about this document.</p>
              </div>
            ) : (
              chatHistory.map((msg, index) => (
                <div key={index} style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.role === 'user' ? 'var(--primary-color)' : '#2A2A2A',
                  color: msg.role === 'user' ? '#fff' : '#e0e0e0',
                  padding: '0.8rem 1.2rem',
                  borderRadius: msg.role === 'user' ? '18px 18px 0 18px' : '18px 18px 18px 0',
                  maxWidth: '85%',
                  lineHeight: '1.4'
                }}>
                  {msg.content}
                </div>
              ))
            )}
            {isChatting && (
              <div style={{
                alignSelf: 'flex-start',
                backgroundColor: '#2A2A2A',
                padding: '0.8rem 1.2rem',
                borderRadius: '18px 18px 18px 0',
              }}>
                <div className="spinner" style={{ width: '20px', height: '20px', margin: 0 }}></div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Ask something about the document..."
              disabled={isChatting}
              style={{
                flex: 1,
                padding: '0.8rem 1rem',
                borderRadius: '24px',
                border: '1px solid #444',
                backgroundColor: '#1a1a1a',
                color: '#fff',
                outline: 'none'
              }}
            />
            <button type="submit" className="btn" disabled={isChatting || !chatMessage.trim()} style={{ borderRadius: '24px', padding: '0.8rem 1.5rem' }}>
              Send
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default DocumentView;
