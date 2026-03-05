const express = require('express');
const router = express.Router();
const {
  markAttendance,
  getSessionAttendance,
  getStudentAttendance,
  exportAttendanceCSV,
  manualAttendance,
} = require('../controllers/attendanceController');
const { authMiddleware, teacherOnly, studentOnly } = require('../middleware/auth');

// Student scans QR code
router.post('/mark', authMiddleware, studentOnly, markAttendance);

// Student's own attendance
router.get('/my-attendance', authMiddleware, studentOnly, getStudentAttendance);

// Teacher views session attendance (live/historical)
router.get('/session/:session_id', authMiddleware, teacherOnly, getSessionAttendance);

// Teacher exports attendance as CSV
router.get('/export/:session_id', authMiddleware, teacherOnly, exportAttendanceCSV);

// Teacher manually adds attendance
router.post('/manual', authMiddleware, teacherOnly, manualAttendance);

module.exports = router;
