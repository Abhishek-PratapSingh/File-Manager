const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config()
const app = express();
const cors = require('cors');
const PORT = process.env.APP_PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send("Welcome to home page of the server!");
})

app.use('/api/auth', require('./controllers/userAuth'));
app.use('/api/create', require('./controllers/createFolder'));
app.use('/api/upload', require('./controllers/uploadFile'));
app.use('/api/manage', require('./controllers/manageFile'));
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
