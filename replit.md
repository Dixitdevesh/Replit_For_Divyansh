# School Attendance Management System

## Overview

This is a modern school attendance management system that provides separate portals for teachers and students. The system enables teachers to register students, track attendance using QR codes, and generate reports, while students can view their attendance records and access their personal QR codes. The application features email notifications, Excel file management for bulk student uploads, and comprehensive attendance tracking capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology**: Vanilla HTML, CSS, and JavaScript with Bootstrap 5 for responsive design
- **Design Pattern**: Single Page Application (SPA) with dynamic content switching
- **Styling**: Modern card-based design with CSS custom properties, animations, and responsive layouts
- **Navigation**: Role-based dashboard systems with sidebar navigation for teachers and students

### Backend Architecture
- **Framework**: Flask (Python) with RESTful API design
- **Database**: SQLite3 with direct connection handling (no ORM)
- **Authentication**: Password hashing using Werkzeug's security utilities
- **File Handling**: Secure file uploads and storage in organized directory structure
- **Session Management**: Flask's built-in session handling with configurable secret keys

### Data Storage Solutions
- **Primary Database**: SQLite3 with tables for teachers, students, and attendance records
- **File Storage**: 
  - Excel files stored in `student_sheets/` directory for bulk uploads
  - QR code images stored in `qr_codes/` directory
- **Data Export**: Pandas integration for Excel file processing and report generation

### Authentication and Authorization
- **Password Security**: Werkzeug password hashing and verification
- **Role-based Access**: Separate authentication flows for teachers and students
- **Session Storage**: Client-side localStorage for user session persistence
- **Access Control**: Route protection based on user roles

## External Dependencies

### Backend Services
- **Flask-Mail**: Email service integration for sending student credentials and notifications
- **SMTP Configuration**: Gmail SMTP server with TLS encryption
- **QR Code Generation**: Python qrcode library for generating student QR codes

### Frontend Libraries
- **Bootstrap 5**: UI framework for responsive design and components
- **Font Awesome**: Icon library for enhanced visual interface
- **HTML5-QRCode**: Client-side QR code scanning functionality

### Email Integration
- **SMTP Server**: Configurable mail server (default: Gmail SMTP)
- **Email Templates**: Automated email sending for student registration
- **Environment Variables**: Secure configuration for email credentials

### File Processing
- **Pandas**: Excel file reading and data manipulation
- **Werkzeug**: Secure filename handling for file uploads
- **Base64 Encoding**: QR code image encoding for web display

### Development Tools
- **CORS**: Flask-CORS for cross-origin resource sharing
- **Logging**: Python logging module for debugging and monitoring
- **Environment Configuration**: OS environment variables for secure configuration management