const http = require('http');
const https = require('https');
const fs = require('fs');
const httpProxy = require('http-proxy');
const express = require('express');
const { ArgumentParser } = require('argparse');

/**
 * Create an Express application with static file serving and HTTP proxy setup.
 * @param {string} httpProxyTarget - The target URL for HTTP proxying.
 * @returns {Express.Application} - The configured Express application.
 */
function createExpressApp(httpProxyTarget) {
  const app = express();
  app.use(express.static('public')); // Serve static files from 'public' directory

  // Proxy HTTP requests to the specified target
  app.use('/api', (req, res) => {
    const proxy = httpProxy.createProxyServer({});
    proxy.web(req, res, { target: httpProxyTarget });
  });

  return app;
}

/**
 * Create an HTTP or HTTPS server based on provided SSL certificate and key.
 * Also sets up WebSocket proxying.
 * @param {Express.Application} app - The Express application.
 * @param {string} certPath - Path to the SSL certificate file.
 * @param {string} keyPath - Path to the SSL key file.
 * @param {string} wsProxyTarget - The target URL for WebSocket proxying.
 * @returns {http.Server | https.Server} - The created HTTP/HTTPS server.
 */
function createServer(app, certPath, keyPath, wsProxyTarget) {
  let server;

  if (certPath && keyPath) {
    // Read SSL certificate and key
    const options = {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath)
    };
    server = https.createServer(options, app);
  } else {
    server = http.createServer(app);
  }

  // Set up WebSocket proxying
  const proxy = httpProxy.createProxyServer({});

  server.on('upgrade', function (req, socket, head) {
    if (req.url.startsWith('/ws')) {
      proxy.ws(req, socket, head, { target: wsProxyTarget });
    } else {
      // Handle non-WebSocket upgrades here, if necessary
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    }
  });

  proxy.on('error', function (error, req, res) {
    console.error('Proxy error:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
    }
    res.end('Proxy error.');
  });

  return server;
}

/**
 * Start the server on a specified port.
 * @param {http.Server | https.Server} server - The HTTP/HTTPS server to start.
 * @param {number} port - The port number on which to start the server.
 */
function startServer(server, port) {
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// Parse command line arguments
const parser = new ArgumentParser({
  description: 'Node.js HTTPS/HTTP server with WebSocket and HTTP proxying'
});
parser.add_argument('-c', '--cert', { help: 'Path to SSL certificate file' });
parser.add_argument('-k', '--key', { help: 'Path to SSL key file' });
parser.add_argument('-hp', '--httpproxy', { help: 'HTTP proxy target URL' });
parser.add_argument('-wp', '--wsproxy', { help: 'WebSocket proxy target URL' });
const args = parser.parse_args();

// Create and start the server
const app = createExpressApp(args.httpproxy);
const server = createServer(app, args.cert, args.key, args.wsproxy);
const PORT = 3000;
startServer(server, PORT);
