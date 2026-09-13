const aedes = require('aedes')();
const net = require('net');
const http = require('http');
const ws = require('websocket-stream');

const TCP_PORT = 1884;
const WS_PORT = 8080;

// 1. Create Raw TCP server (for ESP8266 Arduino clients)
const tcpServer = net.createServer(aedes.handle);
tcpServer.listen(TCP_PORT, '0.0.0.0', () => {
  console.log(`[MQTT] Raw TCP broker listening on port ${TCP_PORT} (for ESP8266)`);
});

// 2. Create WebSocket server (for React Web App)
const httpServer = http.createServer();
ws.createServer({ server: httpServer }, aedes.handle);
httpServer.listen(WS_PORT, '0.0.0.0', () => {
  console.log(`[MQTT] WebSocket broker listening on port ${WS_PORT} (for React App)`);
});

// Optional: Logging events to see what's happening
aedes.on('client', (client) => {
  console.log(`[+] Client connected: ${client ? client.id : 'unknown'}`);
});

aedes.on('clientDisconnect', (client) => {
  console.log(`[-] Client disconnected: ${client ? client.id : 'unknown'}`);
});

aedes.on('publish', (packet, client) => {
  if (client && !packet.topic.startsWith('$SYS')) {
    console.log(`[PUBLISH] ${client.id} -> ${packet.topic}: ${packet.payload.toString()}`);
  }
});

aedes.on('clientError', (client, err) => {
  console.log(`[ERROR] Client error (${client ? client.id : 'unknown'}):`, err.message);
});

aedes.on('connectionError', (client, err) => {
  console.log(`[ERROR] Connection error:`, err.message);
});
