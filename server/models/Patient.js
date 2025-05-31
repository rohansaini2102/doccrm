const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
    medicineName: {
        type: String,
        required: true
    },
    timings: {
        morning: {
            type: Boolean,
            default: false
        },
        afternoon: {
            type: Boolean,
            default: false
        },
        evening: {
            type: Boolean,
            default: false
        }
    }
});

const prescriptionSchema = new mongoose.Schema({
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    medicines: [medicineSchema],
    revisitRequired: {
        type: Boolean,
        default: false
    }
});

const visitSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId()
    },
    date: {
        type: Date,
        default: Date.now
    },
    problem: {
        type: String,
        required: true
    },
    diagnosis: {
        type: String,
        required: true
    },
    prescription: prescriptionSchema,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

const patientSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        required: false, // Changed to false for public bookings
        min: 1,
        max: 150
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: false // Changed to false for public bookings
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        required: false
    },
    address: {
        type: String,
        required: false // Changed to false for public bookings
    },
    visits: [visitSchema],
    onboardingDate: {
        type: Date,
        default: Date.now
    },
    onboardingTime: {
        type: String,
        default: () => new Date().toLocaleTimeString('en-US', { hour12: false })
    }
}, {
    timestamps: true
});

// Index for search functionality
patientSchema.index({ fullName: 'text', phone: 'text', email: 'text' });

module.exports = mongoose.model('Patient', patientSchema);