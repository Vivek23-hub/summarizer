import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = ({ token }) => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchSummaries = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/summaries', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch summaries');
        }

        const data = await response.json();
        setSummaries(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSummaries();
  }, [token, navigate]);

  if (loading) {
    return (
      <div className="loading-container" style={{ marginTop: '3rem' }}>
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Your Summaries</h2>
        <button className="btn" onClick={() => navigate('/')}>
          + New Summary
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}

      {summaries.length === 0 ? (
        <div className="empty-state">
          <p>You haven't generated any summaries yet.</p>
          <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>
            Get Started
          </button>
        </div>
      ) : (
        <div className="summary-list">
          {summaries.map((doc) => (
            <div key={doc._id} className="summary-list-item">
              <div className="summary-list-item-header">
                <h3>📄 {doc.originalName}</h3>
                <span className="date">{new Date(doc.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="summary-preview">
                {doc.summary.length > 150 ? doc.summary.substring(0, 150) + '...' : doc.summary}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
