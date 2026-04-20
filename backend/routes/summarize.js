const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const Document = require('../models/Document');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const FASTAPI_URL = 'http://127.0.0.1:8000';

// POST /api/summarize - Summarize plain text
router.post('/summarize', requireAuth, async (req, res) => {
  try {
    const { text, max_length = 100, mode = 'balanced' } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'No text provided' });
    }

    const newDoc = new Document({
      originalName: 'Pasted Text',
      summary: 'pending', // Will update below
      user: req.user ? req.user.id : undefined,
    });
    
    // Call FastAPI service
    const response = await axios.post(`${FASTAPI_URL}/summarize-text`, {
      text: text,
      max_length: max_length,
      mode: mode,
      document_id: newDoc._id.toString()
    });

    const summary = response.data.summary;
    newDoc.summary = summary;

    try {
      await newDoc.save();
    } catch (saveErr) {
      console.error("Failed to save to DB:", saveErr);
    }

    res.json({ success: true, summary, originalName: 'Pasted Text', documentId: newDoc._id });
      console.error("Failed to save to DB:", saveErr);
    

    res.json({ success: true, summary, originalName: 'Pasted Text' });
  } catch (error) {
    console.error('Error in /summarize route:', error.message);
    const errorMessage = error.response ? error.response.data.detail || error.message : 'FastAPI service not reachable';
    res.status(500).json({ error: errorMessage });
  }
});

// POST /api/summarize-file - Summarize uploaded file (PDF, TXT, etc.)
router.post('/summarize-file', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { path, originalname, mimetype } = req.file;
    const max_length = req.body.max_length || 100;
    const mode = req.body.mode || 'balanced';

    const newDoc = new Document({
      originalName: originalname,
      summary: 'pending', // Will update below
      user: req.user ? req.user.id : undefined,
    });

    // Prepare form data to forward to FastAPI
    const form = new FormData();
    form.append('file', fs.createReadStream(path), {
        filename: originalname,
        contentType: mimetype,
    });
    form.append('max_length', max_length.toString());
    form.append('mode', mode.toString());
    form.append('document_id', newDoc._id.toString());

    // Forward file to FastAPI
    const response = await axios.post(`${FASTAPI_URL}/summarize-file`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    const summary = response.data.summary;
    newDoc.summary = summary;

    try {
      await newDoc.save();
    } catch (saveErr) {
      console.error("Failed to save to DB:", saveErr);
    }

    // Clean up local temp file
    fs.unlinkSync(path);

    res.json({ success: true, summary, originalName: originalname, documentId: newDoc._id });
  } catch (error) {
    console.error('Error in /summarize-file route:', error.message);
    if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
    }
    const errorMessage = error.response ? error.response.data.detail || error.message : 'FastAPI service not reachable';
    res.status(500).json({ error: errorMessage });
  }
});

// GET /api/summaries - Fetch summaries for the logged-in user
router.get('/summaries', requireAuth, async (req, res) => {
  try {
    const documents = await Document.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (err) {
    console.error('Error fetching summaries:', err);
    res.status(500).send('Server error');
  }
});

// GET /api/documents/:id - Fetch a single document
router.get('/documents/:id', requireAuth, async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, user: req.user.id });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(document);
  } catch (err) {
    console.error('Error fetching document:', err);
    res.status(500).send('Server error');
  }
});

// POST /api/documents/:id/chat - Ask a question about a document
router.post('/documents/:id/chat', requireAuth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const document = await Document.findOne({ _id: req.params.id, user: req.user.id });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Append user question
    document.chatHistory.push({ role: 'user', content: question });

    // Send question to FastAPI
    const response = await axios.post(`${FASTAPI_URL}/ask`, {
      document_id: document._id.toString(),
      question: question
    });

    const answer = response.data.answer;

    // Append bot answer
    document.chatHistory.push({ role: 'bot', content: answer });
    await document.save();

    res.json({ 
      success: true, 
      answer,
      chatHistory: document.chatHistory
    });

  } catch (error) {
    console.error('Error in /documents/:id/chat route:', error.message);
    const errorMessage = error.response ? error.response.data.detail || error.message : 'FastAPI service not reachable';
    res.status(500).json({ error: errorMessage });
  }
});

module.exports = router;
