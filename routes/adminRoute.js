// routes/adminRoute.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Admin = require("../models/adminModel");
const dotenv = require("dotenv");

dotenv.config();

// ==================== 1. SEED ADMIN DATA ====================
/**
 * Create seed admin (One-time setup)
 * Only works if no admin exists in database
 */
router.post("/seed", async (req, res) => {
  try {
    // Check if any admin already exists
    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return res.status(400).json({
        message: "Admin already exists. Use login or forget password instead.",
        existingAdminEmail: existingAdmin.email,
      });
    }

    // Default seed credentials (can be customized via env or request body)
    const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@example.com";
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123";

    const { email = defaultEmail, password = defaultPassword } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the admin
    const admin = new Admin({
      email: email,
      password: hashedPassword,
    });

    await admin.save();

    return res.status(201).json({
      success: true,
      message: "Seed admin created successfully",
      data: {
        id: admin._id,
        email: admin.email,
        note: "Please save these credentials securely. You can now login.",
      },
    });
  } catch (error) {
    console.error("Seed admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create seed admin",
      error: error.message,
    });
  }
});

// ==================== 2. ADMIN LOGIN ====================
/**
 * Login existing admin
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message:
          "Admin not found. Check your email or create seed admin first.",
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    // Successful login
    return res.status(200).json({
      success: true,
      message: "Login successful",
      admin: {
        id: admin._id,
        email: admin.email,
        createdAt: admin.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
});

// ==================== 3. FORGET PASSWORD ====================
/**
 * Step 1: Verify admin email (no token needed)
 * This verifies the admin exists and prepares for password reset
 */
router.post("/forget-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if admin exists with this email
    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found with this email",
      });
    }

    // Email verification successful
    // In a real app, you would send an email here
    // For simplicity, we just return success
    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now reset your password.",
      adminId: admin._id,
      email: admin.email,
      instructions:
        "Use the reset-password endpoint with admin ID and new password",
    });
  } catch (error) {
    console.error("Forget password error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process forget password request",
      error: error.message,
    });
  }
});

// ==================== 4. RESET PASSWORD ====================
/**
 * Step 2: Reset password after email verification
 * Requires admin ID and new password
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { adminId, newPassword } = req.body;

    if (!adminId || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Admin ID and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Find admin by ID
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    admin.password = hashedPassword;
    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
      admin: {
        id: admin._id,
        email: admin.email,
        updatedAt: admin.updatedAt,
      },
      note: "You can now login with your new password",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
});

// ==================== 5. UPDATE ADMIN CREDENTIALS ====================
/**
 * Update admin email and/or password
 * Requires admin ID and current password for security
 */
router.put("/update/:id", async (req, res) => {
  try {
    const adminId = req.params.id;
    const { currentPassword, newEmail, newPassword } = req.body;

    // Validate input
    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password is required for verification",
      });
    }

    if (!newEmail && !newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "At least one field (newEmail or newPassword) must be provided",
      });
    }

    // Find admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      admin.password,
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Prepare update object
    const updates = {};

    if (newEmail) {
      // Check if new email is already taken by another admin
      const emailExists = await Admin.findOne({
        email: newEmail.toLowerCase(),
        _id: { $ne: adminId },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email is already in use by another admin",
        });
      }

      updates.email = newEmail.toLowerCase();
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters long",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updates.password = hashedPassword;
    }

    // Update admin
    const updatedAdmin = await Admin.findByIdAndUpdate(adminId, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    return res.status(200).json({
      success: true,
      message: "Admin credentials updated successfully",
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error("Update admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update admin credentials",
      error: error.message,
    });
  }
});

// ==================== 6. GET ADMIN INFO ====================
/**
 * Get admin information (excluding password)
 */
router.get("/:id", async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select("-password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      admin: admin,
    });
  } catch (error) {
    console.error("Get admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get admin information",
      error: error.message,
    });
  }
});

// ==================== 7. CHECK IF ADMIN EXISTS ====================
/**
 * Check if admin account exists
 */
router.get("/check/exists", async (req, res) => {
  try {
    const admin = await Admin.findOne().select("email createdAt");

    if (!admin) {
      return res.status(200).json({
        success: true,
        exists: false,
        message: "No admin account found. Use seed endpoint to create one.",
      });
    }

    return res.status(200).json({
      success: true,
      exists: true,
      admin: {
        email: admin.email,
        createdAt: admin.createdAt,
      },
    });
  } catch (error) {
    console.error("Check admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check admin status",
      error: error.message,
    });
  }
});

module.exports = router;
