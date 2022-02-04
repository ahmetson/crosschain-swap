const app = require("https-localhost")()

app.serve('./');

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
})
