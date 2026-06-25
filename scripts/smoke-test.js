'use strict';

var assert = require('assert');
var Module = require('module');
var originalLoad = Module._load;
var receivedUri;
var receivedOptions;

var reactNativeMock = {
  Platform: { OS: 'android' },
  NativeModules: {
    RNImageInspector: {
      inspectLocalImage: function (options) {
        receivedUri = options.localUri;
        receivedOptions = options;
        return Promise.resolve({
          uri: 'file:///tmp/photo_watermarked.jpg',
          sourceUri: options.localUri,
          fileName: 'photo_watermarked.jpg',
          width: 1200,
          height: 800,
        });
      },
    },
  },
};

Module._load = function (request, parent, isMain) {
  if (request === 'react-native') return reactNativeMock;
  return originalLoad.call(this, request, parent, isMain);
};

var inspectLocalImage;
try {
  inspectLocalImage = require('..');
} finally {
  Module._load = originalLoad;
}

async function main() {
  assert.strictEqual(inspectLocalImage, inspectLocalImage.default);
  assert.strictEqual(inspectLocalImage, inspectLocalImage.inspectLocalImage);

  var result = await inspectLocalImage({
    localUri: '  file:///tmp/photo.jpg  ',
    text: '  CONFIDENTIAL  ',
    position: 'center',
    rotateDegree: -30,
    fontSize: 48,
    colorCode: '#FF0000',
    margins: { top: 10, right: 20, bottom: 30, left: 40 },
  });
  assert.strictEqual(receivedUri, 'file:///tmp/photo.jpg');
  assert.deepStrictEqual(result, {
    uri: 'file:///tmp/photo_watermarked.jpg',
    sourceUri: 'file:///tmp/photo.jpg',
    fileName: 'photo_watermarked.jpg',
    width: 1200,
    height: 800,
  });
  assert.deepStrictEqual(receivedOptions, {
    localUri: 'file:///tmp/photo.jpg',
    text: 'CONFIDENTIAL',
    position: 'center',
    rotateDegree: -30,
    fontSize: 48,
    colorCode: '#FF0000',
    margins: { top: 10, right: 20, bottom: 30, left: 40 },
  });

  await inspectLocalImage({
    localUri: 'file:///tmp/photo.jpg',
    text: 'DRAFT',
  });
  assert.deepStrictEqual(receivedOptions, {
    localUri: 'file:///tmp/photo.jpg',
    text: 'DRAFT',
    position: 'top-center',
    rotateDegree: 0,
    colorCode: '#FFFFFF',
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  reactNativeMock.Platform.OS = 'ios';
  await inspectLocalImage({
    localUri: 'file:///tmp/ios-photo.jpg',
    text: 'IOS',
    position: 'bottom-right',
    rotateDegree: 15,
    colorCode: '#80FFFFFF',
    margins: { bottom: 8, right: 9 },
  });
  assert.strictEqual(receivedUri, 'file:///tmp/ios-photo.jpg');
  assert.deepStrictEqual(receivedOptions, {
    localUri: 'file:///tmp/ios-photo.jpg',
    text: 'IOS',
    position: 'bottom-right',
    rotateDegree: 15,
    colorCode: '#80FFFFFF',
    margins: { top: 0, right: 9, bottom: 8, left: 0 },
  });
  reactNativeMock.Platform.OS = 'android';

  await assert.rejects(function () {
    return inspectLocalImage({ localUri: '', text: 'Text' });
  }, /non-empty string/);

  await assert.rejects(function () {
    return inspectLocalImage({
      localUri: 'file:///tmp/photo.jpg',
      text: 'Text',
      margins: { top: 10, right: -1, bottom: 0, left: 0 },
    });
  }, /margins\.right/);

  await assert.rejects(function () {
    return inspectLocalImage({
      localUri: 'file:///tmp/photo.jpg',
      text: 'Text',
      position: 'middle',
    });
  }, /position must be one of/);

  await assert.rejects(function () {
    return inspectLocalImage({
      localUri: 'file:///tmp/photo.jpg',
      text: 'Text',
      fontSize: 0,
    });
  }, /fontSize/);

  await assert.rejects(function () {
    return inspectLocalImage('file:///tmp/photo.jpg');
  }, /options must be an object/);

  console.log('✓ Delegated a normalized options object to RNImageInspector');
  console.log('✓ Supported Android and iOS platform guards');
  console.log('✓ Normalized default color and margins');
  console.log('✓ Delegated optional font size when provided');
  console.log('✓ Rejected invalid URI, position, margin, and font size input');
  console.log('✓ Returned native image width and height');
  console.log('Local package smoke test passed.');
}

main().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
