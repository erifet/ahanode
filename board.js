var events = require('events'),
    util = require('util'),
    colors = require('colors'),
    serial = require('serialport'),
    Crc16 = require('./ahaprotocol/crc16');
//Ahapacket = require('./ahaprotocol/ahapacket');
/*
 * The main Arduino constructor
 * Connect to the serial port and bind
 * {
   debug: true,
   portUSB: "/dev/ttyUSB0,
   baudrate: 115200,
   toarduino: toarduinoqueue,
   fromarduino: fromarduinoqueue
   }
 */
var Board = function (options) {
    this.log('info', 'initializing');
    this.debug = options && options.debug || false;
    this.portUSB = options && options.portUSB || "/dev/ttyUSB0";
    this.baudrate = options && options.baudrate || 115200;
    this.toarduino = options && options.toarduino;
    this.fromarduino = options && options.fromarduino;
    this.log('debug', 'debug:' + this.debug);
    this.log('debug', 'portUSB:' + this.portUSB);
    this.log('debug', 'baudrate:' + this.baudrate);

    this.serialPort = new serial.SerialPort(this.portUSB, {
      baudrate: this.baudrate
    });

    this.log('debug', 'SerialPort ouvert:');

    this.incrc = new Crc16();
    this.outcrc = new Crc16();
    this.lastControlByte = this.S_FRAME_RR;
    this.linkup = false;

    this.FRAME_BOUNDARY = 0x7E; //126
    this.ESCAPE_OCTET = 0x7D; //125
    this.ESCAPEXOR_FLAG = 0x20; //32
    this.I_FRAME_BITS = 0x1; //1
    this.S_FRAME_BITS = 0x3; //3
    this.S_FRAME_RR = 0x11; //17
    this.S_FRAME_RNR = 0x15; //21
    this.S_FRAME_REJ = 0x19; //25
    this.U_FRAME_UA = 0x73; //115
    this.U_FRAME_SABM = 0x3F; //63
    this.U_FRAME_DISC = 0x53; //83
    this.U_FRAME_DM = 0x1F; //31
    this.U_FRAME_TEST = 0x33; //51
    this.I_FRAME_DATA = 0x0; //0
    var self = this;

    this.serialPort.on("data", function (data) {
      // loop on data received
      var unEscaping = false;
      var inPacket = false;
      var datalength = data.length;
      var buffer = [];
      var maxPacketSize = 32;

      for (var i = 0; i < datalength; i++) {
        var bIn = data.charCodeAt(i);
        if (bIn === self.ESCAPE_OCTET) {
          unEscaping = true;
          //return 0;
        }

        if (bIn === self.FRAME_BOUNDARY && !unEscaping) {
          if (inPacket) { /* End of packet */
            if (buffer.length) { /* 0 == false */
              /* buffer != 0 so message*/
              // processFrame
              var bufferlen = buffer.length;
              var messCRC;
              if (buffer.length < 3) {
                // less than 3 bytes so wrong message
                this.log('warn', 'less than 3 bytes so wrong message');
                return;
              }

              // crc 2 last bytes
              this.incrc.reset();
              for (var icrc = 0; icrc < bufferlen - 2; i++) {
                this.incrc.update(buffer[icrc]);
              }
              //message's crc
              messCRC = buffer[bufferlen - 2] & 0xff << 8 | buffer[bufferlen - 1] & 0xff;
              if (messCRC != this.incrc.get()) {
                // CRC error
                this.log('warn', 'CRC Error');
                return;
              }

              if ((buffer[0] & this.I_FRAME_BITS) === 0x0) {
                // Information frame
                if (bufferlen - 3 > 0) {
                  // create CAN message
                  this.log('INFO', 'CAN message:' + buffer);
                  buffer = buffer.slice(1, bufferlen - 3);
                  this.fromarduino.push(buffer);
                  //receivedQueue.add(new SerialPacket(payload));
                }
                //sendFrame(this.S_FRAME_RR);
                this.outcrc.reset();
                this.serialport.write(this.FRAME_BOUNDARY);
                this.lastControlByte = this.S_FRAME_RR;
                this.serialport.write(this.S_FRAME_RR);
                this.outcrc.update(this.S_FRAME_RR);
                this.serialport.write(this.outcrc.get() & 0xff);
                this.serialport.write(this.outcrc.get() >> 8);
                this.serialport.write(this.FRAME_BOUNDARY);
              }
              else if ((buffer[0] & this.S_FRAME_BITS) === 0x1) {
                // Supervisory frame
                switch (buffer[0]) {
                case this.S_FRAME_RR:
                  // RR receive ready, packet have only one frame so send
                  // DISC
                  //sentQueue.remove();
                  this.toarduino.shift();
                  //sendFrame(U_FRAME_DISC);
                  this.outcrc.reset();
                  this.serialport.write(this.FRAME_BOUNDARY);
                  this.lastControlByte = this.U_FRAME_DISC;
                  this.serialport.write(this.U_FRAME_DISC);
                  this.outcrc.update(this.U_FRAME_DISC);
                  this.serialport.write(this.outcrc.get() & 0xff);
                  this.serialport.write(this.outcrc.get() >> 8);
                  this.serialport.write(this.FRAME_BOUNDARY);
                  break;
                case this.S_FRAME_RNR:
                  // RNR receive not ready
                  //sendFrame(U_FRAME_DISC);
                  this.outcrc.reset();
                  this.serialport.write(this.FRAME_BOUNDARY);
                  this.lastControlByte = this.U_FRAME_DISC;
                  this.serialport.write(this.U_FRAME_DISC);
                  this.outcrc.update(this.U_FRAME_DISC);
                  this.serialport.write(this.outcrc.get() & 0xff);
                  this.serialport.write(this.outcrc.get() >> 8);
                  this.serialport.write(this.FRAME_BOUNDARY);
                  break;
                case this.S_FRAME_REJ:
                  // REJ rejected
                  //sendFrame(I_FRAME_DATA, sentQueue.peek());
                  this.outcrc.reset();
                  this.serialport.write(this.FRAME_BOUNDARY);
                  this.lastControlByte = this.I_FRAME_DATA;
                  this.outcrc.update(this.I_FRAME_DATA);
                  this.serialport.write(this.I_FRAME_DISC);
                  var datas = this.toarduino[0].getdatas();
                  var len = datas.length;
                  for (var d = 0; d < len; d++) {
                    this.outcrc.update(datas[d]);
                    this.serialport.write(datas[d]);
                  }
                  this.serialport.write(this.outcrc.get() & 0xff);
                  this.serialport.write(this.outcrc.get() >> 8);
                  this.serialport.write(this.FRAME_BOUNDARY);
                  break;
                default:
                  //sendFrame(U_FRAME_DISC);
                  this.outcrc.reset();
                  this.serialport.write(this.FRAME_BOUNDARY);
                  this.lastControlByte = this.U_FRAME_DISC;
                  this.serialport.write(this.U_FRAME_DISC);
                  this.outcrc.update(this.U_FRAME_DISC);
                  this.serialport.write(this.outcrc.get() & 0xff);
                  this.serialport.write(this.outcrc.get() >> 8);
                  this.serialport.write(this.FRAME_BOUNDARY);
                  break;
                }
              }
              else {
                // Unnnumbered frame
                switch (buffer[0]) {
                case this.U_FRAME_SABM:
                  if (!this.linkUp) {
                    this.linkup = true;
                    //sendFrame(U_FRAME_UA);
                    this.outcrc.reset();
                    this.serialport.write(this.FRAME_BOUNDARY);
                    this.lastControlByte = this.U_FRAME_UA;
                    this.serialport.write(this.U_FRAME_UA);
                    this.outcrc.update(this.U_FRAME_UA);
                    this.serialport.write(this.outcrc.get() & 0xff);
                    this.serialport.write(this.outcrc.get() >> 8);
                    this.serialport.write(this.FRAME_BOUNDARY);
                  }
                  else {
                    //sendFrame(U_FRAME_DM);
                    this.outcrc.reset();
                    this.serialport.write(this.FRAME_BOUNDARY);
                    this.lastControlByte = this.U_FRAME_DM;
                    this.serialport.write(this.U_FRAME_DM);
                    this.outcrc.update(this.U_FRAME_DM);
                    this.serialport.write(this.outcrc.get() & 0xff);
                    this.serialport.write(this.outcrc.get() >> 8);
                    this.serialport.write(this.FRAME_BOUNDARY);
                  }
                  break;
                case this.U_FRAME_DM:
                  this.linkup = false;
                  //startXMit(true);
                  break;
                case this.U_FRAME_UA:
                  if (this.lastControlByte === this.U_FRAME_SABM) {
                    if (romCanQueue.count() > 0) {
                      //sendFrame(I_FRAME_DATA, fromCanQueue.peek());
                      this.outcrc.reset();
                      this.serialport.write(this.FRAME_BOUNDARY);
                    }
                    else {
                      //sendFrame(U_FRAME_DISC);
                      this.outcrc.reset();
                      this.serialport.write(this.FRAME_BOUNDARY);
                      this.lastControlByte = this.U_FRAME_DISC;
                      this.serialport.write(this.U_FRAME_DISC);
                      this.outcrc.update(this.U_FRAME_DISC);
                      this.serialport.write(this.outcrc.get() & 0xff);
                      this.serialport.write(this.outcrc.get() >> 8);
                      this.serialport.write(this.FRAME_BOUNDARY);
                    }
                  }
                  else {
                    this.linkup = false;
                    //startXMit(false);
                  }
                  break;
                case this.U_FRAME_DISC:
                  //sendFrame(U_FRAME_UA);
                  this.outcrc.reset();
                  this.serialport.write(this.FRAME_BOUNDARY);
                  this.lastControlByte = this.U_FRAME_UA;
                  this.serialport.write(this.U_FRAME_UA);
                  this.outcrc.update(this.U_FRAME_UA);
                  this.serialport.write(this.outcrc.get() & 0xff);
                  this.serialport.write(this.outcrc.get() >> 8);
                  this.serialport.write(this.FRAME_BOUNDARY);
                  this.linkup = false;
                  break;
                default:
                  //sendFrame(U_FRAME_DISC);
                  this.outcrc.reset();
                  this.serialport.write(this.FRAME_BOUNDARY);
                  this.lastControlByte = this.U_FRAME_DISC;
                  this.serialport.write(this.U_FRAME_DISC);
                  this.outcrc.update(this.U_FRAME_DISC);
                  this.serialport.write(this.outcrc.get() & 0xff);
                  this.serialport.write(this.outcrc.get() >> 8);
                  this.serialport.write(this.FRAME_BOUNDARY);
                  break;
                }
                // send back message              
                inPacket = false;
              }
            }
            else { /* Beginning of packet */
              buffer.clear();
              inPacket = true;
            }
          }
          else {
            if (unEscaping) {
              bIn ^= self.ESCAPEXOR_FLAG;
              unEscaping = false;
            }

            if (buffer.length() < maxPacketSize) {
              buffer.push(bIn);
            }
            else {
              self.log('warn', 'Message too big');
            }
          }
        }
      }
    });

    this.serialPort.on("close", function () {
      self.log('info', "SerialPort ferme.");
    });
    };

/*
 * EventEmitter, I choose you!
 */
util.inherits(Board, events.EventEmitter);

/*
 * Utility function to pause for a given time
 */
Board.prototype.delay = function (ms) {
  ms += +new Date();
  while (+new Date() < ms) {}
};

/*
 * Logger utility function
 */
Board.prototype.log = function (level, message) {
  if (this.debug) {
    console.log(String(+new Date()).grey + ' aha '.blue + level.magenta + ' ' + message);
  }
};

module.exports = Board;