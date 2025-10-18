const net = require('net');
const client = net.createConnection(3000, '172.20.10.4');
client.on('connect', () => console.log('Connected!'));
client.on('data', (data) => console.log('Received:', data.toString()));
