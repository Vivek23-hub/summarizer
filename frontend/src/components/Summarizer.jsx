import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

const Summarizer = ({ token }) => {
  const [file, setFile] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [inputType, setInputType] = useState('file'); // 'file' or 'text'
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState(null);
  const [originalName, setOriginalName] = useState('');
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = ['application/pdf', 'text/plain'];
      
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please upload a valid PDF or plain text (.txt) file.');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      setSummary(''); // Clear previous summary
    }
  };

  const handleSummarize = async () => {
    if (inputType === 'file' && !file) {
      setError('Please select a file first.');
      return;
    }
    
    if (inputType === 'text' && !textInput.trim()) {
      setError('Please enter some text to summarize.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response;
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (inputType === 'file') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('max_length', '100');
        
        // Let fetch set the correct Content-Type for FormData
        response = await fetch('http://localhost:5000/api/summarize-file', {
          method: 'POST',
          headers,
          body: formData,
        });
      } else {
        headers['Content-Type'] = 'application/json';
        response = await fetch('http://localhost:5000/api/summarize', {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            text: textInput,
            max_length: 100 
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to summarize document');
      }

      setSummary(data.summary);
      setOriginalName(data.originalName);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const blob = new Blob([summary], {type: 'text/plain'});
    element.href = URL.createObjectURL(blob);
    element.download = `summary_${originalName || 'document'}.txt`;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    document.body.removeChild(element);
  };

  const handleReset = () => {
    setFile(null);
    setTextInput('');
    setSummary('');
    setError(null);
    setOriginalName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!token) {
    return (
      <>
        <header className="header">
          <h1>Summarizer AI</h1>
          <p>Instantly extract key insights from your PDF and Text documents.</p>
        </header>

        <main className="upload-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>Access Restricted</h2>
          <p style={{ margin: '1rem 0' }}>Please log in to use the document summarizer.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
            <Link to="/login" className="btn">Log In</Link>
            <Link to="/register" className="btn btn-secondary">Register</Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="header">
        <h1>Summarizer AI</h1>
        <p>Instantly extract key insights from your PDF and Text documents.</p>
      </header>


      {!summary && (
        <main className="upload-card">
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <button 
              className={`btn ${inputType === 'file' ? '' : 'btn-secondary'}`}
              onClick={() => setInputType('file')}
            >
              Upload File
            </button>
            <button 
              className={`btn ${inputType === 'text' ? '' : 'btn-secondary'}`}
              onClick={() => setInputType('text')}
            >
              Paste Text
            </button>
          </div>

          {inputType === 'file' ? (
            <>
              <div className="file-input-wrapper">
                <button className="btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  Choose a File
                </button>
                <input 
                  type="file" 
                  accept=".pdf,.txt" 
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  disabled={loading}
                />
              </div>

              {file && (
                <div className="file-name">
                  📄 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </>
          ) : (
            <div style={{ marginBottom: '1.5rem' }}>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste or type your text here to summarize..."
                rows={8}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #333',
                  backgroundColor: '#1E1E1E',
                  color: '#fff',
                  fontSize: '1rem',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Analyzing document...</p>
            </div>
          ) : (
            <button 
              className="btn btn-secondary" 
              onClick={handleSummarize} 
              disabled={inputType === 'file' ? !file : !textInput.trim()}
              style={{ width: '100%', marginTop: '1rem' }}
            >
              Generate Summary
            </button>
          )}
        </main>
      )}

      {summary && !loading && (
        <main className="result-card">
          <div className="result-header">
            <h2>Analysis Complete</h2>
            <button className="btn btn-secondary" onClick={handleReset} style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>
              Upload New
            </button>
          </div>
          
          <div className="summary-content">
            {summary}
          </div>

          <div className="actions">
            <button className="btn" onClick={handleCopy}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy
            </button>
            <button className="btn btn-secondary" onClick={handleDownload}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Download
            </button>
          </div>
        </main>
      )}
    </>
  );
};

export default Summarizer;
