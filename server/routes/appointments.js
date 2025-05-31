const express = require('express');
const Appointment = require('../models/Appointment');
const notificationService = require('../services/notificationService');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(auth);

// GET /api/appointments
router.get('/', async (req, res) => {
  try {
    const { date, status, page = 1, limit = 10 } = req.query;
    const query = {};

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }

    if (status) {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .sort({ date: 1, time: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(query);

    console.log(`📋 Fetched ${appointments.length} appointments (${total} total)`);

    res.json({
      success: true,
      appointments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/appointments/upcoming
router.get('/upcoming', async (req, res) => {
  try {
    const now = new Date();
    
    // Get appointments that are either pending (no date set) or scheduled in the future
    const appointments = await Appointment.find({
      $or: [
        { status: 'pending' }, // Include all pending appointments
        { 
          date: { $gte: now },
          status: { $in: ['scheduled', 'pending'] }
        }
      ]
    })
    .sort({ 
      // Sort by: pending first, then by date
      status: 1, // pending comes before scheduled alphabetically
      date: 1,
      createdAt: -1 
    })
    .limit(10);

    console.log(`📅 Fetched ${appointments.length} upcoming appointments`);

    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming appointments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PATCH /api/appointments/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { 
        ...(status && { status }),
        ...(notes !== undefined && { notes })
      },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    console.log(`📝 Updated appointment ${id}: status=${status}`);

    // Create notification for status change if it's significant
    if (status && ['completed', 'cancelled'].includes(status)) {
      try {
        const notificationType = status === 'completed' 
          ? notificationService.NotificationTypes.SYSTEM
          : notificationService.NotificationTypes.APPOINTMENT_CANCELLED;
        
        const message = status === 'completed'
          ? `✅ Appointment completed for ${appointment.patient.name}`
          : `❌ Appointment cancelled for ${appointment.patient.name}`;

        await notificationService.createNotification(
          notificationType,
          message,
          appointment._id
        );
      } catch (notificationError) {
        console.error('⚠️ Failed to create status update notification:', notificationError.message);
      }
    }

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/appointments/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status: 'cancelled' },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    console.log(`🗑️ Cancelled appointment ${id}`);

    // Create notification for cancellation
    try {
      await notificationService.createNotification(
        notificationService.NotificationTypes.APPOINTMENT_CANCELLED,
        `❌ Appointment cancelled for ${appointment.patient.name}`,
        appointment._id
      );
    } catch (notificationError) {
      console.error('⚠️ Failed to create cancellation notification:', notificationError.message);
    }

    res.json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;