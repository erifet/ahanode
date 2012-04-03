var Crc16 = function () {
    this.crc = 0xffff;
    };

Crc16.prototype.reset = function () {
  this.crc = 0xffff;
};

Crc16.prototype.update = function (d) {
  console.log(d);
  var data = d & 0xff;
  data ^= this.crc & 0xff;

  data ^= ((data << 4) & 0xff);

  //this.crc = ((data << 8) | ((this.crc>>8) & 0xff) ^ (data >> 4) ^ (data << 3));
  this.crc = (((data << 8) & 0xffff) | ((this.crc >> 8) & 0xff) ^ ((data >> 4) & 0xffff) ^ ((data << 3) & 0xffff));
  this.crc = this.crc & 0xffff;
};

Crc16.prototype.get = function () {
  return this.crc;
};

module.exports = Crc16;