const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const mockTestRoutes = require('./routes/mockTestRoutes');
const connection = require("./config/db.js");
const { body, validationResult } = require("express-validator");

// Initialize the application
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Replaces body-parser for JSON parsing
app.use(bodyParser.urlencoded({ extended: true })); // Retain if URL encoding is needed

// Routes
app.use('/api/mocktest', mockTestRoutes);
app.use("/api", userRoutes);

// Routes Definitions

// Add Resume Route
app.post("/api/resume", async (req, res) => {
  const {
    firstName,
    lastName,
    address,
    jobTitle,
    linkedinId,
    experience,
    education,
    skills,
  } = req.body;

  const query = `
    INSERT INTO resumes 
    (first_name, last_name, address, job_title, linkedin_id, experience, education, skills) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  try {
    const [result] = await connection.query(query, [
      firstName,
      lastName,
      address,
      jobTitle,
      linkedinId,
      JSON.stringify(experience),
      JSON.stringify(education),
      JSON.stringify(skills),
    ]);
    res.status(201).json({ message: "Resume saved successfully!", resumeId: result.insertId });
  } catch (err) {
    console.error("Error saving resume data:", err.message);
    res.status(500).json({ error: "Error saving resume data" });
  }
});

// Resume Builder Route
app.post("/api/resumebuilder", async (req, res) => {
  const { firstName, lastName, address, jobTitle, linkedinId, phone, email } = req.body;

  const query = `
    INSERT INTO resumeUser 
    (first_name, last_name, address, job_title, linkedin_id, phone, email) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

  try {
    const [result] = await connection.query(query, [
      firstName, lastName, address, jobTitle, linkedinId, phone, email,
    ]);
    res.status(200).json({ message: "User data saved successfully", userId: result.insertId });
  } catch (err) {
    console.error("Error saving user data:", err.message);
    res.status(500).json({ error: "Error saving user data" });
  }
});

// Experience Route
app.post("/api/experience", async (req, res) => {
  const { company, position, startDate, endDate, isCurrent, userId } = req.body;

  const query = `
    INSERT INTO experience 
    (user_id, company, position, start_date, end_date, is_current) 
    VALUES (?, ?, ?, ?, ?, ?)`;

  try {
    const [result] = await connection.query(query, [
      userId, company, position, startDate, endDate, isCurrent ? 1 : 0,
    ]);
    res.status(200).json({ message: "Experience data saved successfully", experienceId: result.insertId });
  } catch (err) {
    console.error("Error saving experience data:", err.message);
    res.status(500).json({ error: "Error saving experience data" });
  }
});

// Applications Route
app.get("/applications", async (req, res) => {
  try {
    const [applications] = await connection.query(`
      SELECT a.application_id AS id, j.job_role AS jobRole, 
             u.name AS applicantName, a.applied_at AS submissionDate, a.status
      FROM applications a
      JOIN users u ON a.user_id = u.user_id
      JOIN jobs j ON a.job_id = j.job_id`);
    res.json(applications);
  } catch (err) {
    console.error("Error retrieving applications:", err.message);
    res.status(500).json({ error: "Error retrieving applications" });
  }
});

// Update Application Status Route
app.put("/applications/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await connection.query("UPDATE applications SET status = ? WHERE application_id = ?", [status, id]);
    res.json({ message: "Application status updated successfully" });
  } catch (err) {
    console.error("Error updating application status:", err.message);
    res.status(500).json({ error: "Error updating application status" });
  }
});

// Payment Route
app.post("/api/payment", [
  body("fullName").notEmpty().withMessage("Full Name is required"),
  body("email").isEmail().withMessage("Invalid email format"),
  body("phone").isLength({ min: 9, max: 9 }).isNumeric().withMessage("Phone number must be 9 digits"),
  body("cardNumber").isLength({ min: 16, max: 16 }).isNumeric().withMessage("Card number must be 16 digits"),
  body("cvv").isLength({ min: 3, max: 3 }).isNumeric().withMessage("CVV must be 3 digits"),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { fullName, email, phone, cardName, cardNumber, cvv } = req.body;

  try {
    const sql = `
      INSERT INTO payments 
      (full_name, email, phone, card_name, card_number, cvv) 
      VALUES (?, ?, ?, ?, ?, ?)`;
    const [result] = await connection.query(sql, [fullName, email, phone, cardName, cardNumber, cvv]);
    res.status(201).json({ message: "Payment processed successfully!", paymentId: result.insertId });
  } catch (err) {
    console.error("Error processing payment:", err.message);
    res.status(500).json({ error: "Error processing payment" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
