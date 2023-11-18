const express = require('express')
const router = express.Router()
const client = require('../database.js'); 
const verifyToken = require('../middleware/verifyToken')

router.post('/folders', verifyToken, async (req, res) => {
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
  router.post('/subfolders',verifyToken,  async (req, res) => {
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


  module.exports = router