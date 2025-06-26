const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
const PORT = 3001;

// Your existing code here

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
