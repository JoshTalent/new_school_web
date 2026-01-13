const express = require("express");
const leaderModel = require("../models/leaderModel");
const router = express.Router();
require("dotenv").config();

router.get("/msg", (req, res) => {
  res.json({ message: "hello world" });
});

// Creating leaders API (updated for new schema)
router.post("/add", async (req, res) => {
  try {
    const { 
      id, 
      name, 
      role, 
      image, 
      social, 
      category, 
      phone, 
      profession 
    } = req.body;

    // Required fields check based on new schema
    if (!id || !name || !social?.email) {
      return res.status(400).json({ 
        message: "ID, name, and email are required" 
      });
    }

    // Check if leader with same ID or email already exists
    const isExistById = await leaderModel.findOne({ id });
    const isExistByEmail = await leaderModel.findOne({ "social.email": social.email });
    
    if (isExistById || isExistByEmail) {
      return res.status(400).json({ 
        message: "Leader with this ID or email already exists" 
      });
    }

    // Create new leader with new schema structure
    const newLeader = new leaderModel({
      id,
      name,
      role: role || "",
      image: image || "",
      social: {
        linkedin: social?.linkedin || "#",
        email: social.email
      },
      category: category || "",
      phone: phone || "",
      profession: profession || "",
    });

    const addedLeader = await newLeader.save();

    if (!addedLeader) {
      return res.status(400).json({ message: "Failed to add leader" });
    }

    res.status(201).json({ 
      message: "Leader added successfully", 
      data: addedLeader 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Selecting all leaders
router.get("/select", async (req, res) => {
  try {
    const selectedLeaders = await leaderModel.find().sort({ id: 1 });

    if (!selectedLeaders || selectedLeaders.length === 0) {
      return res.status(404).json({ message: "No leaders found" });
    }

    return res.status(200).json({
      message: "Leaders selected successfully",
      count: selectedLeaders.length,
      data: selectedLeaders,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Getting a specific leader by ID (using custom id field, not MongoDB _id)
router.get("/select/:id", async (req, res) => {
  try {
    const leader = await leaderModel.findOne({ id: req.params.id });

    if (!leader) {
      return res.status(404).json({ message: "Leader not found" });
    }

    return res.status(200).json({
      message: "Leader found successfully",
      data: leader,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Deleting leaders API (updated to use custom id field)
router.delete("/delete/:id", async (req, res) => {
  try {
    // Using custom id field instead of MongoDB _id
    const deletedLeader = await leaderModel.findOneAndDelete({ 
      id: req.params.id 
    });

    if (!deletedLeader) {
      return res.status(404).json({ message: "Leader not found" });
    }

    res.status(200).json({
      message: "Leader deleted successfully",
      leaderId: req.params.id,
      data: deletedLeader,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Updating leaders API (updated for new schema)
router.put("/update/:id", async (req, res) => {
  try {
    const { 
      name, 
      role, 
      image, 
      social, 
      category, 
      phone, 
      profession 
    } = req.body;

    // Find the leader by custom id
    const existingLeader = await leaderModel.findOne({ id: req.params.id });
    
    if (!existingLeader) {
      return res.status(404).json({ message: "Leader not found" });
    }

    // Prepare update object
    const updatedLeader = {};

    if (name) updatedLeader.name = name;
    if (role !== undefined) updatedLeader.role = role;
    if (image !== undefined) updatedLeader.image = image;
    if (category !== undefined) updatedLeader.category = category;
    if (phone !== undefined) updatedLeader.phone = phone;
    if (profession !== undefined) updatedLeader.profession = profession;
    
    // Handle social updates
    if (social) {
      updatedLeader.social = {};
      if (social.linkedin !== undefined) updatedLeader.social.linkedin = social.linkedin;
      if (social.email !== undefined) {
        // Check if email is already used by another leader
        if (social.email !== existingLeader.social.email) {
          const emailExists = await leaderModel.findOne({ 
            "social.email": social.email,
            id: { $ne: req.params.id } // Exclude current leader
          });
          if (emailExists) {
            return res.status(400).json({ 
              message: "Email already in use by another leader" 
            });
          }
        }
        updatedLeader.social.email = social.email;
      }
    }

    // Update the leader
    const updated = await leaderModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: updatedLeader },
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({ message: "Failed to update leader" });
    }

    return res.status(200).json({ 
      message: "Leader updated successfully", 
      data: updated 
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});



module.exports = router;