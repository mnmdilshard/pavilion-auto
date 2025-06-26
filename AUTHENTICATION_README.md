# Authentication System Documentation

## Overview
The Pavilion Auto application now includes a comprehensive authentication system that requires users to login before accessing the application.

## Login Credentials

### Default Admin Account
- **Username:** `admin`
- **Password:** `admin123`

## Features

### 🔐 **Login System**
- **Secure Authentication**: JWT-based token authentication
- **Password Hashing**: Bcrypt encryption for secure password storage
- **Session Management**: 24-hour token expiration
- **Auto-login**: Remember login state using localStorage

### 🎨 **User Interface**
- **Beautiful Login Page**: Modern, responsive design with gradient background
- **Error Handling**: Clear error messages for invalid credentials
- **Loading States**: Visual feedback during authentication
- **Demo Credentials**: Displayed on login page for easy access

### 👤 **User Management**
- **User Dropdown Menu**: Access user functions from the navigation
- **Change Password**: Secure password update functionality
- **Logout**: Safe session termination with confirmation
- **Welcome Message**: Display current user in navigation

### 🔒 **Security Features**
- **Protected Routes**: All application pages require authentication
- **Token Verification**: Server-side JWT token validation
- **Password Requirements**: Minimum 6 characters for new passwords
- **Secure Headers**: Proper CORS and authorization headers

## How to Use

### 1. **First Time Login**
1. Open the application in your browser
2. You'll be redirected to the login page
3. Enter the default credentials:
   - Username: `admin`
   - Password: `admin123`
4. Click "Sign in"

### 2. **Changing Password**
1. Click on your username in the top-right corner
2. Select "Change Password" from the dropdown
3. Enter your current password
4. Enter and confirm your new password (minimum 6 characters)
5. Click "Change Password"

### 3. **Logging Out**
1. Click on your username in the top-right corner
2. Select "Logout" from the dropdown
3. Confirm the logout action

## Technical Implementation

### Frontend Components
- **Login.js**: Main login form component
- **AuthContext.js**: React context for authentication state management
- **ProtectedRoute.js**: Higher-order component for route protection
- **ChangePassword.js**: Password change modal component

### Backend API Endpoints
- `POST /api/auth/login` - User authentication
- `GET /api/auth/verify` - Token verification
- `POST /api/auth/change-password` - Password update

### Database
- **users table**: Stores user credentials with hashed passwords
- **Auto-initialization**: Creates default admin user on first run

## Security Considerations

### ✅ **Implemented Security Measures**
- Password hashing using bcrypt (10 salt rounds)
- JWT tokens with expiration (24 hours)
- SQL injection prevention with parameterized queries
- Client-side route protection
- Server-side endpoint authentication

### 🔧 **Production Recommendations**
- Use environment variables for JWT secret
- Implement rate limiting for login attempts
- Add password complexity requirements
- Enable HTTPS in production
- Implement proper session management
- Add user roles and permissions
- Enable audit logging

## Troubleshooting

### Common Issues
1. **Login not working**: Check server console for errors
2. **Token expired**: Simply login again
3. **Password change fails**: Ensure current password is correct
4. **Can't access pages**: Make sure you're logged in

### Default User Recovery
If you forget the admin password, restart the server. It will recreate the default admin user if it doesn't exist.

## Future Enhancements
- Multiple user accounts
- Role-based permissions
- Password reset functionality
- User registration (admin-only)
- Session timeout warnings
- Two-factor authentication
- User activity logging
