const jwt = require("jsonwebtoken");
const adminModel = require("../models/adminModel");
require("dotenv").config();

const authorizeAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
  
    if (!authHeader || !authHeader.startsWith("Baerer ")) {
      return res.status(401).json({ message: " no token provided" });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);


    const user = await adminModel.findById(decoded.id);

    if (!user) {
      return res
        .status(401)
        .json({ message: "Unauthorized attempt detected." });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Token expired, please login again." });
    }
    console.log(error.message);
    return res
      .status(500)
      .json({ message: " error found on server ", error: error.message });
  }
};

module.exports = authorizeAdmin;
