const Notification = require('../models/Notification');

let io = null;

// Initialize socket.io instance
const initSocket = (socketInstance) => {
  io = socketInstance;
  console.log('🔔 Notification service initialized with Socket.IO');
};

// Create and emit notification
const createNotification = async (type, message, appointmentId = null) => {
  try {
    console.log('🔔 Creating notification:', { type, message, appointmentId });

    // Create notification in database
    const notification = new Notification({
      type,
      message,
      appointment: appointmentId,
      read: false
    });

    await notification.save();
    console.log('✅ Notification saved to database:', notification._id);

    // Emit real-time notification via socket.io
    if (io) {
      const notificationData = {
        _id: notification._id,
        type: notification.type,
        message: notification.message,
        appointment: notification.appointment,
        read: notification.read,
        createdAt: notification.createdAt
      };

      io.emit('notification', notificationData);
      console.log('✅ Real-time notification emitted via Socket.IO');
    } else {
      console.warn('⚠️ Socket.IO not initialized, notification not sent in real-time');
    }

    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
};

// Get all notifications
const getNotifications = async (limit = 20, offset = 0) => {
  try {
    const notifications = await Notification.find()
      .populate('appointment')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);

    return notifications;
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    throw error;
  }
};

// Mark notification as read
const markAsRead = async (notificationId) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );

    if (notification && io) {
      io.emit('notification_read', { notificationId });
    }

    return notification;
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    throw error;
  }
};

// Mark all notifications as read
const markAllAsRead = async () => {
  try {
    await Notification.updateMany(
      { read: false },
      { read: true }
    );

    if (io) {
      io.emit('all_notifications_read');
    }

    console.log('✅ All notifications marked as read');
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    throw error;
  }
};

// Get unread notification count
const getUnreadCount = async () => {
  try {
    const count = await Notification.countDocuments({ read: false });
    return count;
  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    return 0;
  }
};

// Delete old notifications (older than 30 days)
const cleanupOldNotifications = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Notification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });

    console.log(`🧹 Cleaned up ${result.deletedCount} old notifications`);
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Error cleaning up old notifications:', error);
    return 0;
  }
};

// Notification types and messages
const NotificationTypes = {
  NEW_APPOINTMENT: 'new_appointment',
  APPOINTMENT_CONFIRMED: 'appointment_confirmed',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  APPOINTMENT_RESCHEDULED: 'appointment_rescheduled',
  SYSTEM: 'system'
};

const createAppointmentNotification = async (appointment, type = NotificationTypes.NEW_APPOINTMENT) => {
  let message = '';
  
  switch (type) {
    case NotificationTypes.NEW_APPOINTMENT:
      message = `🆕 New appointment request from ${appointment.patient.name} (${appointment.patient.phone})`;
      break;
    case NotificationTypes.APPOINTMENT_CONFIRMED:
      message = `✅ Appointment confirmed for ${appointment.patient.name} on ${new Date(appointment.date).toLocaleDateString()}`;
      break;
    case NotificationTypes.APPOINTMENT_CANCELLED:
      message = `❌ Appointment cancelled for ${appointment.patient.name}`;
      break;
    case NotificationTypes.APPOINTMENT_RESCHEDULED:
      message = `📅 Appointment rescheduled for ${appointment.patient.name} to ${new Date(appointment.date).toLocaleDateString()}`;
      break;
    default:
      message = `📋 Appointment update for ${appointment.patient.name}`;
  }

  return await createNotification(type, message, appointment._id);
};

const createSystemNotification = async (message) => {
  return await createNotification(NotificationTypes.SYSTEM, message);
};

module.exports = {
  initSocket,
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  cleanupOldNotifications,
  createAppointmentNotification,
  createSystemNotification,
  NotificationTypes
};