var Board = require('./board');


new Board({
  debug: true,
  portUSB: "/dev/ttyUSB0",
  baudrate: 115200
});

console.log("Starting...");