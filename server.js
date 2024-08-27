const express = require('express');
const path = require('path');
const mysql = require('mysql');
const cors = require('cors');
const rateLimit = require("express-rate-limit");
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100 
});

app.use(limiter);

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

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
