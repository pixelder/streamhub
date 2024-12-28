const express = require('express');
const app = express();
const PORT = 8443;

app.use(express.static('public')); // Serve files from the 'public' folder

app.get("/error", (req,res) => {
  res.sendStatus(500);
})
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});