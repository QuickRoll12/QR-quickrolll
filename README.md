# Attendance System

A real-time attendance tracking system with multi-session support for different courses and sections. Built with React, Node.js, Express, Socket.IO, and MongoDB..

## Environment Variables

This project uses environment variables for configuration. You'll need to set these up before deploying.

### Server Environment Variables (.env file in server directory)

```
MONGODB_URI=your_mongodb_connection_string
PORT=5000
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email_for_notifications
EMAIL_PASSWORD=your_email_password
FRONTEND_URL=https://your-frontend-domain.com
BACKEND_URL=https://your-backend-domain.com
```

### Client Environment Variables (.env file in client directory)

```
REACT_APP_API_URL=https://your-backend-domain.com/api
REACT_APP_BACKEND_URL=https://your-backend-domain.com
REACT_APP_WEBSITE_URL=https://your-frontend-domain.com
REACT_APP_ADMIN_EMAIL=admin@example.com
```

## Deployment Instructions

### Backend Deployment

1. Set up your environment variables in the server's `.env` file
2. Install dependencies: `npm install`
3. Build the project (if needed): `npm run build`
4. Start the server: `npm start`

### Frontend Deployment

1. Set up your environment variables in the client's `.env` file
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Deploy the build folder to your hosting provider

## Important Notes for Deployment

- Make sure your MongoDB instance is accessible from your deployment environment
- The `FRONTEND_URL` in the server's `.env` must match your actual frontend domain for CORS to work correctly
- The `REACT_APP_BACKEND_URL` in the client's `.env` must point to your actual backend domain
- For local development, you can use the default values (localhost)
- Remember to restart both server and client after changing environment variables

## Security Features

- IP-based attendance tracking to prevent proxy attendance
- One attendance mark per student per session
- JWT authentication for secure access
- CORS protection for API endpoints
- Easily scalable

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Copyright

Copyright (c) 2025 QuickRoll Attendance System. All rights reserved.