import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'student',
    roll_number: '', department: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>📋</div>
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.subtitle}>Join the Attendance System</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Full Name</label>
              <input name="name" value={form.name} onChange={handleChange} style={styles.input} placeholder="Your name" required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Role</label>
              <select name="role" value={form.role} onChange={handleChange} style={styles.input}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email Address</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} style={styles.input} placeholder="your@email.com" required />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} style={styles.input} placeholder="Min 6 characters" minLength={6} required />
          </div>

          {form.role === 'student' && (
            <div style={styles.field}>
              <label style={styles.label}>Roll Number</label>
              <input name="roll_number" value={form.roll_number} onChange={handleChange} style={styles.input} placeholder="e.g. 22102A040657" required />
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Department</label>
            <input name="department" value={form.department} onChange={handleChange} style={styles.input} placeholder="e.g. Computer Science" />
          </div>

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    fontFamily: "'Segoe UI', sans-serif", padding: '20px',
  },
  card: {
    background: '#fff', borderRadius: '16px', padding: '40px',
    width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
  },
  header: { textAlign: 'center', marginBottom: '28px' },
  logo: { fontSize: '3rem', marginBottom: '12px' },
  title: { margin: 0, fontSize: '1.8rem', color: '#1a1a2e', fontWeight: 700 },
  subtitle: { color: '#6b7280', margin: '6px 0 0', fontSize: '0.95rem' },
  error: {
    background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
    padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem',
  },
  success: {
    background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a',
    padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '0.9rem', fontWeight: 600, color: '#374151' },
  input: {
    padding: '11px 14px', borderRadius: '8px', border: '1.5px solid #d1d5db',
    fontSize: '0.95rem', outline: 'none',
  },
  btn: {
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff',
    padding: '14px', border: 'none', borderRadius: '8px', fontSize: '1rem',
    fontWeight: 600, cursor: 'pointer', marginTop: '4px',
  },
  footer: { textAlign: 'center', marginTop: '20px', color: '#6b7280', fontSize: '0.9rem' },
  link: { color: '#4f46e5', fontWeight: 600, textDecoration: 'none' },
};
