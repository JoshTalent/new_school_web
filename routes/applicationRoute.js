const express = require("express");
const Application = require("../models/applicationModel");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/applications/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware to handle file uploads
const uploadFields = upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'transcripts', maxCount: 1 },
  { name: 'idProof', maxCount: 1 },
  { name: 'passportPhoto', maxCount: 1 },
  { name: 'recommendationLetters', maxCount: 3 }
]);

// GET all applications (with filters and pagination)
router.get("/applications", async (req, res) => {
  try {
    const {
      status,
      program,
      level,
      year,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    const query = {};
    
    // Apply filters
    if (status && status !== 'all') query.status = status;
    if (program && program !== 'all') query['courseSelection.program'] = program;
    if (level && level !== 'all') query['courseSelection.level'] = level;
    if (year && year !== 'all') query['courseSelection.intakeYear'] = parseInt(year);
    
    // Search functionality
    if (search) {
      query.$or = [
        { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
        { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
        { 'personalInfo.email': { $regex: search, $options: 'i' } },
        { 'personalInfo.phone': { $regex: search, $options: 'i' } },
        { applicationNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [applications, totalCount] = await Promise.all([
      Application.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user', 'name email')
        .lean(),
      Application.countDocuments(query)
    ]);

    // Add virtual properties
    const applicationsWithVirtuals = applications.map(app => ({
      ...app,
      fullName: `${app.personalInfo.firstName} ${app.personalInfo.lastName}`,
      isSubmitted: app.status !== 'draft'
    }));

    res.status(200).json({
      success: true,
      message: "Applications retrieved successfully",
      count: applications.length,
      totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / limit),
      data: applicationsWithVirtuals
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET application by ID
router.get("/applications/:id", async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('user', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('statusHistory.changedBy', 'name email');

    if (!application) {
      return res.status(404).json({ 
        success: false,
        message: "Application not found" 
      });
    }

    // Add virtual properties
    const applicationWithVirtuals = {
      ...application.toObject(),
      fullName: application.fullName,
      isSubmitted: application.isSubmitted,
      isUnderReview: application.isUnderReview,
      isAccepted: application.isAccepted,
      isRejected: application.isRejected
    };

    res.status(200).json({
      success: true,
      message: "Application retrieved successfully",
      data: applicationWithVirtuals
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET application by application number
router.get("/applications/number/:number", async (req, res) => {
  try {
    const application = await Application.findOne({ 
      applicationNumber: req.params.number 
    }).populate('user', 'name email');

    if (!application) {
      return res.status(404).json({ 
        success: false,
        message: "Application not found" 
      });
    }

    res.status(200).json({
      success: true,
      message: "Application retrieved successfully",
      data: application
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// POST create new application (with file uploads)
router.post("/applications", uploadFields, async (req, res) => {
  try {
    const {
      personalInfo,
      locationInfo,
      courseSelection,
      termsAgreed,
      education,
      workExperience,
      additionalInfo
    } = req.body;

    // Parse JSON fields
    const parsedPersonalInfo = JSON.parse(personalInfo || '{}');
    const parsedLocationInfo = JSON.parse(locationInfo || '{}');
    const parsedCourseSelection = JSON.parse(courseSelection || '{}');
    const parsedEducation = education ? JSON.parse(education) : [];
    const parsedWorkExperience = workExperience ? JSON.parse(workExperience) : [];
    const parsedAdditionalInfo = additionalInfo ? JSON.parse(additionalInfo) : {};

    // Validate required fields
    const requiredFields = [
      parsedPersonalInfo.firstName,
      parsedPersonalInfo.lastName,
      parsedPersonalInfo.email,
      parsedPersonalInfo.phone,
      parsedLocationInfo.province,
      parsedLocationInfo.district,
      parsedLocationInfo.sector,
      parsedLocationInfo.cell,
      parsedLocationInfo.village,
      parsedCourseSelection.program,
      parsedCourseSelection.level,
      parsedCourseSelection.intakeYear,
      termsAgreed
    ];

    if (requiredFields.some(field => !field)) {
      return res.status(400).json({ 
        success: false,
        message: "All required fields must be filled" 
      });
    }

    // Check if user already has an application for this program
    const existingApplication = await Application.findOne({
      'personalInfo.email': parsedPersonalInfo.email,
      'courseSelection.program': parsedCourseSelection.program,
      'courseSelection.intakeYear': parsedCourseSelection.intakeYear
    });

    if (existingApplication) {
      return res.status(400).json({ 
        success: false,
        message: "You have already applied for this program" 
      });
    }

    // Prepare documents object
    const documents = {};
    
    // Handle uploaded files
    if (req.files) {
      if (req.files['resume']) {
        const resumeFile = req.files['resume'][0];
        documents.resume = {
          filename: resumeFile.originalname,
          path: resumeFile.path,
          url: `/uploads/applications/${resumeFile.filename}`,
          size: resumeFile.size,
          mimetype: resumeFile.mimetype
        };
      }
      
      if (req.files['transcripts']) {
        const transcriptsFile = req.files['transcripts'][0];
        documents.transcripts = {
          filename: transcriptsFile.originalname,
          path: transcriptsFile.path,
          url: `/uploads/applications/${transcriptsFile.filename}`,
          size: transcriptsFile.size,
          mimetype: transcriptsFile.mimetype
        };
      }
      
      if (req.files['idProof']) {
        const idProofFile = req.files['idProof'][0];
        documents.idProof = {
          filename: idProofFile.originalname,
          path: idProofFile.path,
          url: `/uploads/applications/${idProofFile.filename}`,
          size: idProofFile.size,
          mimetype: idProofFile.mimetype
        };
      }
      
      if (req.files['passportPhoto']) {
        const passportPhotoFile = req.files['passportPhoto'][0];
        documents.passportPhoto = {
          filename: passportPhotoFile.originalname,
          path: passportPhotoFile.path,
          url: `/uploads/applications/${passportPhotoFile.filename}`,
          size: passportPhotoFile.size,
          mimetype: passportPhotoFile.mimetype
        };
      }
      
      if (req.files['recommendationLetters']) {
        documents.recommendationLetters = req.files['recommendationLetters'].map(file => ({
          filename: file.originalname,
          path: file.path,
          url: `/uploads/applications/${file.filename}`,
          size: file.size,
          mimetype: file.mimetype
        }));
      }
    }

    // Create new application
    const newApplication = new Application({
      personalInfo: parsedPersonalInfo,
      locationInfo: parsedLocationInfo,
      courseSelection: parsedCourseSelection,
      documents,
      education: parsedEducation,
      workExperience: parsedWorkExperience,
      additionalInfo: parsedAdditionalInfo,
      termsAgreed: termsAgreed === 'true',
      status: 'draft',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    const savedApplication = await newApplication.save();

    res.status(201).json({
      success: true,
      message: "Application created successfully",
      data: savedApplication
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// PUT update application
router.put("/applications/:id", uploadFields, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ 
        success: false,
        message: "Application not found" 
      });
    }

    // Parse request data
    const {
      personalInfo,
      locationInfo,
      courseSelection,
      termsAgreed,
      status,
      reviewNotes,
      reviewerComments
    } = req.body;

    // Update fields if provided
    if (personalInfo) {
      const parsedPersonalInfo = JSON.parse(personalInfo);
      application.personalInfo = { ...application.personalInfo, ...parsedPersonalInfo };
    }
    
    if (locationInfo) {
      const parsedLocationInfo = JSON.parse(locationInfo);
      application.locationInfo = { ...application.locationInfo, ...parsedLocationInfo };
    }
    
    if (courseSelection) {
      const parsedCourseSelection = JSON.parse(courseSelection);
      application.courseSelection = { ...application.courseSelection, ...parsedCourseSelection };
    }
    
    if (termsAgreed !== undefined) {
      application.termsAgreed = termsAgreed === 'true';
    }
    
    // Handle status change (admin only)
    if (status && req.user?.role === 'admin') {
      application.status = status;
      if (status === 'under-review') {
        application.reviewedBy = req.user.id;
        application.reviewedAt = new Date();
      }
    }
    
    if (reviewNotes && req.user?.role === 'admin') {
      application.reviewNotes = reviewNotes;
    }
    
    if (reviewerComments && req.user?.role === 'admin') {
      application.reviewerComments = reviewerComments;
    }

    // Handle file uploads
    if (req.files) {
      if (req.files['resume']) {
        const resumeFile = req.files['resume'][0];
        application.documents.resume = {
          filename: resumeFile.originalname,
          path: resumeFile.path,
          url: `/uploads/applications/${resumeFile.filename}`,
          size: resumeFile.size,
          mimetype: resumeFile.mimetype,
          uploadedAt: new Date()
        };
      }
      
      if (req.files['transcripts']) {
        const transcriptsFile = req.files['transcripts'][0];
        application.documents.transcripts = {
          filename: transcriptsFile.originalname,
          path: transcriptsFile.path,
          url: `/uploads/applications/${transcriptsFile.filename}`,
          size: transcriptsFile.size,
          mimetype: transcriptsFile.mimetype,
          uploadedAt: new Date()
        };
      }
      
      // Add other file updates as needed
    }

    const updatedApplication = await application.save();

    res.status(200).json({
      success: true,
      message: "Application updated successfully",
      data: updatedApplication
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// PUT submit application
router.put("/applications/:id/submit", async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ 
        success: false,
        message: "Application not found" 
      });
    }

    // Validate that all required fields are filled
    if (!application.termsAgreed) {
      return res.status(400).json({ 
        success: false,
        message: "You must agree to the terms and conditions" 
      });
    }

    // Check if required documents are uploaded
    const requiredDocs = ['resume', 'transcripts', 'idProof'];
    const missingDocs = requiredDocs.filter(doc => !application.documents[doc]?.url);
    
    if (missingDocs.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: `Missing required documents: ${missingDocs.join(', ')}` 
      });
    }

    // Update status to submitted
    application.status = 'submitted';
    application.submittedAt = new Date();

    const submittedApplication = await application.save();

    res.status(200).json({
      success: true,
      message: "Application submitted successfully",
      data: submittedApplication
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// DELETE application
router.delete("/applications/:id", async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ 
        success: false,
        message: "Application not found" 
      });
    }

    // Delete associated files
    const fileFields = ['resume', 'transcripts', 'idProof', 'passportPhoto'];
    fileFields.forEach(field => {
      if (application.documents[field]?.path) {
        try {
          fs.unlinkSync(application.documents[field].path);
        } catch (err) {
          console.error(`Error deleting file ${field}:`, err);
        }
      }
    });

    // Delete recommendation letters
    if (application.documents.recommendationLetters) {
      application.documents.recommendationLetters.forEach(letter => {
        if (letter.path) {
          try {
            fs.unlinkSync(letter.path);
          } catch (err) {
            console.error('Error deleting recommendation letter:', err);
          }
        }
      });
    }

    await application.deleteOne();

    res.status(200).json({
      success: true,
      message: "Application deleted successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET application statistics
router.get("/applications/statistics", async (req, res) => {
  try {
    const statistics = await Application.getStatistics();
    
    res.status(200).json({
      success: true,
      message: "Statistics retrieved successfully",
      data: statistics
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET applications by user email
router.get("/applications/user/:email", async (req, res) => {
  try {
    const applications = await Application.findByEmail(req.params.email)
      .sort({ createdAt: -1 })
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      message: "Applications retrieved successfully",
      count: applications.length,
      data: applications
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET applications by status
router.get("/applications/status/:status", async (req, res) => {
  try {
    const applications = await Application.findByStatus(req.params.status)
      .sort({ createdAt: -1 })
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      message: "Applications retrieved successfully",
      count: applications.length,
      data: applications
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET applications by program
router.get("/applications/program/:program", async (req, res) => {
  try {
    const applications = await Application.findByProgram(req.params.program)
      .sort({ createdAt: -1 })
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      message: "Applications retrieved successfully",
      count: applications.length,
      data: applications
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;
