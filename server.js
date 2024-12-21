const express = require('express');
const app = express();

const PORT = 8443; // Port to listen on
//const HOST = '0.0.0.0'; // Listen on all interfaces to serve on LAN

app.use(express.static('public'));

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
