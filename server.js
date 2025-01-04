const express = require('express');
const app = express();
const path = require('path');

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/search', async (req, res) => {
  const query = req.query.q;
  res.render('search', { query });
});


// Dynamic route for the watch page
app.get('/watch/movie/:id/:name', (req, res) => {
  const { mediaType = "movie", id, name} = req.params;
  // You can pass the dynamic parameters to the template or render a dynamic response
  res.render('watch', { mediaType, id, name, season : null , episode : null }); // If using EJS or another templating engine
});

app.get('/watch/tv/:id/:name/:season/:episode', (req, res) => {
  const { mediaType = "tv", id, name, season, episode} = req.params;
  // You can pass the dynamic parameters to the template or render a dynamic response
  res.render('watch', { mediaType, id, name, season, episode}); // If using EJS or another templating engine
});

/* app.get("/hi", (req,res) => {
  res.sendStatus(500);
}) */

const PORT = process.env.PORT || 8443;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
