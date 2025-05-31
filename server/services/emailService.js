const nodemailer = require('nodemailer');
const config = require('../config/config');

// Email templates
const templates = {
  appointmentRequestConfirmation: (patient, message) => ({
    subject: 'Appointment Request Received - Dr. Uddit Kant Sinha',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Appointment Request Received</h1>
        <p>Dear ${patient.fullName},</p>
        <p>Thank you for your interest in scheduling an appointment with Dr. Uddit Kant Sinha.</p>
        <p>We have received your appointment request with the following details:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Name:</strong> ${patient.fullName}</p>
          <p><strong>Email:</strong> ${patient.email}</p>
          <p><strong>Phone:</strong> ${patient.phone}</p>
          ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
        </div>
        <p>You will now be redirected to our scheduling calendar to choose your preferred appointment time.</p>
        <p>Once you select a time slot, you will receive a final confirmation email with your appointment details.</p>
        <p><strong>Next Steps:</strong></p>
        <ol>
          <li>Choose your preferred date and time from the calendar</li>
          <li>Complete the booking process</li>
          <li>Receive final confirmation email</li>
          <li>Arrive 10 minutes before your scheduled time</li>
        </ol>
        <p>If you have any questions or need to cancel/reschedule, please contact us directly.</p>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0;"><strong>Dr. Uddit Kant Sinha</strong></p>
          <p style="margin: 0; color: #6b7280;">Medical Practice</p>
          <p style="margin: 0; color: #6b7280;">Email: udditkantsinha@gmail.com</p>
        </div>
      </div>
    `
  }),
  appointmentConfirmation: (appointment, patient) => ({
    subject: 'Appointment Confirmed - Dr. Uddit Kant Sinha',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #059669;">Appointment Confirmed</h1>
        <p>Dear ${patient.fullName},</p>
        <p>Your appointment with Dr. Uddit Kant Sinha has been successfully scheduled.</p>
        <div style="background-color: #ecfdf5; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #059669;">
          <h2 style="margin-top: 0; color: #059669;">Appointment Details</h2>
          <p><strong>Date:</strong> ${new Date(appointment.date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
          <p><strong>Time:</strong> ${new Date(appointment.date).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })}</p>
          <p><strong>Type:</strong> ${appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1)} Consultation</p>
          ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
        </div>
        <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin-top: 0; color: #d97706;">Important Reminders</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Please arrive 10 minutes before your scheduled time</li>
            <li>Bring a valid ID and any relevant medical documents</li>
            <li>If you need to cancel or reschedule, please contact us at least 24 hours in advance</li>
          </ul>
        </div>
        <p>We look forward to seeing you at your appointment.</p>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0;"><strong>Dr. Uddit Kant Sinha</strong></p>
          <p style="margin: 0; color: #6b7280;">Medical Practice</p>
          <p style="margin: 0; color: #6b7280;">Email: udditkantsinha@gmail.com</p>
        </div>
      </div>
    `
  }),
  prescriptionReminder: (patient, prescription) => ({
    subject: 'Prescription Reminder - Dr. Uddit Kant Sinha',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed;">Prescription Reminder</h1>
        <p>Dear ${patient.fullName},</p>
        <p>This is a reminder about your current prescription from Dr. Uddit Kant Sinha:</p>
        <div style="background-color: #f5f3ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Prescription Period:</strong></p>
          <p>Start Date: ${new Date(prescription.startDate).toLocaleDateString()}</p>
          <p>End Date: ${new Date(prescription.endDate).toLocaleDateString()}</p>
        </div>
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin-top: 0;">Prescribed Medicines:</h3>
          ${prescription.medicines.map(med => `
            <div style="margin-bottom: 12px; padding: 8px; background-color: white; border-radius: 4px;">
              <strong>${med.medicineName}</strong>
              <div style="margin-top: 4px;">
                ${med.timings.morning ? '<span style="background-color: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-right: 4px;">Morning</span>' : ''}
                ${med.timings.afternoon ? '<span style="background-color: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-right: 4px;">Afternoon</span>' : ''}
                ${med.timings.evening ? '<span style="background-color: #e0e7ff; color: #5b21b6; padding: 2px 8px; border-radius: 12px; font-size: 12px;">Evening</span>' : ''}
              </div>
            </div>
          `).join('')}
        </div>
        <p><strong>Important:</strong> Please ensure you take your medicines as prescribed and complete the full course.</p>
        <p>If you experience any side effects or have questions about your medication, please contact us immediately.</p>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0;"><strong>Dr. Uddit Kant Sinha</strong></p>
          <p style="margin: 0; color: #6b7280;">Medical Practice</p>
          <p style="margin: 0; color: #6b7280;">Email: udditkantsinha@gmail.com</p>
        </div>
      </div>
    `
  }),
  appointmentStatusUpdate: (appointment, patient) => ({
    subject: `Appointment ${appointment.status.toUpperCase()} - Dr. Uddit Kant Sinha`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: ${appointment.status === 'cancelled' ? '#dc2626' : '#059669'};">
          Appointment ${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
        </h1>
        <p>Dear ${patient.fullName},</p>
        <p>This is to inform you that your appointment scheduled for <strong>${new Date(appointment.date).toLocaleDateString()}</strong> at <strong>${appointment.time}</strong> has been <strong>${appointment.status}</strong>.</p>
        ${appointment.status === 'cancelled' ? 
          '<p>If you would like to schedule a new appointment, please visit our booking page or contact us directly.</p>' :
          '<p>We look forward to seeing you at your appointment.</p>'
        }
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0;"><strong>Dr. Uddit Kant Sinha</strong></p>
          <p style="margin: 0; color: #6b7280;">Medical Practice</p>
          <p style="margin: 0; color: #6b7280;">Email: udditkantsinha@gmail.com</p>
        </div>
      </div>
    `
  })
};

// Configure email transporter - FIX: Use createTransport instead of createTransporter
const createTransporter = () => {
  try {
    return nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: false, // true for 465, false for other ports
      auth: {
        user: config.email.user,
        pass: config.email.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  } catch (error) {
    console.error('Error creating email transporter:', error);
    throw error;
  }
};

// Email sending with retry logic
const sendEmailWithRetry = async (mailOptions, maxRetries = 3) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const transporter = createTransporter();
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', {
        to: mailOptions.to,
        messageId: info.messageId
      });
      return true;
    } catch (error) {
      retries++;
      console.error(`Email sending failed (attempt ${retries}/${maxRetries}):`, {
        error: error.message,
        to: mailOptions.to
      });
      
      if (retries === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
    }
  }
};

// Email service functions
const sendAppointmentRequestConfirmation = async (patient, message) => {
  try {
    if (!config.email?.user || !config.email?.pass) {
      console.warn('Email configuration not complete, skipping email send');
      return false;
    }

    const { subject, html } = templates.appointmentRequestConfirmation(patient, message);
    const mailOptions = {
      from: `"Dr. Uddit Kant Sinha" <${config.email.user}>`,
      to: patient.email,
      subject,
      html
    };

    await sendEmailWithRetry(mailOptions);
    console.log('Appointment request confirmation sent to:', patient.email);
    return true;
  } catch (error) {
    console.error('Error sending appointment request confirmation email:', error);
    // Don't throw error - email failure shouldn't stop the appointment process
    return false;
  }
};

const sendAppointmentConfirmation = async (appointment, patient) => {
  try {
    if (!config.email?.user || !config.email?.pass) {
      console.warn('Email configuration not complete, skipping email send');
      return false;
    }

    const { subject, html } = templates.appointmentConfirmation(appointment, patient);
    const mailOptions = {
      from: `"Dr. Uddit Kant Sinha" <${config.email.user}>`,
      to: patient.email,
      subject,
      html
    };

    await sendEmailWithRetry(mailOptions);
    console.log('Appointment confirmation sent to:', patient.email);
    return true;
  } catch (error) {
    console.error('Error sending appointment confirmation email:', error);
    return false;
  }
};

const sendPrescriptionReminder = async (patient, prescription) => {
  try {
    if (!config.email?.user || !config.email?.pass) {
      console.warn('Email configuration not complete, skipping email send');
      return false;
    }

    const { subject, html } = templates.prescriptionReminder(patient, prescription);
    const mailOptions = {
      from: `"Dr. Uddit Kant Sinha" <${config.email.user}>`,
      to: patient.email,
      subject,
      html
    };

    await sendEmailWithRetry(mailOptions);
    console.log('Prescription reminder sent to:', patient.email);
    return true;
  } catch (error) {
    console.error('Error sending prescription reminder email:', error);
    return false;
  }
};

const sendAppointmentStatusUpdate = async (appointment, patient) => {
  try {
    if (!config.email?.user || !config.email?.pass) {
      console.warn('Email configuration not complete, skipping email send');
      return false;
    }

    const { subject, html } = templates.appointmentStatusUpdate(appointment, patient);
    const mailOptions = {
      from: `"Dr. Uddit Kant Sinha" <${config.email.user}>`,
      to: patient.email,
      subject,
      html
    };

    await sendEmailWithRetry(mailOptions);
    console.log('Appointment status update sent to:', patient.email);
    return true;
  } catch (error) {
    console.error('Error sending appointment status update email:', error);
    return false;
  }
};

module.exports = {
  sendAppointmentRequestConfirmation,
  sendAppointmentConfirmation,
  sendPrescriptionReminder,
  sendAppointmentStatusUpdate
};