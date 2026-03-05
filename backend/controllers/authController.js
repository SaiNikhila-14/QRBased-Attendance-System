const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Register a new user
const register = async (req, res) => {
  const { name, email, password, role, roll_number, department } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'Name, email, password and role are required.' });
  }

  if (!['teacher', 'student'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Role must be teacher or student.' });
  }

  if (role === 'student' && !roll_number) {
    return res.status(400).json({ success: false, message: 'Roll number is required for students.' });
  }

  try {
    // Check if email already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role, roll_number, department) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role, roll_number || null, department || null]
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      userId: result.insertId,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// Login
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roll_number: user.roll_number,
        department: user.department,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, role, roll_number, department, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, user: users[0] });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { register, login, getProfile };
