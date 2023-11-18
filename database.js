const { Client } = require('pg');
const users = require('./models/user.model')
const folderSchema = require('./models/folder.model')
const subfolderSchema = require('./models/subfolder.model')
const file = require('./models/file.model')

const client = new Client({
  user: process.env.user,
  host: process.env.host,
  database: process.env.database,
  password: process.env.password,
  port: process.env.port,
});

client.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Error connecting to PostgreSQL', err));


client.query(users);
client.query(folderSchema);
client.query(subfolderSchema);  
client.query(file);
module.exports = client;
