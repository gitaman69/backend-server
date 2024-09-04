const express = require('express');
const path = require('path');
const mysql = require('mysql');
const multer = require('multer');
const nodemailer = require('nodemailer');
const fs = require('fs');
const cors = require('cors');
const { getMaxListeners } = require('events');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;

// Use CORS
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));


const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// Mail setup
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
      user: 'reymundo.streich@ethereal.email',
      pass: 'Nuz4pEPJuuzrcYNmC8'
  }
});

const sendEmail = (filePath) => {
  const mailOptions = {
    from: "cityrentalsbuisness@gmail.com",
    to: "amanbhaker@gmail.com",
    subject: 'New File Upload',
    text: 'A file has been uploaded.',
    attachments: [
      {
        path: filePath,
      },
    ],
  };

  return transporter.sendMail(mailOptions);
};

db.connect(err => {
  if (err) {
    console.error('Error connecting to the second database:', err);
  } else {
    console.log('Connected to the second database.');
  }
});

// Define an API endpoint to get rentals by city and pincode
app.get('/api/rentals/:cityName/:pincode?', (req, res) => {
  const { cityName, pincode } = req.params;
  
  let query = 'SELECT * FROM propertyinfo WHERE City = ? AND status = "approved"';
  const queryParams = [cityName];

  if (pincode) {
    query += ' AND Pincode = ?';
    queryParams.push(pincode);
  }

  db.query(query, queryParams, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch data' });
      return;
    }
    res.json(results);
  });
});

// Define an API endpoint to get pending listings
app.get('/api/pending-listings', (req, res) => {
  const query = 'SELECT * FROM propertyinfo WHERE status = "pending"';

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch pending listings' });
      return;
    }
    res.json(results);
  });
});

// Define an API endpoint to submit a new listing
app.post('/api/pending-listings', (req, res) => {
  const { name, price, contact, address, pincode, city } = req.body;
  const query = 'INSERT INTO propertyinfo (Name_of_Place, Price, Contact, Address, Pincode, City, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
  const values = [name, price, contact, address, pincode, city, 'pending'];

  db.query(query, values, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      res.status(500).json({ error: 'Failed to submit listing' });
      return;
    }
    res.status(200).json({ message: 'Listing submitted for approval' });
  });
});

// Define an API endpoint to approve a listing
app.post('/api/approve-listing', (req, res) => {
  const { id } = req.body;
  const query = 'UPDATE propertyinfo SET status = "approved" WHERE ID = ?';

  db.query(query, [id], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Failed to approve listing' });
      return;
    }
    res.json({ success: true });
  });
});

// Define an API endpoint to reject a listing
app.post('/api/reject-listing', (req, res) => {
  const { id } = req.body;
  const query = 'UPDATE propertyinfo SET status = "rejected" WHERE ID = ?';

  db.query(query, [id], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Failed to reject listing' });
      return;
    }
    res.json({ success: true });
  });
});

app.post('/api/upload-image', upload.single('file'), (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.file.filename);

  sendEmail(filePath)
    .then(() => {
      fs.unlinkSync(filePath); // Delete the file after sending the email
      res.status(200).send('File uploaded and sent via email.');
    })
    .catch((error) => {
      console.error('Error sending email:', error);
      res.status(500).send('Failed to send email.');
    });
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
