const fs = require('fs'),
  path = require('path'),
  imagediff = require('../imagediff.js'),
  Canvas = require('canvas'),
  Image = Canvas.Image;

function compareImageDiff(filenameA, filenameB, outFilename) {
  var a = new Image();
  a.src = fs.readFileSync(path.join(__dirname, filenameA));
  var b = new Image();
  b.src = fs.readFileSync(path.join(__dirname, filenameB));

  var diff = imagediff.diff(a, b);

  var canvas = imagediff.createCanvas(diff.width, diff.height);

// get its context
  var context = canvas.getContext('2d');

// and finally draw the ImageData diff.
  context.putImageData(diff, 0, 0);

  canvas.createPNGStream().pipe(fs.createWriteStream(path.join(__dirname, outFilename)))
}

compareImageDiff('1_normal_a.jpg', '1_normal_b.jpg', 'image-src.png');