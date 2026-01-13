// models/notificationModel.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
    maxlength: [200, "Title cannot exceed 200 characters"]
  },
  message: {
    type: String,
    required: [true, "Message is required"],
    trim: true,
    maxlength: [500, "Message cannot exceed 500 characters"]
  },
  type: {
    type: String,
    enum: ['success', 'warning', 'error', 'info'],
    default: 'info'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  // CRITICAL: This prevents Mongoose from creating an id field
  id: false
});

// Remove any 'id' field definition if you have it
// DO NOT add: id: { type: mongoose.Schema.Types.ObjectId }

// Index for better query performance
notificationSchema.index({ timestamp: -1 });
notificationSchema.index({ type: 1, timestamp: -1 });

// Create a virtual 'id' field that returns _id
notificationSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
notificationSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    // Remove _id and __v, keep id
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

notificationSchema.set('toObject', {
  virtuals: true
});

// Method to format notification for response
notificationSchema.methods.toResponse = function() {
  return {
    id: this._id.toString(),
    title: this.title,
    message: this.message,
    type: this.type,
    timestamp: this.timestamp,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to create system notifications
notificationSchema.statics.createSystemNotification = async function(data) {
  const notification = new this({
    title: data.title,
    message: data.message,
    type: data.type || 'info',
    timestamp: data.timestamp || Date.now()
  });
  
  return await notification.save();
};

module.exports = mongoose.model("Notification", notificationSchema);