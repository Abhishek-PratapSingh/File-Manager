const express = require('express')
const router = express.Router()
const client = require('../database'); 
const verifyToken = require('../middleware/verifyToken')
const multer = require('multer');
const path = require('path');


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
router.post('/', verifyToken, upload.single('file'), async (req, res) => {
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

  
module.exports = router