# 📋 Serverless Attendance System

A QR code-based attendance management system with separate **Teacher** and **Student** portals, built with React.js, Node.js/Express, and MySQL.

---

## 🗂 Project Structure

```
attendance-system/
├── database/
│   └── schema.sql          ← Run this first in MySQL
├── backend/
│   ├── server.js           ← Express server entry point
│   ├── .env                ← Configure your DB + JWT secret
│   ├── config/db.js        ← MySQL connection pool
│   ├── middleware/auth.js  ← JWT middleware + role guards
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── sessionController.js
│   │   ├── attendanceController.js
│   │   └── courseController.js
│   └── routes/
│       ├── auth.js
│       ├── sessions.js
│       ├── attendance.js
│       └── courses.js
└── frontend/
    └── src/
        ├── App.js
        ├── context/AuthContext.js
        ├── utils/api.js
        └── pages/
            ├── LoginPage.js
            ├── RegisterPage.js
            ├── TeacherDashboard.js
            └── StudentDashboard.js
```

---

## ⚙️ Setup Instructions

### Step 1 — Database Setup

1. Open MySQL Workbench or terminal
2. Run the schema file:

```sql
source /path/to/attendance-system/database/schema.sql
```

Or copy-paste the contents of `database/schema.sql` into MySQL Workbench and execute.

---

### Step 2 — Backend Setup

```bash
cd attendance-system/backend
npm install
```

Edit the `.env` file with your MySQL credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
DB_NAME=attendance_db
JWT_SECRET=some_random_secret_string_change_this
PORT=5000
CLIENT_URL=http://localhost:3000
```

Start the backend:

```bash
npm run dev     # development (with auto-restart)
# or
npm start       # production
```

You should see:
```
✅ MySQL connected successfully
🚀 Server running on http://localhost:5000
```

---

### Step 3 — Frontend Setup

```bash
cd attendance-system/frontend
npm install
npm start
```

The app opens at **http://localhost:3000**

---

## 👤 First Time Use

### Register Accounts

1. Go to http://localhost:3000/register
2. Register a **Teacher** account
3. Register one or more **Student** accounts (with roll numbers)

### Teacher Workflow

1. Login → redirected to **Teacher Dashboard**
2. Click **➕ New Course** → create a course
3. Click **👥 Students** → load all students → click **Enroll** to add them
4. Click the course card → go to **📡 Live Session**
5. Click **🚀 Generate QR Code** → QR appears with countdown timer
6. Students scan the QR → attendance updates live every 5 seconds
7. Click **⏹ Close Session** when done
8. Go to **📅 History** → view records → click **⬇ CSV** to download

### Student Workflow

1. Login → redirected to **Student Dashboard**
2. Click **📷 Scan QR** → click **Start Camera Scanner**
3. Point camera at teacher's QR code
4. On success → attendance marked ✅
5. Go to **📊 My Attendance** → see % per course
6. Go to **📅 History** → see all sessions attended

---

## 🔑 API Endpoints

### Auth
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| GET | /api/auth/profile | Any logged-in user |

### Sessions (Teacher Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/sessions/create | Create session + generate QR |
| PUT | /api/sessions/close/:id | Close a session |
| GET | /api/sessions/active/:course_id | Get active session for course |
| GET | /api/sessions/history/:course_id | Session history |

### Attendance
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | /api/attendance/mark | Student — scan QR |
| GET | /api/attendance/my-attendance | Student — own summary |
| GET | /api/attendance/session/:id | Teacher — live attendance |
| GET | /api/attendance/export/:id | Teacher — CSV download |
| POST | /api/attendance/manual | Teacher — manual override |

### Courses
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | /api/courses/create | Teacher |
| GET | /api/courses/teacher | Teacher — their courses |
| GET | /api/courses/student | Student — enrolled courses |
| POST | /api/courses/enroll | Teacher — enroll student |
| GET | /api/courses/students/all | Teacher — list all students |
| GET | /api/courses/:id/students | Teacher — course students |

---

## 🛡️ Security Features

- **JWT Authentication** — tokens expire in 8 hours
- **Role-based access** — teachers cannot access student routes and vice versa
- **Time-bound QR codes** — configurable expiry (5–30 min)
- **Duplicate scan prevention** — same student cannot scan twice per session
- **Enrollment check** — only enrolled students can mark attendance
- **bcrypt password hashing** — passwords never stored in plain text

---

## 🚀 Production Deployment

For production, set in `.env`:
```env
NODE_ENV=production
JWT_SECRET=very_long_random_secret_at_least_32_chars
CLIENT_URL=https://yourdomain.com
```

Build the frontend:
```bash
cd frontend && npm run build
```

Serve the build folder from your backend or a web server like Nginx.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, React Router, Recharts, html5-qrcode |
| Backend | Node.js, Express.js |
| Database | MySQL (mysql2 driver) |
| Auth | JWT + bcryptjs |
| QR Code | qrcode (generation), html5-qrcode (scanning) |
| API | RESTful, Axios |
