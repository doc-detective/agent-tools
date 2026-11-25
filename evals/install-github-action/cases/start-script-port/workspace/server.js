const http = require('node:http');

const PORT = process.env.PORT || 8080;

http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end('<!doctype html><title>Widget portal</title><h1>Widget portal</h1><a href="/sign-in">Sign in</a>');
}).listen(PORT, () => console.log(`Widget portal on http://localhost:${PORT}`));
