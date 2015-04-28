function Layer(canvas) {
  this.canvas = canvas;
  this.gl = this._initGl(canvas);
  this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
  this.shader = this._initShader(this.gl);
  this.stageShaders = [];
  this.postEffects = {};
  this.mvMatrix = mat4.create();
  this.pMatrix = mat4.create();
  this.textureID = 0;
  this.lightDirection = [-30, 100, 50]; // TODO: temporal
  this.camera = null;
  this._initPostEffects();
  this._initStageShaders();
};

// only for reference.
Layer.prototype.mat4 = mat4;
Layer.prototype.Math = Math;

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
  attribute float aVertexEdge;\
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
  uniform bool uEdge;\
  uniform bool uShadow;\
\
  varying vec2 vTextureCoordinates;\
  varying vec4 vLightWeighting;\
  varying vec3 vNormal;\
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
  vec4 getVTF(float index) {\
    return texture2D(uVTF, getUV(index));\
  }\
\
  vec3 getMotionTranslation(float bn) {\
    float index = bn * 7.0 + 0.0;\
    highp float x = binary32(getVTF(index+0.0));\
    highp float y = binary32(getVTF(index+1.0));\
    highp float z = binary32(getVTF(index+2.0));\
    return vec3(x, y, z);\
  }\
\
  vec4 getMotionRotation(float bn) {\
    float index = bn * 7.0 + 3.0;\
    highp float x = binary32(getVTF(index+0.0));\
    highp float y = binary32(getVTF(index+1.0));\
    highp float z = binary32(getVTF(index+2.0));\
    highp float w = binary32(getVTF(index+3.0));\
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
    vNormal = normalize(norm);\
\
    if(uLightingType > 0) {\
      vec4 vertexPositionEye4 = uMVMatrix * vec4(pos, 1.0);\
      vec3 vertexPositionEye3 = vertexPositionEye4.xyz / vertexPositionEye4.w;\
      vec3 vectorToLightSource = normalize(uLightDirection -\
                                           vertexPositionEye3);\
      vec3 normalEye = normalize(uNMatrix * norm);\
      float diffuseLightWeightning = (uShadow)\
                                       ? max(dot(normalEye,\
                                                 vectorToLightSource), 0.0)\
                                       : 1.0;\
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
\
    /* just copied from MMD.js */\
    if(uEdge) {\
      const float thickness = 0.003;\
      vec4 epos = gl_Position;\
      vec4 epos2 = uPMatrix * uMVMatrix * vec4(pos + norm, 1.0);\
      vec4 enorm = normalize(epos2 - epos);\
      gl_Position = epos + enorm * thickness * aVertexEdge * epos.w;\
    }\
  }\
';

Layer.prototype._SHADERS['shader-fs'] = {};
Layer.prototype._SHADERS['shader-fs'].type = 'x-shader/x-fragment';
Layer.prototype._SHADERS['shader-fs'].src = '\
  precision mediump float;\
  varying vec2 vTextureCoordinates;\
  uniform sampler2D uSampler;\
  uniform bool uEdge;\
  uniform bool uUseSphereMap;\
  uniform bool uUseSphereMapAddition;\
  uniform sampler2D uSphereTexture;\
  varying vec4 vLightWeighting;\
  varying vec3 vNormal;\
\
  void main() {\
\
    if(uEdge) {\
      gl_FragColor = vec4(vec3(0.0), vLightWeighting.a);\
      return;\
    }\
\
    vec4 textureColor = texture2D(uSampler, vTextureCoordinates);\
\
    /* just copied from MMD.js */\
    if(uUseSphereMap) {\
      vec2 sphereCood = 0.5 * (1.0 + vec2(1.0, -1.0) * vNormal.xy);\
      vec3 sphereColor = texture2D(uSphereTexture, sphereCood).rgb;\
      if(uUseSphereMapAddition) {\
        textureColor.rgb += sphereColor;\
      } else {\
        textureColor.rgb *= sphereColor;\
      }\
    }\
\
    gl_FragColor = vLightWeighting * textureColor;\
  }\
';


Layer.prototype._initGl = function(canvas) {
  var names = this._NAMES;
  var context = null;
  for(var i = 0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i], {antialias: true});
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

  return this.compileShader(gl, source, script.type);
};


Layer.prototype.compileShader = function(gl, source, type) {
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

  // TODO: temporal workaround
  if(this.gl.getParameter(this.gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) <= 0) {
    params.src = params.src.replace('texture2D(uVTF, getUV(index))',
                                    'vec4(0.0)');
    params.src = params.src.replace(
        'vLightWeighting.rgb *= texture2D(uToonTexture, toonCoord).rgb',
        'vLightWeighting.rgb *= vec3(1.0)');
  }

  return this.compileShader(gl, params.src, params.type);
};


Layer.prototype._initFragmentShader = function(gl) {
  var params = this._SHADERS['shader-fs'];
  return this.compileShader(gl, params.src, params.type);
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
  shader.vertexPositionAttribute1 =
    gl.getAttribLocation(shader, 'aVertexPosition1');
  shader.vertexPositionAttribute2 =
    gl.getAttribLocation(shader, 'aVertexPosition2');
  shader.vertexMorphAttribute =
    gl.getAttribLocation(shader, 'aVertexMorph');
  shader.vertexEdgeAttribute =
    gl.getAttribLocation(shader, 'aVertexEdge');
  shader.vertexNormalAttribute =
    gl.getAttribLocation(shader, 'aVertexNormal');
  shader.boneWeightAttribute =
    gl.getAttribLocation(shader, 'aBoneWeight');
  shader.boneIndicesAttribute =
    gl.getAttribLocation(shader, 'aBoneIndices');

  shader.motionTranslationAttribute1 =
    gl.getAttribLocation(shader, 'aMotionTranslation1');
  shader.motionTranslationAttribute2 =
    gl.getAttribLocation(shader, 'aMotionTranslation2');
  shader.motionRotationAttribute1 =
    gl.getAttribLocation(shader, 'aMotionRotation1');
  shader.motionRotationAttribute2 =
    gl.getAttribLocation(shader, 'aMotionRotation2');

  shader.textureCoordAttribute = 
    gl.getAttribLocation(shader, 'aTextureCoordinates');

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

  shader.edgeUniform =
    gl.getUniformLocation(shader, 'uEdge');
  shader.shadowUniform =
    gl.getUniformLocation(shader, 'uShadow');

  shader.sphereTextureUniform =
    gl.getUniformLocation(shader, 'uSphereTexture');
  shader.useSphereMapUniform =
    gl.getUniformLocation(shader, 'uUseSphereMap');
  shader.useSphereMapAdditionUniform =
    gl.getUniformLocation(shader, 'uUseSphereMapAddition');

  return shader;
}


/**
 * TODO: temporal
 */
Layer.prototype._initPostEffects = function() {
  this.postEffects['blur']        = new BlurEffect(this);
  this.postEffects['gaussian']    = new GaussianBlurEffect(this);
  this.postEffects['diffusion']   = new DiffusionBlurEffect(this);
  this.postEffects['division']    = new DivisionEffect(this);
  this.postEffects['low_reso']    = new LowResolutionEffect(this);
  this.postEffects['face_mosaic'] = new FaceMosaicEffect(this);
};


Layer.prototype._initStageShaders = function() {
  this.stageShaders[0] = new SimpleStage(this);
  this.stageShaders[1] = new MeshedStage(this);
  this.stageShaders[2] = new TrialStage(this);
};


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

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

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



function StageShader(layer) {
  this.layer = layer;
  this.shader = null;
  this._init();
};

StageShader.prototype._VSHADER = {};
StageShader.prototype._VSHADER.type = 'x-shader/x-vertex';
StageShader.prototype._VSHADER.src = '\
  attribute vec3 aPosition;\
  attribute float aAlpha;\
  uniform mat4 uMVMatrix;\
  uniform mat4 uPMatrix;\
  varying vec3 vPosition;\
  varying float vAlpha;\
\
  void main() {\
    gl_Position = uPMatrix * uMVMatrix * vec4(aPosition, 1.0);\
    vPosition = aPosition;\
    vAlpha = aAlpha;\
  }\
';

StageShader.prototype._FSHADER = {};
StageShader.prototype._FSHADER.type = 'x-shader/x-fragment';
StageShader.prototype._FSHADER.src = '\
  precision mediump float;\
  varying vec3  vPosition;\
  varying float vAlpha;\
  uniform float uFrame;\
  uniform float uWidth;\
  uniform int   uModelNum;\
  uniform vec3  uModelCenterPosition[5];\
  uniform vec3  uModelRightFootPosition[5];\
  uniform vec3  uModelLeftFootPosition[5];\
\
  void main() {\
    gl_FragColor = vec4(vec3(0.0), vAlpha);\
  }\
';


StageShader.prototype._init = function() {
  var gl = this.layer.gl;
  this.shader = this._initShader(gl);
  this._initAttributes(this.shader, gl);
  this._initUniforms(this.shader, gl);
  this._initBuffers(this.shader, gl);
  this._initParams(this.shader, gl);
};


StageShader.prototype._initShader = function(gl) {
  var vertexShader = this._compileShader(this._VSHADER);
  var fragmentShader = this._compileShader(this._FSHADER);

  var shader = gl.createProgram();
  gl.attachShader(shader, vertexShader);
  gl.attachShader(shader, fragmentShader);
  gl.linkProgram(shader);

  if(!gl.getProgramParameter(shader, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  return shader;
};


StageShader.prototype._initAttributes = function(shader, gl) {
  shader.positionAttribute =
    gl.getAttribLocation(shader, 'aPosition');
  shader.alphaAttribute =
    gl.getAttribLocation(shader, 'aAlpha');
};


StageShader.prototype._initUniforms = function(shader, gl) {
  shader.mvMatrixUniformLocation =
    gl.getUniformLocation(shader, 'uMVMatrix');
  shader.pMatrixUniformLocation =
    gl.getUniformLocation(shader, 'uPMatrix');
  shader.widthUniformLocation =
    gl.getUniformLocation(shader, 'uWidth');
  shader.frameUniformLocation =
    gl.getUniformLocation(shader, 'uFrame');
  shader.modelNumUniformLocation =
    gl.getUniformLocation(shader, 'uModelNum');
  shader.modelCenterPositionUniformLocation =
    gl.getUniformLocation(shader, 'uModelCenterPosition');
  shader.modelLeftFootPositionUniformLocation =
    gl.getUniformLocation(shader, 'uModelLeftFootPosition');
  shader.modelRightFootPositionUniformLocation =
    gl.getUniformLocation(shader, 'uModelRightFootPosition');
};


StageShader.prototype._initBuffers = function(shader, gl) {
  var w = 1000.0;
  var positions = [
    -w,  0.0,  w,
     w,  0.0,  w,
    -w,  0.0, -w,
     w,  0.0, -w,

    -w,  0.0,  w,
     w,  0.0,  w,
    -w,  0.0, -w,
     w,  0.0, -w,
  ];

  var indices = [
     2,  1,  0,
     1,  2,  3,

     4,  5,  6,
     7,  6,  5,
  ];

  var alphas = [
    1.0, 1.0, 1.0, 1.0,
    0.5, 0.5, 0.5, 0.5,
  ];

  var pBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  pBuffer.itemSize = 3;

  var aBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, aBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(alphas), gl.STATIC_DRAW);
  aBuffer.itemSize = 1;

  var iBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices),
                gl.STATIC_DRAW);
  iBuffer.itemNum = indices.length;

  shader.width = w;
  shader.pBuffer = pBuffer;
  shader.aBuffer = aBuffer;
  shader.iBuffer = iBuffer;
};


/**
 * override in child class
 */
StageShader.prototype._initParams = function(shader, gl) {
};


StageShader.prototype._compileShader = function(params) {
  return this.layer.compileShader(this.layer.gl, params.src, params.type);
};


StageShader.prototype._bindAttributes = function() {
  var shader = this.shader;
  var gl = this.layer.gl;

  gl.bindBuffer(gl.ARRAY_BUFFER, shader.pBuffer);
  gl.enableVertexAttribArray(shader.positionAttribute);
  gl.vertexAttribPointer(shader.positionAttribute,
                         shader.pBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, shader.aBuffer);
  gl.enableVertexAttribArray(shader.alphaAttribute);
  gl.vertexAttribPointer(shader.alphaAttribute,
                         shader.aBuffer.itemSize, gl.FLOAT, false, 0, 0);
};


StageShader.prototype._bindIndices = function() {
  var shader = this.shader;
  var gl = this.layer.gl;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shader.iBuffer);
};


/**
 * TODO: be param flexible
 */
StageShader.prototype._setUniforms = function(frame, num, cPos, lfPos, rfPos) {
  var shader = this.shader;
  var gl = this.layer.gl;

  // TODO: temporal
  gl.uniformMatrix4fv(shader.mvMatrixUniformLocation, false,
                      this.layer.mvMatrix);
  gl.uniformMatrix4fv(shader.pMatrixUniformLocation, false,
                      this.layer.pMatrix);

  gl.uniform1f(shader.frameUniformLocation, frame);
  gl.uniform1f(shader.widthUniformLocation, shader.width);
  gl.uniform1i(shader.modelNumUniformLocation, num);

  if(cPos !== null)
    gl.uniform3fv(shader.modelCenterPositionUniformLocation, cPos);

  if(lfPos !== null)
    gl.uniform3fv(shader.modelLeftFootPositionUniformLocation, lfPos);

  if(rfPos !== null)
    gl.uniform3fv(shader.modelRightFootPositionUniformLocation, rfPos);
};


StageShader.prototype._enableConditions = function() {
  var shader = this.shader;
  var gl = this.layer.gl;

  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA,
                       gl.ONE_MINUS_SRC_ALPHA,
                       gl.SRC_ALPHA,
                       gl.DST_ALPHA);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.FRONT);
};


StageShader.prototype._draw = function() {
  var shader = this.shader;
  var gl = this.layer.gl;

  gl.drawElements(gl.TRIANGLES, shader.iBuffer.itemNum, gl.UNSIGNED_SHORT, 0);
};


/**
 * TODO: be param flexible
 */
StageShader.prototype.draw = function(frame, num, cPos, lfPos, rfPos) {
  this.layer.gl.useProgram(this.shader);
  this._bindAttributes();
  this._setUniforms(frame, num, cPos, lfPos, rfPos);
  this._bindIndices();
  this._enableConditions();
  this._draw();
};



function SimpleStage(layer) {
  this.parent = StageShader;
  this.parent.call(this, layer);
};
__inherit(SimpleStage, StageShader);

SimpleStage.prototype._FSHADER = {};
SimpleStage.prototype._FSHADER.type = 'x-shader/x-fragment';
SimpleStage.prototype._FSHADER.src = '\
  precision mediump float;\
  varying vec3  vPosition;\
  varying float vAlpha;\
  uniform float uFrame;\
  uniform float uWidth;\
  uniform int   uModelNum;\
  uniform vec3  uModelCenterPosition[5];\
  uniform vec3  uModelRightFootPosition[5];\
  uniform vec3  uModelLeftFootPosition[5];\
\
  void main() {\
    float r = cos(vPosition.x);\
    float g = cos(vPosition.z);\
    gl_FragColor = vec4(r*g, r*g, r*g, vAlpha);\
  }\
';



function MeshedStage(layer) {
  this.parent = StageShader;
  this.parent.call(this, layer);
};
__inherit(MeshedStage, StageShader);


MeshedStage.prototype._FSHADER = {};
MeshedStage.prototype._FSHADER.type = 'x-shader/x-fragment';
MeshedStage.prototype._FSHADER.src = '\
  precision mediump float;\
  varying vec3  vPosition;\
  varying float vAlpha;\
  uniform float uFrame;\
  uniform float uWidth;\
  uniform int   uModelNum;\
  uniform vec3  uModelCenterPosition[5];\
  uniform vec3  uModelRightFootPosition[5];\
  uniform vec3  uModelLeftFootPosition[5];\
\
  const float tileSize = 5.0;\
  const float pi = 3.1415926535;\
  const float circleRatio = 0.01;\
\
  vec2 getTile(vec2 pos) {\
    return floor((pos + uWidth + (tileSize * 0.5)) / tileSize);\
  }\
\
  void main() {\
    vec3 pos = vPosition / uWidth;\
    float s = cos(uFrame/(pi*2.0));\
    float b = 0.0;\
    float alpha = vAlpha;\
    vec2 tile = getTile(vPosition.xz);\
\
    for(int i = 0; i < 5; i++) {\
      if(i >= uModelNum)\
        break;\
\
      vec2 ctile = getTile(uModelCenterPosition[i].xz);\
      vec2 ltile = getTile(uModelLeftFootPosition[i].xz);\
      vec2 rtile = getTile(uModelRightFootPosition[i].xz);\
\
      if(tile == ltile || tile == rtile) {\
        gl_FragColor = vec4(vec3(1.0, 0.5, 0.5)*s, alpha);\
        return;\
      }\
    }\
\
    tile = vec2(mod(tile.x, 2.0), mod(tile.y, 2.0));\
\
    if(pos.x * pos.x+ pos.z * pos.z > circleRatio) {\
      b = 0.8;\
    }\
\
    if(tile == vec2(0.0) || tile == vec2(1.0)) {\
      gl_FragColor = vec4(vec3(1.0)+b, alpha);\
    } else {\
      gl_FragColor = vec4(vec3(0.0)+b, alpha);\
    }\
  }\
';



function TrialStage(layer) {
  this.parent = StageShader;
  this.parent.call(this, layer);
};
__inherit(TrialStage, StageShader);

TrialStage.prototype._FSHADER = {};
TrialStage.prototype._FSHADER.type = 'x-shader/x-fragment';
TrialStage.prototype._FSHADER.src = '\
  precision mediump float;\
  varying vec3  vPosition;\
  varying float vAlpha;\
  uniform float uFrame;\
  uniform float uWidth;\
  uniform int   uModelNum;\
  uniform vec3  uModelCenterPosition[5];\
  uniform vec3  uModelRightFootPosition[5];\
  uniform vec3  uModelLeftFootPosition[5];\
\
  const int num = 8;\
  const int unitAngle = 360 / num;\
\
  vec2 getVec2(vec3 v) {\
    if(vPosition.y == 0.0 || vPosition.y >= 2.0 * uWidth - 0.1)\
      return v.xz;\
    if(vPosition.x <= -uWidth + 0.1 || vPosition.x >= uWidth - 0.1)\
      return v.yz;\
    return v.xy;\
  }\
\
  vec2 getPosition(int unitAngle, float uTime, int i) {\
    float ax = abs(mod(uTime*0.4, 100.0) - 50.0);\
    float ay = abs(mod(uTime*0.6, 100.0) - 50.0);\
    float rad = radians(float(unitAngle * i) + uTime*1.0);\
    vec2 val = vec2(0, 0);\
    for(int i = 0; i < 5; i++) {\
      if(i >= uModelNum)\
        break;\
      val += getVec2(uModelCenterPosition[i]);\
    }\
    val = val / float(uModelNum);\
    float x = val.x + ax * cos(rad);\
    float y = val.y + ay * sin(rad);\
    return vec2(x, y);\
  }\
\
  void main() {\
    float color = 0.0;\
    vec2 val = getVec2(vPosition);\
    for(int i = 0; i < num; i++) {\
      vec2 pos = getPosition(unitAngle, uFrame, i);\
      float dist = length(val - pos) * 6.0;\
      color += 5.0 / dist;\
    }\
    gl_FragColor = vec4(vec3(color), vAlpha);\
  }\
';



TrialStage.prototype._initBuffers = function(shader, gl) {
  var w = 100.0;
  var positions = [
    -w,  0.0,  w,
     w,  0.0,  w,
    -w,  0.0, -w,
     w,  0.0, -w,

    -w,  0.0,  w,
     w,  0.0,  w,
    -w,  0.0, -w,
     w,  0.0, -w,

    -w,  w*2,  w,
     w,  w*2,  w,
    -w,  0.0,  w,
     w,  0.0,  w,

    -w,  0.0, -w,
     w,  0.0, -w,
    -w,  w*2, -w,
     w,  w*2, -w,

     w,  0.0, -w,
     w,  0.0,  w,
     w,  w*2, -w,
     w,  w*w,  w,

    -w,  w*2, -w,
    -w,  w*2,  w,
    -w,  0.0, -w,
    -w,  0.0,  w,

    -w,  w*2, -w,
     w,  w*2, -w,
    -w,  w*2,  w,
     w,  w*2,  w,
  ];

  var indices = [
     2,  1,  0,
     1,  2,  3,

     4,  5,  6,
     7,  6,  5,

    10,  9,  8,
     9, 10, 11,

    14, 13, 12,
    13, 14, 15,

    18, 17, 16,
    17, 18, 19,

    22, 21, 20,
    21, 22, 23,

    26, 25, 24,
    25, 26, 27,
  ];

  var alphas = [
    1.0, 1.0, 1.0, 1.0,
    0.5, 0.5, 0.5, 0.5,
    1.0, 1.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 1.0,
  ];

  var pBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  pBuffer.itemSize = 3;

  var aBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, aBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(alphas), gl.STATIC_DRAW);
  aBuffer.itemSize = 1;

  var iBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices),
                gl.STATIC_DRAW);
  iBuffer.itemNum = indices.length;

  shader.width = w;
  shader.pBuffer = pBuffer;
  shader.aBuffer = aBuffer;
  shader.iBuffer = iBuffer;
};



function PostEffect(layer, pathNum) {
  this.layer = layer;
  this.shader = null;
  this.pathNum = pathNum;
  this._init();
};

// for reference
PostEffect.prototype.Math = Math;
PostEffect.prototype.mat4 = mat4;
PostEffect.prototype.vec3 = vec3;
PostEffect.prototype.quat4 = quat4;


PostEffect.prototype._VSHADER = {};
PostEffect.prototype._VSHADER.type = 'x-shader/x-vertex';
PostEffect.prototype._VSHADER.src = '\
  attribute vec3 aPosition;\
  uniform   mat4 uMvpMatrix;\
\
  void main() {\
    gl_Position = uMvpMatrix * vec4(aPosition, 1.0);\
  }\
';

PostEffect.prototype._FSHADER = {};
PostEffect.prototype._FSHADER.type = 'x-shader/x-fragment';
PostEffect.prototype._FSHADER.src = '\
  precision mediump float;\
  uniform float uWidth;\
  uniform float uHeight;\
  uniform float uFrame;\
  uniform sampler2D uSampler;\
  uniform sampler2D uSampler2;\
\
  void main() {\
    vec2 ts = vec2(1.0 / uWidth, 1.0 / uHeight);\
    vec4 color = texture2D(uSampler, gl_FragCoord.st * ts);\
    gl_FragColor = color;\
  }\
';


PostEffect.prototype._init = function() {
  var gl = this.layer.gl;
  this.shader = this._initShader(gl);
  this._initAttributes(this.shader, gl);
  this._initUniforms(this.shader, gl);
  this._initBuffers(this.shader, gl);
  this._initMatrices(this.shader, gl);
  this._initParams(this.shader, gl);
  this._initFrameBuffers(this.shader, gl);
};


PostEffect.prototype._initShader = function(gl) {
  var vertexShader = this._compileShader(this._VSHADER);
  var fragmentShader = this._compileShader(this._FSHADER);

  var shader = gl.createProgram();
  gl.attachShader(shader, vertexShader);
  gl.attachShader(shader, fragmentShader);
  gl.linkProgram(shader);

  if(!gl.getProgramParameter(shader, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  return shader;
};


PostEffect.prototype._initAttributes = function(shader, gl) {
  shader.positionAttribute =
    gl.getAttribLocation(shader, 'aPosition');
};


PostEffect.prototype._initUniforms = function(shader, gl) {
  shader.mvpMatrixUniformLocation =
    gl.getUniformLocation(shader, 'uMvpMatrix');
  shader.widthUniformLocation =
    gl.getUniformLocation(shader, 'uWidth');
  shader.heightUniformLocation =
    gl.getUniformLocation(shader, 'uHeight');
  shader.frameUniformLocation =
    gl.getUniformLocation(shader, 'uFrame');
  shader.samplerUniformLocation =
    gl.getUniformLocation(shader, 'uSampler');
  shader.sampler2UniformLocation =
    gl.getUniformLocation(shader, 'uSampler2');

  shader.width = this.layer.canvas.width;
  shader.height = this.layer.canvas.height;
  shader.frame = 0;
};


PostEffect.prototype._initBuffers = function(shader, gl) {
  var positions = [
    -1.0,  1.0,  0.0,
     1.0,  1.0,  0.0,
    -1.0, -1.0,  0.0,
     1.0, -1.0,  0.0
  ];

  var indices = [
    0, 1, 2,
    3, 2, 1
  ];

  var pBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  var iBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices),
                gl.STATIC_DRAW);

  shader.pBuffer = pBuffer;
  shader.iBuffer = iBuffer;
};


PostEffect.prototype._initMatrices = function(shader, gl) {
  var mMatrix = this.mat4.create();
  var vMatrix = this.mat4.create();
  var pMatrix = this.mat4.create();
  var vpMatrix = this.mat4.create();
  var mvpMatrix = this.mat4.create();

  this.mat4.lookAt([0.0, 0.0, 0.5], [0.0, 0.0, 0.0], [0, 1, 0], vMatrix);
  this.mat4.ortho(-1.0, 1.0, 1.0, -1.0, 0.1, 1, pMatrix);
  this.mat4.multiply(pMatrix, vMatrix, vpMatrix);
  this.mat4.identity(mMatrix);
  this.mat4.multiply(vpMatrix, mMatrix, mvpMatrix);

  shader.mvpMatrix = mvpMatrix;
};


PostEffect.prototype._initFrameBuffers = function(shader, gl) {
  shader.pathNum = this.pathNum;
  shader.frameBuffers = [];
  for(var i = 0; i < shader.pathNum; i++) {
    shader.frameBuffers.push(this._createFrameBuffer(shader, gl));
  }
};


PostEffect.prototype._createFrameBuffer = function(shader, gl) {
  var width = shader.width;
  var height = shader.height;

  var frameBuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

  var depthRenderBuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
                             gl.RENDERBUFFER, depthRenderBuffer);

  var fTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, fTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height,
                0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                          gl.TEXTURE_2D, fTexture, 0);

  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return {f: frameBuffer, d: depthRenderBuffer, t: fTexture};
};


/**
 * override in child class
 */
PostEffect.prototype._initParams = function(shader, gl) {
};


PostEffect.prototype._compileShader = function(params) {
  return this.layer.compileShader(this.layer.gl, params.src, params.type);
};


/**
 * from: http://wgld.org/d/webgl/w057.html
 */
PostEffect.prototype._getGaussianWeight = function(array, length, strength) {
  var t = 0.0;
  var d = strength * strength / 100;
  for(i = 0; i < length; i++){
    var r = 1.0 + 2.0 * i;
    var w = this.Math.exp(-0.5 * (r * r) / d);
    array[i] = w;
    if(i > 0)
      w *= 2.0;
    t += w;
  }
  for(i = 0; i < length; i++){
    array[i] /= t;
  }
};


PostEffect.prototype._bindAttributes = function() {
  var shader = this.shader;
  var gl = this.layer.gl;
  gl.bindBuffer(gl.ARRAY_BUFFER, shader.pBuffer);
  gl.enableVertexAttribArray(shader.positionAttribute);
  gl.vertexAttribPointer(shader.positionAttribute,
                         3, gl.FLOAT, false, 0, 0);
};


PostEffect.prototype._bindIndices = function() {
  var shader = this.shader;
  var gl = this.layer.gl;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shader.iBuffer);
};


PostEffect.prototype._setUniforms = function(n, params) {
  var shader = this.shader;
  var gl = this.layer.gl;
  gl.uniformMatrix4fv(shader.mvpMatrixUniformLocation, false, shader.mvpMatrix);
  gl.uniform1f(shader.widthUniformLocation, shader.width);
  gl.uniform1f(shader.heightUniformLocation, shader.height);
  gl.uniform1f(shader.frameUniformLocation, shader.frame);
};


PostEffect.prototype.bindFrameBufferForScene = function() {
  var shader = this.shader;
  var gl = this.layer.gl;
  gl.bindFramebuffer(gl.FRAMEBUFFER, shader.frameBuffers[0].f);
};


PostEffect.prototype._bindFrameBuffer = function(n) {
  var shader = this.shader;
  var gl = this.layer.gl;
  var f = (shader.pathNum-1 == n) ? null : shader.frameBuffers[n+1].f;

  gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
};


PostEffect.prototype._bindFrameTextures = function(n) {
  var shader = this.shader;
  var gl = this.layer.gl;

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, shader.frameBuffers[n].t);
  gl.uniform1i(shader.samplerUniformLocation, 0);

  if(shader.sampler2UniformLocation === null)
    return;

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, shader.frameBuffers[0].t);
  gl.uniform1i(shader.sampler2UniformLocation, 1);
};


PostEffect.prototype._enableConditions = function() {
  var shader = this.shader;
  var gl = this.layer.gl;

  gl.enable(gl.BLEND);
  gl.disable(gl.CULL_FACE);
  gl.cullFace(gl.FRONT);
};


/**
 * override in child class.
 */
PostEffect.prototype._setParams = function(n, params) {
};


PostEffect.prototype._draw = function() {
  var shader = this.shader;
  var gl = this.layer.gl;

  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  gl.flush();
};


PostEffect.prototype.draw = function(params) {
  for(var i = 0; i < this.shader.pathNum; i++) {
    this._bindFrameBuffer(i);
    this._bindAttributes();
    this._setUniforms(i, params);
    this._bindIndices();
    this._bindFrameTextures(i);
    this._enableConditions();
    this._draw();
  }
};



function BlurEffect(layer) {
  this.parent = PostEffect;
  this.parent.call(this, layer, 1);
};
__inherit(BlurEffect, PostEffect);


/* from http://wgld.org/d/webgl/w041.html */
BlurEffect.prototype._FSHADER = {};
BlurEffect.prototype._FSHADER.type = 'x-shader/x-fragment';
BlurEffect.prototype._FSHADER.src = '\
  precision mediump float;\
  uniform float uWidth;\
  uniform float uHeight;\
  uniform sampler2D uSampler;\
  uniform sampler2D uSampler2;\
\
  void main() {\
    vec2 st = vec2(1.0 / uWidth, 1.0 / uHeight);\
    vec4 color = texture2D(uSampler, gl_FragCoord.st * st);\
    color *= 0.72;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2(-1.0,  1.0)) * st)\
                        * 0.02;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2( 0.0,  1.0)) * st)\
                        * 0.02;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2( 1.0,  1.0)) * st)\
                        * 0.02;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2(-1.0,  0.0)) * st)\
                        * 0.02;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2( 1.0,  0.0)) * st)\
                        * 0.02;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2(-1.0, -1.0)) * st)\
                        * 0.02;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2( 0.0, -1.0)) * st)\
                        * 0.02;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2( 1.0, -1.0)) * st)\
                        * 0.02;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2(-2.0,  2.0)) * st)\
                        * 0.01;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2(-1.0,  2.0)) * st)\
                        * 0.01;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2( 0.0,  2.0)) * st)\
                        * 0.01;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2( 1.0,  2.0)) * st)\
                        * 0.01;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2( 2.0,  2.0)) * st)\
                        * 0.01;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2(-2.0,  1.0)) * st)\
                        * 0.01;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2( 2.0,  1.0)) * st)\
                        * 0.01;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2(-2.0,  0.0)) * st)\
                        * 0.01;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2( 2.0,  0.0)) * st)\
                        * 0.01;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2(-2.0, -1.0)) * st)\
                        * 0.01;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2( 2.0, -1.0)) * st)\
                        * 0.01;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2(-2.0, -2.0)) * st)\
                        * 0.01;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2(-1.0, -2.0)) * st)\
                        * 0.01;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2( 0.0, -2.0)) * st)\
                        * 0.01;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2( 1.0, -2.0)) * st)\
                        * 0.01;\
    color += texture2D(uSampler, (gl_FragCoord.st + vec2( 2.0, -2.0)) * st)\
                        * 0.01;\
    gl_FragColor = color;\
  }\
';



function GaussianBlurEffect(layer) {
  this.parent = PostEffect;
  this.parent.call(this, layer, 2);
};
__inherit(GaussianBlurEffect, PostEffect);

GaussianBlurEffect.prototype._FSHADER = {};
GaussianBlurEffect.prototype._FSHADER.type = 'x-shader/x-fragment';
// from: http://wgld.org/d/webgl/w057.html
GaussianBlurEffect.prototype._FSHADER.src = '\
  precision mediump float;\
  uniform float uWidth;\
  uniform float uHeight;\
  uniform float uFrame;\
  uniform sampler2D uSampler;\
  uniform sampler2D uSampler2;\
  uniform float     uWeight[10];\
  uniform bool      uIsX;\
\
void main(void){\
  vec2 st = vec2(1.0/uWidth, 1.0/uHeight);\
  vec2 fc = gl_FragCoord.st;\
  vec4 color = vec4(0.0);\
\
  if(uIsX){\
    color += texture2D(uSampler, (fc + vec2(-9.0, 0.0)) * st) * uWeight[9];\
    color += texture2D(uSampler, (fc + vec2(-8.0, 0.0)) * st) * uWeight[8];\
    color += texture2D(uSampler, (fc + vec2(-7.0, 0.0)) * st) * uWeight[7];\
    color += texture2D(uSampler, (fc + vec2(-6.0, 0.0)) * st) * uWeight[6];\
    color += texture2D(uSampler, (fc + vec2(-5.0, 0.0)) * st) * uWeight[5];\
    color += texture2D(uSampler, (fc + vec2(-4.0, 0.0)) * st) * uWeight[4];\
    color += texture2D(uSampler, (fc + vec2(-3.0, 0.0)) * st) * uWeight[3];\
    color += texture2D(uSampler, (fc + vec2(-2.0, 0.0)) * st) * uWeight[2];\
    color += texture2D(uSampler, (fc + vec2(-1.0, 0.0)) * st) * uWeight[1];\
    color += texture2D(uSampler, (fc + vec2( 0.0, 0.0)) * st) * uWeight[0];\
    color += texture2D(uSampler, (fc + vec2( 1.0, 0.0)) * st) * uWeight[1];\
    color += texture2D(uSampler, (fc + vec2( 2.0, 0.0)) * st) * uWeight[2];\
    color += texture2D(uSampler, (fc + vec2( 3.0, 0.0)) * st) * uWeight[3];\
    color += texture2D(uSampler, (fc + vec2( 4.0, 0.0)) * st) * uWeight[4];\
    color += texture2D(uSampler, (fc + vec2( 5.0, 0.0)) * st) * uWeight[5];\
    color += texture2D(uSampler, (fc + vec2( 6.0, 0.0)) * st) * uWeight[6];\
    color += texture2D(uSampler, (fc + vec2( 7.0, 0.0)) * st) * uWeight[7];\
    color += texture2D(uSampler, (fc + vec2( 8.0, 0.0)) * st) * uWeight[8];\
    color += texture2D(uSampler, (fc + vec2( 9.0, 0.0)) * st) * uWeight[9];\
  }else{\
    color += texture2D(uSampler, (fc + vec2(0.0, -9.0)) * st) * uWeight[9];\
    color += texture2D(uSampler, (fc + vec2(0.0, -8.0)) * st) * uWeight[8];\
    color += texture2D(uSampler, (fc + vec2(0.0, -7.0)) * st) * uWeight[7];\
    color += texture2D(uSampler, (fc + vec2(0.0, -6.0)) * st) * uWeight[6];\
    color += texture2D(uSampler, (fc + vec2(0.0, -5.0)) * st) * uWeight[5];\
    color += texture2D(uSampler, (fc + vec2(0.0, -4.0)) * st) * uWeight[4];\
    color += texture2D(uSampler, (fc + vec2(0.0, -3.0)) * st) * uWeight[3];\
    color += texture2D(uSampler, (fc + vec2(0.0, -2.0)) * st) * uWeight[2];\
    color += texture2D(uSampler, (fc + vec2(0.0, -1.0)) * st) * uWeight[1];\
    color += texture2D(uSampler, (fc + vec2(0.0,  0.0)) * st) * uWeight[0];\
    color += texture2D(uSampler, (fc + vec2(0.0,  1.0)) * st) * uWeight[1];\
    color += texture2D(uSampler, (fc + vec2(0.0,  2.0)) * st) * uWeight[2];\
    color += texture2D(uSampler, (fc + vec2(0.0,  3.0)) * st) * uWeight[3];\
    color += texture2D(uSampler, (fc + vec2(0.0,  4.0)) * st) * uWeight[4];\
    color += texture2D(uSampler, (fc + vec2(0.0,  5.0)) * st) * uWeight[5];\
    color += texture2D(uSampler, (fc + vec2(0.0,  6.0)) * st) * uWeight[6];\
    color += texture2D(uSampler, (fc + vec2(0.0,  7.0)) * st) * uWeight[7];\
    color += texture2D(uSampler, (fc + vec2(0.0,  8.0)) * st) * uWeight[8];\
    color += texture2D(uSampler, (fc + vec2(0.0,  9.0)) * st) * uWeight[9];\
  }\
  gl_FragColor = color;\
}\
';


GaussianBlurEffect.prototype._initUniforms = function(shader, gl) {
  this.parent.prototype._initUniforms.call(this, shader, gl);

  shader.isXUniformLocation =
    gl.getUniformLocation(shader, 'uIsX');
  shader.weightUniformLocation =
    gl.getUniformLocation(shader, 'uWeight');
};


GaussianBlurEffect.prototype._initParams = function(shader, gl) {
  this.parent.prototype._initParams.call(this, shader, gl);

  var weight = [];
  this._getGaussianWeight(weight, 10, 25);
  shader.weight = weight;
};


__copyParentMethod(GaussianBlurEffect, PostEffect, '_setUniforms');
GaussianBlurEffect.prototype._setUniforms = function(n, params) {
  this.PostEffect_setUniforms(n, params);

  var shader = this.shader;
  var gl = this.layer.gl;

  gl.uniform1fv(shader.weightUniformLocation, shader.weight);
  gl.uniform1i(shader.isXUniformLocation, n == 0 ? 1 : 0);
};



function DiffusionBlurEffect(layer) {
  this.parent = PostEffect;
  this.parent.call(this, layer, 2);
};
__inherit(DiffusionBlurEffect, PostEffect);


DiffusionBlurEffect.prototype._FSHADER = {};
DiffusionBlurEffect.prototype._FSHADER.type = 'x-shader/x-fragment';
DiffusionBlurEffect.prototype._FSHADER.src = '\
  precision mediump float;\
  uniform float uWidth;\
  uniform float uHeight;\
  uniform float uFrame;\
  uniform sampler2D uSampler;\
  uniform sampler2D uSampler2;\
  uniform float     uWeight[10];\
  uniform bool      uIsX;\
\
void main(void){\
  vec2 st = vec2(1.0/uWidth, 1.0/uHeight);\
  vec2 fc = gl_FragCoord.st;\
  vec4 color = vec4(0.0);\
\
  if(uIsX){\
    color += texture2D(uSampler, (fc + vec2(-9.0, 0.0)) * st) * uWeight[9];\
    color += texture2D(uSampler, (fc + vec2(-8.0, 0.0)) * st) * uWeight[8];\
    color += texture2D(uSampler, (fc + vec2(-7.0, 0.0)) * st) * uWeight[7];\
    color += texture2D(uSampler, (fc + vec2(-6.0, 0.0)) * st) * uWeight[6];\
    color += texture2D(uSampler, (fc + vec2(-5.0, 0.0)) * st) * uWeight[5];\
    color += texture2D(uSampler, (fc + vec2(-4.0, 0.0)) * st) * uWeight[4];\
    color += texture2D(uSampler, (fc + vec2(-3.0, 0.0)) * st) * uWeight[3];\
    color += texture2D(uSampler, (fc + vec2(-2.0, 0.0)) * st) * uWeight[2];\
    color += texture2D(uSampler, (fc + vec2(-1.0, 0.0)) * st) * uWeight[1];\
    color += texture2D(uSampler, (fc + vec2( 0.0, 0.0)) * st) * uWeight[0];\
    color += texture2D(uSampler, (fc + vec2( 1.0, 0.0)) * st) * uWeight[1];\
    color += texture2D(uSampler, (fc + vec2( 2.0, 0.0)) * st) * uWeight[2];\
    color += texture2D(uSampler, (fc + vec2( 3.0, 0.0)) * st) * uWeight[3];\
    color += texture2D(uSampler, (fc + vec2( 4.0, 0.0)) * st) * uWeight[4];\
    color += texture2D(uSampler, (fc + vec2( 5.0, 0.0)) * st) * uWeight[5];\
    color += texture2D(uSampler, (fc + vec2( 6.0, 0.0)) * st) * uWeight[6];\
    color += texture2D(uSampler, (fc + vec2( 7.0, 0.0)) * st) * uWeight[7];\
    color += texture2D(uSampler, (fc + vec2( 8.0, 0.0)) * st) * uWeight[8];\
    color += texture2D(uSampler, (fc + vec2( 9.0, 0.0)) * st) * uWeight[9];\
  }else{\
    color += texture2D(uSampler, (fc + vec2(0.0, -9.0)) * st) * uWeight[9];\
    color += texture2D(uSampler, (fc + vec2(0.0, -8.0)) * st) * uWeight[8];\
    color += texture2D(uSampler, (fc + vec2(0.0, -7.0)) * st) * uWeight[7];\
    color += texture2D(uSampler, (fc + vec2(0.0, -6.0)) * st) * uWeight[6];\
    color += texture2D(uSampler, (fc + vec2(0.0, -5.0)) * st) * uWeight[5];\
    color += texture2D(uSampler, (fc + vec2(0.0, -4.0)) * st) * uWeight[4];\
    color += texture2D(uSampler, (fc + vec2(0.0, -3.0)) * st) * uWeight[3];\
    color += texture2D(uSampler, (fc + vec2(0.0, -2.0)) * st) * uWeight[2];\
    color += texture2D(uSampler, (fc + vec2(0.0, -1.0)) * st) * uWeight[1];\
    color += texture2D(uSampler, (fc + vec2(0.0,  0.0)) * st) * uWeight[0];\
    color += texture2D(uSampler, (fc + vec2(0.0,  1.0)) * st) * uWeight[1];\
    color += texture2D(uSampler, (fc + vec2(0.0,  2.0)) * st) * uWeight[2];\
    color += texture2D(uSampler, (fc + vec2(0.0,  3.0)) * st) * uWeight[3];\
    color += texture2D(uSampler, (fc + vec2(0.0,  4.0)) * st) * uWeight[4];\
    color += texture2D(uSampler, (fc + vec2(0.0,  5.0)) * st) * uWeight[5];\
    color += texture2D(uSampler, (fc + vec2(0.0,  6.0)) * st) * uWeight[6];\
    color += texture2D(uSampler, (fc + vec2(0.0,  7.0)) * st) * uWeight[7];\
    color += texture2D(uSampler, (fc + vec2(0.0,  8.0)) * st) * uWeight[8];\
    color += texture2D(uSampler, (fc + vec2(0.0,  9.0)) * st) * uWeight[9];\
    vec4 color2 = texture2D(uSampler2, gl_FragCoord.st * st);\
    vec4 color3 = vec4(color2.rgb * color2.rgb, color2.a);\
    color = color3 + color - color3 * color;\
    color = max(color, color2);\
    color = mix(color2, color, 0.67);\
/*    color.a = max(color.a, color2.a);*/\
  }\
  gl_FragColor = color;\
}\
';


DiffusionBlurEffect.prototype._initUniforms = function(shader, gl) {
  this.parent.prototype._initUniforms.call(this, shader, gl);

  shader.isXUniformLocation =
    gl.getUniformLocation(shader, 'uIsX');
  shader.weightUniformLocation =
    gl.getUniformLocation(shader, 'uWeight');
};


DiffusionBlurEffect.prototype._initParams = function(shader, gl) {
  this.parent.prototype._initParams.call(this, shader, gl);

  var weight = [];
  this._getGaussianWeight(weight, 10, 20);
  shader.weight = weight;
};


__copyParentMethod(DiffusionBlurEffect, PostEffect, '_setUniforms');
DiffusionBlurEffect.prototype._setUniforms = function(n, params) {
  this.PostEffect_setUniforms(n, params);

  var shader = this.shader;
  var gl = this.layer.gl;

  gl.uniform1fv(shader.weightUniformLocation, shader.weight);
  gl.uniform1i(shader.isXUniformLocation, n == 0 ? 1 : 0);
};



function DivisionEffect(layer) {
  this.parent = PostEffect;
  this.parent.call(this, layer, 1);
};
__inherit(DivisionEffect, PostEffect);


/* from http://clemz.io/article-retro-shaders-rayman-legends */
DivisionEffect.prototype._FSHADER = {};
DivisionEffect.prototype._FSHADER.type = 'x-shader/x-fragment';
DivisionEffect.prototype._FSHADER.src = '\
  precision mediump float;\
  uniform float uWidth;\
  uniform float uHeight;\
  uniform float uFrame;\
  uniform sampler2D uSampler;\
  uniform sampler2D uSampler2;\
\
  void main() {\
    const float n = 2.0;\
    vec2 st = vec2(1.0 / uWidth, 1.0 / uHeight);\
    vec2 pos = mod(gl_FragCoord.st * st, 1.0 / n) * n;\
    gl_FragColor = texture2D(uSampler, pos);\
  }\
';



function LowResolutionEffect(layer) {
  this.parent = PostEffect;
  this.parent.call(this, layer, 1);
};
__inherit(LowResolutionEffect, PostEffect);


/* from http://clemz.io/article-retro-shaders-rayman-legends */
LowResolutionEffect.prototype._FSHADER = {};
LowResolutionEffect.prototype._FSHADER.type = 'x-shader/x-fragment';
LowResolutionEffect.prototype._FSHADER.src = '\
  precision mediump float;\
  uniform float uWidth;\
  uniform float uHeight;\
  uniform float uFrame;\
  uniform sampler2D uSampler;\
  uniform sampler2D uSampler2;\
\
  void main() {\
    const float n = 50.0;\
    vec2 st = vec2(1.0 / uWidth, 1.0 / uHeight);\
    vec2 pos = gl_FragCoord.st * st;\
    pos = floor(pos * n) / n;\
    gl_FragColor = texture2D(uSampler, pos);\
  }\
';



/* the idea is from https://github.com/i-saint/Unity5Effects */
function FaceMosaicEffect(layer) {
  this.parent = PostEffect;
  this.parent.call(this, layer, 1);
};
__inherit(FaceMosaicEffect, PostEffect);


FaceMosaicEffect.prototype._FSHADER = {};
FaceMosaicEffect.prototype._FSHADER.type = 'x-shader/x-fragment';
FaceMosaicEffect.prototype._FSHADER.src = '\
  precision mediump float;\
  uniform float uWidth;\
  uniform float uHeight;\
  uniform float uFrame;\
  uniform int   uModelNum;\
  uniform vec3  uModelFacePositions[5];\
  uniform float uModelFaceAngles[5];\
  uniform sampler2D uSampler;\
  uniform sampler2D uSampler2;\
\
  void main() {\
    const float n = 50.0;\
    const float xSize = 0.05;\
    const float ySize = 0.02;\
    vec2 st = vec2(1.0 / uWidth, 1.0 / uHeight);\
    vec2 pos = gl_FragCoord.st * st;\
    for(int i = 0; i < 5; i++) {\
      if(i >= uModelNum)\
        break;\
\
      vec3 fpos = uModelFacePositions[i];\
      float angle = uModelFaceAngles[i];\
      vec2 dpos = pos - fpos.xy;\
      vec2 apos = vec2( dpos.x * cos(angle) + dpos.y * sin(angle), \
                       -dpos.x * sin(angle) + dpos.y * cos(angle));\
      if(apos.x > -xSize / fpos.z && \
         apos.x <  xSize / fpos.z && \
         apos.y > -ySize / fpos.z && \
         apos.y <  ySize / fpos.z) {\
        pos = floor(pos * n) / n;\
        break;\
      }\
    }\
    gl_FragColor = texture2D(uSampler, pos);\
  }\
';


FaceMosaicEffect.prototype._initUniforms = function(shader, gl) {
  this.parent.prototype._initUniforms.call(this, shader, gl);

  shader.modelNumUniformLocation =
    gl.getUniformLocation(shader, 'uModelNum');
  shader.modelFacePositionsUniformLocation =
    gl.getUniformLocation(shader, 'uModelFacePositions');
  shader.modelFaceAnglesUniformLocation =
    gl.getUniformLocation(shader, 'uModelFaceAngles');
};


/**
 * TODO: temporal
 */
__copyParentMethod(FaceMosaicEffect, PostEffect, '_setUniforms');
FaceMosaicEffect.prototype._setUniforms = function(n, params) {
  this.PostEffect_setUniforms(n);

  var shader = this.shader;
  var gl = this.layer.gl;

  var view = params; // PMDView

  var mvMatrix = this.layer.mvMatrix;
  var pMatrix = this.layer.pMatrix;
  var mvpMatrix = this.mat4.create();

  this.mat4.multiply(pMatrix, mvMatrix, mvpMatrix);

  var width = this.layer.gl.width;
  var height = this.layer.gl.height;
  var near = 0.1;
  var far = 2000.0;

  var num = 0;
  var array = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  var angles = [0, 0, 0, 0, 0];
  for(var i = 0; i < view.getModelNum(); i++) {
    var v = view.modelViews[i];
    var le = v.pmd.leftEyeBone;
    var re = v.pmd.rightEyeBone;

    if(le.id === null || re.id === null)
      continue;

    var a1 = v.skinningOneBone(le);
    var a2 = v.skinningOneBone(re);
    a1[3] = 1.0;
    a2[3] = 1.0;

    var a = [(a1[0] + a2[0]) / 2.0,
             (a1[1] + a2[1]) / 2.0,
             (a1[2] + a2[2]) / 2.0,
             1.0];

    this.mat4.multiplyVec4(mvpMatrix, a, a)
    this.mat4.multiplyVec4(mvpMatrix, a1, a1)
    this.mat4.multiplyVec4(mvpMatrix, a2, a2)

    a[0] = a[0] / a[3];
    a[1] = a[1] / a[3];
    a[2] = a[2] / a[3];
    a[0] = (a[0] + 1.0) / 2.0;
    a[1] = (a[1] + 1.0) / 2.0;
    a[2] = (a[2] + 1.0) / 2.0;
    a1[0] = a1[0] / a1[3];
    a1[1] = a1[1] / a1[3];
    a1[2] = a1[2] / a1[3];
    a1[0] = (a1[0] + 1.0) / 2.0;
    a1[1] = (a1[1] + 1.0) / 2.0;
    a1[2] = (a1[2] + 1.0) / 2.0;
    a2[0] = a2[0] / a2[3];
    a2[1] = a2[1] / a2[3];
    a2[2] = a2[2] / a2[3];
    a2[0] = (a2[0] + 1.0) / 2.0;
    a2[1] = (a2[1] + 1.0) / 2.0;
    a2[2] = (a2[2] + 1.0) / 2.0;

    var angle = this.Math.atan2(a2[1] - a1[1], a2[0] - a1[0]);

    angles[num] = angle;
    array[num*3+0] = a[0];
    array[num*3+1] = a[1];
    array[num*3+2] = a[2];
    num++;
  }

  gl.uniform3fv(shader.modelFacePositionsUniformLocation, array);
  gl.uniform1fv(shader.modelFaceAnglesUniformLocation, angles);
  gl.uniform1i(shader.modelNumUniformLocation, num);
};


