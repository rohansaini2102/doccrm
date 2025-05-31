const express = require('express');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

const router = express.Router();

// Apply authentication to all routes
router.use(auth);

// GET /api/patients
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const patients = await Patient.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Patient.countDocuments(query);

    res.json({
      success: true,
      patients,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patients',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/patients/search
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.json({ 
        success: true, 
        patients: [],
        message: 'No search query provided'
      });
    }

    const patients = await Patient.find({
      $or: [
        { fullName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } }
      ]
    })
    .limit(20)
    .sort({ fullName: 1 });

    res.json({
      success: true,
      patients,
      count: patients.length
    });
  } catch (error) {
    console.error('Error searching patients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search patients',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/patients/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 5 } = req.query;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient ID format'
      });
    }

    const patient = await Patient.findById(id);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get paginated visits
    const skip = (page - 1) * limit;
    const visits = patient.visits
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(skip, skip + parseInt(limit));

    const patientData = patient.toObject();
    patientData.visits = visits;
    patientData.totalVisits = patient.visits.length;

    res.json({
      success: true,
      patient: patientData
    });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/patients
router.post('/', async (req, res) => {
  try {
    const { fullName, age, gender, phone, email, address } = req.body;

    // Validate required fields
    if (!fullName || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Full name and phone are required'
      });
    }

    // Validate age if provided
    if (age && (isNaN(age) || age < 0 || age > 150)) {
      return res.status(400).json({
        success: false,
        message: 'Age must be a valid number between 0 and 150'
      });
    }

    // Check if patient already exists
    const existingPatient = await Patient.findOne({
      $or: [
        ...(email ? [{ email: email.toLowerCase() }] : []),
        { phone }
      ]
    });

    if (existingPatient) {
      return res.status(400).json({
        success: false,
        message: 'Patient with this email or phone already exists'
      });
    }

    // Create patient data object
    const patientData = {
      fullName: fullName.trim(),
      phone: phone.trim()
    };

    // Add optional fields only if they exist
    if (age) patientData.age = parseInt(age);
    if (gender) patientData.gender = gender;
    if (email) patientData.email = email.toLowerCase().trim();
    if (address) patientData.address = address.trim();

    console.log('Creating patient with data:', patientData);

    const patient = new Patient(patientData);
    await patient.save();

    console.log('Patient created successfully:', patient._id);

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      patient
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    
    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Patient with this information already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create patient',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/patients/:id/visits
router.post('/:id/visits', async (req, res) => {
  try {
    const { id } = req.params;
    const { problem, diagnosis, prescription } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient ID format'
      });
    }

    if (!problem || !diagnosis) {
      return res.status(400).json({
        success: false,
        message: 'Problem and diagnosis are required'
      });
    }

    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const visit = {
      problem: problem.trim(),
      diagnosis: diagnosis.trim(),
      prescription,
      createdBy: req.user.userId
    };

    patient.visits.push(visit);
    await patient.save();

    const newVisit = patient.visits[patient.visits.length - 1];

    res.status(201).json({
      success: true,
      message: 'Visit added successfully',
      visit: newVisit
    });
  } catch (error) {
    console.error('Error adding visit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add visit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/patients/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient ID format'
      });
    }

    // Clean up the updates
    if (updates.email) {
      updates.email = updates.email.toLowerCase().trim();
    }
    if (updates.fullName) {
      updates.fullName = updates.fullName.trim();
    }
    if (updates.phone) {
      updates.phone = updates.phone.trim();
    }

    const patient = await Patient.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.json({
      success: true,
      message: 'Patient updated successfully',
      patient
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update patient',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;