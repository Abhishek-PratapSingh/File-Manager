const file = `
CREATE TABLE IF NOT EXISTS files (
  id SERIAL PRIMARY KEY,
  original_name VARCHAR(255) NOT NULL,
  size INTEGER NOT NULL,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  folder_id INTEGER REFERENCES folders(id) NOT NULL
);
`;

module.exports = file;