const express = require('express');
const router = express.Router();
const { createSession, closeSession, getActiveSession, getSessionHistory } = require('../controllers/sessionController');
const { authMiddleware, teacherOnly } = require('../middleware/auth');

router.post('/create', authMiddleware, teacherOnly, createSession);
router.put('/close/:session_id', authMiddleware, teacherOnly, closeSession);
router.get('/active/:course_id', authMiddleware, teacherOnly, getActiveSession);
router.get('/history/:course_id', authMiddleware, teacherOnly, getSessionHistory);

module.exports = router;
