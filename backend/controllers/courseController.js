const db = require('../config/db');

// Teacher: Create a course
const createCourse = async (req, res) => {
  const { course_code, course_name, department, semester, academic_year } = req.body;
  const teacher_id = req.user.id;

  if (!course_code || !course_name) {
    return res.status(400).json({ success: false, message: 'course_code and course_name are required.' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO courses (course_code, course_name, teacher_id, department, semester, academic_year) VALUES (?, ?, ?, ?, ?, ?)',
      [course_code, course_name, teacher_id, department, semester, academic_year]
    );

    res.status(201).json({
      success: true,
      message: 'Course created.',
      course_id: result.insertId,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Course code already exists.' });
    }
    console.error('Create course error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Teacher: Get all courses they teach
const getTeacherCourses = async (req, res) => {
  const teacher_id = req.user.id;

  try {
    const [courses] = await db.query(
      `SELECT c.*,
              COUNT(DISTINCT e.student_id) as enrolled_count
       FROM courses c
       LEFT JOIN enrollments e ON c.id = e.course_id
       WHERE c.teacher_id = ?
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [teacher_id]
    );

    res.json({ success: true, courses });
  } catch (err) {
    console.error('Get teacher courses error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Student: Get all courses they are enrolled in
const getStudentCourses = async (req, res) => {
  const student_id = req.user.id;

  try {
    const [courses] = await db.query(
      `SELECT c.*, u.name as teacher_name
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       JOIN users u ON c.teacher_id = u.id
       WHERE e.student_id = ?`,
      [student_id]
    );

    res.json({ success: true, courses });
  } catch (err) {
    console.error('Get student courses error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Enroll a student in a course (teacher does this)
const enrollStudent = async (req, res) => {
  const { student_id, course_id } = req.body;
  const teacher_id = req.user.id;

  try {
    // Verify teacher owns this course
    const [courseCheck] = await db.query(
      'SELECT id FROM courses WHERE id = ? AND teacher_id = ?',
      [course_id, teacher_id]
    );

    if (courseCheck.length === 0) {
      return res.status(403).json({ success: false, message: 'Course not found or access denied.' });
    }

    await db.query(
      'INSERT IGNORE INTO enrollments (student_id, course_id) VALUES (?, ?)',
      [student_id, course_id]
    );

    res.json({ success: true, message: 'Student enrolled.' });
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get all students for teacher to enroll
const getAllStudents = async (req, res) => {
  try {
    const [students] = await db.query(
      "SELECT id, name, email, roll_number, department FROM users WHERE role = 'student' ORDER BY name"
    );
    res.json({ success: true, students });
  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get enrolled students for a course
const getCourseStudents = async (req, res) => {
  const { course_id } = req.params;
  const teacher_id = req.user.id;

  try {
    const [courseCheck] = await db.query(
      'SELECT id FROM courses WHERE id = ? AND teacher_id = ?',
      [course_id, teacher_id]
    );

    if (courseCheck.length === 0) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const [students] = await db.query(
      `SELECT u.id, u.name, u.email, u.roll_number
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       WHERE e.course_id = ?
       ORDER BY u.roll_number`,
      [course_id]
    );

    res.json({ success: true, students });
  } catch (err) {
    console.error('Get course students error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  createCourse,
  getTeacherCourses,
  getStudentCourses,
  enrollStudent,
  getAllStudents,
  getCourseStudents,
};
