const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    patient: {
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        }
    },
    message: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled', 'pending'],
        default: 'pending'
    },
    date: {
        type: Date,
        required: function() {
            return this.status !== 'pending';
        }
    },
    time: {
        type: String,
        required: function() {
            return this.status !== 'pending';
        },
        validate: {
            validator: function(v) {
                if (!v) return true;
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: 'Time must be in HH:MM format'
        }
    },
    type: {
        type: String,
        enum: ['new', 'follow-up', 'consultation'],
        default: 'new'
    },
    notes: {
        type: String,
        default: ''
    },
    calendlyEventId: {
        type: String,
        sparse: true
    },
    source: {
        type: String,
        enum: ['public', 'dashboard'],
        default: 'public'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Appointment', appointmentSchema);