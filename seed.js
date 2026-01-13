// seed.js - Run this file once to create seed data
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Admin = require("./models/adminModel"); // Adjust path as needed

const seedAdmins = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect("mongodb://localhost:27017/school", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Connected to MongoDB");

    // Clear existing admins (optional)
    await Admin.deleteMany({});
    console.log("Cleared existing admin data");

    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const hashedPassword1 = await bcrypt.hash("admin123", salt);
    const hashedPassword2 = await bcrypt.hash("superadmin456", salt);

    // Seed data
    const admins = [
      {
        email: "admin@example.com",
        password: hashedPassword1,
      },
      {
        email: "superadmin@example.com",
        password: hashedPassword2,
      },
    ];

    // Insert seed data
    await Admin.insertMany(admins);
    console.log("Seed data created successfully!");
    
    // Display the created admins
    const createdAdmins = await Admin.find({});
    console.log("Created admins:");
    createdAdmins.forEach(admin => {
      console.log(`Email: ${admin.email}`);
    });

    // Close connection
    await mongoose.connection.close();
    console.log("Connection closed");

  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedAdmins();