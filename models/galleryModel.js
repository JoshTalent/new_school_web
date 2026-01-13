const mongoose = require("mongoose");

const gallerySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
    maxlength: [200, "Title cannot exceed 200 characters"]
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, "Description cannot exceed 1000 characters"]
  },
  category: {
    type: String,
    required: [true, "Category is required"],
    trim: true,
    default: "General"
  },
  imageUrl: {
    type: String,
    required: [true, "Image URL is required"],
    trim: true
  },
  altText: {
    type: String,
    trim: true,
    default: ""
  }
}, {
  timestamps: true
});

// Indexes for better query performance - updated to remove unused indexes
gallerySchema.index({ category: 1, createdAt: -1 });

// Virtual for full image path (if needed)
gallerySchema.virtual('fullImageUrl').get(function() {
  // If you're storing relative paths, prepend your base URL
  return `${process.env.BASE_URL || ''}${this.imageUrl}`;
});

// Pre-save middleware to ensure alt text
gallerySchema.pre('save', function(next) {
  if (!this.altText || this.altText.trim() === '') {
    this.altText = this.title;
  }
  next();
});

module.exports = mongoose.model("Gallery", gallerySchema);