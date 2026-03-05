const db = require('../config/db');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs');

// Student scans QR code to mark attendance
const markAttendance = async (req, res) => {
  const { session_token, session_id } = req.body;
  const student_id = req.user.id;

  if (!session_token || !session_id) {
    return res.status(400).json({ success: false, message: 'session_token and session_id are required.' });
  }

  try {
    // Validate session exists, is active, and not expired
    const [sessions] = await db.query(
      `SELECT s.*, c.course_name, c.course_code
       FROM sessions s
       JOIN courses c ON s.course_id = c.id
       WHERE s.id = ? AND s.session_token = ? AND s.status = 'active' AND s.expires_at > NOW()`,
      [session_id, session_token]
    );

    if (sessions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'QR code is invalid or has expired. Please ask your teacher to regenerate.',
      });
    }

    const session = sessions[0];

    // Check student is enrolled in this course
    const [enrollment] = await db.query(
      'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
      [student_id, session.course_id]
    );

    if (enrollment.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course.',
      });
    }

    // Check for duplicate attendance
    const [existing] = await db.query(
      'SELECT id FROM attendance WHERE session_id = ? AND student_id = ?',
      [session_id, student_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Attendance already marked for this session.',
      });
    }

    // Mark attendance
    await db.query(
      'INSERT INTO attendance (session_id, student_id, course_id) VALUES (?, ?, ?)',
      [session_id, student_id, session.course_id]
    );

    res.json({
      success: true,
      message: '✅ Attendance marked successfully!',
      data: {
        course_name: session.course_name,
        course_code: session.course_code,
        session_date: session.session_date,
        marked_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Mark attendance error:', err);
    res.status(500).json({ success: false, message: 'Server error marking attendance.' });
  }
};

// Get attendance list for a session (teacher view - live)
const getSessionAttendance = async (req, res) => {
  const { session_id } = req.params;
  const teacher_id = req.user.id;

  try {
    // Verify teacher owns this session
    const [sessionCheck] = await db.query(
      'SELECT id, course_id FROM sessions WHERE id = ? AND teacher_id = ?',
      [session_id, teacher_id]
    );

    if (sessionCheck.length === 0) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Get all enrolled students and their attendance status
    const [students] = await db.query(
      `SELECT u.id, u.name, u.roll_number, u.email,
              a.id as attendance_id,
              a.scanned_at,
              CASE WHEN a.id IS NOT NULL THEN 'present' ELSE 'absent' END as status
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       LEFT JOIN attendance a ON a.student_id = u.id AND a.session_id = ?
       WHERE e.course_id = ?
       ORDER BY u.roll_number ASC`,
      [session_id, sessionCheck[0].course_id]
    );

    const present = students.filter(s => s.status === 'present').length;
    const total = students.length;

    res.json({
      success: true,
      stats: { present, absent: total - present, total },
      students,
    });
  } catch (err) {
    console.error('Session attendance error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get student's own attendance summary across courses
const getStudentAttendance = async (req, res) => {
  const student_id = req.user.id;

  try {
    const [records] = await db.query(
      `SELECT 
         c.id as course_id,
         c.course_code,
         c.course_name,
         COUNT(DISTINCT s.id) as total_sessions,
         COUNT(DISTINCT a.session_id) as attended_sessions,
         ROUND((COUNT(DISTINCT a.session_id) / COUNT(DISTINCT s.id)) * 100, 1) as percentage
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       JOIN sessions s ON s.course_id = c.id
       LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = e.student_id
       WHERE e.student_id = ?
       GROUP BY c.id`,
      [student_id]
    );

    // Recent attendance history
    const [history] = await db.query(
      `SELECT a.scanned_at, s.session_date, c.course_name, c.course_code
       FROM attendance a
       JOIN sessions s ON a.session_id = s.id
       JOIN courses c ON s.course_id = c.id
       WHERE a.student_id = ?
       ORDER BY a.scanned_at DESC LIMIT 20`,
      [student_id]
    );

    res.json({ success: true, courses: records, history });
  } catch (err) {
    console.error('Student attendance error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Export attendance as CSV (teacher)
const exportAttendanceCSV = async (req, res) => {
  const { session_id } = req.params;
  const teacher_id = req.user.id;

  try {
    const [sessionCheck] = await db.query(
      `SELECT s.*, c.course_name, c.course_code
       FROM sessions s JOIN courses c ON s.course_id = c.id
       WHERE s.id = ? AND s.teacher_id = ?`,
      [session_id, teacher_id]
    );

    if (sessionCheck.length === 0) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const session = sessionCheck[0];

    const [students] = await db.query(
      `SELECT u.name, u.roll_number, u.email,
              CASE WHEN a.id IS NOT NULL THEN 'Present' ELSE 'Absent' END as status,
              a.scanned_at
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       LEFT JOIN attendance a ON a.student_id = u.id AND a.session_id = ?
       WHERE e.course_id = ?
       ORDER BY u.roll_number ASC`,
      [session_id, session.course_id]
    );

    // Build CSV content
    const rows = students.map(s => ({
      'Roll Number': s.roll_number || 'N/A',
      'Student Name': s.name,
      'Email': s.email,
      'Status': s.status,
      'Scanned At': s.scanned_at ? new Date(s.scanned_at).toLocaleString() : '-',
    }));

    // Create CSV string
    const headers = Object.keys(rows[0]).join(',');
    const csvRows = rows.map(r => Object.values(r).map(v => `"${v}"`).join(','));
    const csvContent = [headers, ...csvRows].join('\n');

    const filename = `attendance_${session.course_code}_${session.session_date}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err) {
    console.error('Export CSV error:', err);
    res.status(500).json({ success: false, message: 'Server error exporting data.' });
  }
};

// Add attendance manually (teacher override)
const manualAttendance = async (req, res) => {
  const { session_id, student_id } = req.body;
  const teacher_id = req.user.id;

  try {
    // Verify teacher owns the session
    const [sessionCheck] = await db.query(
      'SELECT * FROM sessions WHERE id = ? AND teacher_id = ?',
      [session_id, teacher_id]
    );

    if (sessionCheck.length === 0) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Check enrollment
    const [enrollment] = await db.query(
      'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
      [student_id, sessionCheck[0].course_id]
    );

    if (enrollment.length === 0) {
      return res.status(400).json({ success: false, message: 'Student not enrolled in this course.' });
    }

    // Insert or ignore duplicate
    await db.query(
      'INSERT IGNORE INTO attendance (session_id, student_id, course_id) VALUES (?, ?, ?)',
      [session_id, student_id, sessionCheck[0].course_id]
    );

    res.json({ success: true, message: 'Attendance manually added.' });
  } catch (err) {
    console.error('Manual attendance error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  markAttendance,
  getSessionAttendance,
  getStudentAttendance,
  exportAttendanceCSV,
  manualAttendance,
};
