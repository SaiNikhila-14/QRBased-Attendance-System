import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const [view, setView] = useState('dashboard');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [newCourse, setNewCourse] = useState({ course_code: '', course_name: '', department: '', semester: '', academic_year: '2025-2026' });
  const [duration, setDuration] = useState(10);
  const [countdown, setCountdown] = useState(0);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const pollRef = useRef(null);
  const countdownRef = useRef(null);

  useEffect(() => {
    loadCourses();
    return () => { clearInterval(pollRef.current); clearInterval(countdownRef.current); };
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadActiveSession();
      loadSessionHistory();
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (activeSession) {
      // Poll attendance every 5 seconds
      loadAttendance(activeSession.id);
      pollRef.current = setInterval(() => loadAttendance(activeSession.id), 5000);

      // Countdown timer
      const expiresAt = new Date(activeSession.expires_at).getTime();
      countdownRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        setCountdown(remaining);
        if (remaining === 0) {
          clearInterval(pollRef.current);
          clearInterval(countdownRef.current);
          setActiveSession(null);
        }
      }, 1000);
    }
    return () => { clearInterval(pollRef.current); clearInterval(countdownRef.current); };
  }, [activeSession]);

  const loadCourses = async () => {
    try {
      const res = await api.get('/courses/teacher');
      setCourses(res.data.courses);
    } catch {}
  };

  const loadActiveSession = async () => {
    try {
      const res = await api.get(`/sessions/active/${selectedCourse.id}`);
      setActiveSession(res.data.session);
    } catch {}
  };

  const loadAttendance = async (sessionId) => {
    try {
      const res = await api.get(`/attendance/session/${sessionId}`);
      setAttendance(res.data.students || []);
    } catch {}
  };

  const loadSessionHistory = async () => {
    try {
      const res = await api.get(`/sessions/history/${selectedCourse.id}`);
      setSessionHistory(res.data.sessions);
    } catch {}
  };

  const loadAllStudents = async () => {
    try {
      const res = await api.get('/courses/students/all');
      setAllStudents(res.data.students);
    } catch {}
  };

  const showMsg = (text, type = 'success') => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleCreateSession = async () => {
    try {
      const res = await api.post('/sessions/create', { course_id: selectedCourse.id, duration_minutes: duration });
      setActiveSession(res.data.session);
      setView('session');
      showMsg('Session started! QR code is live.');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to create session.', 'error');
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    try {
      await api.put(`/sessions/close/${activeSession.id}`);
      clearInterval(pollRef.current);
      clearInterval(countdownRef.current);
      setActiveSession(null);
      loadSessionHistory();
      showMsg('Session closed.');
    } catch {}
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      await api.post('/courses/create', newCourse);
      loadCourses();
      setNewCourse({ course_code: '', course_name: '', department: '', semester: '', academic_year: '2025-2026' });
      showMsg('Course created successfully!');
      setView('dashboard');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to create course.', 'error');
    }
  };

  const handleEnroll = async (studentId) => {
    try {
      await api.post('/courses/enroll', { student_id: studentId, course_id: selectedCourse.id });
      showMsg('Student enrolled.');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Enrollment failed.', 'error');
    }
  };

  const handleManualAttendance = async (studentId) => {
    try {
      await api.post('/attendance/manual', { session_id: activeSession.id, student_id: studentId });
      loadAttendance(activeSession.id);
      showMsg('Attendance added manually.');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed.', 'error');
    }
  };

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const present = attendance.filter(a => a.status === 'present').length;

  const navItems = [
    { id: 'dashboard', label: '🏠 Dashboard' },
    { id: 'session', label: '📡 Live Session', disabled: !selectedCourse },
    { id: 'history', label: '📅 History', disabled: !selectedCourse },
    { id: 'enroll', label: '👥 Students', disabled: !selectedCourse },
    { id: 'new-course', label: '➕ New Course' },
  ];

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.sidebarLogo}>📋</div>
          <div>
            <div style={styles.sidebarTitle}>Attendance</div>
            <div style={styles.sidebarSub}>Teacher Portal</div>
          </div>
        </div>

        <div style={styles.userInfo}>
          <div style={styles.avatar}>{user?.name?.[0]}</div>
          <div>
            <div style={styles.userName}>{user?.name}</div>
            <div style={styles.userRole}>Teacher</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => !item.disabled && setView(item.id)}
              style={{
                ...styles.navBtn,
                ...(view === item.id ? styles.navBtnActive : {}),
                ...(item.disabled ? styles.navBtnDisabled : {}),
              }}
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

        {/* Dashboard View */}
        {view === 'dashboard' && (
          <div>
            <h2 style={styles.pageTitle}>Dashboard</h2>
            <p style={styles.pageSubtitle}>Select a course to manage sessions and attendance</p>

            <div style={styles.courseGrid}>
              {courses.map(course => (
                <div
                  key={course.id}
                  onClick={() => { setSelectedCourse(course); setView('session'); }}
                  style={{
                    ...styles.courseCard,
                    ...(selectedCourse?.id === course.id ? styles.courseCardActive : {}),
                  }}
                >
                  <div style={styles.courseCode}>{course.course_code}</div>
                  <div style={styles.courseName}>{course.course_name}</div>
                  <div style={styles.courseMeta}>
                    <span>👨‍🎓 {course.enrolled_count} students</span>
                    <span>{course.semester}</span>
                  </div>
                </div>
              ))}
              {courses.length === 0 && (
                <div style={styles.emptyCard}>
                  <p>No courses yet.</p>
                  <button style={styles.btnPrimary} onClick={() => setView('new-course')}>Create Your First Course</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Session View */}
        {view === 'session' && selectedCourse && (
          <div>
            <h2 style={styles.pageTitle}>📡 {selectedCourse.course_name}</h2>
            <p style={styles.pageSubtitle}>{selectedCourse.course_code} · Live Session Management</p>

            {!activeSession ? (
              <div style={styles.sessionStart}>
                <h3 style={{ color: '#1a1a2e', marginBottom: '16px' }}>Start a New Session</h3>
                <div style={styles.durationRow}>
                  <label style={styles.label}>QR Valid For:</label>
                  <select value={duration} onChange={e => setDuration(Number(e.target.value))} style={styles.select}>
                    {[5, 10, 15, 20, 30].map(d => <option key={d} value={d}>{d} minutes</option>)}
                  </select>
                  <button onClick={handleCreateSession} style={styles.btnPrimary}>🚀 Generate QR Code</button>
                </div>
              </div>
            ) : (
              <div style={styles.sessionGrid}>
                {/* QR Panel */}
                <div style={styles.qrPanel}>
                  <div style={styles.qrHeader}>
                    <div style={styles.liveDot} />
                    <span style={{ fontWeight: 700, color: '#16a34a' }}>LIVE</span>
                  </div>
                  <img src={activeSession.qr_code} alt="QR Code" style={styles.qrImage} />
                  <div style={{ ...styles.countdown, color: countdown < 60 ? '#dc2626' : '#4f46e5' }}>
                    ⏱ {fmtTime(countdown)}
                  </div>
                  <p style={styles.qrHint}>Students scan this QR to mark attendance</p>
                  <button onClick={handleCloseSession} style={styles.btnDanger}>⏹ Close Session</button>
                </div>

                {/* Attendance Panel */}
                <div style={styles.attendancePanel}>
                  <div style={styles.statsRow}>
                    <div style={styles.statBox}>
                      <div style={{ ...styles.statNum, color: '#16a34a' }}>{present}</div>
                      <div style={styles.statLabel}>Present</div>
                    </div>
                    <div style={styles.statBox}>
                      <div style={{ ...styles.statNum, color: '#dc2626' }}>{attendance.length - present}</div>
                      <div style={styles.statLabel}>Absent</div>
                    </div>
                    <div style={styles.statBox}>
                      <div style={{ ...styles.statNum, color: '#4f46e5' }}>{attendance.length}</div>
                      <div style={styles.statLabel}>Total</div>
                    </div>
                  </div>

                  <div style={styles.attendanceList}>
                    {attendance.map(student => (
                      <div key={student.id} style={styles.studentRow}>
                        <div style={styles.studentInfo}>
                          <div style={styles.rollNum}>{student.roll_number}</div>
                          <div style={styles.studentName}>{student.name}</div>
                        </div>
                        {student.status === 'present' ? (
                          <span style={styles.badgePresent}>✓ Present</span>
                        ) : (
                          <button
                            onClick={() => handleManualAttendance(student.id)}
                            style={styles.manualBtn}
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* History View */}
        {view === 'history' && selectedCourse && (
          <div>
            <h2 style={styles.pageTitle}>📅 Session History</h2>
            <p style={styles.pageSubtitle}>{selectedCourse.course_name}</p>

            {sessionHistory.length > 0 && (
              <div style={styles.chartBox}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={sessionHistory.slice(0, 10).reverse()}>
                    <XAxis dataKey="session_date" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="attendance_count" name="Present" radius={[4, 4, 0, 0]}>
                      {sessionHistory.slice(0, 10).reverse().map((_, i) => (
                        <Cell key={i} fill="#4f46e5" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div style={styles.historyList}>
              {sessionHistory.map(session => (
                <div key={session.id} style={styles.historyRow}>
                  <div>
                    <div style={styles.sessionDate}>{session.session_date}</div>
                    <div style={styles.sessionTime}>{new Date(session.start_time).toLocaleTimeString()}</div>
                  </div>
                  <div style={styles.attendanceBadge}>
                    {session.attendance_count} / {session.total_enrolled} attended
                  </div>
                  <span style={{ ...styles.statusBadge, background: session.status === 'active' ? '#dcfce7' : '#f3f4f6', color: session.status === 'active' ? '#16a34a' : '#6b7280' }}>
                    {session.status}
                  </span>
                  <a
                    href={`/api/attendance/export/${session.id}`}
                    style={styles.exportBtn}
                    onClick={e => { e.preventDefault(); window.open(`/api/attendance/export/${session.id}`, '_blank'); }}
                  >
                    ⬇ CSV
                  </a>
                </div>
              ))}
              {sessionHistory.length === 0 && <p style={{ color: '#6b7280' }}>No sessions yet.</p>}
            </div>
          </div>
        )}

        {/* Enroll Students View */}
        {view === 'enroll' && selectedCourse && (
          <div>
            <h2 style={styles.pageTitle}>👥 Manage Students</h2>
            <p style={styles.pageSubtitle}>{selectedCourse.course_name}</p>
            <button onClick={loadAllStudents} style={styles.btnSecondary}>Load All Students</button>
            <div style={styles.studentGrid}>
              {allStudents.map(student => (
                <div key={student.id} style={styles.studentCard}>
                  <div style={styles.studentCardName}>{student.name}</div>
                  <div style={styles.studentCardRoll}>{student.roll_number}</div>
                  <div style={styles.studentCardEmail}>{student.email}</div>
                  <button onClick={() => handleEnroll(student.id)} style={styles.enrollBtn}>Enroll</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Course View */}
        {view === 'new-course' && (
          <div style={styles.formCard}>
            <h2 style={styles.pageTitle}>➕ Create New Course</h2>
            <form onSubmit={handleCreateCourse} style={styles.form}>
              <div style={styles.formRow}>
                <div style={styles.field}>
                  <label style={styles.label}>Course Code *</label>
                  <input value={newCourse.course_code} onChange={e => setNewCourse({ ...newCourse, course_code: e.target.value })} style={styles.input} placeholder="e.g. 22IT102003" required />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Semester</label>
                  <input value={newCourse.semester} onChange={e => setNewCourse({ ...newCourse, semester: e.target.value })} style={styles.input} placeholder="e.g. Semester 5" />
                </div>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Course Name *</label>
                <input value={newCourse.course_name} onChange={e => setNewCourse({ ...newCourse, course_name: e.target.value })} style={styles.input} placeholder="e.g. Cloud Computing" required />
              </div>
              <div style={styles.formRow}>
                <div style={styles.field}>
                  <label style={styles.label}>Department</label>
                  <input value={newCourse.department} onChange={e => setNewCourse({ ...newCourse, department: e.target.value })} style={styles.input} placeholder="e.g. Computer Science" />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Academic Year</label>
                  <input value={newCourse.academic_year} onChange={e => setNewCourse({ ...newCourse, academic_year: e.target.value })} style={styles.input} />
                </div>
              </div>
              <button type="submit" style={styles.btnPrimary}>Create Course</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif", background: '#f8fafc' },
  sidebar: {
    width: '260px', background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
    display: 'flex', flexDirection: 'column', padding: '0', position: 'fixed', height: '100vh', zIndex: 10,
  },
  sidebarHeader: { display: 'flex', alignItems: 'center', gap: '12px', padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  sidebarLogo: { fontSize: '2rem' },
  sidebarTitle: { color: '#fff', fontWeight: 700, fontSize: '1.1rem' },
  sidebarSub: { color: '#94a3b8', fontSize: '0.75rem' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  avatar: {
    width: '40px', height: '40px', borderRadius: '50%', background: '#4f46e5',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.1rem',
  },
  userName: { color: '#fff', fontWeight: 600, fontSize: '0.9rem' },
  userRole: { color: '#94a3b8', fontSize: '0.75rem' },
  nav: { flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' },
  navBtn: {
    width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none',
    borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#94a3b8',
    background: 'transparent', fontFamily: "'Segoe UI', sans-serif",
  },
  navBtnActive: { background: 'rgba(79,70,229,0.2)', color: '#a5b4fc' },
  navBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  logoutBtn: {
    margin: '16px', padding: '10px', border: 'none', borderRadius: '8px',
    background: 'rgba(239,68,68,0.15)', color: '#f87171', cursor: 'pointer', fontSize: '0.9rem',
  },
  main: { marginLeft: '260px', flex: 1, padding: '32px', position: 'relative' },
  toast: {
    position: 'fixed', top: '20px', right: '20px', padding: '14px 20px',
    borderRadius: '8px', color: '#fff', fontWeight: 600, zIndex: 100,
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  },
  pageTitle: { margin: '0 0 6px', fontSize: '1.7rem', color: '#1a1a2e', fontWeight: 700 },
  pageSubtitle: { color: '#6b7280', margin: '0 0 28px', fontSize: '0.95rem' },
  courseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' },
  courseCard: {
    background: '#fff', borderRadius: '12px', padding: '24px',
    border: '2px solid #e5e7eb', cursor: 'pointer', transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  courseCardActive: { borderColor: '#4f46e5', boxShadow: '0 0 0 3px rgba(79,70,229,0.1)' },
  courseCode: { fontSize: '0.8rem', color: '#4f46e5', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' },
  courseName: { fontSize: '1.1rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '12px' },
  courseMeta: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6b7280' },
  emptyCard: {
    gridColumn: '1/-1', background: '#fff', borderRadius: '12px', padding: '40px',
    textAlign: 'center', border: '2px dashed #d1d5db',
  },
  sessionStart: { background: '#fff', borderRadius: '12px', padding: '32px', maxWidth: '500px' },
  durationRow: { display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' },
  sessionGrid: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' },
  qrPanel: {
    background: '#fff', borderRadius: '12px', padding: '24px', textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb',
  },
  qrHeader: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' },
  liveDot: {
    width: '10px', height: '10px', borderRadius: '50%', background: '#16a34a',
    boxShadow: '0 0 0 3px rgba(22,163,74,0.2)', animation: 'pulse 2s infinite',
  },
  qrImage: { width: '260px', height: '260px', borderRadius: '8px' },
  countdown: { fontSize: '2rem', fontWeight: 700, margin: '12px 0 4px' },
  qrHint: { color: '#6b7280', fontSize: '0.85rem', margin: '0 0 16px' },
  attendancePanel: { background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' },
  statBox: { textAlign: 'center', padding: '16px', borderRadius: '8px', background: '#f8fafc' },
  statNum: { fontSize: '2rem', fontWeight: 700 },
  statLabel: { fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' },
  attendanceList: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' },
  studentRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e5e7eb',
  },
  studentInfo: { display: 'flex', gap: '12px', alignItems: 'center' },
  rollNum: { fontSize: '0.8rem', color: '#6b7280', fontFamily: 'monospace' },
  studentName: { fontWeight: 600, color: '#1a1a2e', fontSize: '0.95rem' },
  badgePresent: {
    background: '#dcfce7', color: '#16a34a', padding: '4px 12px',
    borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
  },
  manualBtn: {
    background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
    padding: '4px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
  },
  chartBox: { background: '#fff', borderRadius: '12px', padding: '24px', marginBottom: '24px', border: '1px solid #e5e7eb' },
  historyList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  historyRow: {
    display: 'flex', alignItems: 'center', gap: '20px', background: '#fff',
    borderRadius: '10px', padding: '16px 20px', border: '1px solid #e5e7eb',
  },
  sessionDate: { fontWeight: 700, color: '#1a1a2e' },
  sessionTime: { fontSize: '0.8rem', color: '#6b7280' },
  attendanceBadge: { flex: 1, color: '#4f46e5', fontWeight: 600 },
  statusBadge: { padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 },
  exportBtn: {
    background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
    padding: '6px 14px', borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600,
  },
  studentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px', marginTop: '20px' },
  studentCard: { background: '#fff', borderRadius: '10px', padding: '18px', border: '1px solid #e5e7eb' },
  studentCardName: { fontWeight: 700, color: '#1a1a2e', marginBottom: '4px' },
  studentCardRoll: { fontSize: '0.8rem', color: '#4f46e5', marginBottom: '2px' },
  studentCardEmail: { fontSize: '0.75rem', color: '#6b7280', marginBottom: '12px' },
  enrollBtn: {
    width: '100%', padding: '8px', background: '#4f46e5', color: '#fff',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
  },
  formCard: { background: '#fff', borderRadius: '12px', padding: '32px', maxWidth: '600px', border: '1px solid #e5e7eb' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '0.9rem', fontWeight: 600, color: '#374151' },
  input: { padding: '11px 14px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '0.95rem', outline: 'none' },
  select: { padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '0.95rem' },
  btnPrimary: {
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff',
    padding: '12px 24px', border: 'none', borderRadius: '8px', fontSize: '0.95rem',
    fontWeight: 600, cursor: 'pointer',
  },
  btnSecondary: {
    background: '#eff6ff', color: '#2563eb', padding: '10px 20px',
    border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
  },
  btnDanger: {
    background: '#fef2f2', color: '#dc2626', padding: '10px 24px',
    border: '1px solid #fecaca', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', width: '100%',
  },
};
