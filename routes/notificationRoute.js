// routes/notificationRoute.js
const express = require("express");
const Notification = require("../models/notificationModel");
const router = express.Router();

// Get all notifications with filters
router.get("/", async (req, res) => {
  try {
    const { type, startDate, endDate, limit = 50, page = 1 } = req.query;

    // Build query
    let query = {};
    
    if (type && type !== 'all') {
      query.type = type;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    
    // Get total count
    const total = await Notification.countDocuments(query);
    
    // Get paginated results
    const notifications = await Notification.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Transform to response format
    const transformedNotifications = notifications.map(notification => ({
      id: notification._id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      timestamp: notification.timestamp,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt
    }));

    res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully",
      data: transformedNotifications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving notifications",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Get notification by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification retrieved successfully",
      data: notification.toResponse()
    });
  } catch (error) {
    console.error("Error fetching notification:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving notification",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Create new notification
router.post("/", async (req, res) => {
  try {
    const { title, message, type = 'info', timestamp } = req.body;

    // Basic validation
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required"
      });
    }

    // Validate type
    const validTypes = ['success', 'warning', 'error', 'info'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification type"
      });
    }

    const notificationData = {
      title,
      message,
      type
    };

    if (timestamp) {
      notificationData.timestamp = new Date(timestamp);
    }

    const notification = await Notification.create(notificationData);

    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      data: notification.toResponse()
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating notification",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});


// Update notification
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Validate type if provided
    if (updateData.type) {
      const validTypes = ['success', 'warning', 'error', 'info'];
      if (!validTypes.includes(updateData.type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid notification type"
        });
      }
    }

    // Convert timestamp if provided
    if (updateData.timestamp) {
      updateData.timestamp = new Date(updateData.timestamp);
    }

    const updatedNotification = await Notification.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedNotification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification updated successfully",
      data: updatedNotification.toResponse()
    });
  } catch (error) {
    console.error("Error updating notification:", error);
    
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating notification",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Delete notification
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedNotification = await Notification.findByIdAndDelete(id);
    
    if (!deletedNotification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
      data: {
        id: deletedNotification._id,
        title: deletedNotification.title
      }
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting notification",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Clear all notifications
router.delete("/", async (req, res) => {
  try {
    const result = await Notification.deleteMany({});
    
    res.status(200).json({
      success: true,
      message: "All notifications cleared successfully",
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    res.status(500).json({
      success: false,
      message: "Error clearing notifications",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});


// Seed sample notifications
router.post("/seed", async (req, res) => {
  try {
    const sampleNotifications = [
      {
        title: 'Storage Warning',
        message: 'Gallery storage is reaching 85% capacity',
        type: 'warning',
        timestamp: '2024-01-15T09:15:00Z'
      },
      {
        title: 'New Image Uploaded',
        message: 'Gallery item "Sunset View" has been successfully uploaded',
        type: 'success',
        timestamp: '2024-01-15T10:30:00Z'
      },
      {
        title: 'System Update',
        message: 'New gallery features available in v2.1.0',
        type: 'info',
        timestamp: '2024-01-14T16:45:00Z'
      },
      {
        title: 'Failed Upload',
        message: 'Unable to process image "beach.jpg" - Invalid format',
        type: 'error',
        timestamp: '2024-01-14T14:20:00Z'
      },
      {
        title: 'Backup Completed',
        message: 'Gallery backup has been successfully completed',
        type: 'success',
        timestamp: '2024-01-12T08:30:00Z'
      }
    ];

    // Clear existing notifications
    await Notification.deleteMany({});

    // Insert sample notifications
    const createdNotifications = await Notification.insertMany(sampleNotifications);

    res.status(201).json({
      success: true,
      message: `${createdNotifications.length} sample notifications seeded`,
      data: createdNotifications.map(n => n.toResponse())
    });
  } catch (error) {
    console.error("Error seeding notifications:", error);
    res.status(500).json({
      success: false,
      message: "Error seeding notifications",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

module.exports = router;