const folderSchema = `
CREATE TABLE IF NOT EXISTS folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) NOT NULL
);
`;

module.exports = folderSchema;