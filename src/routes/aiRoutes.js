const express = require('express');
const router = express.Router();
const { chatWithAssistant } = require('../controllers/aiController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.post('/chat', chatWithAssistant);

module.exports = router;
