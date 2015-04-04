function PMDView(layer, pmd, worker) {
  this.layer = layer;
  this.pmd = pmd;
  this.vmd = null;

  this.vtf = layer.generateTexture();
  this.vtfWidth = layer.calculateVTFWidth(pmd.boneCount*7);
  var buffer = new ArrayBuffer(this.vtfWidth * this.vtfWidth * 4);
  this.vtfUint8Array = new Uint8Array(buffer);
  this.vtfFloatArray = new Float32Array(buffer);

  this.vArray = layer.createFloatArray(pmd.vertexCount*this._V_ITEM_SIZE);
  this.vArray1 = layer.createFloatArray(pmd.vertexCount*this._V_ITEM_SIZE);
  this.vArray2 = layer.createFloatArray(pmd.vertexCount*this._V_ITEM_SIZE);
  this.vmArray = layer.createFloatArray(pmd.vertexCount*this._V_ITEM_SIZE);
  this.mtArray1 = layer.createFloatArray(pmd.vertexCount*this._MT_ITEM_SIZE);
  this.mtArray2 = layer.createFloatArray(pmd.vertexCount*this._MT_ITEM_SIZE);
  this.mrArray1 = layer.createFloatArray(pmd.vertexCount*this._MR_ITEM_SIZE);
  this.mrArray2 = layer.createFloatArray(pmd.vertexCount*this._MR_ITEM_SIZE);
  this.cArray = layer.createFloatArray(pmd.vertexCount*this._C_ITEM_SIZE);
  this.iArray = layer.createUintArray(pmd.vertexIndexCount);
  this.biArray = layer.createFloatArray(pmd.vertexCount*this._BI_ITEM_SIZE);
  this.bwArray = layer.createFloatArray(pmd.vertexCount*this._BW_ITEM_SIZE);
  this.vnArray = layer.createFloatArray(pmd.vertexCount*this._VN_ITEM_SIZE);

  this.vBuffer = layer.createBuffer();
  this.vBuffer1 = layer.createBuffer();
  this.vBuffer2 = layer.createBuffer();
  this.vmBuffer = layer.createBuffer();
  this.mtBuffer1 = layer.createBuffer();
  this.mtBuffer2 = layer.createBuffer();
  this.mrBuffer1 = layer.createBuffer();
  this.mrBuffer2 = layer.createBuffer();
  this.cBuffer = layer.createBuffer();
  this.iBuffer = layer.createBuffer();
  this.biBuffer = layer.createBuffer();
  this.bwBuffer = layer.createBuffer();
  this.vnBuffer = layer.createBuffer();

  this.textures = [];
  this.toonTextures = [];

  this.eye = [0, 0, 0];
  this.center = [0, 0, 0];
  this.up = [0, 1, 0];

  this.frame = 0;
  this.frameIndex = 0;
  this.baseFrame = 0;
  this.dframe = 1;

  this.motions = [];
  this.originalMotions = {};
  this.firstMove = false;

  this.posFromBone1 = [];
  this.posFromBone2 = [];

  this.camera = {};
  this.camera.location = [0, 0, 0];
  this.camera.rotation = [0, 0, 0];
  this.length = 0;
  this.angle = 0;
  this.useVMDCamera = false;

  this.oldDate = null;

  this.useWorkers = (worker) ? true : false;

  if(this.useWorkers) {
    var self = this;
    this.worker = worker;
    this.worker.addEventListener('message',
      function(e) {self._receivedPhysicsResult(e);});
  } else {
    this.physics = new Physics(this.pmd);
    this.physicsType = this._PHYSICS_ON;
  }

  this.skinningType = null;
  this.lightingType = null;
  this.ikType = null;
  this.morphType = null;
  this.lightColor = null;
  this.runType = null;
  this.dancing = false;

  this.elapsedTime = 0.0;

  this.setLightingType(this._LIGHTING_ON);
  this.setSkinningType(this._SKINNING_CPU_AND_GPU);
  this.setIKType(this._IK_ON);
  this.setMorphType(this._MORPH_ON);
  this.setRunType(this._RUN_FRAME_ORIENTED);
  this.setLightColor(1.0);
};

// Note: for reference
PMDView.prototype.Math = Math;
PMDView.prototype.vec3 = vec3;
PMDView.prototype.quat4 = quat4;

PMDView.prototype._V_ITEM_SIZE = 3;
PMDView.prototype._C_ITEM_SIZE = 2;
PMDView.prototype._I_ITEM_SIZE = 1;
PMDView.prototype._BW_ITEM_SIZE = 1;
PMDView.prototype._BI_ITEM_SIZE = 2;
PMDView.prototype._MT_ITEM_SIZE = 3;
PMDView.prototype._MR_ITEM_SIZE = 4;
PMDView.prototype._VN_ITEM_SIZE = 3;

PMDView.prototype._FRAME_MS = 1/60*1000;

PMDView.prototype._PHYSICS_OFF        = 0;
PMDView.prototype._PHYSICS_ON         = 1;
PMDView.prototype._PHYSICS_WORKERS_ON = 2;

// Note: these skinningÅ@parameters must correspond to vertex shader.
PMDView.prototype._SKINNING_CPU         = 0;
PMDView.prototype._SKINNING_GPU         = 1;
PMDView.prototype._SKINNING_CPU_AND_GPU = 2;

// Note: these lighting parameters must correspond to vertex shader.
PMDView.prototype._LIGHTING_OFF = 0;
PMDView.prototype._LIGHTING_ON  = 1;
PMDView.prototype._LIGHTING_ON_WITH_TOON = 2;

PMDView.prototype._IK_OFF = 0;
PMDView.prototype._IK_ON  = 1;

PMDView.prototype._MORPH_OFF = 0;
PMDView.prototype._MORPH_ON  = 1;

PMDView.prototype._RUN_FRAME_ORIENTED = 0;
PMDView.prototype._RUN_REALTIME_ORIENTED = 1;

PMDView._PHYSICS_OFF        = PMDView.prototype._PHYSICS_OFF;
PMDView._PHYSICS_ON         = PMDView.prototype._PHYSICS_ON;
PMDView._PHYSICS_WORKERS_ON = PMDView.prototype._PHYSICS_WORKERS_ON;

PMDView._SKINNING_CPU         = PMDView.prototype._SKINNING_CPU;
PMDView._SKINNING_GPU         = PMDView.prototype._SKINNING_GPU;
PMDView._SKINNING_CPU_AND_GPU = PMDView.prototype._SKINNING_CPU_AND_GPU;

PMDView._LIGHTING_OFF           = PMDView.prototype._LIGHTING_OFF;
PMDView._LIGHTING_ON            = PMDView.prototype._LIGHTING_ON;
PMDView._LIGHTING_ON_WITH_TOON  = PMDView.prototype._LIGHTING_ON_WITH_TOON;

PMDView._IK_OFF = PMDView.prototype._IK_OFF;
PMDView._IK_ON  = PMDView.prototype._IK_ON;

PMDView._MORPH_OFF = PMDView.prototype._MORPH_OFF;
PMDView._MORPH_ON  = PMDView.prototype._MORPH_ON;

PMDView._RUN_FRAME_ORIENTED    = PMDView.prototype._RUN_FRAME_ORIENTED;
PMDView._RUN_REALTIME_ORIENTED = PMDView.prototype._RUN_REALTIME_ORIENTED;


PMDView.prototype.setup = function() {
  // TODO: temporal
  for(var i = 0; i < this.pmd.vertexCount; i++) {
    for(var j = 0; j < this._MT_ITEM_SIZE; j++) {
      this.mtArray1[i*this._MT_ITEM_SIZE+j] = 0;
      this.mtArray2[i*this._MT_ITEM_SIZE+j] = 0;
    }
    for(var j = 0; j < this._MR_ITEM_SIZE; j++) {
      this.mrArray1[i*this._MR_ITEM_SIZE+j] = 0;
      this.mrArray2[i*this._MR_ITEM_SIZE+j] = 0;
    }
  }
  var layer = this.layer;
  layer.pourArrayBuffer(this.mtBuffer1, this.mtArray1,
                        this._MT_ITEM_SIZE, this.pmd.vertexCount);
  layer.pourArrayBuffer(this.mtBuffer2, this.mtArray2,
                        this._MT_ITEM_SIZE, this.pmd.vertexCount);
  layer.pourArrayBuffer(this.mrBuffer1, this.mrArray1,
                        this._MR_ITEM_SIZE, this.pmd.vertexCount);
  layer.pourArrayBuffer(this.mrBuffer2, this.mrArray2,
                        this._MR_ITEM_SIZE, this.pmd.vertexCount);

  this.elapsedTime = 0.0;

  this._initArrays();
  this._initTextures();
  this._pourArrays();
  this._bindBuffers();
};


PMDView.prototype.setVMD = function(vmd) {
  this.vmd = vmd;
};


PMDView.prototype.startDance = function() {
  this.vmd.setup(this.pmd);
  this.firstMove = true;
  this.elapsedTime = 0.0;
  this.dancing = true;
};


PMDView.prototype.setEye = function(eye) {
  for(var i = 0; i < this.eye.length; i++) {
    this.eye[i] = eye[i];
  }
  this.center[0] = eye[0];
  this.center[1] = eye[1];
};


PMDView.prototype.setPhysicsType = function(type) {
  this.physicsType = type;
};


PMDView.prototype.setSkinningType = function(type) {
  this.skinningType = type;
  this.layer.gl.uniform1i(this.layer.shader.uSkinningTypeUniform, type);
};


PMDView.prototype.setLightingType = function(type) {
  this.lightingType = type;
  this.layer.gl.uniform1i(this.layer.shader.uLightingTypeUniform, type);
};


PMDView.prototype.setLightColor = function(color) {
  this.lightColor = [color, color, color];
  this.layer.gl.uniform3fv(this.layer.shader.lightColorUniform,
                           this.lightColor);
};


PMDView.prototype.setIKType = function(type) {
  this.ikType = type;
};


PMDView.prototype.setMorphType = function(type) {
  this.morphType = type;
};


PMDView.prototype.setRunType = function(type) {
  this.runType = type;
};


PMDView.prototype._initArrays = function() {
  this._initVertices();
  this._initVerticesFromBones();
  this._initVertexMorphs();
  this._initCoordinates();
  this._initIndices();
  this._initBoneWeights();
  this._initBoneIndices();
  this._initVertexNormals();
  this._initMotions();
  this._initMotionArrays();
};


PMDView.prototype._initVertices = function() {
  for(var i = 0; i < this.pmd.vertexCount; i++) {
    var pos = this.pmd.vertices[i].position;
    var index = i * this._V_ITEM_SIZE;

    for(var j = 0; j < this._V_ITEM_SIZE; j++) {
      this.vArray[index+j] = pos[j];
    }
  }
};


PMDView.prototype._initVerticesFromBones = function() {
  for(var i = 0; i < this.pmd.vertexCount; i++) {
    var pos = this.pmd.vertices[i].position;
    var bi1 = this.pmd.vertices[i].boneIndices[0];
    var bi2 = this.pmd.vertices[i].boneIndices[1];
    var b1 = this.pmd.bones[bi1];
    var b2 = this.pmd.bones[bi2];

    var v1 = this.vec3.create();
    var v2 = this.vec3.create();
    for(var j = 0; j < this._V_ITEM_SIZE; j++) {
      v1[j] = pos[j] - b1.position[j];
      v2[j] = pos[j] - b2.position[j];
    }
    this.posFromBone1.push(v1);
    this.posFromBone2.push(v2);

    var index = i * this._V_ITEM_SIZE;
    for(var j = 0; j < this._V_ITEM_SIZE; j++) {
      this.vArray1[index+j] = pos[j] - b1.position[j];
      this.vArray2[index+j] = pos[j] - b2.position[j];
    }
  }
};


PMDView.prototype._initVertexMorphs = function() {
  for(var i = 0; i < this.pmd.vertexCount; i++) {
    var index = i * this._V_ITEM_SIZE;

    for(var j = 0; j < this._V_ITEM_SIZE; j++) {
      this.vmArray[index+j] = 0;
    }
  }
};


PMDView.prototype._initCoordinates = function() {
  for(var i = 0; i < this.pmd.vertexCount; i++) {
    var index = i * this._C_ITEM_SIZE;
    var uv = this.pmd.vertices[i].uv;
    for(var j = 0; j < this._C_ITEM_SIZE; j++) {
      this.cArray[index+j] = uv[j];
    }
  }
};


PMDView.prototype._initIndices = function() {
  for(var i = 0; i < this.pmd.vertexIndexCount; i++) {
    this.iArray[i] = this.pmd.vertexIndices[i].index;
  }
};


PMDView.prototype._initBoneWeights = function() {
  for(var i = 0; i < this.pmd.vertexCount; i++) {
    this.bwArray[i] = this.pmd.vertices[i].boneWeight / 100;
  }
};


PMDView.prototype._initBoneIndices = function() {
  for(var i = 0; i < this.pmd.vertexCount; i++) {
    for(var j = 0; j < this._BI_ITEM_SIZE; j++) {
      this.biArray[i*this._BI_ITEM_SIZE+j] =
        this.pmd.vertices[i].boneIndices[j];
    }
  }
};


PMDView.prototype._initVertexNormals = function() {
  for(var i = 0; i < this.pmd.vertexCount; i++) {
    var nor = this.pmd.vertices[i].normal;
    var index = i * this._VN_ITEM_SIZE;

    for(var j = 0; j < this._VN_ITEM_SIZE; j++) {
      this.vnArray[index+j] = nor[j];
    }
  }
};


PMDView.prototype._initMotionArrays = function() {
  if(this.skinningType == this._SKINNING_CPU) {
    this._skinning();
    return;
  }

  if(this.skinningType == this._SKINNING_GPU) {
    this._pourVTF();
    return;
  }

  for(var i = 0; i < this.pmd.vertexCount; i++) {
    var bn1 = this.pmd.vertices[i].boneIndices[0];
    var bn2 = this.pmd.vertices[i].boneIndices[1];
    var m1 = this._getBoneMotion(bn1);
    var m2 = this._getBoneMotion(bn2);

    var index = i * this._MT_ITEM_SIZE;
    for(var j = 0; j < this._MT_ITEM_SIZE; j++) {
      this.mtArray1[index+j] = m1.p[j];
      this.mtArray2[index+j] = m2.p[j];
    }

    index = i * this._MR_ITEM_SIZE;
    for(var j = 0; j < this._MR_ITEM_SIZE; j++) {
      this.mrArray1[index+j] = m1.r[j];
      this.mrArray2[index+j] = m2.r[j];
    }
  }

  var layer = this.layer;
  var gl = this.layer.gl;
  var shader = this.layer.shader;
  layer.pourArrayBuffer(this.mtBuffer1, this.mtArray1,
                        this._MT_ITEM_SIZE, this.pmd.vertexCount);
  layer.pourArrayBuffer(this.mtBuffer2, this.mtArray2,
                        this._MT_ITEM_SIZE, this.pmd.vertexCount);
  layer.pourArrayBuffer(this.mrBuffer1, this.mrArray1,
                        this._MR_ITEM_SIZE, this.pmd.vertexCount);
  layer.pourArrayBuffer(this.mrBuffer2, this.mrArray2,
                        this._MR_ITEM_SIZE, this.pmd.vertexCount);
};


PMDView.prototype._packTo4Uint8 = function(f, uint8Array, offset) {
  f = f * 1.0;
  var sign = (f < 0.0) ? 0x80 : 0x00;
  f = this.Math.abs(f);
  uint8Array[offset+0] = sign | (f & 0x7F);
  uint8Array[offset+1] = (f * 256.0) & 0xFF;
  uint8Array[offset+2] = (f * 256.0 * 256.0) & 0xFF;
  uint8Array[offset+3] = (f * 256.0 * 256.0 * 256.0) & 0xFF;
};


PMDView.prototype._pourVTF = function() {
  for(var i = 0; i < this.pmd.boneCount; i++) {
    var offset = 7 * i * 4;

    // Motion Translation x, y, z
    var m = this._getBoneMotion(i);
    this._packTo4Uint8(m.p[0], this.vtfUint8Array, offset+0);
    this._packTo4Uint8(m.p[1], this.vtfUint8Array, offset+4);
    this._packTo4Uint8(m.p[2], this.vtfUint8Array, offset+8);

    // Motion Rotation x, y, z, w
    this._packTo4Uint8(m.r[0], this.vtfUint8Array, offset+12);
    this._packTo4Uint8(m.r[1], this.vtfUint8Array, offset+16);
    this._packTo4Uint8(m.r[2], this.vtfUint8Array, offset+20);
    this._packTo4Uint8(m.r[3], this.vtfUint8Array, offset+24);
  }
  this.layer.pourVTF(this.vtf, this.vtfUint8Array, this.vtfWidth);
};


PMDView.prototype._skinning = function() {
  var vd1 = this.vec3.create();
  var vd2 = this.vec3.create();
  for(var i = 0; i < this.pmd.vertexCount; i++) {
    var v = this.pmd.vertices[i];
    var bw = v.boneWeight;

    var b1Num = v.boneIndices[0];
    var b1 = this.pmd.bones[b1Num];
    var m1 = this._getBoneMotion(b1Num);
    var v1 = this.posFromBone1[i];
    this.vec3.rotateByQuat4(v1, m1.r, vd1);
    this.vec3.add(vd1, m1.p, vd1);

    var index = i * this._V_ITEM_SIZE;
    if(bw >= 99) {
      this.vArray[index+0] = vd1[0];
      this.vArray[index+1] = vd1[1];
      this.vArray[index+2] = vd1[2];
    } else {
      var b2Num = v.boneIndices[1];
      var b2 = this.pmd.bones[b2Num];
      var m2 = this._getBoneMotion(b2Num);
      var v2 = this.posFromBone2[i];
      this.vec3.rotateByQuat4(v2, m2.r, vd2);
      this.vec3.add(vd2, m2.p, vd2);

      var bw1 = v.boneWeightFloat1;
      var bw2 = v.boneWeightFloat2;
      this.vArray[index+0] = vd1[0] * bw1 + vd2[0] * bw2;
      this.vArray[index+1] = vd1[1] * bw1 + vd2[1] * bw2;
      this.vArray[index+2] = vd1[2] * bw1 + vd2[2] * bw2;
    }
  }

  this.layer.pourArrayBuffer(this.vBuffer, this.vArray,
                             this._V_ITEM_SIZE, this.pmd.vertexCount);
};


/**
 * TODO: consider the case if images aren't loaded yet.
 */
PMDView.prototype._initTextures = function() {
  for(var i = 0; i < this.pmd.materialCount; i++) {
    this.textures[i] = this.layer.generateTexture(this.pmd.images[i]);
  }

  for(var i = 0; i < this.pmd.toonTextureCount; i++) {
    this.toonTextures[i] = this.layer.generateTexture(this.pmd.toonImages[i]);
  }
};



PMDView.prototype._pourArrays = function() {
  var layer = this.layer;
  layer.pourArrayBuffer(this.vBuffer, this.vArray,
                        this._V_ITEM_SIZE, this.pmd.vertexCount);
  layer.pourArrayBuffer(this.vBuffer1, this.vArray1,
                        this._V_ITEM_SIZE, this.pmd.vertexCount);
  layer.pourArrayBuffer(this.vBuffer2, this.vArray2,
                        this._V_ITEM_SIZE, this.pmd.vertexCount);
  layer.pourArrayBuffer(this.vmBuffer, this.vmArray,
                        this._V_ITEM_SIZE, this.pmd.vertexCount);
  layer.pourArrayBuffer(this.cBuffer, this.cArray,
                        this._C_ITEM_SIZE, this.pmd.vertexCount);
  layer.pourElementArrayBuffer(this.iBuffer, this.iArray,
                        this._I_ITEM_SIZE, this.pmd.vertexIndexCount);
  layer.pourArrayBuffer(this.bwBuffer, this.bwArray,
                        this._BW_ITEM_SIZE, this.pmd.vertexCount);
  layer.pourArrayBuffer(this.biBuffer, this.biArray,
                        this._BI_ITEM_SIZE, this.pmd.vertexCount);
  layer.pourArrayBuffer(this.vnBuffer, this.vnArray,
                        this._VN_ITEM_SIZE, this.pmd.vertexCount);
};


/**
 * TODO: remove shader specific attribute names from this class.
 */
PMDView.prototype._bindBuffers = function() {
  var layer = this.layer;
  var gl = this.layer.gl;
  var shader = this.layer.shader;

  gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
  gl.vertexAttribPointer(shader.vertexPositionAttribute,
                         this.vBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer1);
  gl.vertexAttribPointer(shader.vertexPositionAttribute1,
                         this.vBuffer1.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer2);
  gl.vertexAttribPointer(shader.vertexPositionAttribute2,
                         this.vBuffer2.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.vmBuffer);
  gl.vertexAttribPointer(shader.vertexMorphAttribute,
                         this.vmBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.cBuffer);
  gl.vertexAttribPointer(shader.textureCoordAttribute,
                         this.cBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.bwBuffer);
  gl.vertexAttribPointer(shader.boneWeightAttribute,
                         this.bwBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.biBuffer);
  gl.vertexAttribPointer(shader.boneIndicesAttribute,
                         this.biBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.vnBuffer);
  gl.vertexAttribPointer(shader.vertexNormalAttribute,
                         this.vnBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.mtBuffer1);
  gl.vertexAttribPointer(shader.motionTranslationAttribute1,
                         this.mtBuffer1.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.mtBuffer2);
  gl.vertexAttribPointer(shader.motionTranslationAttribute2,
                         this.mtBuffer2.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.mrBuffer1);
  gl.vertexAttribPointer(shader.motionRotationAttribute1,
                         this.mrBuffer1.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.mrBuffer2);
  gl.vertexAttribPointer(shader.motionRotationAttribute2,
                         this.mrBuffer2.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
};


PMDView.prototype._draw = function(texture, pos, num) {
  var layer = this.layer;
  layer.viewport();
  layer.perspective(this.useVMDCamera ? this.camera.angle : 60,
                    0.1, 1000.0);
  layer.identity();

  if(this.useVMDCamera) {
    var cameraPosition = vec3.create([0, 0, this.camera.length]);
    vec3.rotateX(cameraPosition, this.camera.rotation[0], cameraPosition);
    vec3.rotateY(cameraPosition, this.camera.rotation[1], cameraPosition);
    vec3.rotateZ(cameraPosition, this.camera.rotation[2], cameraPosition);
    vec3.add(cameraPosition, this.camera.location, cameraPosition);

    var up = [0, 1, 0];
    vec3.rotateX(up, this.camera.rotation[0], up);
    vec3.rotateY(up, this.camera.rotation[1], up);
    vec3.rotateZ(up, this.camera.rotation[2], up);

    layer.lookAt(cameraPosition, this.camera.location, up);
  } else {
    layer.lookAt(this.eye, this.center, this.up);
  }

  layer.draw(texture,
             layer._BLEND_ALPHA, num, pos);
};


/**
 * just copied from MMD.js so far
 */
vec3.rotateX = function(vec, angle, dest) {
  var rotation = mat4.rotateX(mat4.identity(mat4.create()), angle);
  return mat4.multiplyVec3(rotation, vec, dest);
};
vec3.rotateY = function(vec, angle, dest) {
  var rotation = mat4.rotateY(mat4.identity(mat4.create()), angle);
  return mat4.multiplyVec3(rotation, vec, dest);
};
vec3.rotateZ = function(vec, angle, dest) {
  var rotation = mat4.rotateZ(mat4.identity(mat4.create()), angle);
  return mat4.multiplyVec3(rotation, vec, dest);
};


/**
 * TODO: temporal
 */
PMDView.prototype._calculateDframe = function() {
  var newDate = Date.now();
  if(this.runType == this._RUN_FRAME_ORIENTED) {
    this.dframe = 1;
    this.elapsedTime += this._FRAME_MS;
  } else {
    if(this.oldDate) {
      var oldFrame = (this.elapsedTime / this._FRAME_MS) | 0;
      this.elapsedTime += (newDate - this.oldDate);
      var newFrame = (this.elapsedTime / this._FRAME_MS) | 0;
      var dframe = (newFrame - oldFrame);
      if(dframe == 0) {
        this.dframe = 1;
        this.elapsedTime += this._FRAME_MS - (newDate - this.oldDate);
      } else {
        this.dframe = dframe;
      }
    } else {
      this.dframe = 1;
      this.elapsedTime += this._FRAME_MS;
    }
  }
  this.oldDate = newDate;
};


/**
 * TODO: temporal
 */
PMDView.prototype.update = function() {
  this._calculateDframe();

  if(this.useWorkers)
    this._runPhysicsByWorker();

  this._initMotions2();

  if(this.dancing) {
    this._moveBone();
    if(this.firstMove) {
      if(this.useWorkers)
        this.worker.postMessage(JSON.stringify({cmd: 'reset',
                                                motions: this.motions}));
      else
        this.physics.resetRigidBodies(this.motions);
    }
    this.firstMove = false;
  }

  if(! this.useWorkers && this.physicsType == this._PHYSICS_ON)
    this._runPhysics();
};


/**
 * TODO: temporal
 */
PMDView.prototype.draw = function() {
  this._initMotionArrays();

  // TODO: temporal
  if(this.skinningType == this._SKINNING_GPU) {
    this.layer.gl.activeTexture(this.layer.gl.TEXTURE1);
    this.layer.gl.bindTexture(this.layer.gl.TEXTURE_2D, this.vtf);
    this.layer.gl.uniform1i(this.layer.shader.uVTFUniform, 1);
  }

  var offset = 0;
  for(var i = 0; i < this.pmd.materialCount; i++) {
    // TODO: temporal
    var m = this.pmd.materials[i];
    this.layer.gl.uniform4fv(this.layer.shader.diffuseColorUniform,
                             m.color);
    this.layer.gl.uniform3fv(this.layer.shader.ambientColorUniform,
                             m.mirrorColor);
    this.layer.gl.uniform3fv(this.layer.shader.specularColorUniform,
                             m.specularColor);
    this.layer.gl.uniform1f(this.layer.shader.shininessUniform,
                            m.specularity);

    // TODO: rename tune to toon
    if(this.pmd.materials[i].hasToon()) {
      this.layer.gl.activeTexture(this.layer.gl.TEXTURE2);
      this.layer.gl.bindTexture(this.layer.gl.TEXTURE_2D,
                                this.toonTextures[m.tuneIndex]);
      this.layer.gl.uniform1i(this.layer.shader.toonTextureUniform, 2);
      this.layer.gl.uniform1i(this.layer.shader.useToonUniform, 1);
    } else {
      this.layer.gl.uniform1i(this.layer.shader.useToonUniform, 0);
    }

    var num = this.pmd.materials[i].vertexCount;
    this._draw(this.textures[i], offset, num);
    offset += num;
  }
};


/**
 * TODO: temporal
 */
PMDView.prototype._runPhysics = function() {
  for(var i = 0; i < this.pmd.boneCount; i++) {
    this._getBoneMotion(i);
  }
  if(this.runType == this._RUN_FRAME_ORIENTED || this.dframe == 1)
    this.physics.simulate(this.motions);
  else
    this.physics.simulateFrame(this.motions, this.dframe);
};


/**
 * TODO: temporal
 */
PMDView.prototype._runPhysicsByWorker = function() {
  for(var i = 0; i < this.pmd.boneCount; i++) {
    this._getBoneMotion(i);
  }
  this.worker.postMessage(JSON.stringify(this.motions));
};


PMDView.prototype._receivedPhysicsResult = function(e) {
  var motions = JSON.parse(e.data);
  this.motions = motions;
  __updateDone(this);
};


PMDView.prototype._loadFromVMD = function() {
  this._loadMotionFromVMD();

  if(this.morphType == this._MORPH_ON)
    this._loadFaceFromVMD();

  this._loadCameraFromVMD();
  // Note: doesn't work correctly yet
/*
  this._loadLightFromVMD();
*/

  this.vmd.step(this.dframe);

  this.frame += this.dframe;
};


PMDView.prototype._loadMotionFromVMD = function() {
  var originalMotions = {};

  // TODO: move this logic into VMD.
  // TODO: check the logic.
  var keys = Object.keys(this.vmd.orderedMotions);
  for(var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var m = this.vmd.orderedMotions[key];

    if(m.index == -1)
      continue;

    originalMotions[key] = {};
    originalMotions[key].n = m.motions[m.index].frameNum;
    originalMotions[key].rotation = [];
    originalMotions[key].rotation[0] = m.motions[m.index].rotation[0];
    originalMotions[key].rotation[1] = m.motions[m.index].rotation[1];
    originalMotions[key].rotation[2] = m.motions[m.index].rotation[2];
    originalMotions[key].rotation[3] = m.motions[m.index].rotation[3];
    originalMotions[key].location = [];
    originalMotions[key].location[0] = m.motions[m.index].location[0];
    originalMotions[key].location[1] = m.motions[m.index].location[1];
    originalMotions[key].location[2] = m.motions[m.index].location[2];

    if(m.index+1 >= m.motions.length)
      continue;

    originalMotions[key].m = m.motions[m.index+1].frameNum;
    originalMotions[key].rotation2 = [];
    originalMotions[key].rotation2[0] = m.motions[m.index+1].rotation[0];
    originalMotions[key].rotation2[1] = m.motions[m.index+1].rotation[1];
    originalMotions[key].rotation2[2] = m.motions[m.index+1].rotation[2];
    originalMotions[key].rotation2[3] = m.motions[m.index+1].rotation[3];
    originalMotions[key].location2 = [];
    originalMotions[key].location2[0] = m.motions[m.index+1].location[0];
    originalMotions[key].location2[1] = m.motions[m.index+1].location[1];
    originalMotions[key].location2[2] = m.motions[m.index+1].location[2];

    m = originalMotions[key];
    if(m.m === undefined || m.n == this.frame || m.n >= m.m)
      continue;

    // Note: linear interpolation so far
    var d = m.m - m.n;
    var d2 = this.frame - m.n;
    var r = d2/d;

    m.rotation = this._slerp(m.rotation, m.rotation2, r);
//    this.quat4.slerp(m.rotation, m.rotation2, r, m.rotation);
    m.location[0] = m.location2[0] * r + m.location[0] * (1-r);
    m.location[1] = m.location2[1] * r + m.location[1] * (1-r);
    m.location[2] = m.location2[2] * r + m.location[2] * (1-r);
  }
  this.originalMotions = originalMotions;
};


/**
 * TODO: temporal
 * TODO: any ways to avoid update all morph Buffer?
 */
PMDView.prototype._loadFaceFromVMD = function() {
  // TODO: move this logic into VMD.
  // TODO: check the logic.
  var done = false;
  var keys = Object.keys(this.vmd.orderedFaces);
  for(var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var f = this.vmd.orderedFaces[key];

    if(f.index == -1)
      continue;

    var f2 = f.faces[f.index];
    var f3 = f.faces[f.index+1];

    var weight;
    if(f3 !== undefined) {
      var d = f3.frameNum - f2.frameNum;
      var d2 = this.frame - f2.frameNum;
      var r = d2/d;
      weight = f3.weight * r + f2.weight * (1-r);
    } else {
      weight = f2.weight;
    }

    var pmdFace = this.pmd.facesHash[f2.name];
    this._moveMorph(pmdFace.id, weight);
    done = true;
  }

  if(! done)
    return;

  this.layer.pourArrayBuffer(this.vmBuffer, this.vmArray,
                             this._V_ITEM_SIZE, this.pmd.vertexCount);

  var base = this.pmd.faces[0];
  for(var i = 0; i < base.vertexCount; i++) {
    var v = base.vertices[i];
    var o = v.index * this._V_ITEM_SIZE;
    this.vmArray[o+0] = 0;
    this.vmArray[o+1] = 0;
    this.vmArray[o+2] = 0;
  }

};


PMDView.prototype._loadCameraFromVMD = function() {
  // TODO: move this logic into VMD.
  // TODO: check the logic.
  var ocs = this.vmd.orderedCameras;
  var index = this.vmd.cameraIndex;

  if(index == -1)
    return;

  this.useVMDCamera = true;

  var c1 = ocs[index];
  var c2 = ocs[index+1];

  if(index+1 >= ocs.length
       || c1.frameNum == this.frame
       || c2 === undefined
       || c2.frameNum - c1.frameNum <= 2) {
    this.camera.location[0] = c1.location[0];
    this.camera.location[1] = c1.location[1];
    this.camera.location[2] = c1.location[2];
    this.camera.rotation[0] = c1.rotation[0];
    this.camera.rotation[1] = c1.rotation[1];
    this.camera.rotation[2] = c1.rotation[2];
    this.camera.length = c1.length;
    this.camera.angle = c1.angle;
  } else {
    // Note: linear interpolation so far
    var d = c2.frameNum - c1.frameNum;
    var d2 = this.frame - c1.frameNum;
    var r = d2/d;

    this.vec3.lerp(c1.rotation, c2.rotation, r, this.camera.rotation);
    this.camera.location[0] = c2.location[0] * r + c1.location[0] * (1-r);
    this.camera.location[1] = c2.location[1] * r + c1.location[1] * (1-r);
    this.camera.location[2] = c2.location[2] * r + c1.location[2] * (1-r);
    this.camera.length = c2.length * r + c1.length * (1-r);
    this.camera.angle = c2.angle * r + c1.angle * (1-r);
  }
};


PMDView.prototype._loadLightFromVMD = function() {
  // TODO: move this logic into VMD.
  // TODO: check the logic.
  var ols = this.vmd.orderedLights;
  var index = this.vmd.lightIndex;

  if(index == -1)
    return;

  this.layer.gl.uniform3fv(this.layer.shader.lightColorUniform,
                           ols[index].light.color);
  this.layer.lightDirection = ols[index].light.location;
};


/**
 * copied from somewhere so far
 * TODO: move this logic to general matrix class or somewhere
 */
PMDView.prototype._slerp = function(q, r, t) {
  // TODO: not to create.
  var p = this.quat4.create();

  var cosHalfTheta = q[0]*r[0] + q[1]*r[1] + q[2]*r[2] + q[3]*r[3];
  if(cosHalfTheta < 0) {
    p[0] = -r[0];
    p[1] = -r[1];
    p[2] = -r[2];
    p[3] = -r[3];
    cosHalfTheta = -cosHalfTheta;
  } else {
    p[0] = r[0];
    p[1] = r[1];
    p[2] = r[2];
    p[3] = r[3];
  }

  if(this.Math.abs(cosHalfTheta) >= 1.0) {
    p[0] = q[0];
    p[1] = q[1];
    p[2] = q[2];
    p[3] = q[3];
    return p;
  }

  var halfTheta = this.Math.acos(cosHalfTheta);
  var sinHalfTheta = this.Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

  if(this.Math.abs(sinHalfTheta) < 0.001) {
    p[0] = 0.5 * (q[0]+r[0]);
    p[1] = 0.5 * (q[1]+r[1]);
    p[2] = 0.5 * (q[2]+r[2]);
    p[3] = 0.5 * (q[3]+r[3]);
    return p;
  }

  var ratioA = this.Math.sin((1-t) * halfTheta) / sinHalfTheta;
  var ratioB = this.Math.sin(t * halfTheta) / sinHalfTheta;

  p[0] = (q[0] * ratioA + p[0] * ratioB);
  p[1] = (q[1] * ratioA + p[1] * ratioB);
  p[2] = (q[2] * ratioA + p[2] * ratioB);
  p[3] = (q[3] * ratioA + p[3] * ratioB);

  return p;
};



/**
 * TODO: temporal
 */
PMDView.prototype._moveBone = function() {
  this._loadFromVMD();

  for(var i = 0; i < this.pmd.boneCount; i++) {
    this._getBoneMotion(i);
  }

  if(this.ikType == this._IK_ON)
    this._resolveIK();

};


PMDView.prototype._initMotions = function() {
  for(var i = 0; i < this.pmd.boneCount; i++) {
    this.motions[i] = {
      r: this.quat4.create(),
      p: this.vec3.create(),
      done: false
    };
  }
};


/**
 * TODO: temporal
 */
PMDView.prototype._initMotions2 = function() {
  for(var i = 0; i < this.pmd.boneCount; i++) {
    this.quat4.clear(this.motions[i].r);
    this.vec3.clear(this.motions[i].p);
    this.motions[i].done = false;
  }
};


/**
 * copied from MMD.js so far
 */
vec3.rotateByQuat4 = function(vec, quat, dest) {
  if(dest === undefined) {
    dest = vec;
  }

  if(dest[0] === 0 && dest[1] === 0 && dest[2] === 0)
    return dest;

  quat4.multiplyVec3(quat, vec, dest);

  return vec3.set(dest,
                  quat4.multiply([ dest[0],  dest[1],  dest[2],       0],
                                 [-quat[0], -quat[1], -quat[2], quat[3]]));
};


vec3.clear = function(v) {
  v[0] = 0;
  v[1] = 0;
  v[2] = 0;
};


quat4.clear = function(q) {
  q[0] = 0;
  q[1] = 0;
  q[2] = 0;
  q[3] = 0;
};


/**
 * copied from MMD.js so far
 */
PMDView.prototype._getBoneMotion = function(index) {
  var motion = this.motions[index];
  if(motion.done) {
    return motion;
  }

  var bn = this.pmd.bones[index].name;
  if(this.originalMotions[bn] === undefined) {
    this.originalMotions[bn] = {
      rotation: [0.0, 0.0, 0.0, 1.0],
      location: [0.0, 0.0, 0.0]
    };
  }
  var m = this.originalMotions[bn];

  var r = this.quat4.set(m.rotation, motion.r);
  var t = m.location;
  var p = this.vec3.set(this.pmd.bones[index].position, motion.p);
  if(this.pmd.bones[index].parentIndex === 0xFFFF) {
    this.vec3.add(p, t, p),
    this.vec3.set(p, this.motions[index].p);
    this.quat4.set(r, this.motions[index].r);
    this.motions[index].done = true;
    return this.motions[index];
  } else {
    var parentIndex = this.pmd.bones[index].parentIndex;
    var parentMotion = this._getBoneMotion(parentIndex);
    this.quat4.multiply(parentMotion.r, r, r);
    this.vec3.subtract(p, this.pmd.bones[parentIndex].position, p);
    this.vec3.add(p, t, p);
    this.vec3.rotateByQuat4(p, parentMotion.r, p);
    this.vec3.add(p, parentMotion.p, p);
    this.vec3.set(p, this.motions[index].p);
    this.quat4.set(r, this.motions[index].r);
    this.motions[index].done = true;
    return this.motions[index];
  }
};


/**
 * copied from MMD.js so far
 */
PMDView.prototype._resolveIK = function() {
  var axis = this.vec3.create();
  var tbv = this.vec3.create(), ikv = this.vec3.create();
  var tmpQ = this.quat4.create(), tmpR = this.quat4.create();

  for(var i = 0; i < this.pmd.ikCount; i++) {
    var ik = this.pmd.iks[i];
    var ikb = this.pmd.bones[ik.index];
    var tb = this.pmd.bones[ik.targetBoneIndex];
    var ikm = this._getBoneMotion(ik.index);
    var tbm = this._getBoneMotion(ik.targetBoneIndex);
    var iterations = ik.iteration;
    var chainLength = ik.chainLength;

    var minLength = 0.1 * this.vec3.length(
                      this.vec3.subtract(
                        tb.position,
                        this.pmd.bones[tb.parentIndex].position,
                        axis));

    for(var j = 0; j < iterations; j++) {
      if(minLength > this.vec3.length(this.vec3.subtract(tbm.p, ikm.p, axis))) {
        break;
      }
      for(var k = 0; k < chainLength; k++) {
        var bn = ik.childBoneIndices[k];
        var cb = this.pmd.bones[bn];
        var cbm = this._getBoneMotion(bn);
        tbm = this._getBoneMotion(ik.targetBoneIndex);

        var tbvl, ikvl, axisLen, sinTheta, theta;
        this.vec3.subtract(tbm.p, cbm.p, tbv);
        tbvl = this.vec3.length(tbv);
        this.vec3.subtract(ikm.p, cbm.p, ikv);
        ikvl = this.vec3.length(ikv);
        this.vec3.cross(tbv, ikv, axis);
        axisLen = this.vec3.length(axis);
        sinTheta = axisLen / ikvl / tbvl;

        if(tbvl < minLength || ikvl < minLength)
          continue;

        if(sinTheta < 0.001)
          continue;

        var maxangle = (k+1) * ik.limitation * 4;

        theta = this.Math.asin(sinTheta);
        if(this.vec3.dot(tbv, ikv) < 0) {
          theta = 3.141592653589793 - theta;
        }
        if(theta > maxangle)
          theta = maxangle;

        var q = this.quat4.set(this.vec3.scale(axis,
                                            this.Math.sin(theta/2) / axisLen,
                                            null),
                               tmpQ);
        q[3] = this.Math.cos(theta / 2);
        var parentRotation = this._getBoneMotion(cb.parentIndex).r;
        var r = this.quat4.inverse(parentRotation, tmpR);
        this.quat4.multiply(this.quat4.multiply(r, q, null), cbm.r, r);

        if(this.pmd.bones[bn].isKnee()) {
          var c = r[3];
          // TODO: is this negative x right?
          this.quat4.set([-this.Math.sqrt(1 - c * c), 0, 0, c], r);
//          this.quat4.inverse(this._getBoneMotion(bn).r, q);
          this.quat4.inverse(cbm.r, q);
          this.quat4.multiply(r, q, q);
          this.quat4.multiply(parentRotation, q, q);
        }

        this.quat4.normalize(r, this.originalMotions[cb.name].rotation);
        this.quat4.multiply(q, cbm.r, cbm.r);
        this.motions[ik.targetBoneIndex].done = false;
        for(var l = 0; l <= k; l++) {
          this.motions[ik.childBoneIndices[l]].done = false;
        }
      }
    }
  }
};


/**
 * TODO: temporal
 */
PMDView.prototype._moveMorph = function(index, weight) {
//  this._initVertexMorphs();

  // TODO: temporal
  if(index == 0) {
    return;
  }

  var f = this.pmd.faces[index];
  var base = this.pmd.faces[0];
  for(var i = 0; i < f.vertexCount; i++) {
    var v = base.vertices[f.vertices[i].index];
    var o = v.index * this._V_ITEM_SIZE;
    this.vmArray[o+0] += f.vertices[i].position[0] * weight;
    this.vmArray[o+1] += f.vertices[i].position[1] * weight;
    this.vmArray[o+2] += f.vertices[i].position[2] * weight;
  }

};
