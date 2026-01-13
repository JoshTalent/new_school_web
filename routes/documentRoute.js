// routes/documentRoutes.js
const express = require("express");
const documentModel = require("../models/documentModel");
const router = express.Router();
// If you have authentication middleware, keep it. Otherwise remove.
// const authorizeAdmin = require("../middlewares/authentication");
require("dotenv").config();

// Adding new document API
router.post("/add", async (req, res) => {
  try {
    const { 
      name,           // Changed from title to name
      description, 
      category, 
      fileSize, 
      fileType,
      uploadDate,     // Optional - will use default if not provided
      url 
    } = req.body;

    // Check if required data is provided
    if (!name || !category || !fileType || !url) {
      return res.status(400).json({ 
        message: "Name, category, fileType, and URL are required" 
      });
    }

    // Check if document already exists by name
    const isDocumentExist = await documentModel.findOne({ name });
    if (isDocumentExist) {
      return res.status(400).json({ message: "Document with this name already exists" });
    }

    // Create new document - Mongoose will handle defaults
    const newDocument = new documentModel({
      name,           // Use name instead of title
      description: description || "",
      category,
      fileSize: fileSize || "0 MB",
      fileType,
      url,
      // uploadDate will be set automatically by default Date.now
      // Only set custom uploadDate if provided
      ...(uploadDate && { uploadDate: new Date(uploadDate) })
    });

    const savedDocument = await newDocument.save();

    return res.status(201).json({
      message: "Document added successfully",
      data: savedDocument,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Selecting all documents
router.get("/select/all", async (req, res) => {
  try {
    const documents = await documentModel.find().sort({ uploadDate: -1 });
    
    if (!documents || documents.length === 0) {
      return res.status(404).json({ message: "No documents found" });
    }
    
    res.status(200).json({
      message: "Documents retrieved successfully",
      data: documents,
      count: documents.length
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Get documents by category
router.get("/select/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    
    // Validate category
    const validCategories = ['administrative', 'academic', 'financial', 'announcement', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        message: "Invalid category",
        validCategories 
      });
    }
    
    const documents = await documentModel.find({ category }).sort({ uploadDate: -1 });
    
    if (!documents || documents.length === 0) {
      return res.status(404).json({ 
        message: `No documents found in category: ${category}` 
      });
    }
    
    res.status(200).json({
      message: `Documents in category '${category}' retrieved successfully`,
      data: documents,
      count: documents.length
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Search for document by ID
router.get("/select/id/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: "Please provide a document ID" });
    }
    
    const document = await documentModel.findById(id);
    
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    
    res.status(200).json({
      message: "Document retrieved successfully",
      data: document
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Search documents by name or description (partial match)
router.get("/search", async (req, res) => {
  try {
    const { name, category, description } = req.query;
    
    let query = {};
    
    if (name) {
      query.name = { $regex: name, $options: "i" }; // Case-insensitive search
    }
    
    if (description) {
      query.description = { $regex: description, $options: "i" };
    }
    
    if (category) {
      query.category = category;
    }
    
    const documents = await documentModel.find(query).sort({ uploadDate: -1 });
    
    if (!documents || documents.length === 0) {
      return res.status(404).json({ message: "No documents found matching your criteria" });
    }
    
    res.status(200).json({
      message: "Documents retrieved successfully",
      data: documents,
      count: documents.length
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Update document by ID
router.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!id) {
      return res.status(400).json({ message: "Please provide a document ID" });
    }
    
    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.uploadDate; // Keep original upload date
    delete updateData.createdAt; // Mongoose handles this
    
    // Check if trying to update name and if new name already exists
    if (updateData.name) {
      const existingDoc = await documentModel.findOne({ 
        name: updateData.name,
        _id: { $ne: id } // Exclude current document
      });
      
      if (existingDoc) {
        return res.status(400).json({ 
          message: "Document with this name already exists" 
        });
      }
    }
    
    const updatedDocument = await documentModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedDocument) {
      return res.status(404).json({ message: "Document not found" });
    }
    
    res.status(200).json({
      message: "Document updated successfully",
      data: updatedDocument
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete document by ID
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: "Please provide a document ID" });
    }
    
    const deletedDocument = await documentModel.findByIdAndDelete(id);
    
    if (!deletedDocument) {
      return res.status(404).json({ message: "Document not found" });
    }
    
    res.status(200).json({ 
      message: "Document deleted successfully",
      deletedDocument: {
        id: deletedDocument._id,
        name: deletedDocument.name
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Get recent documents (optional - added functionality)
router.get("/recent", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const recentDocuments = await documentModel.find()
      .sort({ uploadDate: -1 })
      .limit(limit);
    
    res.status(200).json({
      message: "Recent documents retrieved successfully",
      data: recentDocuments,
      count: recentDocuments.length
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Get all categories with counts (optional - added functionality)
router.get("/categories", async (req, res) => {
  try {
    const categories = await documentModel.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          latest: { $max: "$uploadDate" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.status(200).json({
      message: "Categories retrieved successfully",
      data: categories
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Simple statistics endpoint
router.get("/stats", async (req, res) => {
  try {
    const totalDocuments = await documentModel.countDocuments();
    
    const documentsByCategory = await documentModel.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const documentsByType = await documentModel.aggregate([
      { $group: { _id: "$fileType", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get recent uploads
    const recentUploads = await documentModel.find()
      .sort({ uploadDate: -1 })
      .limit(5)
      .select("name category uploadDate fileType");
    
    res.status(200).json({
      message: "Statistics retrieved successfully",
      data: {
        totalDocuments,
        byCategory: documentsByCategory,
        byType: documentsByType,
        recentUploads
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Simple download endpoint (for tracking or direct download)
// This returns the document URL for download
router.get("/download/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await documentModel.findById(id);
    
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    
    // If you want to track downloads, you'd need to add a downloads field to your model
    // For now, just return the URL
    res.status(200).json({
      message: "Document URL retrieved successfully",
      data: {
        id: document._id,
        name: document.name,
        url: document.url,
        fileType: document.fileType,
        fileSize: document.fileSize
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;