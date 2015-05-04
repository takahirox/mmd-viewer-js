/**
 * TODO: refactoring
 */
function PMDModelView(layer, pmd, pmdView) {
  this.layer = layer;
  this.pmd = pmd;
  this.view = pmdView;
  this.vmd = null;
  this.audio = null;

  this.vtf = layer.generateTexture();
  this.vtfWidth = layer.calculateVTFWidth(pmd.boneCount*7);
  var buffer = new ArrayBuffer(this.vtfWidth * this.vtfWidth * 4);
  this.vtfUint8Array = new Uint8Array(buffer);
  this.vtfFloatArray = new Float32Array(buffer);

  this.vArray = layer.createFloatArray(pmd.vertexCount*this._V_ITEM_SIZE);
  this.vArray1 = layer.createFloatArray(pmd.vertexCount*this._V_ITEM_SIZE);
  this.vArray2 = layer.createFloatArray(pmd.vertexCount*this._V_ITEM_SIZE);
  this.vmArray = layer.createFloatArray(pmd.vertexCount*this._V_ITEM_SIZE);
  this.veArray = layer.createFloatArray(pmd.vertexCount*this._VE_ITEM_SIZE);
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
  this.veBuffer = layer.createBuffer();
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
  this.sphereTextures = [];

  this.basePosition = [0, 0, 0];

  this.frame = 0;

  this.motions = [];
  this.originalMotions = {};

  this.posFromBone1 = [];
  this.posFromBone2 = [];

  this.dancing = false;

  this.physics = new Physics(this.pmd);
};

// Note: for reference
PMDModelView.prototype.Math = Math;
PMDModelView.prototype.vec3 = vec3;
PMDModelView.prototype.quat4 = quat4;
PMDModelView.prototype.mat4 = mat4;

PMDModelView.prototype._V_ITEM_SIZE  = 3;
PMDModelView.prototype._C_ITEM_SIZE  = 2;
PMDModelView.prototype._I_ITEM_SIZE  = 1;
PMDModelView.prototype._BW_ITEM_SIZE = 1;
PMDModelView.prototype._BI_ITEM_SIZE = 2;
PMDModelView.prototype._MT_ITEM_SIZE = 3;
PMDModelView.prototype._MR_ITEM_SIZE = 4;
PMDModelView.prototype._VN_ITEM_SIZE = 3;
PMDModelView.prototype._VE_ITEM_SIZE  = 1;


PMDModelView.prototype.setup = function() {
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

  this._initArrays();
  this._initTextures();
  this._pourArrays();
  this._bindBuffers();
};


/**
 * TODO: temporal
 */
PMDModelView.prototype.setBasePosition = function(x, y, z) {
  this.basePosition[0] = x;
  this.basePosition[1] = y;
  this.basePosition[2] = z;

  this._initMotions2();
  for(var i = 0; i < this.pmd.boneCount; i++) {
    this._getBoneMotion(i);
  }
  this.physics.resetRigidBodies(this.motions);
};


PMDModelView.prototype.setVMD = function(vmd) {
  this.vmd = vmd;
};


PMDModelView.prototype.startDance = function() {
  this.vmd.setup(this.pmd);
  this.dancing = true;
  this.frame = 0;

  this._initMotions2();
  this._moveBone(1);
  this.physics.resetRigidBodies(this.motions);
};


PMDModelView.prototype._initArrays = function() {
  this._initVertices();
  this._initVerticesFromBones();
  this._initVertexMorphs();
  this._initVertexEdges();
  this._initCoordinates();
  this._initIndices();
  this._initBoneWeights();
  this._initBoneIndices();
  this._initVertexNormals();
  this._initMotions();
  this._initMotionArrays();
};


PMDModelView.prototype._initVertices = function() {
  for(var i = 0; i < this.pmd.vertexCount; i++) {
    var pos = this.pmd.vertices[i].position;
    var index = i * this._V_ITEM_SIZE;

    for(var j = 0; j < this._V_ITEM_SIZE; j++) {
      this.vArray[index+j] = pos[j];
    }
  }
};


PMDModelView.prototype._initVerticesFromBones = function() {
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


PMDModelView.prototype._initVertexMorphs = function() {
  for(var i = 0; i < this.pmd.vertexCount; i++) {
    var index = i * this._V_ITEM_SIZE;

    for(var j = 0; j < this._V_ITEM_SIZE; j++) {
      this.vmArray[index+j] = 0;
    }
  }
};


PMDModelView.prototype._initVertexEdges = function() {
  for(var i = 0; i < this.pmd.vertexCount; i++) {
    this.veArray[i] = this.pmd.vertices[i].edgeFlag ? 0.0 : 1.0;
  }
};


PMDModelView.prototype._initCoordinates = function() {
  for(var i = 0; i < this.pmd.vertexCount; i++) {
    var index = i * this._C_ITEM_SIZE;
    var uv = this.pmd.vertices[i].uv;
    for(var j = 0; j < this._C_ITEM_SIZE; j++) {
      this.cArray[index+j] = uv[j];
    }
  }
};


PMDModelView.prototype._initIndices = function() {
  for(var i = 0; i < this.pmd.vertexIndexCount; i++) {
    this.iArray[i] = this.pmd.vertexIndices[i].index;
  }
};


PMDModelView.prototype._initBoneWeights = function() {
  for(var i = 0; i < this.pmd.vertexCount; i++) {
    this.bwArray[i] = this.pmd.vertices[i].boneWeight / 100;
  }
};


PMDModelView.prototype._initBoneIndices = function() {
  for(var i = 0; i < this.pmd.vertexCount; i++) {
    for(var j = 0; j < this._BI_ITEM_SIZE; j++) {
      this.biArray[i*this._BI_ITEM_SIZE+j] =
        this.pmd.vertices[i].boneIndices[j];
    }
  }
};


PMDModelView.prototype._initVertexNormals = function() {
  for(var i = 0; i < this.pmd.vertexCount; i++) {
    var nor = this.pmd.vertices[i].normal;
    var index = i * this._VN_ITEM_SIZE;

    for(var j = 0; j < this._VN_ITEM_SIZE; j++) {
      this.vnArray[index+j] = nor[j];
    }
  }
};


PMDModelView.prototype._initMotionArrays = function() {
  if(this.view.skinningType == this.view._SKINNING_CPU) {
    this._skinning();
    return;
  }

  if(this.view.skinningType == this.view._SKINNING_GPU) {
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


/**
 * TODO: consider the case if images aren't loaded yet.
 */
PMDModelView.prototype._initTextures = function() {
  for(var i = 0; i < this.pmd.materialCount; i++) {
    this.textures[i] = this.layer.generateTexture(this.pmd.images[i]);
  }

  for(var i = 0; i < this.pmd.toonTextureCount; i++) {
    this.toonTextures[i] = this.layer.generateTexture(this.pmd.toonImages[i]);
  }

  for(var i = 0; i < this.pmd.materialCount; i++) {
    this.sphereTextures[i] = 
      this.layer.generateTexture(this.pmd.sphereImages[i]);
  }
};


PMDModelView.prototype._initMotions = function() {
  for(var i = 0; i < this.pmd.boneCount; i++) {
    this.motions[i] = {
      r: this.quat4.create(),
      p: this.vec3.create(),
      done: false
    };

    var b = this.pmd.bones[i];
    var a = {};
    a.location = [0, 0, 0];
    a.rotation = [0, 0, 0, 1];
    this.originalMotions[b.name] = a;
  }

};


/**
 * TODO: temporal
 */
PMDModelView.prototype._initMotions2 = function() {
  for(var i = 0; i < this.pmd.boneCount; i++) {
    this.quat4.clear(this.motions[i].r);
    this.vec3.clear(this.motions[i].p);
    this.motions[i].done = false;

    var b = this.pmd.bones[i];
    var a = this.originalMotions[b.name];
    this.vec3.clear(a.location);
    this.quat4.clear(a.rotation);
  }
};


PMDModelView.prototype._packTo4Uint8 = function(f, uint8Array, offset) {
  f = f * 1.0;
  var sign = (f < 0.0) ? 0x80 : 0x00;
  f = this.Math.abs(f);
  uint8Array[offset+0] = sign | (f & 0x7F);
  uint8Array[offset+1] = (f * 256.0) & 0xFF;
  uint8Array[offset+2] = (f * 256.0 * 256.0) & 0xFF;
  uint8Array[offset+3] = (f * 256.0 * 256.0 * 256.0) & 0xFF;
};


PMDModelView.prototype._pourVTF = function() {
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


/**
 * TODO: rename
 */
PMDModelView.prototype.skinningOneBone = function(b) {
  if(b.id === null)
    return null;

  var m = this._getBoneMotion(b.id);
  var v = b.posFromBone;
  var vd = [0, 0, 0];
  this.vec3.rotateByQuat4(v, m.r, vd);
  this.vec3.add(vd, m.p, vd);
  return vd;
};


PMDModelView.prototype._skinning = function() {
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


PMDModelView.prototype._pourArrays = function() {
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
  layer.pourArrayBuffer(this.veBuffer, this.veArray,
                        this._VE_ITEM_SIZE, this.pmd.vertexCount);
};


/**
 * TODO: remove shader specific attribute names from this class.
 */
PMDModelView.prototype._bindBuffers = function() {
  var layer = this.layer;
  var gl = this.layer.gl;
  var shader = this.layer.shader;

  gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
  gl.enableVertexAttribArray(shader.vertexPositionAttribute);
  gl.vertexAttribPointer(shader.vertexPositionAttribute,
                         this.vBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer1);
  gl.enableVertexAttribArray(shader.vertexPositionAttribute1);
  gl.vertexAttribPointer(shader.vertexPositionAttribute1,
                         this.vBuffer1.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer2);
  gl.enableVertexAttribArray(shader.vertexPositionAttribute2);
  gl.vertexAttribPointer(shader.vertexPositionAttribute2,
                         this.vBuffer2.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.vmBuffer);
  gl.enableVertexAttribArray(shader.vertexMorphAttribute);
  gl.vertexAttribPointer(shader.vertexMorphAttribute,
                         this.vmBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.cBuffer);
  gl.enableVertexAttribArray(shader.textureCoordAttribute);
  gl.vertexAttribPointer(shader.textureCoordAttribute,
                         this.cBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.bwBuffer);
  gl.enableVertexAttribArray(shader.boneWeightAttribute);
  gl.vertexAttribPointer(shader.boneWeightAttribute,
                         this.bwBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.biBuffer);
  gl.enableVertexAttribArray(shader.boneIndicesAttribute);
  gl.vertexAttribPointer(shader.boneIndicesAttribute,
                         this.biBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.vnBuffer);
  gl.enableVertexAttribArray(shader.vertexNormalAttribute);
  gl.vertexAttribPointer(shader.vertexNormalAttribute,
                         this.vnBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.veBuffer);
  gl.enableVertexAttribArray(shader.vertexEdgeAttribute);
  gl.vertexAttribPointer(shader.vertexEdgeAttribute,
                         this.veBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.mtBuffer1);
  gl.enableVertexAttribArray(shader.motionTranslationAttribute1);
  gl.vertexAttribPointer(shader.motionTranslationAttribute1,
                         this.mtBuffer1.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.mtBuffer2);
  gl.enableVertexAttribArray(shader.motionTranslationAttribute2);
  gl.vertexAttribPointer(shader.motionTranslationAttribute2,
                         this.mtBuffer2.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.mrBuffer1);
  gl.enableVertexAttribArray(shader.motionRotationAttribute1);
  gl.vertexAttribPointer(shader.motionRotationAttribute1,
                         this.mrBuffer1.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.mrBuffer2);
  gl.enableVertexAttribArray(shader.motionRotationAttribute2);
  gl.vertexAttribPointer(shader.motionRotationAttribute2,
                         this.mrBuffer2.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
};


PMDModelView.prototype._draw = function(texture, pos, num) {
  this.layer.draw(texture, this.layer._BLEND_ALPHA, num, pos);
};


/**
 * TODO: temporal
 */
PMDModelView.prototype.update = function(dframe) {
  this._initMotions2();

  if(this.dancing) {
    this._moveBone(dframe);
    this._moveFace();
  }

  for(var i = 0; i < this.pmd.boneCount; i++) {
    this._getBoneMotion(i);
  }

  if(this.view.physicsType == this.view._PHYSICS_ON)
    this._runPhysics(dframe);

  this._initMotionArrays();
};


/**
 * TODO: temporal
 * TODO: optimize
 */
PMDModelView.prototype.draw = function() {
  var layer = this.layer;
  var gl = this.layer.gl;
  var shader = this.layer.shader;

  this._bindBuffers();

  // TODO: temporal
  if(this.view.skinningType == this.view._SKINNING_GPU) {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.vtf);
    gl.uniform1i(shader.uVTFUniform, 1);
  } else {
    gl.uniform1i(shader.uVTFUniform, 0);
  }

  gl.uniform1i(shader.edgeUniform, 0);
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
                       gl.SRC_ALPHA, gl.DST_ALPHA);

  var offset = 0;
  for(var i = 0; i < this.pmd.materialCount; i++) {
    var m = this.pmd.materials[i];

    // TODO: temporal
    if(m.edgeFlag)
      gl.uniform1i(shader.shadowUniform, 1);
    else
      gl.uniform1i(shader.shadowUniform, 0);

    // TODO: temporal
    if(this.view.edgeType == this.view._EDGE_ON && m.color[3] == 1.0) {
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
    } else {
      gl.disable(gl.CULL_FACE);
      gl.cullFace(gl.FRONT);
    }

    gl.uniform4fv(shader.diffuseColorUniform, m.color);
    gl.uniform3fv(shader.ambientColorUniform, m.mirrorColor);
    gl.uniform3fv(shader.specularColorUniform, m.specularColor);
    gl.uniform1f(shader.shininessUniform, m.specularity);

    // TODO: rename tune to toon
    if(m.hasToon()) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.toonTextures[m.tuneIndex]);
      gl.uniform1i(shader.toonTextureUniform, 2);
      gl.uniform1i(shader.useToonUniform, 1);
    } else {
      gl.uniform1i(shader.useToonUniform, 0);
    }

    if(this.view.sphereMapType == this.view._SPHERE_MAP_ON &&
       m.hasSphereTexture()) {
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.sphereTextures[i]);
      gl.uniform1i(shader.sphereTextureUniform, 3);
      gl.uniform1i(shader.useSphereMapUniform, 1);
      if(m.isSphereMapAddition()) {
        gl.uniform1i(shader.useSphereMapAdditionUniform, 1);
      } else {
        gl.uniform1i(shader.useSphereMapAdditionUniform, 0);
      }
    } else {
      gl.uniform1i(shader.useSphereMapUniform, 0);
    }

    var num = this.pmd.materials[i].vertexCount;
    this._draw(this.textures[i], offset, num);
    offset += num;
  }
};


PMDModelView.prototype.drawEdge = function() {
  var layer = this.layer;
  var gl = this.layer.gl;
  var shader = this.layer.shader;

  gl.uniform1i(shader.edgeUniform, 1);
  gl.uniform1i(shader.useToonUniform, 0);
  gl.cullFace(gl.FRONT);
  gl.disable(gl.BLEND);
  gl.enable(gl.CULL_FACE);

  // Note: attempt to call _draw() as less as possible
  var offset = 0;
  var num = 0;
  var flag = false;
  for(var i = 0; i < this.pmd.materialCount; i++) {
    num += this.pmd.materials[i].vertexCount;
    if(! this.pmd.materials[i].edgeFlag) {
      if(flag)
        this._draw(this.textures[0], offset, num);
      offset += num;
      num = 0;
      flag = false;
    } else {
      flag = true;
    }
  }
  if(flag)
    this._draw(this.textures[0], offset, num);
};


PMDModelView.prototype.drawShadowMap = function() {
  var layer = this.layer;
  var gl = this.layer.gl;
  var shader = this.layer.shader;

  this._bindBuffers();

  // TODO: temporal
  if(this.view.skinningType == this.view._SKINNING_GPU) {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.vtf);
    gl.uniform1i(shader.uVTFUniform, 1);
  } else {
    gl.uniform1i(shader.uVTFUniform, 0);
  }

  gl.uniform1i(shader.edgeUniform, 0);

  gl.disable(gl.BLEND);
  gl.disable(gl.CULL_FACE);
  gl.cullFace(gl.FRONT);

  this._draw(this.textures[0], 0, this.pmd.vertexIndexCount);
};


/**
 * TODO: temporal
 */
PMDModelView.prototype._runPhysics = function(dframe) {
  if(dframe == 1)
    this.physics.simulate(this.motions);
  else
    this.physics.simulateFrame(this.motions, dframe);
};


/**
 * TODO: rename
 */
PMDModelView.prototype._loadFromVMD = function(dframe) {
  this.vmd.loadMotion();

  if(this.view.morphType == this.view._MORPH_ON)
    this.vmd.loadFace();

  this.vmd.step(dframe);
  this.frame += dframe;
};


/**
 * TODO: temporal
 * TODO: any ways to avoid update all morph Buffer?
 */
PMDModelView.prototype._moveFace = function() {
  if(this.view.morphType == this.view._MORPH_OFF)
    return;

  var done = false;
  for(var i = 0; i < this.pmd.faceCount; i++) {
    var f = this.vmd.getFace(this.pmd.faces[i]);
    if(f.available) {
      this._moveMorph(this.pmd.faces[i].id, f.weight);
      done = true;
    }
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


/**
 * TODO: temporal
 */
PMDModelView.prototype._moveBone = function(dframe) {
  this._loadFromVMD(dframe);

  for(var i = 0; i < this.pmd.boneCount; i++) {
    this._getBoneMotion(i);
  }

  if(this.view.ikType == this.view._IK_ON)
    this._resolveIK();
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


// TODO: move generic place
vec3.clear = function(v) {
  v[0] = 0;
  v[1] = 0;
  v[2] = 0;
};


quat4.clear = function(q) {
  q[0] = 0;
  q[1] = 0;
  q[2] = 0;
  q[3] = 1;
};


PMDModelView.prototype._getOriginalBoneMotion = function(bone) {
  return (this.dancing)
           ? this.vmd.getBoneMotion(bone)
           : this.originalMotions[bone.name];
};


/**
 * copied from MMD.js so far
 */
PMDModelView.prototype._getBoneMotion = function(index) {
  var motion = this.motions[index];
  if(motion.done) {
    return motion;
  }

  // TODO: temporal work around
  var m = this._getOriginalBoneMotion(this.pmd.bones[index]);

  var r = this.quat4.set(m.rotation, motion.r);
  var t = this.vec3.create();
  this.vec3.set(m.location, t);
  if(this.pmd.bones[index].parentIndex == 0xFFFF)
    this.vec3.add(t, this.basePosition, t);

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
PMDModelView.prototype._resolveIK = function() {
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

        this.quat4.normalize(r, this.vmd.getBoneMotion(cb).rotation);
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
PMDModelView.prototype._moveMorph = function(index, weight) {
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
