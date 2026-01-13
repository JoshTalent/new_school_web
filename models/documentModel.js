// models/Document.js
const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Document name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['administrative', 'academic', 'financial', 'announcement', 'other'],
    default: 'administrative'
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  fileSize: {
    type: String,
    required: [true, 'File size is required']
  },
  fileType: {
    type: String,
    required: [true, 'File type is required'],
    enum: ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'TXT', 'ZIP']
  },
  uploadDate: {
    type: Date,
    required: [true, 'Upload date is required'],
    default: Date.now
  },
  url: {
    type: String,
    required: [true, 'File URL is required'],
    trim: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for better query performance
documentSchema.index({ name: 'text', description: 'text' });
documentSchema.index({ category: 1 });
documentSchema.index({ uploadDate: -1 });

const Document = mongoose.model('Document', documentSchema);
module.exports = Document;