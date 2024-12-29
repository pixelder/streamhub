const express = require('express');
const app = express();
const path = require('path');

app.set('view engine', 'ejs')
// Serve static files like CSS, JS
app.use(express.static(path.join(__dirname, 'public')));

app.get("/hi", (req,res) => {
  res.sendStatus(500);
})
// Dynamic route for the watch page
app.get('/watch/:mediaType/:id/:name', (req, res) => {
  const { mediaType, id, name } = req.params;
  // You can pass the dynamic parameters to the template or render a dynamic response
  res.render('watch', { mediaType, id, name }); // If using EJS or another templating engine
});

// Default route (your index page)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 8443;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

/* const express = require('express');
const app = express();

const PORT = 8443; // Port to listen on
//const HOST = '0.0.0.0'; // Listen on all interfaces to serve on LAN

app.use(express.static('public'));

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
}); */