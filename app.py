import os
import secrets
import string
import logging
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import qrcode
from io import BytesIO
import base64
import pandas as pd
from flask import Flask, request, jsonify, send_file, send_from_directory, render_template_string
from flask_cors import CORS
from flask_mail import Mail, Message
import sqlite3
import json

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")

# Configure CORS
CORS(app)

# Configure Flask-Mail
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME', 'test@example.com')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD', 'password')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER', 'test@example.com')

mail = Mail(app)

# Create directories if they don't exist
os.makedirs('student_sheets', exist_ok=True)
os.makedirs('qr_codes', exist_ok=True)

def init_db():
    """Initialize the database with required tables"""
    conn = sqlite3.connect('school.db')
    cursor = conn.cursor()
    
    # Teachers table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS teachers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Students table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            class TEXT NOT NULL,
            section TEXT NOT NULL,
            roll_no TEXT NOT NULL,
            teacher_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (teacher_id) REFERENCES teachers (id)
        )
    ''')
    
    # Attendance table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            date DATE NOT NULL,
            status TEXT DEFAULT 'present',
            marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students (student_id)
        )
    ''')
    
    conn.commit()
    conn.close()

def generate_student_id():
    """Generate a unique student ID"""
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))

def generate_password():
    """Generate a random password for students"""
    return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))

def send_email(to_email, subject, body):
    """Send email to student"""
    try:
        msg = Message(subject=subject, recipients=[to_email], body=body)
        mail.send(msg)
        return True
    except Exception as e:
        logging.error(f"Failed to send email: {e}")
        return False

@app.route('/')
def index():
    """Serve the main page"""
    try:
        with open('index.html', 'r') as f:
            return f.read()
    except FileNotFoundError:
        return jsonify({'error': 'Frontend files not found'}), 404

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    try:
        # Handle HTML files
        if filename.endswith('.html'):
            with open(filename, 'r') as f:
                return f.read()
        # Handle CSS files
        elif filename.endswith('.css'):
            with open(filename, 'r') as f:
                content = f.read()
                return app.response_class(content, mimetype='text/css')
        # Handle JS files
        elif filename.endswith('.js'):
            with open(filename, 'r') as f:
                content = f.read()
                return app.response_class(content, mimetype='application/javascript')
        else:
            return send_file(filename)
    except FileNotFoundError:
        return jsonify({'error': 'File not found'}), 404

@app.route('/register_teacher', methods=['POST'])
def register_teacher():
    """Register a new teacher"""
    try:
        data = request.get_json() or {}
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        
        if not all([name, email, password]):
            return jsonify({'error': 'All fields are required'}), 400
        
        # Check if teacher already exists
        conn = sqlite3.connect('school.db')
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM teachers WHERE email = ?', (email,))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Teacher with this email already exists'}), 400
        
        # Hash password and insert teacher
        password_hash = generate_password_hash(password or '')
        cursor.execute('INSERT INTO teachers (name, email, password_hash) VALUES (?, ?, ?)',
                      (name, email, password_hash))
        teacher_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Teacher registered successfully', 'teacher_id': teacher_id}), 201
    
    except Exception as e:
        logging.error(f"Error registering teacher: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/login', methods=['POST'])
def login():
    """Login for both teachers and students"""
    try:
        data = request.get_json() or {}
        email = data.get('email')
        password = data.get('password')
        
        if not all([email, password]):
            return jsonify({'error': 'Email and password are required'}), 400
        
        conn = sqlite3.connect('school.db')
        cursor = conn.cursor()
        
        # Check teachers first
        cursor.execute('SELECT id, name, email, password_hash FROM teachers WHERE email = ?', (email,))
        teacher = cursor.fetchone()
        
        if teacher and check_password_hash(teacher[3], password or ''):
            conn.close()
            return jsonify({
                'message': 'Login successful',
                'role': 'teacher',
                'user_id': teacher[0],
                'name': teacher[1],
                'email': teacher[2]
            }), 200
        
        # Check students
        cursor.execute('SELECT student_id, name, email, password_hash, class, section, roll_no FROM students WHERE email = ?', (email,))
        student = cursor.fetchone()
        
        if student and check_password_hash(student[3], password or ''):
            conn.close()
            return jsonify({
                'message': 'Login successful',
                'role': 'student',
                'student_id': student[0],
                'name': student[1],
                'email': student[2],
                'class': student[4],
                'section': student[5],
                'roll_no': student[6]
            }), 200
        
        conn.close()
        return jsonify({'error': 'Invalid email or password'}), 401
    
    except Exception as e:
        logging.error(f"Error during login: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/add_student', methods=['POST'])
def add_student():
    """Add a single student"""
    try:
        data = request.get_json() or {}
        name = data.get('name')
        email = data.get('email')
        class_name = data.get('class')
        section = data.get('section')
        roll_no = data.get('roll_no')
        teacher_id = data.get('teacher_id')
        
        if not all([name, email, class_name, section, roll_no, teacher_id]):
            return jsonify({'error': 'All fields are required'}), 400
        
        conn = sqlite3.connect('school.db')
        cursor = conn.cursor()
        
        # Check if student already exists
        cursor.execute('SELECT student_id FROM students WHERE email = ?', (email,))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Student with this email already exists'}), 400
        
        # Generate student ID and password
        student_id = generate_student_id()
        password = generate_password()
        password_hash = generate_password_hash(password)
        
        # Insert student
        cursor.execute('''
            INSERT INTO students (student_id, name, email, password_hash, class, section, roll_no, teacher_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (student_id, name, email, password_hash, class_name, section, roll_no, teacher_id))
        
        conn.commit()
        conn.close()
        
        # Send email to student
        email_body = f"""
        Dear {name},
        
        Your student account has been created successfully.
        
        Student ID: {student_id}
        Password: {password}
        Class: {class_name}
        Section: {section}
        Roll No: {roll_no}
        
        Please login to access your dashboard.
        
        Best regards,
        School Management System
        """
        
        send_email(email, "Your Student Account Details", email_body)
        
        return jsonify({
            'message': 'Student added successfully',
            'student_id': student_id,
            'password': password
        }), 201
    
    except Exception as e:
        logging.error(f"Error adding student: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/add_students_excel', methods=['POST'])
def add_students_excel():
    """Add multiple students from Excel file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        teacher_id = request.form.get('teacher_id')
        
        if not teacher_id:
            return jsonify({'error': 'Teacher ID is required'}), 400
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save uploaded file
        filename = secure_filename(file.filename or 'upload.xlsx')
        filepath = os.path.join('student_sheets', filename)
        file.save(filepath)
        
        # Read Excel file
        df = pd.read_excel(filepath)
        
        # Expected columns: name, email, class, section, roll_no
        required_columns = ['name', 'email', 'class', 'section', 'roll_no']
        if not all(col in df.columns for col in required_columns):
            return jsonify({'error': f'Excel file must contain columns: {required_columns}'}), 400
        
        conn = sqlite3.connect('school.db')
        cursor = conn.cursor()
        
        added_students = []
        errors = []
        
        for index, row in df.iterrows():
            try:
                name = row['name']
                email = row['email']
                class_name = row['class']
                section = row['section']
                roll_no = str(row['roll_no'])
                
                # Check if student already exists
                cursor.execute('SELECT student_id FROM students WHERE email = ?', (email,))
                if cursor.fetchone():
                    errors.append(f"Row {int(index) + 1}: Student with email {email} already exists")
                    continue
                
                # Generate student ID and password
                student_id = generate_student_id()
                password = generate_password()
                password_hash = generate_password_hash(password)
                
                # Insert student
                cursor.execute('''
                    INSERT INTO students (student_id, name, email, password_hash, class, section, roll_no, teacher_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (student_id, name, email, password_hash, class_name, section, roll_no, teacher_id))
                
                added_students.append({
                    'student_id': student_id,
                    'name': name,
                    'email': email,
                    'password': password
                })
                
                # Send email to student
                email_body = f"""
                Dear {name},
                
                Your student account has been created successfully.
                
                Student ID: {student_id}
                Password: {password}
                Class: {class_name}
                Section: {section}
                Roll No: {roll_no}
                
                Please login to access your dashboard.
                
                Best regards,
                School Management System
                """
                
                send_email(email, "Your Student Account Details", email_body)
                
            except Exception as e:
                errors.append(f"Row {int(index) + 1}: {str(e)}")
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': f'Added {len(added_students)} students successfully',
            'added_students': added_students,
            'errors': errors
        }), 201
    
    except Exception as e:
        logging.error(f"Error adding students from Excel: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/mark_attendance', methods=['POST'])
def mark_attendance():
    """Mark attendance for a student"""
    try:
        data = request.get_json() or {}
        student_id = data.get('student_id')
        
        if not student_id:
            return jsonify({'error': 'Student ID is required'}), 400
        
        conn = sqlite3.connect('school.db')
        cursor = conn.cursor()
        
        # Check if student exists
        cursor.execute('SELECT name FROM students WHERE student_id = ?', (student_id,))
        student = cursor.fetchone()
        
        if not student:
            conn.close()
            return jsonify({'error': 'Student not found'}), 404
        
        # Check if attendance already marked for today
        today = datetime.now().strftime('%Y-%m-%d')
        cursor.execute('SELECT id FROM attendance WHERE student_id = ? AND date = ?', (student_id, today))
        
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Attendance already marked for today'}), 400
        
        # Mark attendance
        cursor.execute('INSERT INTO attendance (student_id, date) VALUES (?, ?)', (student_id, today))
        conn.commit()
        conn.close()
        
        return jsonify({'message': f'Attendance marked successfully for {student[0]}'}), 200
    
    except Exception as e:
        logging.error(f"Error marking attendance: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/weekly_report/<student_id>', methods=['GET'])
def weekly_report(student_id):
    """Get weekly attendance report for a student"""
    try:
        conn = sqlite3.connect('school.db')
        cursor = conn.cursor()
        
        # Get student details
        cursor.execute('SELECT name, class, section, roll_no FROM students WHERE student_id = ?', (student_id,))
        student = cursor.fetchone()
        
        if not student:
            conn.close()
            return jsonify({'error': 'Student not found'}), 404
        
        # Get attendance for the last 7 days
        end_date = datetime.now()
        start_date = end_date - timedelta(days=6)
        
        cursor.execute('''
            SELECT date, status FROM attendance 
            WHERE student_id = ? AND date BETWEEN ? AND ?
            ORDER BY date DESC
        ''', (student_id, start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')))
        
        attendance_records = cursor.fetchall()
        conn.close()
        
        # Create weekly report
        weekly_data = []
        for i in range(7):
            date = (end_date - timedelta(days=i)).strftime('%Y-%m-%d')
            status = 'absent'  # Default to absent
            
            for record in attendance_records:
                if record[0] == date:
                    status = record[1]
                    break
            
            weekly_data.append({
                'date': date,
                'status': status
            })
        
        return jsonify({
            'student_id': student_id,
            'name': student[0],
            'class': student[1],
            'section': student[2],
            'roll_no': student[3],
            'weekly_attendance': weekly_data
        }), 200
    
    except Exception as e:
        logging.error(f"Error generating weekly report: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/generate_qr/<student_id>', methods=['GET'])
def generate_qr(student_id):
    """Generate QR code for a student"""
    try:
        conn = sqlite3.connect('school.db')
        cursor = conn.cursor()
        
        # Get student details
        cursor.execute('SELECT name, class, section, roll_no FROM students WHERE student_id = ?', (student_id,))
        student = cursor.fetchone()
        
        if not student:
            conn.close()
            return jsonify({'error': 'Student not found'}), 404
        
        conn.close()
        
        # Create QR data
        qr_data = {
            'student_id': student_id,
            'name': student[0],
            'class': student[1],
            'section': student[2],
            'roll_no': student[3]
        }
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(json.dumps(qr_data))
        qr.make(fit=True)
        
        # Create QR code image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Save QR code image
        qr_filename = f"{student_id}_qr.png"
        qr_path = os.path.join('qr_codes', qr_filename)
        img.save(qr_path)
        
        # Convert to base64 for frontend display
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        return jsonify({
            'student_id': student_id,
            'name': student[0],
            'qr_image': f"data:image/png;base64,{qr_base64}",
            'qr_data': qr_data
        }), 200
    
    except Exception as e:
        logging.error(f"Error generating QR code: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/get_students/<int:teacher_id>', methods=['GET'])
def get_students(teacher_id):
    """Get all students for a teacher"""
    try:
        conn = sqlite3.connect('school.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT student_id, name, email, class, section, roll_no, created_at
            FROM students WHERE teacher_id = ?
            ORDER BY name
        ''', (teacher_id,))
        
        students = cursor.fetchall()
        conn.close()
        
        student_list = []
        for student in students:
            student_list.append({
                'student_id': student[0],
                'name': student[1],
                'email': student[2],
                'class': student[3],
                'section': student[4],
                'roll_no': student[5],
                'created_at': student[6]
            })
        
        return jsonify({'students': student_list}), 200
    
    except Exception as e:
        logging.error(f"Error getting students: {e}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
