# Doctor's Clinical CRM

A modern web application for doctors to manage their clinical practice, built with the MERN stack (MongoDB, Express.js, React, Node.js).

## Features

- Secure authentication system
- Patient management
- Medical records
- Appointment scheduling
- Public appointment booking
- Responsive design

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd doctor-crm
```

2. Install dependencies:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Create a `.env` file in the server directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/doctor-crm
JWT_SECRET=your-secret-key
```

4. Start the development servers:
```bash
# Start the backend server (from the server directory)
npm run dev

# Start the frontend development server (from the client directory)
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Project Structure

```
doctor-crm/
├── client/                 # React frontend
│   ├── public/
│   └── src/
│       ├── components/     # Reusable components
│       ├── contexts/       # React contexts
│       ├── pages/         # Page components
│       └── App.js         # Main application component
└── server/                # Express backend
    ├── config/           # Configuration files
    ├── controllers/      # Route controllers
    ├── middleware/       # Custom middleware
    ├── models/          # Mongoose models
    ├── routes/          # API routes
    └── server.js        # Entry point
```

## API Endpoints

### Authentication
- POST /api/auth/register - Register a new user
- POST /api/auth/login - Login user
- GET /api/auth/me - Get current user

### Patients
- GET /api/patients - Get all patients
- POST /api/patients - Create a new patient
- GET /api/patients/:id - Get patient details
- PUT /api/patients/:id - Update patient
- DELETE /api/patients/:id - Delete patient

### Appointments
- GET /api/appointments - Get all appointments
- POST /api/appointments - Create a new appointment
- PATCH /api/appointments/:id - Update appointment status
- DELETE /api/appointments/:id - Delete appointment

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 