const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const bodyparser=require("body-parser");
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const dotenv = require('dotenv');
dotenv.config();
// Initialize Express app
const app = express();
app.use(express.json());  
app.use(express.urlencoded({ extended: true }));  
app.use(cors());
app.use('/uploads', express.static('uploads'));

// MongoDB connection (replace with your MongoDB URI)
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// User Schema
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// User Model
const User = mongoose.model('User', userSchema);

// Routes

// Register user
app.post('/SignUpScreen', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
      
    // const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//LOGINUPSCREEN

app.post("/LoginUpScreen", async (req, res) => {
  const { emailOrPhone, password } = req.body;
  try {
    if (!emailOrPhone || !password) {
      return res.status(400).json({ message: "Email/Phone and Password are required." });
    }

    // Find user by email or phone
    const user = await User.findOne({ 
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    console.log("Stored Hashed Password:", user.password);

    // Compare the provided password with the hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Route to reset password
app.post("/ForgotScreen", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

//EDITPROFILESCREEN

const userProfileSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  dob: String,
  address: String,
  profileImage: String
});

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// API Endpoint to update user profile
app.post('/api/EditProfileScreen', upload.single('profileImage'), async (req, res) => {
  try {
    const { name, email, phone, dob, address } = req.body;

    const profileImage = req.file ? `/uploads/${req.file.filename}` : '';
    console.log(" Received Data:", { name, email, phone, dob, address });

    // Create a new profile in the database
    const newUserProfile = new UserProfile({
      name,
      email,
      phone,
      dob,
      address,
      profileImage
    });
    // Save the profile to the database
    const savedProfile = await newUserProfile.save();
    console.log("Saved Profile:", savedProfile); 

    // Send success response
    return res.json({ message: 'Profile created successfully', user: savedProfile });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to save profile' });
  }
});


//PROFILESCREEN

app.get("/api/ProfileScreen", async (req, res) => {
  try {
    console.log("Fetching user profile..."); // Debugging log

    const user = await UserProfile.findOne().sort({ _id: -1 }); // Fetch the first user
    if (!user) {
      return res.status(404).json({ error: "No users found" });
    }
    res.json({name: user.name, email: user.email, profileImage: user.profileImage});
  } catch (error) {
    console.error("Error fetching profile:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }

});

app.use(express.json()); // Make sure this is added to parse JSON bodies


//FEEDBACK
// Define the feedback schema
const feedbackSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  message: { type: String, required: true },
  feedbackTypes: { type: [String], required: true },
  rating: { type: Number, required: true },
});

// Create the feedback model
const Feedback = mongoose.model('Feedback', feedbackSchema);

// POST endpoint to handle form submission
app.post('/Feedback', async (req, res) => {
  try {
    const { fullName, email, phone, message, feedbackTypes, rating } = req.body;

    // Create new feedback document
    const newFeedback = new Feedback({
      fullName,
      email,
      phone,
      message,
      feedbackTypes,
      rating
    });

    // Save the feedback in the database
    await newFeedback.save();

    // Respond with a success message
    res.status(201).json({ message: 'Feedback submitted successfully!' });
  } catch (err) {
    console.error('Error saving feedback:', err);
    res.status(500).json({ error: 'Error submitting feedback' });
  }
});

// Notification Schema & Model
const NotificationSchema = new mongoose.Schema({
  title: String,
  message: String,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Notification = mongoose.model("Notification", NotificationSchema);

// API to fetch notifications
// app.get("/Notifications", async (req, res) => {
//   try {
//     const notifications = await Notification.find().sort({ createdAt: -1 });
//     res.json(notifications);
//   } catch (error) {
//     res.status(500).json({ error: "Error fetching notifications" });
//   }
// });

// // API to add a new notification (Optional)
// app.post("/Notifications", async (req, res) => {
//   try {
//     const { title, message } = req.body;
//     const newNotification = new Notification({ title, message });
//     await newNotification.save();
//     res.status(201).json(newNotification);
//   } catch (error) {
//     res.status(500).json({ error: "Error adding notification" });
//   }
// });

// // Seed sample notifications (Optional)
// app.get("/Notifications", async (req, res) => {
//   const {title, message }=req.body;
//   const newNotification = {
//     _id: new Date().getTime().toString(), // Generate a fake _id for this example
//     title,
//     message,
//     createdAt: new Date().toISOString(), // Current timestamp
//     __v: 0 // Version key (for MongoDB)
//   };
//   // Add new notification to the array (in-memory storage, replace with database)
//   notifications.push(newNotification);
//   // Respond with a success message
//   res.status(200).json({ message: "Notification added successfully" });
// });


      //  API: Fetch Notifications
app.get("/Notifications", async (req, res) => {
  try {
    const notifications = await Notification.find();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Error fetching notifications" });
  }
});

//  API: Mark Notifications as Read
app.post("/Notifications/mark-read", async (req, res) => {
  try {
    await Notification.updateMany({}, { $set: { read: true } });
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ error: "Error updating notifications" });
  }
});

// API: Add a New Notification
app.post("/Notifications/add", async (req, res) => {
  try {
    const { title, message } = req.body;
    const notification = new Notification({ title, message, read: false });
    await notification.save();
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: "Error adding notification" });
  }
});

//CONTACT US
const contactData = {
  email: "vishwasritechnologies@vishcom.net",
  website: "https://www.vishcom.net",
  officeAddress: "Vishwasi Technologies, H.no: 10-72/b/vb, Flat no: T - 400/8, Technopolis, Gachibowli Complex, Dwaraka das colony, Begumpet 500016",
  location: {
    latitude: 17.4441147,
    longitude: 78.4607775,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  },
  googleMapsLink: "https://www.google.com/maps/place/Vishwasri+Technologies+Pvt.Ltd/@17.4441147,78.4607775,17z/data=!3m1!4b1!4m6!3m5!1s0x3bcb9100083e8389:0xceb1ec1986df69c8!8m2!3d17.4441096!4d78.4633524!16s%2Fg%2F11wwpw6zvb?entry=ttu&g_ep=EgoyMDI1MDEyOS4xIKXMDSoASAFQAw%3D%3D",
  availability: "Mon - Sat | 9 AM - 6 PM",
};

// API endpoint to get contact and location details
app.get('/contact-info', (req, res) => {
  res.json(contactData);
});


// Start the server
const PORT = 5000; // Replace with your preferred port
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



// // UPLOADING IMAGE 

// //  MongoDB Schema for Member Profiles
// const MemberSchema = new mongoose.Schema({
//   fullName: String,
//   profilePic: String,
// });

// const Member = mongoose.model("Member", MemberSchema);

// //  API Endpoint to upload user profile image
// app.post("/api/uploadMemberPic", upload.single("profilePic"), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "No image uploaded" });
//     }

//     //  Update the member profile with the new profile picture
//     const member = await Member.findOneAndUpdate(
//       { _id: req.body.memberId }, //  Find member by ID
//       { profilePic: `/memberImages/${req.file.filename}` }, // ✅ Store the image path
//       { new: true }
//     );

//     if (!member) {
//       return res.status(404).json({ error: "Member not found" });
//     }

//     res.json({ message: "Profile picture updated successfully", profilePic: member.profilePic });
//   } catch (error) {
//     console.error("Upload Error:", error);
//     res.status(500).json({ error: "Failed to upload profile picture" });
//   }
// });

// //  Serve uploaded images statically
// app.use("/memberImages", express.static(uploadDirectory));





//   try {
//     await Notification.insertMany([
//       {
//         title: "New Feature Update Available!",
//         message: "We've added exciting new features to enhance your experience. Check them out!",
//       },
//       {
//         title: "Your Support Ticket Has Been Resolved!",
//         message: "Issue #12345 has been successfully resolved. Click to view details.",
//       },
//       {
//         title: "Upcoming Webinar: Register Now!",
//         message: "Join our expert panel for a live session on AI trends in business. Register today!",
//       },
//       {
//         title: "Security Alert: Login from a New Device",
//         message: "A new login attempt was detected from an unknown device. Please review your activity.",
//       },
//       {
//         title: "Job Alert: New Openings Available",
//         message: "Exciting job opportunities are now open. Apply today!",
//       },
//     ]);
//     res.json({ message: "Sample notifications added!" });
//   } catch (error) {
//     res.status(500).json({ error: "Error seeding notifications" });
//   }
// });







