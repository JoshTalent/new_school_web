const mongoose = require("mongoose");

const leaderSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, default: "" },
  image: { type: String, default: "" },
  social: {
    linkedin: { type: String, default: "#" },
    email: { type: String, required: true }
  },
  category: { type: String, default: "" },
  phone: { type: String, default: "" },
  profession: { type: String, default: "" },
}, {
  timestamps: true // Optional: adds createdAt and updatedAt automatically
});


module.exports = mongoose.model("leader", leaderSchema);