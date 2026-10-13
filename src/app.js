const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get(['/api/health', '/api/v1/health'], (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

module.exports = app;
