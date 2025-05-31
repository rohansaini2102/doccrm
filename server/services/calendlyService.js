const config = require('../config/config');
const crypto = require('crypto');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const emailService = require('./emailService');
const notificationService = require('./notificationService');
const axios = require('axios');

// Logger for Calendly events
const logCalendlyEvent = (event, data) => {
  console.log(`[Calendly Event] ${event}:`, {
    timestamp: new Date().toISOString(),
    data
  });
};

const verifyWebhookSignature = (signature, payload) => {
  try {
    if (!config.calendly?.webhookKey) {
      console.warn('Webhook signing key not configured');
      return true; // Allow in development
    }
    
    const hmac = crypto.createHmac('sha256', config.calendly.webhookKey);
    const calculatedSignature = hmac.update(JSON.stringify(payload)).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature)
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
};

// Create a patient record first, then return Calendly URL
const createAppointmentRequest = async (patientData) => {
  try {
    console.log('📞 Creating appointment request for:', patientData.email);

    // Check if patient already exists
    let patient = await Patient.findOne({ email: patientData.email });
    
    if (!patient) {
      // Create new patient with proper field mapping
      const patientCreateData = {
        fullName: patientData.name, // Map 'name' to 'fullName'
        email: patientData.email,
        phone: patientData.phone
      };

      // Add optional fields only if they exist
      if (patientData.age && patientData.age > 0) {
        patientCreateData.age = parseInt(patientData.age);
      }
      
      if (patientData.gender) {
        patientCreateData.gender = patientData.gender;
      }
      
      if (patientData.address) {
        patientCreateData.address = patientData.address;
      }

      patient = new Patient(patientCreateData);
      await patient.save();
      console.log('✅ New patient created:', patient._id);
    } else {
      console.log('✅ Existing patient found:', patient._id);
    }

    // Create pending appointment record (NO date/time required for pending status)
    const appointment = new Appointment({
      patient: {
        name: patient.fullName,
        email: patient.email,
        phone: patient.phone
      },
      message: patientData.message || '',
      status: 'pending', // This allows empty date/time
      type: 'new',
      source: 'public'
      // Note: date and time are NOT set here - they'll be set when Calendly webhook fires
    });
    
    await appointment.save();
    console.log('✅ Pending appointment created:', appointment._id);

    // 🔔 CREATE NOTIFICATION for new appointment request
    try {
      await notificationService.createAppointmentNotification(
        appointment, 
        notificationService.NotificationTypes.NEW_APPOINTMENT
      );
      console.log('✅ Notification created for new appointment request');
    } catch (notificationError) {
      console.error('⚠️ Failed to create notification (non-blocking):', notificationError.message);
    }

    // Send immediate confirmation email
    try {
      if (emailService && emailService.sendAppointmentRequestConfirmation) {
        await emailService.sendAppointmentRequestConfirmation(patient, patientData.message);
        console.log('✅ Confirmation email sent');
      }
    } catch (emailError) {
      console.error('⚠️ Email sending failed (non-blocking):', emailError.message);
    }

    // Try to create Calendly scheduling link if API key is available
    if (config.calendly?.apiKey && config.calendly?.userUri) {
      try {
        const schedulingLink = await createSchedulingLink(patient.fullName, patient.email);
        return {
          success: true,
          calendlyLink: schedulingLink,
          patientId: patient._id,
          appointmentId: appointment._id
        };
      } catch (apiError) {
        console.error('⚠️ Calendly API error, falling back to direct URL:', apiError.message);
      }
    }

    // Fallback to direct Calendly URL with pre-filled data
    const directUrl = createDirectCalendlyUrl(patient.fullName, patient.email);
    return {
      success: true,
      calendlyLink: directUrl,
      patientId: patient._id,
      appointmentId: appointment._id
    };

  } catch (error) {
    console.error('❌ Error creating appointment request:', error);
    throw error;
  }
};

// Create Calendly scheduling link via API
const createSchedulingLink = async (name, email) => {
  if (!config.calendly?.apiKey || !config.calendly?.userUri) {
    throw new Error('Calendly API key or user URI is not configured');
  }

  try {
    const url = 'https://api.calendly.com/scheduling_links';
    const data = {
      owner: config.calendly.userUri,
      max_event_count: 1,
      owner_type: "User",
      send_notifications: false,
      invitees: [
        {
          email: email,
          name: name
        }
      ]
    };
    
    const headers = {
      'Authorization': `Bearer ${config.calendly.apiKey}`,
      'Content-Type': 'application/json'
    };

    console.log('🔗 Creating Calendly scheduling link for:', { name, email });
    const response = await axios.post(url, data, { headers });
    console.log('✅ Calendly scheduling link created successfully');
    
    return response.data.resource.booking_url;
  } catch (error) {
    console.error('❌ Calendly API error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw new Error(`Calendly API error: ${error.response?.data?.message || error.message}`);
  }
};

// Create direct Calendly URL with pre-filled information
const createDirectCalendlyUrl = (name, email) => {
  const baseUrl = config.calendly?.bookingUrl || 'https://calendly.com/udditkantsinha/30min';
  const params = new URLSearchParams({
    hide_gdpr_banner: '1',
    name: name,
    email: email
  });
  
  return `${baseUrl}?${params.toString()}`;
};

const handleWebhookEvent = async (event) => {
  try {
    const { payload } = event;
    logCalendlyEvent(payload.event_type, payload);

    switch (payload.event_type) {
      case 'invitee.created':
        await handleInviteeCreated(payload);
        break;
      case 'invitee.canceled':
        await handleInviteeCanceled(payload);
        break;
      case 'invitee.rescheduled':
        await handleInviteeRescheduled(payload);
        break;
      default:
        console.log('ℹ️ Unhandled event type:', payload.event_type);
    }
  } catch (error) {
    console.error('❌ Error handling webhook event:', error);
    throw error;
  }
};

const handleInviteeCreated = async (payload) => {
  try {
    const { invitee, event: calendlyEvent } = payload;
    
    console.log('📅 Processing invitee.created for:', invitee.email);

    // Find patient by email
    let patient = await Patient.findOne({ email: invitee.email });
    if (!patient) {
      console.log('⚠️ Patient not found, creating new one');
      patient = new Patient({
        fullName: invitee.name,
        email: invitee.email,
        phone: ''
      });
      await patient.save();
    }

    // Extract time from Calendly event
    const appointmentDate = new Date(calendlyEvent.start_time);
    const appointmentTime = appointmentDate.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Update existing pending appointment
    let appointment = await Appointment.findOne({ 
      'patient.email': invitee.email,
      status: 'pending'
    }).sort({ createdAt: -1 });

    if (appointment) {
      console.log('✅ Updating existing pending appointment:', appointment._id);
      appointment.date = appointmentDate;
      appointment.time = appointmentTime;
      appointment.status = 'scheduled';
      appointment.calendlyEventId = calendlyEvent.uuid;
      
      if (invitee.questions_and_answers && invitee.questions_and_answers.length > 0) {
        const notes = invitee.questions_and_answers.map(qa => `${qa.question}: ${qa.answer}`).join('\n');
        appointment.notes = notes;
      }
      
      await appointment.save();
    } else {
      console.log('⚠️ No pending appointment found, creating new one');
      appointment = new Appointment({
        patient: {
          name: patient.fullName,
          email: patient.email,
          phone: patient.phone
        },
        date: appointmentDate,
        time: appointmentTime,
        type: 'new',
        status: 'scheduled',
        calendlyEventId: calendlyEvent.uuid,
        notes: invitee.questions_and_answers?.map(qa => `${qa.question}: ${qa.answer}`).join('\n') || '',
        source: 'public'
      });
      await appointment.save();
    }

    // 🔔 CREATE NOTIFICATION for appointment confirmation
    try {
      await notificationService.createAppointmentNotification(
        appointment, 
        notificationService.NotificationTypes.APPOINTMENT_CONFIRMED
      );
      console.log('✅ Notification created for appointment confirmation');
    } catch (notificationError) {
      console.error('⚠️ Failed to create notification (non-blocking):', notificationError.message);
    }

    // Send appointment confirmation email
    try {
      if (emailService && emailService.sendAppointmentConfirmation) {
        await emailService.sendAppointmentConfirmation(appointment, patient);
        console.log('✅ Appointment confirmation email sent');
      }
    } catch (emailError) {
      console.error('⚠️ Email sending failed (non-blocking):', emailError.message);
    }

    logCalendlyEvent('appointment_scheduled', { 
      appointmentId: appointment._id,
      patientId: patient._id 
    });

  } catch (error) {
    console.error('❌ Error handling invitee.created:', error);
    throw error;
  }
};

const handleInviteeCanceled = async (payload) => {
  try {
    const { event: calendlyEvent } = payload;
    
    const appointment = await Appointment.findOne({ calendlyEventId: calendlyEvent.uuid });
    if (!appointment) {
      console.warn(`⚠️ Appointment not found for Calendly event: ${calendlyEvent.uuid}`);
      return;
    }

    appointment.status = 'cancelled';
    await appointment.save();

    // 🔔 CREATE NOTIFICATION for appointment cancellation
    try {
      await notificationService.createAppointmentNotification(
        appointment, 
        notificationService.NotificationTypes.APPOINTMENT_CANCELLED
      );
      console.log('✅ Notification created for appointment cancellation');
    } catch (notificationError) {
      console.error('⚠️ Failed to create notification (non-blocking):', notificationError.message);
    }

    logCalendlyEvent('appointment_cancelled', { appointmentId: appointment._id });

  } catch (error) {
    console.error('❌ Error handling invitee.canceled:', error);
    throw error;
  }
};

const handleInviteeRescheduled = async (payload) => {
  try {
    const { event: calendlyEvent } = payload;
    
    const appointment = await Appointment.findOne({ calendlyEventId: calendlyEvent.uuid });
    if (!appointment) {
      console.warn(`⚠️ Appointment not found for Calendly event: ${calendlyEvent.uuid}`);
      return;
    }

    const newDate = new Date(calendlyEvent.start_time);
    const newTime = newDate.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    appointment.date = newDate;
    appointment.time = newTime;
    await appointment.save();

    // 🔔 CREATE NOTIFICATION for appointment reschedule
    try {
      await notificationService.createAppointmentNotification(
        appointment, 
        notificationService.NotificationTypes.APPOINTMENT_RESCHEDULED
      );
      console.log('✅ Notification created for appointment reschedule');
    } catch (notificationError) {
      console.error('⚠️ Failed to create notification (non-blocking):', notificationError.message);
    }

    logCalendlyEvent('appointment_rescheduled', { appointmentId: appointment._id });

  } catch (error) {
    console.error('❌ Error handling invitee.rescheduled:', error);
    throw error;
  }
};

module.exports = {
  verifyWebhookSignature,
  createAppointmentRequest,
  createSchedulingLink,
  createDirectCalendlyUrl,
  handleWebhookEvent
};