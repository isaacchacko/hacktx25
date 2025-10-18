
const net = require("net");

const server = net.createServer((socket) => {
  console.log("New connection from", socket.remoteAddress);
  socket.write("Hello from Node server!\n");

  socket.on("data", (data) => {
    console.log("Received:", data.toString());
  });

  socket.on("end", () => {
    console.log("Connection ended");
  });
});

const PORT = 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Socket server running on port ${PORT}`);
});
