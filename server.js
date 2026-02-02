const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const Admin = require("./models/adminModel");

// middlewares
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Database connection with detailed logging
console.log("🔄 Connecting to MongoDB...");
console.log(`📧 Email from env: ${process.env.DEFAULT_ADMIN_EMAIL}`);
console.log(`🔐 Auto-seed enabled: ${process.env.AUTO_SEED_ADMIN}`);

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ MongoDB connected successfully");
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);

    // Check current admin count
    try {
      const adminCount = await Admin.countDocuments();
      console.log(`👥 Current admin count: ${adminCount}`);

      // List all admins
      const admins = await Admin.find().select("email createdAt");
      console.log(
        `📋 Existing admins:`,
        admins.map((a) => ({ email: a.email, created: a.createdAt })),
      );

      // Auto-create seed admin if none exists
      if (process.env.AUTO_SEED_ADMIN === "true" && adminCount === 0) {
        console.log("🔄 AUTO_SEED_ADMIN is enabled, creating admin...");

        const defaultEmail =
          process.env.DEFAULT_ADMIN_EMAIL || "admin@example.com";
        const defaultPassword =
          process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123";

        console.log(`📝 Creating admin with email: ${defaultEmail}`);

        // Check one more time
        const existingAdmin = await Admin.findOne({
          email: defaultEmail.toLowerCase(),
        });

        if (!existingAdmin) {
          const hashedPassword = await bcrypt.hash(defaultPassword, 10);
          const newAdmin = await Admin.create({
            email: defaultEmail.toLowerCase().trim(),
            password: hashedPassword,
          });

          console.log(`✅ Auto-created seed admin: ${newAdmin.email}`);
          console.log(`🆔 Admin ID: ${newAdmin._id}`);
        } else {
          console.log(`⚠️ Admin already exists: ${existingAdmin.email}`);
        }
      } else if (adminCount > 0) {
        console.log("✅ Admin(s) already exist, skipping auto-seed");
      }
    } catch (error) {
      console.error("❌ Error during admin check:", error.message);
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });

// Debug endpoints (temporary)
app.get("/debug/admin", async (req, res) => {
  try {
    const admins = await Admin.find().select("-password");
    res.json({
      success: true,
      count: admins.length,
      admins: admins,
      envEmail: process.env.DEFAULT_ADMIN_EMAIL,
      autoSeedEnabled: process.env.AUTO_SEED_ADMIN === "true",
      mongoConnected: mongoose.connection.readyState === 1,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/manual-seed", async (req, res) => {
  try {
    const {
      email = process.env.DEFAULT_ADMIN_EMAIL,
      password = process.env.DEFAULT_ADMIN_PASSWORD,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingAdmin) {
      return res.json({
        success: false,
        message: "Admin already exists",
        admin: {
          id: existingAdmin._id,
          email: existingAdmin.email,
          createdAt: existingAdmin.createdAt,
        },
      });
    }

    // Create new admin
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    res.json({
      success: true,
      message: "Admin created successfully",
      admin: {
        id: admin._id,
        email: admin.email,
        createdAt: admin.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating admin",
      error: error.message,
    });
  }
});

// routes
const adminRoute = require("./routes/adminRoute");
const documentRoute = require("./routes/documentRoute");
const galleryRoute = require("./routes/galleryRoute");
const leaderRoute = require("./routes/leaderRoute");
const contactRoute = require("./routes/contactRoute");
const notificationRoute = require("./routes/notificationRoute");
const eventsRoute = require("./routes/eventsRoutes");
const applicationRoute = require("./routes/applicationRoute");

// route callings to server
app.use("/admin", adminRoute);
app.use("/document", documentRoute);
app.use("/gallery", galleryRoute);
app.use("/leader", leaderRoute);
app.use("/contact", contactRoute);
app.use("/notification", notificationRoute);
app.use("/api/events", eventsRoute);
app.use("/application", applicationRoute);

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Admin API Server",
    endpoints: {
      debug: {
        adminStatus: "GET /debug/admin",
        manualSeed: "POST /manual-seed",
      },
      admin: {
        check: "GET /admin/exists",
        seed: "POST /admin/seed",
        login: "POST /admin/login",
        forget: "POST /admin/forget",
        reset: "POST /admin/reset",
        update: "PUT /admin/update/:id",
      },
    },
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}`);
  console.log(
    `🔗 MongoDB: ${mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"}`,
  );
});
