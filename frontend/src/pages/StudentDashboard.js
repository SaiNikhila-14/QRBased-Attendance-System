import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Html5Qrcode } from 'html5-qrcode';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [view, setView] = useState('scan');
  const [courses, setCourses] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [history, setHistory] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  useEffect(() => {
    loadAttendance();
    loadCourses();
    return () => stopScanner();
  }, []);

  useEffect(() => {
    if (view !== 'scan') stopScanner();
  }, [view]);

  const loadAttendance = async () => {
    try {
      const res = await api.get('/attendance/my-attendance');
      setAttendanceSummary(res.data.courses || []);
      setHistory(res.data.history || []);
    } catch {}
  };

  const loadCourses = async () => {
    try {
      const res = await api.get('/courses/student');
      setCourses(res.data.courses || []);
    } catch {}
  };

  const showMsg = (text, type = 'success') => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 4000);
  };

  const startScanner = () => {
    setScanResult(null);
    setScanning(true);
    setTimeout(() => {
      html5QrRef.current = new Html5Qrcode('qr-reader');
      html5QrRef.current
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          handleScanSuccess,
          () => {}
        )
        .catch(() => {
          showMsg('Camera access denied. Please allow camera permissions.', 'error');
          setScanning(false);
        });
    }, 300);
  };

  const stopScanner = () => {
    if (html5QrRef.current) {
      html5QrRef.current.stop().then(() => {
        html5QrRef.current.clear();
        html5QrRef.current = null;
      }).catch(() => {});
    }
    setScanning(false);
  };

  const handleScanSuccess = async (decodedText) => {
    stopScanner();
    try {
      const data = JSON.parse(decodedText);
      setScanResult({ status: 'loading', message: 'Marking attendance...' });

      const res = await api.post('/attendance/mark', {
        session_token: data.sessionToken,
        session_id: data.sessionId,
      });

      setScanResult({
        status: 'success',
        message: res.data.message,
        detail: res.data.data,
      });
      loadAttendance();
    } catch (err) {
      setScanResult({
        status: 'error',
        message: err.response?.data?.message || 'Failed to mark attendance.',
      });
    }
  };

  const getColorForPercent = (p) => {
    if (p >= 75) return '#16a34a';
    if (p >= 60) return '#d97706';
    return '#dc2626';
  };

  const navItems = [
    { id: 'scan', label: '📷 Scan QR' },
    { id: 'attendance', label: '📊 My Attendance' },
    { id: 'history', label: '📅 History' },
    { id: 'courses', label: '📚 My Courses' },
  ];

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.sidebarLogo}>📋</div>
          <div>
            <div style={styles.sidebarTitle}>Attendance</div>
            <div style={styles.sidebarSub}>Student Portal</div>
          </div>
        </div>

        <div style={styles.userInfo}>
          <div style={styles.avatar}>{user?.name?.[0]}</div>
          <div>
            <div style={styles.userName}>{user?.name}</div>
            <div style={styles.userRole}>{user?.roll_number || 'Student'}</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              style={{ ...styles.navBtn, ...(view === item.id ? styles.navBtnActive : {}) }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button onClick={logout} style={styles.logoutBtn}>🚪 Logout</button>
      </div>

      {/* Main */}
      <div style={styles.main}>
        {msg && (
          <div style={{ ...styles.toast, background: msgType === 'error' ? '#dc2626' : '#16a34a' }}>
            {msg}
          </div>
        )}

        {/* QR Scanner View */}
        {view === 'scan' && (
          <div>
            <h2 style={styles.pageTitle}>📷 Scan QR Code</h2>
            <p style={styles.pageSubtitle}>Point your camera at the QR code displayed by your teacher</p>

            <div style={styles.scanCard}>
              {!scanning && !scanResult && (
                <div style={styles.scanPrompt}>
                  <div style={styles.scanIcon}>📱</div>
                  <p style={styles.scanText}>Ready to scan your teacher's QR code</p>
                  <button onClick={startScanner} style={styles.btnPrimary}>
                    📷 Start Camera Scanner
                  </button>
                </div>
              )}

              {scanning && (
                <div>
                  <div id="qr-reader" style={styles.qrReader} />
                  <button onClick={stopScanner} style={styles.btnSecondary}>✕ Cancel</button>
                </div>
              )}

              {scanResult && (
                <div style={styles.resultBox}>
                  {scanResult.status === 'loading' && (
                    <div style={styles.loadingBox}>
                      <div style={styles.spinner} />
                      <p>{scanResult.message}</p>
                    </div>
                  )}

                  {scanResult.status === 'success' && (
                    <div style={styles.successBox}>
                      <div style={styles.successIcon}>✅</div>
                      <h3 style={{ color: '#16a34a', margin: '0 0 8px' }}>Attendance Marked!</h3>
                      {scanResult.detail && (
                        <div style={styles.detailGrid}>
                          <span style={styles.detailLabel}>Course:</span>
                          <span style={styles.detailValue}>{scanResult.detail.course_name}</span>
                          <span style={styles.detailLabel}>Date:</span>
                          <span style={styles.detailValue}>{scanResult.detail.session_date}</span>
                          <span style={styles.detailLabel}>Time:</span>
                          <span style={styles.detailValue}>{new Date(scanResult.detail.marked_at).toLocaleTimeString()}</span>
                        </div>
                      )}
                      <button onClick={() => { setScanResult(null); }} style={{ ...styles.btnPrimary, marginTop: '16px' }}>
                        Scan Another
                      </button>
                    </div>
                  )}

                  {scanResult.status === 'error' && (
                    <div style={styles.errorBox}>
                      <div style={styles.errorIcon}>❌</div>
                      <h3 style={{ color: '#dc2626', margin: '0 0 8px' }}>Failed</h3>
                      <p style={{ color: '#6b7280', margin: '0 0 16px' }}>{scanResult.message}</p>
                      <button onClick={() => { setScanResult(null); startScanner(); }} style={styles.btnPrimary}>
                        Try Again
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attendance Summary View */}
        {view === 'attendance' && (
          <div>
            <h2 style={styles.pageTitle}>📊 My Attendance</h2>
            <p style={styles.pageSubtitle}>Your attendance percentage by course</p>

            <div style={styles.summaryGrid}>
              {attendanceSummary.map(course => {
                const color = getColorForPercent(course.percentage);
                const strokeDash = (course.percentage / 100) * 251;
                return (
                  <div key={course.course_id} style={styles.summaryCard}>
                    <svg width="80" height="80" viewBox="0 0 90 90">
                      <circle cx="45" cy="45" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                      <circle
                        cx="45" cy="45" r="40" fill="none"
                        stroke={color} strokeWidth="8"
                        strokeDasharray={`${strokeDash} 251`}
                        strokeLinecap="round"
                        transform="rotate(-90 45 45)"
                      />
                      <text x="45" y="50" textAnchor="middle" fill={color} fontWeight="700" fontSize="14">
                        {course.percentage}%
                      </text>
                    </svg>
                    <div style={styles.summaryInfo}>
                      <div style={styles.summaryCode}>{course.course_code}</div>
                      <div style={styles.summaryName}>{course.course_name}</div>
                      <div style={styles.summaryMeta}>
                        {course.attended_sessions} / {course.total_sessions} classes
                      </div>
                      {course.percentage < 75 && (
                        <div style={styles.warningTag}>⚠ Below 75%</div>
                      )}
                    </div>
                  </div>
                );
              })}
              {attendanceSummary.length === 0 && (
                <p style={{ color: '#6b7280' }}>No attendance records yet. Scan a QR code to get started!</p>
              )}
            </div>
          </div>
        )}

        {/* History View */}
        {view === 'history' && (
          <div>
            <h2 style={styles.pageTitle}>📅 Attendance History</h2>
            <p style={styles.pageSubtitle}>Recent 20 classes</p>
            <div style={styles.historyList}>
              {history.map((record, i) => (
                <div key={i} style={styles.historyRow}>
                  <div style={styles.historyDate}>
                    <div style={styles.historyDay}>{new Date(record.session_date).getDate()}</div>
                    <div style={styles.historyMonth}>{new Date(record.session_date).toLocaleString('default', { month: 'short' })}</div>
                  </div>
                  <div style={styles.historyInfo}>
                    <div style={styles.historyCourseName}>{record.course_name}</div>
                    <div style={styles.historyCourseCode}>{record.course_code}</div>
                  </div>
                  <div style={styles.historyTime}>{new Date(record.scanned_at).toLocaleTimeString()}</div>
                  <span style={styles.presentBadge}>✓ Present</span>
                </div>
              ))}
              {history.length === 0 && <p style={{ color: '#6b7280' }}>No history yet.</p>}
            </div>
          </div>
        )}

        {/* Courses View */}
        {view === 'courses' && (
          <div>
            <h2 style={styles.pageTitle}>📚 Enrolled Courses</h2>
            <p style={styles.pageSubtitle}>Courses you are registered in</p>
            <div style={styles.courseGrid}>
              {courses.map(course => (
                <div key={course.id} style={styles.courseCard}>
                  <div style={styles.courseCode}>{course.course_code}</div>
                  <div style={styles.courseName}>{course.course_name}</div>
                  <div style={styles.courseTeacher}>👨‍🏫 {course.teacher_name}</div>
                  <div style={styles.courseMeta}>{course.semester} · {course.academic_year}</div>
                </div>
              ))}
              {courses.length === 0 && <p style={{ color: '#6b7280' }}>You are not enrolled in any courses yet.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif", background: '#f8fafc' },
  sidebar: {
    width: '260px', background: 'linear-gradient(180deg, #0f3460 0%, #16213e 100%)',
    display: 'flex', flexDirection: 'column', padding: '0', position: 'fixed', height: '100vh', zIndex: 10,
  },
  sidebarHeader: { display: 'flex', alignItems: 'center', gap: '12px', padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  sidebarLogo: { fontSize: '2rem' },
  sidebarTitle: { color: '#fff', fontWeight: 700, fontSize: '1.1rem' },
  sidebarSub: { color: '#94a3b8', fontSize: '0.75rem' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  avatar: {
    width: '40px', height: '40px', borderRadius: '50%', background: '#0f3460',
    border: '2px solid #4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: '1.1rem',
  },
  userName: { color: '#fff', fontWeight: 600, fontSize: '0.9rem' },
  userRole: { color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' },
  nav: { flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' },
  navBtn: {
    width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none',
    borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#94a3b8',
    background: 'transparent', fontFamily: "'Segoe UI', sans-serif",
  },
  navBtnActive: { background: 'rgba(79,70,229,0.2)', color: '#a5b4fc' },
  logoutBtn: {
    margin: '16px', padding: '10px', border: 'none', borderRadius: '8px',
    background: 'rgba(239,68,68,0.15)', color: '#f87171', cursor: 'pointer', fontSize: '0.9rem',
  },
  main: { marginLeft: '260px', flex: 1, padding: '32px', position: 'relative' },
  toast: {
    position: 'fixed', top: '20px', right: '20px', padding: '14px 20px',
    borderRadius: '8px', color: '#fff', fontWeight: 600, zIndex: 100,
  },
  pageTitle: { margin: '0 0 6px', fontSize: '1.7rem', color: '#1a1a2e', fontWeight: 700 },
  pageSubtitle: { color: '#6b7280', margin: '0 0 28px', fontSize: '0.95rem' },
  scanCard: {
    background: '#fff', borderRadius: '16px', padding: '40px',
    maxWidth: '480px', border: '1px solid #e5e7eb', textAlign: 'center',
  },
  scanPrompt: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  scanIcon: { fontSize: '4rem' },
  scanText: { color: '#6b7280', fontSize: '1rem', margin: 0 },
  qrReader: { width: '100%', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' },
  resultBox: { padding: '16px' },
  loadingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  spinner: {
    width: '40px', height: '40px', border: '4px solid #e5e7eb',
    borderTop: '4px solid #4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite',
  },
  successBox: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  successIcon: { fontSize: '3rem', marginBottom: '12px' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', textAlign: 'left', marginTop: '12px' },
  detailLabel: { color: '#6b7280', fontSize: '0.85rem', fontWeight: 600 },
  detailValue: { color: '#1a1a2e', fontSize: '0.85rem' },
  errorBox: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  errorIcon: { fontSize: '3rem', marginBottom: '12px' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  summaryCard: {
    background: '#fff', borderRadius: '12px', padding: '24px',
    display: 'flex', alignItems: 'center', gap: '20px',
    border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  summaryInfo: { flex: 1 },
  summaryCode: { fontSize: '0.8rem', color: '#4f46e5', fontWeight: 700 },
  summaryName: { fontWeight: 700, color: '#1a1a2e', fontSize: '1rem', margin: '4px 0' },
  summaryMeta: { fontSize: '0.85rem', color: '#6b7280' },
  warningTag: {
    marginTop: '8px', fontSize: '0.75rem', color: '#d97706',
    background: '#fffbeb', border: '1px solid #fde68a',
    display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
  },
  historyList: { display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '680px' },
  historyRow: {
    display: 'flex', alignItems: 'center', gap: '16px', background: '#fff',
    borderRadius: '10px', padding: '16px 20px', border: '1px solid #e5e7eb',
  },
  historyDate: { textAlign: 'center', width: '40px' },
  historyDay: { fontSize: '1.3rem', fontWeight: 700, color: '#1a1a2e', lineHeight: 1 },
  historyMonth: { fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase' },
  historyInfo: { flex: 1 },
  historyCourseName: { fontWeight: 600, color: '#1a1a2e', fontSize: '0.95rem' },
  historyCourseCode: { fontSize: '0.8rem', color: '#4f46e5' },
  historyTime: { fontSize: '0.85rem', color: '#6b7280' },
  presentBadge: {
    background: '#dcfce7', color: '#16a34a', padding: '4px 12px',
    borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
  },
  courseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' },
  courseCard: { background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' },
  courseCode: { fontSize: '0.8rem', color: '#4f46e5', fontWeight: 700, marginBottom: '6px' },
  courseName: { fontSize: '1rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' },
  courseTeacher: { fontSize: '0.85rem', color: '#374151', marginBottom: '4px' },
  courseMeta: { fontSize: '0.8rem', color: '#6b7280' },
  btnPrimary: {
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff',
    padding: '12px 28px', border: 'none', borderRadius: '8px',
    fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
  },
  btnSecondary: {
    background: '#f3f4f6', color: '#374151', padding: '10px 24px',
    border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem',
    fontWeight: 600, cursor: 'pointer', marginTop: '12px',
  },
};
