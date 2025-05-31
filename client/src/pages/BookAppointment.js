import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function BookAppointment() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    age: '',
    gender: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields - ONLY name, email, phone are required
      if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
        throw new Error('Please fill in all required fields: Name, Email, and Phone');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        throw new Error('Please enter a valid email address');
      }

      // Validate phone number (basic validation)
      if (form.phone.trim().length < 10) {
        throw new Error('Please enter a valid phone number (at least 10 digits)');
      }

      // Validate age if provided
      if (form.age && (parseInt(form.age) < 1 || parseInt(form.age) > 150)) {
        throw new Error('Please enter a valid age between 1 and 150');
      }

      console.log('📞 Submitting appointment request:', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        age: form.age || null,
        gender: form.gender || null,
        address: form.address.trim() || null,
        message: form.message.trim() || ''
      });

      // Prepare data for submission - exactly matching backend expectations
      const appointmentData = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        message: form.message.trim() || ''
      };

      // Add optional fields only if they have values
      if (form.age && parseInt(form.age) > 0) {
        appointmentData.age = parseInt(form.age);
      }

      if (form.gender) {
        appointmentData.gender = form.gender;
      }

      if (form.address && form.address.trim()) {
        appointmentData.address = form.address.trim();
      }

      const response = await axios.post(`${API_BASE_URL}/api/public/book-appointment`, appointmentData);

      console.log('✅ Server response:', response.data);

      if (response.data.success) {
        setSuccess('✅ Request submitted successfully! You will receive a confirmation email and be redirected to schedule your appointment time.');
        
        // Clear form on success
        setForm({
          name: '',
          email: '',
          phone: '',
          message: '',
          age: '',
          gender: '',
          address: ''
        });
        
        // Show success message briefly, then redirect to Calendly
        setTimeout(() => {
          if (response.data.calendlyLink) {
            console.log('🔗 Redirecting to Calendly:', response.data.calendlyLink);
            window.open(response.data.calendlyLink, '_blank');
            
            // Also try to redirect in the same window as backup
            setTimeout(() => {
              window.location.href = response.data.calendlyLink;
            }, 1000);
          } else {
            console.warn('⚠️ No Calendly link provided in response');
            setError('Appointment request created but no scheduling link available. Please contact us directly.');
          }
        }, 2000);
      } else {
        throw new Error(response.data.message || 'Failed to submit appointment request');
      }

    } catch (err) {
      console.error('❌ Error submitting appointment request:', err);
      
      // Better error handling
      let errorMessage = 'Failed to submit appointment request. Please try again.';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Handle specific HTTP status codes
      if (err.response?.status === 400) {
        errorMessage = 'Please check your information and try again.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again in a few moments.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center py-8 px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">Book an Appointment</h1>
          <p className="text-lg text-gray-600">Schedule a consultation with Dr. Uddit Kant Sinha</p>
          <div className="mt-4 p-4 bg-blue-100 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>How it works:</strong> Fill out this form → Receive confirmation email → Choose your preferred time slot → Get final confirmation
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <strong>Success!</strong>
              </div>
              <p>{success}</p>
              <p className="text-sm mt-2">Opening calendar in new tab...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <strong>Error</strong>
              </div>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Required Fields */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  minLength="2"
                  maxLength="100"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  minLength="10"
                />
              </div>

              {/* Optional Fields */}
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                  Age <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  min="1"
                  max="150"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={form.age}
                  onChange={handleChange}
                  placeholder="Enter your age"
                />
              </div>

              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                  Gender <span className="text-gray-400">(Optional)</span>
                </label>
                <select
                  id="gender"
                  name="gender"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={form.gender}
                  onChange={handleChange}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Address <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Enter your address"
                  maxLength="200"
                />
              </div>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Visit / Message <span className="text-gray-400">(Optional)</span>
              </label>
              <textarea
                id="message"
                name="message"
                rows="4"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={form.message}
                onChange={handleChange}
                placeholder="Please describe your symptoms or reason for the visit..."
                maxLength="500"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 px-6 rounded-lg font-medium text-white transition-all duration-200 ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-[1.02]'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Request...
                  </div>
                ) : (
                  'Request Appointment'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">What happens next?</h3>
            <ol className="text-sm text-gray-600 space-y-1">
              <li>1. You'll receive an immediate confirmation email</li>
              <li>2. You'll be redirected to select your preferred appointment time</li>
              <li>3. You'll receive a final confirmation with appointment details</li>
              <li>4. Please arrive 10 minutes before your scheduled time</li>
            </ol>
            
            <div className="mt-4 text-xs text-gray-500">
              <p><span className="text-red-500">*</span> Required fields</p>
              <p>All other fields are optional but help us serve you better</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookAppointment;