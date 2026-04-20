const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || "fullbellies_secret_key_2024";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// Connect MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/fullbellies", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// Schemas
const SignupSchema = new mongoose.Schema({
  type: String,
  name: String,
  email: String,
  message: String,
  created_at: {
    type: Date,
    default: Date.now
  }
});

const NotificationSchema = new mongoose.Schema({
  type: String,
  message: String,
  recipient: String,
  read: { type: Boolean, default: false },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const AdminSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  created_at: {
    type: Date,
    default: Date.now
  }
});

const Signup = mongoose.model("Signup", SignupSchema);
const Notification = mongoose.model("Notification", NotificationSchema);
const Admin = mongoose.model("Admin", AdminSchema);

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Invalid token" });
    }
    req.adminEmail = decoded.email;
    next();
  });
};

// Routes

// Admin Authentication
app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check hardcoded admin
    if (email === "admin@fullbellies.com" && password === ADMIN_PASSWORD) {
      const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "24h" });
      return res.json({ success: true, token, email });
    }

    res.status(401).json({ success: false, message: "Invalid credentials" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Save signup
app.post("/api/signup", async (req, res) => {
  try {
    const data = new Signup(req.body);
    await data.save();
    res.json({ success: true, message: "Saved successfully", data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all signups (admin panel)
app.get("/api/signup", verifyToken, async (req, res) => {
  try {
    const data = await Signup.find().sort({ created_at: -1 });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send notification
app.post("/api/notification", verifyToken, async (req, res) => {
  try {
    const { message, type, recipient } = req.body;
    const notification = new Notification({
      type,
      message,
      recipient: recipient || "all"
    });
    await notification.save();
    res.json({ success: true, message: "Notification sent", data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all notifications (admin panel)
app.get("/api/notification", verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ created_at: -1 });
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete notification
app.delete("/api/notification/:id", verifyToken, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify admin session
app.get("/api/admin/verify", verifyToken, (req, res) => {
  res.json({ success: true, email: req.adminEmail });
});

// Start server
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});