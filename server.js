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