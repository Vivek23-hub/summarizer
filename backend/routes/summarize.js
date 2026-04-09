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
    const { text, max_length = 100 } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Call FastAPI service
    const response = await axios.post(`${FASTAPI_URL}/summarize-text`, {
      text: text,
      max_length: max_length
    });

    const summary = response.data.summary;

    // Save history to MongoDB
    const newDoc = new Document({
      originalName: 'Pasted Text',
      extractedText: text,
      summary: summary,
      user: req.user ? req.user.id : undefined,
    });

    try {
      await newDoc.save();
    } catch (saveErr) {
      console.error("Failed to save to DB:", saveErr);
    }

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

    // Prepare form data to forward to FastAPI
    const form = new FormData();
    form.append('file', fs.createReadStream(path), {
        filename: originalname,
        contentType: mimetype,
    });
    form.append('max_length', max_length.toString());

    // Forward file to FastAPI
    const response = await axios.post(`${FASTAPI_URL}/summarize-file`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    const summary = response.data.summary;

    // Save history to MongoDB
    // Note: We don't have the full extracted text here easily without parsing it ourselves, 
    // but the requirement is to use FastAPI as a proxy. 
    // For history purposes, we might want to store that a file was summarized.
    const newDoc = new Document({
      originalName: originalname,
      extractedText: `[File Content from ${originalname}]`,
      summary: summary,
      user: req.user ? req.user.id : undefined,
    });

    try {
      await newDoc.save();
    } catch (saveErr) {
      console.error("Failed to save to DB:", saveErr);
    }

    // Clean up local temp file
    fs.unlinkSync(path);

    res.json({ success: true, summary, originalName: originalname });
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

module.exports = router;
