const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
  // Personal Information
  personalInfo: {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/, 'Please enter a valid phone number']
    },
    dateOfBirth: {
      type: Date,
      default: null
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say'],
      default: null
    },
    nationality: {
      type: String,
      default: 'Rwandan'
    }
  },
  
  // Location Information
  locationInfo: {
    province: {
      type: String,
      required: true,
      trim: true
    },
    district: {
      type: String,
      required: true,
      trim: true
    },
    sector: {
      type: String,
      required: true,
      trim: true
    },
    cell: {
      type: String,
      required: true,
      trim: true
    },
    village: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    postalCode: {
      type: String,
      trim: true
    }
  },
  
  // Course/Program Selection
  courseSelection: {
    program: {
      type: String,
      required: true,
      trim: true
    },
    level: {
      type: String,
      required: true,
      enum: ['primary', 'secondary', 'diploma', 'bachelor', 'masters', 'phd', 'certificate', 'other']
    },
    specialization: {
      type: String,
      trim: true
    },
    intakeYear: {
      type: Number,
      required: true,
      min: 2020,
      max: 2030
    },
    intakeSemester: {
      type: String,
      enum: ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
      default: 'january'
    },
    modeOfStudy: {
      type: String,
      enum: ['full-time', 'part-time', 'online', 'hybrid'],
      default: 'full-time'
    }
  },
  
  // Document Information
  documents: {
    resume: {
      filename: String,
      path: String,
      url: String,
      size: Number,
      mimetype: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    },
    transcripts: {
      filename: String,
      path: String,
      url: String,
      size: Number,
      mimetype: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    },
    idProof: {
      filename: String,
      path: String,
      url: String,
      size: Number,
      mimetype: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    },
    passportPhoto: {
      filename: String,
      path: String,
      url: String,
      size: Number,
      mimetype: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    },
    recommendationLetters: [{
      filename: String,
      path: String,
      url: String,
      size: Number,
      mimetype: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Educational Background (optional)
  education: [{
    institution: String,
    qualification: String,
    fieldOfStudy: String,
    startYear: Number,
    endYear: Number,
    grade: String,
    isCompleted: Boolean,
    documents: [{
      filename: String,
      path: String,
      url: String
    }]
  }],
  
  // Work Experience (optional)
  workExperience: [{
    employer: String,
    position: String,
    startDate: Date,
    endDate: Date,
    isCurrent: Boolean,
    description: String,
    documents: [{
      filename: String,
      path: String,
      url: String
    }]
  }],
  
  // Additional Information
  additionalInfo: {
    skills: [String],
    languages: [{
      language: String,
      proficiency: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'native']
      }
    }],
    hobbies: [String],
    references: [{
      name: String,
      relationship: String,
      email: String,
      phone: String,
      organization: String
    }]
  },
  
  // Terms and Status
  termsAgreed: {
    type: Boolean,
    required: true,
    validate: {
      validator: function(v) {
        return v === true;
      },
      message: 'You must agree to the terms and conditions'
    }
  },
  
  // Application Status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under-review', 'shortlisted', 'accepted', 'rejected', 'waitlisted', 'cancelled'],
    default: 'draft'
  },
  
  // Status History
  statusHistory: [{
    status: String,
    changedBy: mongoose.Schema.Types.ObjectId,
    changedAt: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  
  // Payment Information (if applicable)
  payment: {
    amount: Number,
    currency: {
      type: String,
      default: 'RWF'
    },
    method: String,
    transactionId: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    paidAt: Date
  },
  
  // Metadata
  applicationNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Submission Information
  submittedAt: Date,
  
  // Review Information
  reviewedBy: mongoose.Schema.Types.ObjectId,
  reviewedAt: Date,
  reviewNotes: String,
  reviewerComments: String,
  
  // User reference (if user is logged in)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  
  // Tracking
  ipAddress: String,
  userAgent: String,
  
  // Audit Trail
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
applicationSchema.virtual('fullName').get(function() {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

applicationSchema.virtual('isSubmitted').get(function() {
  return this.status !== 'draft';
});

applicationSchema.virtual('isUnderReview').get(function() {
  return this.status === 'under-review';
});

applicationSchema.virtual('isAccepted').get(function() {
  return this.status === 'accepted';
});

applicationSchema.virtual('isRejected').get(function() {
  return this.status === 'rejected';
});

// Generate application number before save
applicationSchema.pre('save', async function(next) {
  if (!this.applicationNumber && this.status === 'submitted') {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({ 
      createdAt: { $gte: new Date(`${year}-01-01`) } 
    });
    this.applicationNumber = `APP-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  
  // Update status history when status changes
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date()
    });
  }
  
  this.updatedAt = Date.now();
  next();
});

// Indexes for better query performance
applicationSchema.index({ applicationNumber: 1 });
applicationSchema.index({ 'personalInfo.email': 1 });
applicationSchema.index({ 'personalInfo.phone': 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ 'courseSelection.program': 1 });
applicationSchema.index({ 'courseSelection.intakeYear': 1 });
applicationSchema.index({ createdAt: -1 });
applicationSchema.index({ 'user': 1 });

// Static Methods
applicationSchema.statics.findByEmail = function(email) {
  return this.find({ 'personalInfo.email': email });
};

applicationSchema.statics.findByStatus = function(status) {
  return this.find({ status });
};

applicationSchema.statics.findByProgram = function(program) {
  return this.find({ 'courseSelection.program': program });
};

applicationSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const total = await this.countDocuments();
  const submitted = await this.countDocuments({ status: 'submitted' });
  const accepted = await this.countDocuments({ status: 'accepted' });
  
  return {
    total,
    submitted,
    accepted,
    byStatus: stats
  };
};

const Application = mongoose.model("Application", applicationSchema);

module.exports = Application;