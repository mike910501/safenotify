require('dotenv').config();
const express = require('express');

const app = express();
const PORT = 3002;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Test server running' });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
});