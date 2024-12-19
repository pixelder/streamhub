const express = require('express');
const app = express();
const PORT = 8443;

app.use(express.static('pubic')); // Serve files from the 'public' folder

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
