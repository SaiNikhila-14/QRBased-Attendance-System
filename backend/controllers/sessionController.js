const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const db = require('../config/db');

// Create a new session and generate QR code
const createSession = async (req, res) => {
  const { course_id, duration_minutes = 10 } = req.body;
  const teacher_id = req.user.id;

  if (!course_id) {
    return res.status(400).json({ success: false, message: 'course_id is required.' });
  }

  try {
    // Verify teacher owns this course
    const [courses] = await db.query(
      'SELECT * FROM courses WHERE id = ? AND teacher_id = ?',
      [course_id, teacher_id]
    );

    if (courses.length === 0) {
      return res.status(403).json({ success: false, message: 'Course not found or access denied.' });
    }

    // Close any existing active session for this course
    await db.query(
      "UPDATE sessions SET status = 'closed' WHERE course_id = ? AND status = 'active'",
      [course_id]
    );

    const session_token = uuidv4();
    const expires_at = new Date(Date.now() + duration_minutes * 60 * 1000);
    const session_date = new Date().toISOString().split('T')[0];

    const [result] = await db.query(
      'INSERT INTO sessions (session_token, course_id, teacher_id, session_date, expires_at, duration_minutes) VALUES (?, ?, ?, ?, ?, ?)',
      [session_token, course_id, teacher_id, session_date, expires_at, duration_minutes]
    );

    // Generate QR code as base64 image
    const qrData = JSON.stringify({
      sessionId: result.insertId,
      sessionToken: session_token,
      courseId: course_id,
      expiresAt: expires_at.toISOString(),
    });

    const qrCodeBase64 = await QRCode.toDataURL(qrData, {
      width: 300,
      errorCorrectionLevel: 'H',
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });

    res.json({
      success: true,
      message: 'Session created successfully.',
      session: {
        id: result.insertId,
        session_token,
        course_id,
        course_name: courses[0].course_name,
        course_code: courses[0].course_code,
        session_date,
        expires_at: expires_at.toISOString(),
        duration_minutes,
        qr_code: qrCodeBase64,
      },
    });
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ success: false, message: 'Server error creating session.' });
  }
};

// Close a session manually
const closeSession = async (req, res) => {
  const { session_id } = req.params;
  const teacher_id = req.user.id;

  try {
    const [result] = await db.query(
      "UPDATE sessions SET status = 'closed' WHERE id = ? AND teacher_id = ?",
      [session_id, teacher_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Session not found or access denied.' });
    }

    res.json({ success: true, message: 'Session closed.' });
  } catch (err) {
    console.error('Close session error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get active session for a course (teacher view)
const getActiveSession = async (req, res) => {
  const { course_id } = req.params;
  const teacher_id = req.user.id;

  try {
    const [sessions] = await db.query(
      `SELECT s.*, c.course_name, c.course_code
       FROM sessions s
       JOIN courses c ON s.course_id = c.id
       WHERE s.course_id = ? AND s.teacher_id = ? AND s.status = 'active' AND s.expires_at > NOW()
       ORDER BY s.created_at DESC LIMIT 1`,
      [course_id, teacher_id]
    );

    if (sessions.length === 0) {
      return res.json({ success: true, session: null });
    }

    const session = sessions[0];

    // Regenerate QR code
    const qrData = JSON.stringify({
      sessionId: session.id,
      sessionToken: session.session_token,
      courseId: session.course_id,
      expiresAt: session.expires_at,
    });

    const qrCodeBase64 = await QRCode.toDataURL(qrData, {
      width: 300,
      errorCorrectionLevel: 'H',
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });

    res.json({
      success: true,
      session: { ...session, qr_code: qrCodeBase64 },
    });
  } catch (err) {
    console.error('Get session error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get all sessions for a course (history)
const getSessionHistory = async (req, res) => {
  const { course_id } = req.params;
  const teacher_id = req.user.id;

  try {
    const [sessions] = await db.query(
      `SELECT s.id, s.session_date, s.start_time, s.expires_at, s.status, s.duration_minutes,
              COUNT(a.id) as attendance_count,
              (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = s.course_id) as total_enrolled
       FROM sessions s
       LEFT JOIN attendance a ON s.id = a.session_id
       WHERE s.course_id = ? AND s.teacher_id = ?
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [course_id, teacher_id]
    );

    res.json({ success: true, sessions });
  } catch (err) {
    console.error('Session history error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { createSession, closeSession, getActiveSession, getSessionHistory };
