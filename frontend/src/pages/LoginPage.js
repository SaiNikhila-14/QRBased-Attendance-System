import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'teacher' ? '/teacher' : '/student');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>📋</div>
          <h1 style={styles.title}>Attendance System</h1>
          <p style={styles.subtitle}>Sign in to your account</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              placeholder="your@email.com"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>Register here</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    fontFamily: "'Segoe UI', sans-serif",
    padding: '20px',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
  },
  header: { textAlign: 'center', marginBottom: '32px' },
  logo: { fontSize: '3rem', marginBottom: '12px' },
  title: { margin: 0, fontSize: '1.8rem', color: '#1a1a2e', fontWeight: 700 },
  subtitle: { color: '#6b7280', margin: '6px 0 0', fontSize: '0.95rem' },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '0.9rem',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '0.9rem', fontWeight: 600, color: '#374151' },
  input: {
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1.5px solid #d1d5db',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border 0.2s',
  },
  btn: {
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#fff',
    padding: '14px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px',
  },
  footer: { textAlign: 'center', marginTop: '24px', color: '#6b7280', fontSize: '0.9rem' },
  link: { color: '#4f46e5', fontWeight: 600, textDecoration: 'none' },
};
