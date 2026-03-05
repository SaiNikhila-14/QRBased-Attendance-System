const express = require('express');
const router = express.Router();
const {
  createCourse,
  getTeacherCourses,
  getStudentCourses,
  enrollStudent,
  getAllStudents,
  getCourseStudents,
} = require('../controllers/courseController');
const { authMiddleware, teacherOnly, studentOnly } = require('../middleware/auth');

router.post('/create', authMiddleware, teacherOnly, createCourse);
router.get('/teacher', authMiddleware, teacherOnly, getTeacherCourses);
router.get('/student', authMiddleware, studentOnly, getStudentCourses);
router.post('/enroll', authMiddleware, teacherOnly, enrollStudent);
router.get('/students/all', authMiddleware, teacherOnly, getAllStudents);
router.get('/:course_id/students', authMiddleware, teacherOnly, getCourseStudents);

module.exports = router;
