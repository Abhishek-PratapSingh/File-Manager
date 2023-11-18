const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const client = require('../database.js'); 

router.post('/register', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Check if the user with the given email already exists
      const existingUserQuery = `SELECT * FROM users WHERE email = $1`;
    //   console.log(existingUserQuery)
      const existingUser = await client.query(existingUserQuery, [email]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email is already taken' });
      }
  
      // Create a new user
      const salt = await bcrypt.genSalt(10)
      const secpass = await bcrypt.hash(password, salt)
      const createUserQuery = 'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *';
      const newUser = await client.query(createUserQuery, [email, secpass]);
  
      res.status(201).json({ message: 'User registered successfully', user: newUser.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
// User Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the user with the given email and password exists
    const loginUserQuery = 'SELECT * FROM users WHERE email = $1';
    const loginUser = await client.query(loginUserQuery, [email]);
    // console.log(loginUser)
    const password_compare = await bcrypt.compare(password, loginUser.rows[0].password)
    if (!password_compare) {
      return res.status(401).json({ error: 'Invalid user or password' });
    }
     // Generate JWT token
     const token = jwt.sign({ userId: loginUser.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });
     res.status(200).json({ message: 'Login successful', userId: loginUser.rows[0].id, token });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


module.exports = router