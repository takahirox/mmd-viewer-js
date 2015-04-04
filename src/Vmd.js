/**
 * instance of classes in this file should be created and
 * their fields should be set by VMDFileParser.
 */
function VMD() {
  this.header = null;
  this.motionCount = null;
  this.faceCount = null;
  this.cameraCount = null;
  this.lightCount = null;

  this.motions = [];
  this.faces = [];
  this.cameras = [];
  this.lights = [];

  this.frame = 0;
  this.orderedMotions = null;
  this.orderedFaces = null;
  this.orderedCameras = null;
  this.orderedLights = null;

  this.cameraIndex = -1;
  this.lightIndex = -1;
};


VMD.prototype.valid = function() {
  return this.header.valid();
};


VMD.prototype.setup = function(pmd) {
  for(var i = 0; i < this.motionCount; i++)
    this.motions[i].supply();

  for(var i = 0; i < this.faceCount; i++)
    this.faces[i].supply();

  for(var i = 0; i < this.cameraCount; i++)
    this.cameras[i].supply();

  for(var i = 0; i < this.lightCount; i++)
    this.lights[i].supply();

  this.frame = 0;
  this.cameraIndex = -1;
  this.lightIndex = -1;

  this._setupMotions(pmd);
  this._setupFaces(pmd);
  this._setupCameras(pmd);
  this._setupLights(pmd);

  this.step(1);
};


/**
 * TODO: remove unnecessary element for PMD?
 */
VMD.prototype._setupMotions = function(pmd) {
  this.orderedMotions = {};
  var arrays = this.orderedMotions;
  for(var i = 0; i < this.motionCount; i++) {
    var m = this.motions[i];

    if(pmd.bonesHash[m.boneName] === undefined)
      continue;

    if(arrays[m.boneName] === undefined) {
      arrays[m.boneName] = {};
      arrays[m.boneName].motions = [];
      arrays[m.boneName].index = -1;
    }
    arrays[m.boneName].motions.push(m);
  }

  for(var key in arrays) {
    arrays[key].motions.sort(function(a, b) {
      return a.frameNum - b.frameNum;
    });
  }
};


VMD.prototype._setupFaces = function(pmd) {
  this.orderedFaces = {};
  var arrays = this.orderedFaces;
  for(var i = 0; i < this.faceCount; i++) {
    var f = this.faces[i];

    if(pmd.facesHash[f.name] === undefined)
      continue;

    if(arrays[f.name] === undefined) {
      arrays[f.name] = {};
      arrays[f.name].faces = [];
      arrays[f.name].index = -1;
    }
    arrays[f.name].faces.push(f);
  }

  for(var key in arrays) {
    arrays[key].faces.sort(function(a, b) {
      return a.frameNum - b.frameNum;
    });
  }
};


VMD.prototype._setupCameras = function(pmd) {
  this.orderedCameras = [];
  for(var i = 0; i < this.cameraCount; i++) {
    this.orderedCameras[i] = this.cameras[i];
  }

  this.orderedCameras.sort(function(a, b) {
      return a.frameNum - b.frameNum;
  });
};


VMD.prototype._setupLights = function(pmd) {
  this.orderedLights = [];
  for(var i = 0; i < this.lightCount; i++) {
    this.orderedLights[i] = {};
    this.orderedLights[i].light = this.lights[i];
  }

  this.orderedLights.sort(function(a, b) {
      return a.light.frameNum - b.light.frameNum;
  });
};


VMD.prototype.step = function(dframe) {
  this._stepMotion();
  this._stepFace();
  this._stepCamera();
  this._stepLight();

//  this.frame++;
  this.frame += dframe;
};


/**
 * TODO: check the logic.
 */
VMD.prototype._stepMotion = function() {
  var keys = Object.keys(this.orderedMotions);
  for(var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var m = this.orderedMotions[key];
    while(m.index+1 < m.motions.length &&
          m.motions[m.index+1].frameNum <= this.frame) {
      m.index++;
    }
  }
};


/**
 * TODO: check the logic.
 */
VMD.prototype._stepFace = function() {
  var keys = Object.keys(this.orderedFaces);
  for(var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var f = this.orderedFaces[key];
    while(f.index+1 < f.faces.length &&
          f.faces[f.index+1].frameNum <= this.frame) {
      f.index++;
    }
  }
};


/**
 * TODO: check the logic.
 */
VMD.prototype._stepCamera = function() {
  while(this.cameraIndex+1 < this.cameras.length &&
        this.orderedCameras[this.cameraIndex+1].frameNum <= this.frame) {
    this.cameraIndex++;
  }
};


/**
 * TODO: check the logic.
 */
VMD.prototype._stepLight = function() {
  while(this.lightIndex+1 < this.lights.length &&
        this.orderedLights[this.lightIndex+1].light.frameNum <= this.frame) {
    this.lightIndex++;
  }
};


VMD.prototype.merge = function(v) {
  this.motionCount += v.motionCount;
  this.faceCount += v.faceCount;
  this.cameraCount += v.cameraCount;
  this.lightCount += v.lightCount;

  for(var i = 0; i < v.motionCount; i++) {
    this.motions.push(v.motions[i]);
  }
  for(var i = 0; i < v.faceCount; i++) {
    this.faces.push(v.faces[i]);
  }
  for(var i = 0; i < v.cameraCount; i++) {
    this.cameras.push(v.cameras[i]);
  }
  for(var i = 0; i < v.lightCount; i++) {
    this.lights.push(v.lights[i]);
  }
};


VMD.prototype.dump = function() {
  var str = '';

  str += 'motionCount: ' + this.motionCount + '\n';
  str += 'faceCount: '   + this.faceCount   + '\n';
  str += 'cameraCount: ' + this.cameraCount + '\n';
  str += 'lightCount: '  + this.lightCount  + '\n';

  str += this._dumpMotions();
  str += this._dumpFaces();
  str += this._dumpCameras();
  str += this._dumpLights();

  return str;
};


VMD.prototype._dumpMotions = function() {
  var str = '';
  str += '-- Motions --\n';
  for(var i = 0; i < this.motionCount; i++) {
    str += this.motions[i].dump();
  }
  str += '\n';
  return str;
};


VMD.prototype._dumpFaces = function() {
  var str = '';
  str += '-- Faces --\n';
  for(var i = 0; i < this.faceCount; i++) {
    str += this.faces[i].dump();
  }
  str += '\n';
  return str;
};


VMD.prototype._dumpCameras = function() {
  var str = '';
  str += '-- Cameras --\n';
  for(var i = 0; i < this.cameraCount; i++) {
    str += this.cameras[i].dump();
  }
  str += '\n';
  return str;
};


VMD.prototype._dumpLights = function() {
  var str = '';
  str += '-- Lights --\n';
  for(var i = 0; i < this.lightCount; i++) {
    str += this.lights[i].dump();
  }
  str += '\n';
  return str;
};



function VMDHeader() {
  this.magic = null;
  this.modelName = null;
};


VMDHeader.prototype.valid = function() {
  return (this.magic == 'Vocaloid Motion Data 0002');
};


VMDHeader.prototype.dump = function() {
  var str = '';
  str += 'magic: '     + this.magic     + '\n';
  str += 'modelName: ' + this.modelName + '\n';
  return str;
};



function VMDMotion(id) {
  this.id = id;
  this.boneName = null;
  this.frameNum = null;
  this.location = null;
  this.rotation = null;
  this.interpolation = null;
};


VMDMotion.prototype.supply = function() {
  this.frameNum *= 2;
};


VMDMotion.prototype.dump = function() {
  var str = '';
  str += 'id: '            + this.id            + '\n';
  str += 'boneName: '      + this.boneName      + '\n';
  str += 'frameNum: '      + this.frameNum      + '\n';
  str += 'location: '      + this.location      + '\n';
  str += 'rotation: '      + this.rotation      + '\n';
  str += 'interpolation: ' + this.interpolation + '\n';
  return str;
};



function VMDFace(id) {
  this.id = id;
  this.name = null;
  this.frameNum = null;
  this.weight = null;
};


VMDFace.prototype.supply = function() {
  this.frameNum *= 2;
};


VMDFace.prototype.dump = function() {
  var str = '';
  str += 'id: '       + this.id       + '\n';
  str += 'name: '     + this.name     + '\n';
  str += 'frameNum: ' + this.frameNum + '\n';
  str += 'weight: '   + this.weight   + '\n';
  return str;
};



function VMDCamera(id) {
  this.id = id;
  this.frameNum = null;
  this.length = null;
  this.location = null;
  this.rotation = null;
  this.interpolation = null;
  this.angle = null;
  this.perspective = null;
};


VMDCamera.prototype.supply = function() {
  this.frameNum *= 2;
};


VMDCamera.prototype.dump = function() {
  var str = '';
  str += 'id: '            + this.id            + '\n';
  str += 'frameNum: '      + this.frameNum      + '\n';
  str += 'length: '        + this.length        + '\n';
  str += 'location: '      + this.location      + '\n';
  str += 'rotation: '      + this.rotation      + '\n';
  str += 'interpolation: ' + this.interpolation + '\n';
  str += 'angle: '         + this.angle         + '\n';
  str += 'perspective: '   + this.perspective   + '\n';
  return str;
};



function VMDLight(id) {
  this.id = id;
  this.frameNum = null;
  this.color = null;
  this.location = null;
};


VMDLight.prototype.supply = function() {
  this.frameNum *= 2;
};


VMDLight.prototype.dump = function() {
  var str = '';
  str += 'id: '       + this.id       + '\n';
  str += 'frameNum: ' + this.frameNum + '\n';
  str += 'color: '    + this.color    + '\n';
  str += 'location: ' + this.location + '\n';
  return str;
};

