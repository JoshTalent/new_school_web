this is my adminModal.js

const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
});

module.exports = mongoose.model("Admin", adminSchema);




and this is my adminRoute.js

// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Admin = require("../models/adminModel"); // Adjust path as needed
const dotenv = require("dotenv");

dotenv.config();

/**
 * Test Route
 */
router.get("/msg", (req, res) => {
  res.json({ message: "hello world" });
});

/**
 * REGISTER ADMIN (only one allowed)
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingAdmin = await adminModel.findOne();
    if (existingAdmin) {
      return res
        .status(400)
        .json({ message: "Only one admin account is allowed" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const adminData = new adminModel({ email, password: hashedPassword });
    const savedAdmin = await adminData.save();

    return res.status(201).json({
      message: "Admin registered successfully",
      data: { id: savedAdmin._id, email: savedAdmin.email },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * ADMIN LOGIN
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userExist = await adminModel.findOne({ email });

    if (!userExist) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(password, userExist.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }

    return res.status(200).json({
      message: "Logged in successfully",
      user: { id: userExist._id, email: userExist.email },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET ALL ADMINS (with search & sort)
 * Example: /api/admins?search=example&sort=asc
 */
router.get("/", async (req, res) => {
  try {
    const { search, sort } = req.query;

    let query = {};
    if (search) {
      query.email = { $regex: search, $options: "i" }; // case-insensitive search
    }

    let adminsQuery = adminModel.find(query).select("-password");

    if (sort === "asc") {
      adminsQuery = adminsQuery.sort({ email: 1 });
    } else if (sort === "desc") {
      adminsQuery = adminsQuery.sort({ email: -1 });
    } else if (sort === "newest") {
      adminsQuery = adminsQuery.sort({ createdAt: -1 });
    }

    const admins = await adminsQuery;

    res.status(200).json({ success: true, count: admins.length, data: admins });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * UPDATE ADMIN (email & password)
 */
router.put("/:id", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updatedAdmin = await adminModel.findByIdAndUpdate(
      req.params.id,
      { email, password: hashedPassword },
      { new: true }
    );

    if (!updatedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({
      message: "Admin updated successfully",
      admin: { id: updatedAdmin._id, email: updatedAdmin.email },
    });
  } catch (error) {
    console.error("Error updating admin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * DELETE ADMIN
 */
router.delete("/:id", async (req, res) => {
  try {
    const deletedAdmin = await adminModel.findByIdAndDelete(req.params.id);
    if (!deletedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (error) {
    console.error("Error deleting admin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});




module.exports = router;



and this is my server.js file

const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const cors = require('cors');

// Add this line to make mongoose available to routes
app.set("mongoose", mongoose);

// routes
const adminRoute = require("./routes/adminRoute");
const documentRoute = require("./routes/documentRoute");
const galleryRoute = require("./routes/galleryRoute");
const leaderRoute = require("./routes/leaderRoute");
const contactRoute = require("./routes/contactRoute");
const notificationRoute = require("./routes/notificationRoute");
const eventsRoute = require("./routes/eventsRoutes");
const applicationRoute = require("./routes/applicationRoute");

// middlewares
app.use(express.json());
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// database connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ DB connected successfully"))
  .catch((err) => console.error("❌ DB connection error:", err));

// route callings to server
app.use("/admin", adminRoute);
app.use("/document", documentRoute);
app.use("/gallery", galleryRoute);
app.use("/leader", leaderRoute);
app.use("/contact", contactRoute);
app.use("/notification", notificationRoute);
app.use("/api/events", eventsRoute);
app.use("/application", applicationRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

