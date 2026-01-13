const express = require("express");
const Contact = require("../models/contactModel");
const router = express.Router();
require("dotenv").config();


// Submit contact form (public endpoint)
router.post("/submit", async (req, res) => {
  try {
    const { firstname, lastname, email, subject, message } = req.body;

    // Basic validation
    if (!firstname || !lastname || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: firstname, lastname, email, subject, and message"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    // Create new contact submission
    const newContact = new Contact({
      firstname,
      lastname,
      email,
      subject,
      message,
      status: "new",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    const savedContact = await newContact.save();

    // Here you could add email notification logic
    // await sendContactNotificationEmail(savedContact);

    res.status(201).json({
      success: true,
      message: "Thank you for contacting us! We'll get back to you soon.",
      data: {
        id: savedContact._id,
        firstname: savedContact.firstname,
        email: savedContact.email,
        subject: savedContact.subject
      }
    });
  } catch (error) {
    console.error("Contact form submission error:", error);
    
    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: messages
      });
    }

    // Handle duplicate email submissions (optional)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A submission with this email already exists"
      });
    }

    res.status(500).json({
      success: false,
      message: "Error submitting contact form",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Get all contact submissions (admin only)
router.get("/all",  async (req, res) => {
  try {
    const {
      status,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = "-createdAt"
    } = req.query;

    // Build query
    let query = {};
    
    if (status && status !== 'all') query.status = status;
    
    // Search across multiple fields
    if (search) {
      query.$or = [
        { firstname: { $regex: search, $options: 'i' } },
        { lastname: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include entire end day
        query.createdAt.$lte = end;
      }
    }

    const skip = (page - 1) * limit;
    
    // Get total count
    const total = await Contact.countDocuments(query);
    
    // Get paginated results
    const contacts = await Contact.find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit))
      .select("-__v")
      .lean();

    // Get status counts for filtering
    const statusCounts = await Contact.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      message: "Contacts retrieved successfully",
      data: contacts,
      statusCounts: statusCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving contacts",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Get single contact by ID (admin only)
router.get("/:id",  async (req, res) => {
  try {
    const { id } = req.params;
    
    const contact = await Contact.findById(id).select("-__v");
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Contact retrieved successfully",
      data: contact
    });
  } catch (error) {
    console.error("Error fetching contact:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving contact",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});


// Delete single contact (admin only)
router.delete("/:id",  async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedContact = await Contact.findByIdAndDelete(id);
    
    if (!deletedContact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Contact deleted successfully",
      data: {
        id: deletedContact._id,
        email: deletedContact.email
      }
    });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting contact",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Delete multiple contacts (admin only)
router.delete("/bulk/delete", async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Array of contact IDs is required"
      });
    }

    const validIds = ids.filter(id => /^[0-9a-fA-F]{24}$/.test(id));
    
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid contact IDs provided"
      });
    }

    const result = await Contact.deleteMany({
      _id: { $in: validIds }
    });

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} contacts`,
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    console.error("Error deleting bulk contacts:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting contacts",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});



// Export contacts to CSV (admin only)
router.get("/export/csv",  async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = {};
    if (status && status !== 'all') query.status = status;

    const contacts = await Contact.find(query)
      .sort("-createdAt")
      .select("firstname lastname email subject message status createdAt adminNotes")
      .lean();

    // Convert to CSV
    const headers = ["First Name", "Last Name", "Email", "Subject", "Message", "Status", "Date", "Admin Notes"];
    
    const csvRows = contacts.map(contact => [
      `"${contact.firstname || ''}"`,
      `"${contact.lastname || ''}"`,
      `"${contact.email || ''}"`,
      `"${contact.subject || ''}"`,
      `"${(contact.message || '').replace(/"/g, '""')}"`,
      `"${contact.status || ''}"`,
      `"${new Date(contact.createdAt).toLocaleDateString()}"`,
      `"${(contact.adminNotes || '').replace(/"/g, '""')}"`
    ].join(","));

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    
    const filename = `contacts-export-${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error("Error exporting contacts:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting contacts",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

module.exports = router;