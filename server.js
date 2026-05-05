const express = require('express');
//const helmet = require('helmet');
const app = express();
const path = require('path');

//app.use(helmet());

app.use(express.static(path.join(__dirname, 'public')));


app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));

app.get(['/', '/movie', '/tv', '/person'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.get('/search', async (req, res) => {
  const query = req.query.q;
  res.render('search', { query });
});

// Dynamic route for the watch page
app.get('/watch/movie/:id', (req, res) => {
  const { mediaType = "movie", id} = req.params;
  // You can pass the dynamic parameters to the template or render a dynamic response
  res.render('watch', { mediaType, id, season : null , episode : null }); // If using EJS or another templating engine
});

app.get('/watch/tv/:id/:season/:episode', (req, res) => {
  const { mediaType = "tv", id, season, episode} = req.params;
  // You can pass the dynamic parameters to the template or render a dynamic response
  res.render('watch', { mediaType, id, season, episode}); // If using EJS or another templating engine
});

app.use((req, res) => {
  res.status(404).render('404', {
    url: req.originalUrl
  });
});
/* app.get("/hi", (req,res) => {
  res.sendStatus(500);
}) */

const PORT = process.env.PORT || 8443;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
