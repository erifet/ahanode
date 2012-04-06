var Board = require('./board');

//var seqqueue = require('seq-queue');

//var toarduinoqueue = seqqueue.createQueue(1000);
//var fromarduinoqueue = seqqueue.createQueue(1000);
var toarduinoqueue = [];
var fromarduinoqueue = [];


new Board({
  debug: true,
  portUSB: "/dev/ttyUSB0",
  baudrate: 115200,
  toarduino: toarduinoqueue,
  fromarduino: fromarduinoqueue
});

/*queue.push(function (task) {
  f1(toto);
  task.done();
}, function () {
  console.log('task timeout');
}, 1000);


queue.push(function (task) {
  console.log('world~');
  task.done();
}, function () {
  console.log('task timeout');
}, 500);*/


console.log("Starting...");