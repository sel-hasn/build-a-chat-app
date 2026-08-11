import http from 'http';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = 3001;

const server = http.createServer((req, res) => {
  const filePath = './public' + (req.url === '/' ? '/index.html' : req.url);

  let contentType = 'text/html';
  if (filePath.endsWith('.js')) {
    contentType = 'application/javascript';
  } else if (filePath.endsWith('.css')) {
    contentType = 'text/css';
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

wss.on('connection', (socket, req) => {
  const username = new URL(req.url, 'http://localhost').searchParams.get(
    'username'
  );

  // Broadcast system join message to ALL connected clients
  const joinMessage = JSON.stringify({
    type: 'system',
    text: `${username} joined`
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(joinMessage);
    }
  });

  socket.on('message', (data) => {
    const { username: msgUsername, text } = JSON.parse(data);

    const chatMessage = JSON.stringify({
      type: 'chat',
      username: msgUsername || username,
      text: text
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(chatMessage);
      }
    });
  });

  socket.on('close', () => {
    // Broadcast system leave message to remaining connected clients
    const leaveMessage = JSON.stringify({
      type: 'system',
      text: `${username} left`
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(leaveMessage);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});
