const express = require("express");
const Gallery = require("../models/galleryModel");
const router = express.Router();
require("dotenv").config();

// Get all gallery items (public)
router.get("/all", async (req, res) => {
  try {
    const {
      category,
      search,
      sortBy = "-createdAt",
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    let query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const skip = (page - 1) * limit;
    
    // Get total count
    const total = await Gallery.countDocuments(query);
    
    // Get paginated results
    const galleryItems = await Gallery.find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit))
      .select("-__v")
      .lean();

    // Add fullImageUrl to each item
    const itemsWithFullUrl = galleryItems.map(item => ({
      ...item,
      fullImageUrl: `${process.env.BASE_URL || ''}${item.imageUrl}`
    }));

    res.status(200).json({
      success: true,
      message: "Gallery items retrieved successfully",
      data: itemsWithFullUrl,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching gallery items:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving gallery items",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Get gallery item by ID (public)
router.get("/item/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const galleryItem = await Gallery.findById(id).select("-__v");
    
    if (!galleryItem) {
      return res.status(404).json({
        success: false,
        message: "Gallery item not found"
      });
    }

    // Get the virtual fullImageUrl
    const itemWithFullUrl = galleryItem.toObject();
    itemWithFullUrl.fullImageUrl = galleryItem.fullImageUrl;

    res.status(200).json({
      success: true,
      message: "Gallery item retrieved successfully",
      data: itemWithFullUrl
    });
  } catch (error) {
    console.error("Error fetching gallery item:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving gallery item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Get categories (public)
router.get("/categories", async (req, res) => {
  try {
    const categories = await Gallery.distinct("category");
    
    // Get count for each category
    const categoryCounts = await Gallery.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      data: {
        categories,
        counts: categoryCounts
      }
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving categories",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Add new gallery item (admin only)
router.post("/add", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      imageUrl,
      altText
    } = req.body;

    // Basic validation
    if (!title || !category || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Title, category, and image URL are required"
      });
    }

    // Create new gallery item
    const newGalleryItem = new Gallery({
      title,
      description: description || "",
      category,
      imageUrl,
      altText: altText || ""
    });

    const savedItem = await newGalleryItem.save();

    // Add fullImageUrl to response
    const itemResponse = savedItem.toObject();
    itemResponse.fullImageUrl = savedItem.fullImageUrl;

    res.status(201).json({
      success: true,
      message: "Gallery item added successfully",
      data: itemResponse
    });
  } catch (error) {
    console.error("Error adding gallery item:", error);
    
    // Handle validation errors
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
      message: "Error adding gallery item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Update gallery item (admin only)
router.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove any fields that shouldn't be updated
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.fullImageUrl;

    const updatedItem = await Gallery.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select("-__v");

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        message: "Gallery item not found"
      });
    }

    // Add fullImageUrl to response
    const itemResponse = updatedItem.toObject();
    itemResponse.fullImageUrl = updatedItem.fullImageUrl;

    res.status(200).json({
      success: true,
      message: "Gallery item updated successfully",
      data: itemResponse
    });
  } catch (error) {
    console.error("Error updating gallery item:", error);
    
    // Handle validation errors
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
      message: "Error updating gallery item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Delete gallery item (admin only)
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedItem = await Gallery.findByIdAndDelete(id);
    
    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        message: "Gallery item not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Gallery item deleted successfully",
      deletedItem: {
        id: deletedItem._id,
        title: deletedItem.title,
        imageUrl: deletedItem.imageUrl
      }
    });
  } catch (error) {
    console.error("Error deleting gallery item:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting gallery item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Get gallery statistics (admin only)
router.get("/stats/overview", async (req, res) => {
  try {
    const total = await Gallery.countDocuments();
    
    // Get recent uploads (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentUploads = await Gallery.countDocuments({
      createdAt: { $gte: weekAgo }
    });

    // Get by category stats
    const categoryStats = await Gallery.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      message: "Statistics retrieved successfully",
      data: {
        total,
        recentUploads,
        byCategory: categoryStats
      }
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Bulk upload gallery items (admin only)
router.post("/bulk-upload", async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items array is required"
      });
    }

    if (items.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 items allowed per bulk upload"
      });
    }

    // Validate each item
    const validatedItems = [];
    for (const item of items) {
      if (!item.title || !item.category || !item.imageUrl) {
        return res.status(400).json({
          success: false,
          message: `Item missing required fields: ${JSON.stringify(item)}`
        });
      }

      validatedItems.push({
        title: item.title,
        description: item.description || "",
        category: item.category,
        imageUrl: item.imageUrl,
        altText: item.altText || ""
      });
    }

    const savedItems = await Gallery.insertMany(validatedItems);

    // Add fullImageUrl to each saved item
    const itemsWithFullUrl = savedItems.map(item => ({
      ...item.toObject(),
      fullImageUrl: `${process.env.BASE_URL || ''}${item.imageUrl}`
    }));

    res.status(201).json({
      success: true,
      message: `${savedItems.length} gallery items uploaded successfully`,
      data: itemsWithFullUrl
    });
  } catch (error) {
    console.error("Error in bulk upload:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading gallery items",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

module.exports = router;