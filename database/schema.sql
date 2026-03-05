-- ============================================
-- SERVERLESS ATTENDANCE SYSTEM - MySQL Schema
-- ============================================
CREATE DATABASE IF NOT EXISTS attendance_db;
USE attendance_db;


CREATE DATABASE IF NOT EXISTS attendance_db;
USE attendance_db;

-- Users table (teachers and students)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('teacher', 'student') NOT NULL,
    roll_number VARCHAR(50) NULL,          -- Only for students
    department VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(50) UNIQUE NOT NULL,
    course_name VARCHAR(150) NOT NULL,
    teacher_id INT NOT NULL,
    department VARCHAR(100),
    semester VARCHAR(20),
    academic_year VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Course enrollments (students enrolled in courses)
CREATE TABLE IF NOT EXISTS enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_enrollment (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Sessions table (each class session)
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    course_id INT NOT NULL,
    teacher_id INT NOT NULL,
    session_date DATE NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    status ENUM('active', 'closed') DEFAULT 'active',
    duration_minutes INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Attendance records
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('present', 'absent') DEFAULT 'present',
    UNIQUE KEY unique_attendance (session_id, student_id),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_course ON sessions(course_id);
CREATE INDEX idx_attendance_session ON attendance(session_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- Sample Data
-- ============================================

-- Sample teacher (password: teacher123)
INSERT INTO users (name, email, password, role, department) VALUES
('Dr. Cuddapah Anitha', 'anitha@mbu.edu', '$2b$10$examplehashedpassword1', 'teacher', 'Computer Science');

-- Sample students (password: student123)
INSERT INTO users (name, email, password, role, roll_number, department) VALUES
('A. Govardana Reddy', 'govardana@student.mbu.edu', '$2b$10$examplehashedpassword2', 'student', '22102A040657', 'Computer Science'),
('A. Giri Vamsi', 'girivamsi@student.mbu.edu', '$2b$10$examplehashedpassword3', 'student', '22102A040659', 'Computer Science'),
('A. Vamsi', 'vamsi@student.mbu.edu', '$2b$10$examplehashedpassword4', 'student', '22102A040662', 'Computer Science'),
('A. Abhinay', 'abhinay@student.mbu.edu', '$2b$10$examplehashedpassword5', 'student', '22102A040663', 'Computer Science');

-- Sample course
INSERT INTO courses (course_code, course_name, teacher_id, department, semester, academic_year) VALUES
('22IT102003', 'Cloud Computing', 1, 'Computer Science', 'Semester 5', '2025-2026');

-- Enroll students in the course
INSERT INTO enrollments (student_id, course_id) VALUES (2, 1), (3, 1), (4, 1), (5, 1);
