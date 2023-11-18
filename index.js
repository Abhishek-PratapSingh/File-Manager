const express = require('express');
const { Client } = require('pg');
const bodyParser = require('body-parser');
require('dotenv').config()
const multer = require('multer');
const app = express();
const cors = require('cors');
const PORT = process.env.APP_PORT || 3000;
const jwt = require('jsonwebtoken')
app.use(bodyParser.json());
app.use(cors());
const bcrypt = require('bcryptjs')
const path = require('path');

// Connect to PostgreSQL
const client = new Client({
  user: process.env.user ,
  host: process.env.host,
  database: process.env.database,
  password: process.env.password,
  port: process.env.port
});

client.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Error connecting to PostgreSQL', err));

//define the user schema
const users = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);
`;

// Define the Folder schema
const folderSchema = `
CREATE TABLE IF NOT EXISTS folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) NOT NULL
);
`;

// Define the Subfolder schema
const subfolderSchema = `
CREATE TABLE IF NOT EXISTS subfolders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  parent_folder_id INTEGER REFERENCES folders(id) NOT NULL,
  user_id INTEGER REFERENCES users(id) NOT NULL
);
`;

client.query(users);
client.query(folderSchema);
client.query(subfolderSchema);

// Parse JSON requests
// User Registration endpoint
app.post('/api/register', async (req, res) => {
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
  

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Invalid token' });
  
      req.user = user;
      next();
    });
  };

// User Login endpoint
app.post('/api/login', async (req, res) => {
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

// Create a new folder endpoint
app.post('/api/folders', verifyToken, async (req, res) => {
  try {
    const { name, userId } = req.body;

    // Check if the folder name is unique
    const existingFolderQuery = 'SELECT * FROM folders WHERE name = $1';
    const existingFolder = await client.query(existingFolderQuery, [name]);
    if (existingFolder.rows.length > 0) {
      return res.status(400).json({ error: 'Folder name must be unique' });
    }

    // Create a new folder
    const createFolderQuery = 'INSERT INTO folders (name, user_id) VALUES ($1, $2) RETURNING *';
    const newFolder = await client.query(createFolderQuery, [name, userId]);

    res.status(201).json({ message: 'Folder created successfully', folder: newFolder.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create a new subfolder endpoint
app.post('/api/subfolders',verifyToken,  async (req, res) => {
  try {
    const { name, parentId, userId } = req.body;

    // Check if the user has permission to create a subfolder in the parent folder
    const parentFolderQuery = 'SELECT * FROM folders WHERE id = $1 AND user_id = $2';
    const parentFolder = await client.query(parentFolderQuery, [parentId, userId]);
    if (parentFolder.rows.length === 0) {
      return res.status(403).json({ error: 'Permission denied to create a subfolder in the specified parent folder' });
    }

    // Check if the subfolder name is unique within the parent folder
    const existingSubfolderQuery = 'SELECT * FROM subfolders WHERE name = $1 AND parent_folder_id = $2';
    const existingSubfolder = await client.query(existingSubfolderQuery, [name, parentId]);
    if (existingSubfolder.rows.length > 0) {
      return res.status(400).json({ error: 'Subfolder name must be unique within the parent folder' });
    }

    // Create a new subfolder
    const createSubfolderQuery = 'INSERT INTO subfolders (name, parent_folder_id, user_id) VALUES ($1, $2, $3) RETURNING *';
    const newSubfolder = await client.query(createSubfolderQuery, [name, parentId, userId]);

    res.status(201).json({ message: 'Subfolder created successfully', subfolder: newSubfolder.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


const fileSchema = `
CREATE TABLE IF NOT EXISTS files (
  id SERIAL PRIMARY KEY,
  original_name VARCHAR(255) NOT NULL,
  size INTEGER NOT NULL,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  folder_id INTEGER REFERENCES folders(id) NOT NULL
);
`;

client.query(fileSchema);

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.body.userId; // Assuming userId is sent along with the file upload
    const folderId = req.body.folderId; // Assuming folderId is sent along with the file upload
    // Adjust the destination based on userId and folderId
    const uploadPath = path.join(__dirname, 'uploads', userId, folderId);

    // Ensure the destination folder exists, or create it
    const fs = require('fs');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });
// Upload Files API endpoint
app.post('/api/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const { userId, folderId } = req.body;

    // Check if the user has permission to upload files to the specified folder
    const parentFolderQuery = 'SELECT * FROM folders WHERE id = $1 AND user_id = $2';
    const parentFolder = await client.query(parentFolderQuery, [folderId, userId]);
    if (parentFolder.rows.length === 0) {
      return res.status(403).json({ error: 'Permission denied to upload files to the specified folder' });
    }

    // Extracted file details from multer
    // console.log(req.file)
    const { originalname, size } = req.file;

    // Insert file metadata into the database
    const insertFileQuery = `
      INSERT INTO files (original_name, size, user_id, folder_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const newFile = await client.query(insertFileQuery, [originalname, size, userId, folderId]);

    res.status(200).json({
      message: 'File uploaded successfully',
      file: newFile.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/files/:fileId/move', verifyToken, async (req, res) => {
    try {
      const { fileId } = req.params;
      const { newFolderId } = req.body;
  
      // Check if the user has permission to move the file
      const fileQuery = 'SELECT * FROM files WHERE id = $1 AND user_id = $2';
      const file = await client.query(fileQuery, [fileId, req.user.userId]);
      if (file.rows.length === 0) {
        return res.status(403).json({ error: 'Permission denied to move the specified file' });
      }
      // Check if the new folder exists and belongs to the same user
      const newFolderQuery = 'SELECT * FROM folders WHERE id = $1 AND user_id = $2';
      const newFolder = await client.query(newFolderQuery, [newFolderId, req.user.userId]);
      if (newFolder.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid destination folder' });
      }
  
      // Move the file to the new folder
      const moveFileQuery = 'UPDATE files SET folder_id = $1 WHERE id = $2 RETURNING *';
      const movedFile = await client.query(moveFileQuery, [newFolderId, fileId]);
  
      res.status(200).json({ message: 'File moved successfully', file: movedFile.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  app.post('/api/files/:fileId/rename', verifyToken, async (req, res) => {
    try {
      const { fileId } = req.params;
      const { newName } = req.body;
  
      // Check if the user has permission to rename the file
      const fileQuery = 'SELECT * FROM files WHERE id = $1 AND user_id = $2';
      const file = await client.query(fileQuery, [fileId, req.user.userId]);
      if (file.rows.length === 0) {
        return res.status(403).json({ error: 'Permission denied to rename the specified file' });
      }
  
      // Rename the file
      const renameFileQuery = 'UPDATE files SET original_name = $1 WHERE id = $2 RETURNING *';
      const renamedFile = await client.query(renameFileQuery, [newName, fileId]);
  
      res.status(200).json({ message: 'File renamed successfully', file: renamedFile.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/files/:fileId/delete', verifyToken, async (req, res) => {
    try {
      const { fileId } = req.params;
  
      // Check if the user has permission to delete the file
      const fileQuery = 'SELECT * FROM files WHERE id = $1 AND user_id = $2';
      const file = await client.query(fileQuery, [fileId, req.user.userId]);
      if (file.rows.length === 0) {
        return res.status(403).json({ error: 'No such file' });
      }
  
      // Delete the file
      const deleteFileQuery = 'DELETE FROM files WHERE id = $1 RETURNING *';
      const deletedFile = await client.query(deleteFileQuery, [fileId]);
  
      res.status(200).json({ message: 'File deleted successfully', file: deletedFile.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  
app.get('/', (req, res) => {
    console.log("root route");
    res.send("Welcome to home page of the server!");
})

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
