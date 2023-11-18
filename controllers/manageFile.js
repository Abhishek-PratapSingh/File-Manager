const express = require('express')
const router = express.Router()
const client = require('../database'); 
const verifyToken = require('../middleware/verifyToken')

router.post('/:fileId/move', verifyToken, async (req, res) => {
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
  
 router.post('/:fileId/rename', verifyToken, async (req, res) => {
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

  router.delete('/:fileId/delete', verifyToken, async (req, res) => {
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
  
  
module.exports = router