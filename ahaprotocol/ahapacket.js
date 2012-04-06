// Constructor
var Class = function () {};



// properties and methods
Class.prototype = {
  CID_PRI_MASK: 0x10000000,
  CID_TYP_MASK: 0x8000000,
  CID_DIR_MASK: 0x8000,
  CID_NODE_SRC_MASK: 0x7FF0000,
  CID_NODE_DST_MASK: 0xFFE0,
  CID_NV_BND_MASK: 0x7FFF,
  CID_EM_MASK: 0x1F,
  CID_3b_MASK: 0x7,
  CID_5b_MASK: 0x1F,
  CID_7b_MASK: 0x7F,
  CID_11b_MASK: 0x7FF,
  CID_15b_MASK: 0x7FFF,
  CID_PRI_SHIFT: 28,
  CID_TYP_SHIFT: 27,
  CID_DIR_SHIFT: 15,
  CID_NODE_SRC_SHIFT: 16,
  CID_NODE_DST_SHIFT: 5,
  CID_NV_BND_SHIFT: 0,
  CID_EM_SHIFT: 0,
  canID: 0,
  CidPri: 0,
  CidTyp: 0,
  CidDir: 0,
  CidEm: 0,
  CidNodeSrc: 0,
  CidNodeDst: 0,
  CidNvBnd: 0,
  datas: [],
  datalen: 0
};

Class.prototype.createCanMessage = function (cidPri, cidTyp, cidNodeSrc, cidNodeDst, cidDir, cidNvBnd, cidEm) {
  this.CidPri = cidPri;
  this.CidTyp = cidTyp;
  this.CidNodeSrc = cidNodeSrc;
  this.CidNodeDst = cidNodeDst;
  this.CidDir = cidDir;
  this.CidNvBnd = cidNvBnd;
  this.cidEm = cidEm;

  if (this.CidTyp === this.CID_TYP_NV) {
    this.canID = ((this.CidPri & 0x01) << this.CID_PRI_SHIFT) + ((this.CidTyp & 0x01) << this.CID_TYP_SHIFT) + ((this.CidNodeSrc & 0x7FF) << this.CID_NODE_SRC_SHIFT) + ((this.CidDir & 0x01) << this.CID_DIR_SHIFT) + (this.CidNvBnd & 0x7FFF);
  }
  else {
    this.canID = ((this.CidPri & 0x01) << this.CID_PRI_SHIFT) + ((this.CidTyp & 0x01) << this.CID_TYP_SHIFT) + ((this.CidNodeSrc & 0x7FF) << this.CID_NODE_SRC_SHIFT) + ((this.CidNodeDst & 0x7FF) << this.CID_NODE_DST_SHIFT) + (this.CidEm & 0x1F);
  }
};

Class.prototype.extractCanMessage = function (id) {
  this.canID = id;
  this.CidPri = ((this.canID & this.CID_PRI_MASK) >>> this.CID_PRI_SHIFT);
  this.CidTyp = ((this.canID & this.CID_TYP_MASK) >>> this.CID_TYP_SHIFT);
  this.CidNodeSrc = ((this.canID & this.CID_NODE_SRC_MASK) >>> this.CID_NODE_SRC_SHIFT);
  if (this.CidTyp === this.CID_TYP_NV) {
    this.CidDir = ((this.canID & this.CID_DIR_MASK) >>> this.CID_DIR_SHIFT);
    this.CidNvBnd = ((this.canID & this.CID_NV_BND_MASK) >>> this.CID_NV_BND_SHIFT);
  }
  else {
    this.CidNodeDst = ((this.canID & this.CID_NODE_DST_MASK) >>> this.CID_NODE_DST_SHIFT);
    this.CidEm = ((this.canID & this.CID_EM_MASK) >>> this.CID_EM_SHIFT);
  }
};

Class.prototype.loadCanMessage = function (payload) {
  this.canID = (payload[0] & 0xFF) + ((payload[1] & 0xFF) << 8) + ((payload[2] & 0xFF) << 16) + ((payload[3] & 0xFF) << 24);
  this.extractCanMessage(this.canID);
  this.datalen = payload.length - 4;
  if (this.datalen > 0) {
    this.datas = payload.slice(4, this.datalen);
  }
};

Class.prototype.getdatas = function () {
  var datas = [];
  datas.push(this.canID & 0xff);
  datas.push(this.canID >>> 8 & 0xff);
  datas.push(this.canID >>> 16 & 0xff);
  datas.push(this.canID >>> 24 & 0xff);

  for (var i = 0; i < this.datalen; i++)
  datas.push(this.datas[i]);
};

Class.prototype.processmessage = function (payload) {
  this.loadCanMessage(payload);
  this.toString();
};

Class.prototype.toString = function () {
  console.log(" Object {");
  console.log(" CidPri   : " + this.CidPri);
  console.log(" CidTyp     : " + this.CidTyp);
  console.log(" CidNodeSrc: " + this.CidNodeSrc);
  if (this.CidTyp === this.CID_TYP_NV) {
    console.Log(" CidDir: " + this.CidDir);
    console.log(" CidNvBnd : " + this.CidNvBnd);
  }
  else {
    console.log(" CidNodeDst: " + this.CidNodeDst);
    console.log(" CidEm : " + this.CidEm);
  }
  console.log(" CanID : " + this.canID);
  var len = this.data.length;
  for (var i = 0; i < len; i++) {
    console.log(" Options: " + this.datas[i]);
  }
  console.log("}");
};

// node.js module export
module.exports = Class;
// constructor call
//var object = new Class("Hello", "2");