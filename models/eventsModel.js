const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  id: { 
    type: Number, 
    required: true, 
    unique: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  image: { 
    type: String, 
    required: true 
  },
  date: { 
    type: Date, 
    required: true 
  },
  time: { 
    type: String, 
    required: true 
  },
  location: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    required: true 
  },
  attendees: { 
    type: Number, 
    default: 0,
    min: 0
  },
  maxAttendees: { 
    type: Number, 
    required: true,
    min: 1
  },
  isActive: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true // This automatically creates createdAt and updatedAt
});

EventSchema.index({ date: 1, category: 1 });

module.exports = mongoose.model("Event", EventSchema);

