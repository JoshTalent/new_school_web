const express = require("express");
const Event = require("../models/eventsModel");
const router = express.Router();

// Debug middleware
router.use((req, res, next) => {
  console.log(`📥 Events Route: ${req.method} ${req.path}`);
  next();
});

// GET all events
router.get("/", async (req, res) => {
  try {
    console.log("📋 Fetching all events...");
    
 
    
    const events = await Event.find({ isActive: true }).sort({ date: 1 });
    
    if (!events || events.length === 0) {
      return res.status(200).json({
        message: "No events found",
        data: []
      });
    }

    res.status(200).json({
      message: "Events retrieved successfully",
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error("❌ Error fetching events:", error);
    
    // Return mock data if database fails
    res.status(200).json({
      message: "Using mock data due to database error",
    });
  }
});


// GET single event by ID
router.get("/:id", async (req, res) => {
  try {
    console.log(`🔍 Fetching event with ID: ${req.params.id}`);
    
    const event = await Event.findOne({ 
      id: req.params.id,
      isActive: true 
    });

    if (!event) {
      return res.status(404).json({ 
        message: "Event not found" 
      });
    }

    res.status(200).json({
      message: "Event retrieved successfully",
      data: event
    });
  } catch (error) {
    console.error("❌ Error fetching event:", error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// POST create new event
router.post("/", async (req, res) => {
  try {
    console.log("➕ Creating new event...", req.body);
    
    const {
      id,
      title,
      description,
      image,
      date,
      time,
      location,
      category,
      maxAttendees
    } = req.body;

    // Validation
    if (!id || !title || !description || !image || !date || !time || !location || !category || !maxAttendees) {
      return res.status(400).json({ 
        message: "All fields are required" 
      });
    }

    // Check if event with same ID already exists
    const existingEvent = await Event.findOne({ id });
    if (existingEvent) {
      return res.status(400).json({ 
        message: "Event with this ID already exists" 
      });
    }

    // Validate date is in the future
    const eventDate = new Date(date);
    if (eventDate < new Date()) {
      return res.status(400).json({ 
        message: "Event date must be in the future" 
      });
    }

    // Create new event
    const newEvent = new Event({
      id,
      title,
      description,
      image,
      date: eventDate,
      time,
      location,
      category,
      maxAttendees,
      attendees: 0,
      isActive: true
    });

    const savedEvent = await newEvent.save();

    res.status(201).json({
      message: "Event created successfully",
      data: savedEvent
    });
  } catch (error) {
    console.error("❌ Error creating event:", error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// PUT update event
router.put("/:id", async (req, res) => {
  try {
    console.log(`✏️ Updating event ${req.params.id}...`);
    
    const updateData = req.body;
    
    // If updating date, validate it
    if (updateData.date) {
      const eventDate = new Date(updateData.date);
      if (eventDate < new Date()) {
        return res.status(400).json({ 
          message: "Event date must be in the future" 
        });
      }
      updateData.date = eventDate;
    }

    // If updating maxAttendees, ensure it's not less than current attendees
    if (updateData.maxAttendees !== undefined) {
      const currentEvent = await Event.findOne({ id: req.params.id });
      if (currentEvent && updateData.maxAttendees < currentEvent.attendees) {
        return res.status(400).json({ 
          message: "Max attendees cannot be less than current attendees" 
        });
      }
    }

    const updatedEvent = await Event.findOneAndUpdate(
      { id: req.params.id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({ 
        message: "Event not found" 
      });
    }

    res.status(200).json({
      message: "Event updated successfully",
      data: updatedEvent
    });
  } catch (error) {
    console.error("❌ Error updating event:", error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// DELETE event
router.delete("/:id", async (req, res) => {
  try {
    console.log(`🗑️ Deleting event ${req.params.id}...`);
    
    const deletedEvent = await Event.findOneAndDelete({ 
      id: req.params.id 
    });

    if (!deletedEvent) {
      return res.status(404).json({ 
        message: "Event not found" 
      });
    }

    res.status(200).json({
      message: "Event deleted successfully",
      eventId: req.params.id
    });
  } catch (error) {
    console.error("❌ Error deleting event:", error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});



module.exports = router;