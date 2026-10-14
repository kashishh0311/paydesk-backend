const express = require('express');
const router = express.Router();
const { getOverview } = require('../controllers/analyticsController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/overview', getOverview);

module.exports = router;
