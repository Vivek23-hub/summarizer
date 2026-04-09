const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoute = require('./routes/auth');
const summarizeRoute = require('./routes/summarize');
app.use('/api/auth', authRoute);
app.use('/api', summarizeRoute);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/document_summarizer')
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.log('MongoDB connection error: ', err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
