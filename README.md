# mmd-viewer-js
MMD model dances on your chrome with WebGL. (MMD(MikuMikuDance) is a 3D CG animation tool)

## Demo
[Demo only for Windows&Chrome](http://takahirox.github.io/mmd-viewer-js/)

[Demo video(blog)](http://d.hatena.ne.jp/takahirox/20150407/1428386557/)

## Screen shot
![Screen shot1](http://f.st-hatena.com/images/fotolife/t/takahirox/20150418/20150418191321.png)

![Screen shot2](http://f.st-hatena.com/images/fotolife/t/takahirox/20150425/20150425214706.png)

![Screen shot3](http://f.st-hatena.com/images/fotolife/t/takahirox/20150425/20150425214707.png)

## Instruction

### How to start

1. choose model and click load model button, then MMD model shows up. (currently max model# is 5)
2. choose motion and click load motion button, then MMD model dances with music sync (if music file is available).

### How to add model and motion

1. clone this project
2. put your model and motion data files
3. place toon[00-10].bmp files into your model data directory (you can copy from model/default directory)
4. convert *.tga files to *.pga files in your model data directory if exists
5. edit __models and __motions in index.html

## FAQ

### Q. Which browsers does this app support?

Prolly only Windows Chrome. I haven't checked other platforms.

### Q. Does this app support iPhone/Smartphone?

Prolly not yet. I haven't checked.

### Q. I cannot load model and motion data in my local environment.

Boot up your chrome with "--allow-file-access-from-files"

### Q. What model format does this app support?

Only .pmd now. .pmx and .x would come soon.

### Q. This app is very heavy.

Choose light model. Reduce the number of models show up. Turn off Physics, Stage, Edge and Post-effect.

## dependencies
[Ammo.js](https://github.com/kripken/ammo.js/)

[glMatrix](https://github.com/toji/gl-matrix)

[whammy.js](https://github.com/antimatter15/whammy)

No Three.js, yeah!

## Link
[MMD official site](http://www.geocities.jp/higuchuu4/index_e.htm)
