const express = require('express');
const router = express.Router();
const calendlyService = require('../services/calendlyService');

// POST /api/public/book-appointment
router.post('/book-appointment', async (req, res) => {
  try {
    console.log('📞 Received appointment booking request:', req.body);
    
    const { name, email, phone, message, age, gender, address } = req.body;

    // Validate required fields (NO date/time required)
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and phone are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Create appointment request and get Calendly link
    const result = await calendlyService.createAppointmentRequest({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      message: message?.trim() || '',
      age: age || null,
      gender: gender || null,
      address: address?.trim() || null
    });

    if (result.success) {
      console.log('✅ Appointment request created successfully');
      res.json({
        success: true,
        message: 'Appointment request created successfully',
        calendlyLink: result.calendlyLink,
        patientId: result.patientId,
        appointmentId: result.appointmentId
      });
    } else {
      console.error('❌ Failed to create appointment request');
      res.status(500).json({
        success: false,
        message: 'Failed to create appointment request'
      });
    }

  } catch (error) {
    console.error('❌ Error booking appointment:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while booking your appointment. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Public API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Test endpoint for debugging
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Public routes are working!',
    timestamp: new Date().toISOString(),
    server: 'Doctor CRM API'
  });
});

module.exports = router;