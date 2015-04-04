var __physics;
importScripts('../lib/glMatrix-0.9.5.min.js');
importScripts('../lib/ammo.js');
importScripts('../src/Utility.js');
importScripts('../src/Inherit.js');
importScripts('../src/Pmd.js');
importScripts('../src/FileParser.js');
importScripts('../src/PmdFileParser.js');
importScripts('../src/VmdFileParser.js');
importScripts('../src/Physics.js');

/*
<script type="text/javascript" src="src/Vmd.js"></script>
<script type="text/javascript" src="src/PmdView.js"></script>
*/

/**
 * TODO: temporal
 */
self.addEventListener('message', function(e) {
  if(! self.__pmd) {
    var uint8 = new Uint8Array(e.data);
    var pfp = new PMDFileParser(uint8);
    self.__pmd = pfp.parse();
    self.__physics = new Physics(self.__pmd);
  } else {
    var params = JSON.parse(e.data);
    if(params.cmd && params.cmd == 'reset') {
      var motions = params.motions;
      self.__physics.resetRigidBodies(motions);
    } else {
      var motions = params;
      self.__physics.simulate(motions);
      self.postMessage(JSON.stringify(motions));
    }
  }
}, false);


