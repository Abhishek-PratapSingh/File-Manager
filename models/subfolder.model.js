const subfolderSchema = `
CREATE TABLE IF NOT EXISTS subfolders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  parent_folder_id INTEGER REFERENCES folders(id) NOT NULL,
  user_id INTEGER REFERENCES users(id) NOT NULL
);
`;
module.exports = subfolderSchema;