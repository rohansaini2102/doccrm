// config/config.js
module.exports = {
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  port: process.env.PORT || 5000,
  
  // Email configuration
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  
  // Calendly configuration
  calendly: {
    apiKey: process.env.CALENDLY_PERSONAL_ACCESS_TOKEN,
    userUri: process.env.CALENDLY_USER_URI,
    bookingUrl: process.env.CALENDLY_BOOKING_URL,
    webhookKey: process.env.CALENDLY_WEBHOOK_SIGNING_KEY,
    clientId: process.env.CALENDLY_CLIENT_ID,
    clientSecret: process.env.CALENDLY_CLIENT_SECRET
  }
};