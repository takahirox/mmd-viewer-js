function Layer(canvas) {
  this.canvas = canvas;
  this.gl = this._initGl(canvas);
  this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
  this.shader = this._initShader(this.gl);
  this.mvMatrix = mat4.create();
  this.pMatrix = mat4.create();
  this.textureID = 0;
  this.lightDirection = [-30, 100, 50]; // TODO: temporal
  this.camera = null;
};

Layer.prototype.mat4 = mat4; // only for reference.

Layer.prototype._NAMES = ['webgl', 'experimental-webgl'];

Layer.prototype._BLEND_ALPHA     = 0;
Layer.prototype._BLEND_ALPHA2    = 1;
Layer.prototype._BLEND_ADD_ALPHA = 2;

Layer.prototype._SHADERS = {};

Layer.prototype._SHADERS['shader-vs'] = {};
Layer.prototype._SHADERS['shader-vs'].type = 'x-shader/x-vertex';
Layer.prototype._SHADERS['shader-vs'].src = '\
  attribute vec3 aVertexPosition;\
  attribute vec3 aVertexPosition1;\
  attribute vec3 aVertexPosition2;\
  attribute vec3 aVertexNormal;\
  attribute vec3 aVertexMorph;\
  attribute vec2 aBoneIndices;\
  attribute float aBoneWeight;\
  attribute vec3 aMotionTranslation1;\
  attribute vec3 aMotionTranslation2;\
  attribute vec4 aMotionRotation1;\
  attribute vec4 aMotionRotation2;\
  attribute vec2 aTextureCoordinates;\
\
  uniform mat4 uMVMatrix;\
  uniform mat4 uPMatrix;\
  uniform mat3 uNMatrix;\
  uniform vec3 uLightColor;\
  uniform vec3 uLightDirection;\
  uniform vec4 uDiffuseColor;\
  uniform vec3 uAmbientColor;\
  uniform vec3 uSpecularColor;\
  uniform float uShininess;\
  uniform int uSkinningType;\
  uniform int uLightingType;\
  uniform int uVTFWidth;\
  uniform sampler2D uVTF;\
  uniform sampler2D uToonTexture;\
  uniform bool uUseToon;\
\
  varying vec2 vTextureCoordinates;\
  varying vec4 vLightWeighting;\
\
  highp float binary32(vec4 rgba) {\
    rgba = floor(255.0 * rgba + 0.5);\
    highp float val;\
    val  = rgba[0];\
    val += rgba[1] / (256.0);\
    val += rgba[2] / (256.0 * 256.0);\
    val += rgba[3] / (256.0 * 256.0 * 256.0);\
    return rgba[0] >= 128.0 ? -(val - 128.0) : val;\
  }\
\
  float getU(float index) {\
    float unit = 1.0 / float(uVTFWidth);\
    return fract(index * unit + unit * 0.5);\
  }\
\
  float getV(float index) {\
    float unit = 1.0 / float(uVTFWidth);\
    return floor(index * unit) * unit + unit * 0.5;\
  }\
\
  vec2 getUV(float index) {\
    float u = getU(index);\
    float v = getV(index);\
    return vec2(u, v);\
  }\
\
  vec3 getMotionTranslation(float bn) {\
    float index = bn * 7.0 + 0.0;\
    highp float x = binary32(texture2D(uVTF, getUV(index+0.0)));\
    highp float y = binary32(texture2D(uVTF, getUV(index+1.0)));\
    highp float z = binary32(texture2D(uVTF, getUV(index+2.0)));\
    return vec3(x, y, z);\
  }\
\
  vec4 getMotionRotation(float bn) {\
    float index = bn * 7.0 + 3.0;\
    highp float x = binary32(texture2D(uVTF, getUV(index+0.0)));\
    highp float y = binary32(texture2D(uVTF, getUV(index+1.0)));\
    highp float z = binary32(texture2D(uVTF, getUV(index+2.0)));\
    highp float w = binary32(texture2D(uVTF, getUV(index+3.0)));\
    return vec4(x, y, z, w);\
  }\
\
  vec3 qtransform(vec3 v, vec4 q) {\
    return v + 2.0 * cross(cross(v, q.xyz) - q.w*v, q.xyz);\
  }\
\
  void main() {\
    vec3 pos;\
    vec3 norm;\
    if(uSkinningType == 2) {\
      vec3 v1 = aVertexPosition1 + aVertexMorph;\
      vec3 v2 = aVertexPosition2 + aVertexMorph;\
      v1 = qtransform(v1, aMotionRotation1) + aMotionTranslation1;\
      v2 = qtransform(v2, aMotionRotation2) + aMotionTranslation2;\
      norm = qtransform(aVertexNormal, aMotionRotation1);\
      if(aBoneWeight < 0.99) {\
        pos = mix(v2, v1, aBoneWeight);\
        vec3 n2 = qtransform(aVertexNormal, aMotionRotation2);\
        norm = normalize(mix(n2, norm, aBoneWeight));\
      } else {\
        pos = v1;\
      }\
    } else if(uSkinningType == 1) {\
      float b1 = floor(aBoneIndices.x + 0.5);\
      float b2 = floor(aBoneIndices.y + 0.5);\
      vec3 v1 = aVertexPosition1 + aVertexMorph;\
      vec3 v2 = aVertexPosition2 + aVertexMorph;\
      v1 = qtransform(v1, getMotionRotation(b1)) + getMotionTranslation(b1);\
      v2 = qtransform(v2, getMotionRotation(b2)) + getMotionTranslation(b2);\
      norm = qtransform(aVertexNormal, getMotionRotation(b1));\
      if(aBoneWeight < 0.99) {\
        pos = mix(v2, v1, aBoneWeight);\
        vec3 n2 = qtransform(aVertexNormal, getMotionRotation(b2));\
        norm = normalize(mix(n2, norm, aBoneWeight));\
      } else {\
        pos = v1;\
      }\
    } else {\
      pos = aVertexPosition + aVertexMorph;\
      norm = qtransform(aVertexNormal, vec4(0, 0, 0, 1));\
    }\
\
    gl_Position = uPMatrix * uMVMatrix * vec4(pos, 1.0);\
    vTextureCoordinates = aTextureCoordinates;\
\
    if(uLightingType > 0) {\
      vec4 vertexPositionEye4 = uMVMatrix * vec4(pos, 1.0);\
      vec3 vertexPositionEye3 = vertexPositionEye4.xyz / vertexPositionEye4.w;\
      vec3 vectorToLightSource = normalize(uLightDirection -\
                                           vertexPositionEye3);\
      vec3 normalEye = normalize(uNMatrix * norm);\
      float diffuseLightWeightning = max(dot(normalEye,\
                                             vectorToLightSource), 0.0);\
      vec3 reflectionVector = normalize(reflect(-vectorToLightSource,\
                                                 normalEye));\
      vec3 viewVectorEye = -normalize(vertexPositionEye3);\
      float rdotv = max(dot(reflectionVector, viewVectorEye), 0.0);\
      float specularLightWeightning = pow(rdotv, uShininess);\
\
      vec3 vLight = uAmbientColor + \
                    uLightColor *\
                      (uDiffuseColor.rgb * diffuseLightWeightning +\
                       uSpecularColor * specularLightWeightning);\
\
      vLightWeighting = clamp(vec4(vLight, uDiffuseColor.a), 0.0, 1.0);\
\
      if(uLightingType == 2 && uUseToon) {\
        vec2 toonCoord = vec2(0.0, 0.5 * (1.0 - dot(uLightDirection,\
                                                    normalEye)));\
        vLightWeighting.rgb *= texture2D(uToonTexture, toonCoord).rgb;\
      }\
    } else {\
      vLightWeighting = uDiffuseColor;\
    }\
  }\
';

Layer.prototype._SHADERS['shader-fs'] = {};
Layer.prototype._SHADERS['shader-fs'].type = 'x-shader/x-fragment';
Layer.prototype._SHADERS['shader-fs'].src = '\
  precision mediump float;\
  varying vec2 vTextureCoordinates;\
  uniform sampler2D uSampler;\
  varying vec4 vLightWeighting;\
\
  void main() {\
    vec4 textureColor = texture2D(uSampler, vTextureCoordinates);\
    gl_FragColor = vLightWeighting * textureColor;\
  }\
';


Layer.prototype._initGl = function(canvas) {
  var names = this._NAMES;
  var context = null;
  for(var i = 0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {
      if(context)
        break;
    }
  }
  if(context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
};


Layer.prototype._compileShaderFromDOM = function(gl, id) {
  var script = document.getElementById(id);

  if(!script)
    return null;

  var source = '';
  var currentChild = script.firstChild;
  while(currentChild) {
    if(currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      source += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }

  return this._compileShader(gl, source, script.type);
};


Layer.prototype._compileShader = function(gl, source, type) {
  var shader;
  if(type == 'x-shader/x-fragment') {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if(type == 'x-shader/x-vertex') {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
};


Layer.prototype._initVertexShader = function(gl) {
  var params = this._SHADERS['shader-vs'];
  return this._compileShader(gl, params.src, params.type);
};


Layer.prototype._initFragmentShader = function(gl) {
  var params = this._SHADERS['shader-fs'];
  return this._compileShader(gl, params.src, params.type);
};


Layer.prototype._initShader = function(gl) {
  var vertexShader = this._initVertexShader(gl);
  var fragmentShader = this._initFragmentShader(gl);

  var shader = gl.createProgram();
  gl.attachShader(shader, vertexShader);
  gl.attachShader(shader, fragmentShader);
  gl.linkProgram(shader);

  if(!gl.getProgramParameter(shader, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shader);

  shader.vertexPositionAttribute =
    gl.getAttribLocation(shader, 'aVertexPosition');
  gl.enableVertexAttribArray(shader.vertexPositionAttribute);
  shader.vertexPositionAttribute1 =
    gl.getAttribLocation(shader, 'aVertexPosition1');
  gl.enableVertexAttribArray(shader.vertexPositionAttribute1);
  shader.vertexPositionAttribute2 =
    gl.getAttribLocation(shader, 'aVertexPosition2');
  gl.enableVertexAttribArray(shader.vertexPositionAttribute2);
  shader.vertexMorphAttribute =
    gl.getAttribLocation(shader, 'aVertexMorph');
  gl.enableVertexAttribArray(shader.vertexMorphAttribute);

  shader.motionTranslationAttribute1 =
    gl.getAttribLocation(shader, 'aMotionTranslation1');
  gl.enableVertexAttribArray(shader.motionTranslationAttribute1);
  shader.motionTranslationAttribute2 =
    gl.getAttribLocation(shader, 'aMotionTranslation2');
  gl.enableVertexAttribArray(shader.motionTranslationAttribute2);

  shader.motionRotationAttribute1 =
    gl.getAttribLocation(shader, 'aMotionRotation1');
  gl.enableVertexAttribArray(shader.motionRotationAttribute1);
  shader.motionRotationAttribute2 =
    gl.getAttribLocation(shader, 'aMotionRotation2');
  gl.enableVertexAttribArray(shader.motionRotationAttribute2);

  shader.textureCoordAttribute = 
    gl.getAttribLocation(shader, 'aTextureCoordinates');
  gl.enableVertexAttribArray(shader.textureCoordAttribute);

  shader.boneWeightAttribute =
    gl.getAttribLocation(shader, 'aBoneWeight');
  gl.enableVertexAttribArray(shader.boneWeightAttribute);

  shader.boneIndicesAttribute =
    gl.getAttribLocation(shader, 'aBoneIndices');
  gl.enableVertexAttribArray(shader.boneIndicesAttribute);

  shader.vertexNormalAttribute =
    gl.getAttribLocation(shader, 'aVertexNormal');
  gl.enableVertexAttribArray(shader.vertexNormalAttribute);

  shader.pMatrixUniform =
    gl.getUniformLocation(shader, 'uPMatrix');
  shader.mvMatrixUniform =
    gl.getUniformLocation(shader, 'uMVMatrix');
  shader.nMatrixUniform =
    gl.getUniformLocation(shader, 'uNMatrix');

  shader.lightColorUniform =
    gl.getUniformLocation(shader, 'uLightColor');
  shader.lightDirectionUniform =
    gl.getUniformLocation(shader, 'uLightDirection');
  shader.diffuseColorUniform =
    gl.getUniformLocation(shader, 'uDiffuseColor');
  shader.ambientColorUniform =
    gl.getUniformLocation(shader, 'uAmbientColor');
  shader.specularColorUniform =
    gl.getUniformLocation(shader, 'uSpecularColor');
  shader.shininessUniform =
    gl.getUniformLocation(shader, 'uShininess');

  shader.uSamplerUniform =
    gl.getUniformLocation(shader, 'uSampler');

  shader.uSkinningTypeUniform =
    gl.getUniformLocation(shader, 'uSkinningType');
  shader.uLightingTypeUniform =
    gl.getUniformLocation(shader, 'uLightingType');

  shader.uVTFUniform =
    gl.getUniformLocation(shader, 'uVTF');
  shader.uVTFWidthUniform =
    gl.getUniformLocation(shader, 'uVTFWidth');

  shader.useToonUniform =
    gl.getUniformLocation(shader, 'uUseToon');
  shader.toonTextureUniform =
    gl.getUniformLocation(shader, 'uToonTexture');

  return shader;
}


Layer.prototype.setMatrixUniforms = function(gl) {
  gl.uniformMatrix4fv(this.shader.pMatrixUniform, false, this.pMatrix);
  gl.uniformMatrix4fv(this.shader.mvMatrixUniform, false, this.mvMatrix);

  var nMat = mat3.create();
  mat4.toInverseMat3(this.mvMatrix, nMat);
  mat3.transpose(nMat);
  gl.uniformMatrix3fv(this.shader.nMatrixUniform, false, nMat);

  //  TODO: temporal
  var lightDirection = vec3.normalize(vec3.create(this.lightDirection));
  var nMat4 = mat4.create();
  mat3.toMat4(nMat, nMat4);
  mat4.multiplyVec3(nMat4, lightDirection, lightDirection);
  gl.uniform3fv(this.shader.lightDirectionUniform, lightDirection);
}


Layer.prototype.viewport = function() {
  this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
};


Layer.prototype.clear = function() {
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
};


Layer.prototype.perspective = function(theta, near, far) {
  this.mat4.perspective(theta, this.gl.viewportWidth / this.gl.viewportHeight,
                   near, far, this.pMatrix);
};


Layer.prototype.ortho = function(near, far) {
  this.mat4.ortho(0, this.gl.viewportWidth, -this.gl.viewportHeight, 0,
             near, far, this.pMatrix);
};


Layer.prototype.lookAt = function(eye, center, up) {
  this.mat4.lookAt(eye, center, up, this.mvMatrix);
};


Layer.prototype.identity = function() {
  this.mat4.identity(this.mvMatrix);
};


/**
 * pre_multiplied argument is a last resort.
 */
Layer.prototype.generateTexture = function(image) {
  var gl = this.gl;
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
//  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
//  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
};


Layer.prototype.pourVTF = function(texture, array, width) {
  var gl = this.gl;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, width, 0,
                gl.RGBA, gl.UNSIGNED_BYTE, array);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.uniform1i(this.shader.uVTFWidthUniform, width);
};


Layer.prototype.draw = function(texture, blend, num, offset) {
  if(! offset)
    offset = 0;

  var gl = this.gl;
  var shader = this.shader;

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(shader.uSamplerUniform, 0);

  var param1;
  var param2;
  switch(blend) {
    case this._BLEND_ALPHA2:
      param1 = gl.ONE;
      param2 = gl.ONE_MINUS_SRC_ALPHA;
      break;
    case this._BLEND_ADD_ALPHA:
      param1 = gl.SRC_ALPHA;
      param2 = gl.ONE;
      break;
//  case this._BLEND_ALPHA:
//  case null:
    default:
      param1 = gl.SRC_ALPHA;
      param2 = gl.ONE_MINUS_SRC_ALPHA;
      break;
  }
  gl.blendFuncSeparate(param1, param2, gl.ONE, gl.ONE);

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
//  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
//  gl.enable(gl.CULL_FACE);

  this.setMatrixUniforms(gl);
  gl.drawElements(gl.TRIANGLES, num, gl.UNSIGNED_SHORT, offset*2);
};


/**
 * TODO: gl.bufferSubData and pratial update could improve
 *       CPU-GPU transfer performance.
 */
Layer.prototype.pourArrayBuffer = function(buffer, array, itemSize, numItems) {
  var gl = this.gl;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);
  buffer.itemSize = itemSize;
  buffer.numItems = numItems;
};


Layer.prototype.pourElementArrayBuffer = function(buffer, array, itemSize,
                                                  numItems) {
  var gl = this.gl;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, array, gl.STATIC_DRAW);
  buffer.itemSize = itemSize;
  buffer.numItems = numItems;
};


Layer.prototype.createFloatArray = function(num) {
  return new Float32Array(num);
};


Layer.prototype.createUintArray = function(num) {
  return new Uint16Array(num);
};


Layer.prototype.createUint8Array = function(num) {
  return new Uint8Array(num);
};


Layer.prototype.createBuffer = function() {
  return this.gl.createBuffer();
};


Layer.prototype.calculateSquareValue = function(num) {
  var val = 1;
  while(num > val) {
    val = val << 1;
  }
  return val;
};


Layer.prototype.calculateVTFWidth = function(num) {
  var val = 1;
  while(num > val * val) {
    val = val * 2;
  }
  return val;
};
