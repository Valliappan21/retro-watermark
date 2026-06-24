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
      inspectLocalImage: function (
        uri,
        text,
        position,
        rotateDegree,
        colorCode,
        margins
      ) {
        receivedUri = uri;
        receivedOptions = {
          text: text,
          position: position,
          rotateDegree: rotateDegree,
          colorCode: colorCode,
          margins: margins,
        };
        return Promise.resolve({
          uri: 'file:///tmp/photo_watermarked.jpg',
          sourceUri: uri,
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

  var result = await inspectLocalImage(
    '  file:///tmp/photo.jpg  ',
    '  CONFIDENTIAL  ',
    'center',
    -30,
    '#FF0000',
    { top: 10, right: 20, bottom: 30, left: 40 }
  );
  assert.strictEqual(receivedUri, 'file:///tmp/photo.jpg');
  assert.deepStrictEqual(result, {
    uri: 'file:///tmp/photo_watermarked.jpg',
    sourceUri: 'file:///tmp/photo.jpg',
    fileName: 'photo_watermarked.jpg',
    width: 1200,
    height: 800,
  });
  assert.deepStrictEqual(receivedOptions, {
    text: 'CONFIDENTIAL',
    position: 'center',
    rotateDegree: -30,
    colorCode: '#FF0000',
    margins: { top: 10, right: 20, bottom: 30, left: 40 },
  });

  await inspectLocalImage(
    'file:///tmp/photo.jpg',
    'DRAFT',
    'top-center',
    0
  );
  assert.deepStrictEqual(receivedOptions, {
    text: 'DRAFT',
    position: 'top-center',
    rotateDegree: 0,
    colorCode: '#FFFFFF',
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  reactNativeMock.Platform.OS = 'ios';
  await inspectLocalImage(
    'file:///tmp/ios-photo.jpg',
    'IOS',
    'bottom-right',
    15,
    '#80FFFFFF',
    { bottom: 8, right: 9 }
  );
  assert.strictEqual(receivedUri, 'file:///tmp/ios-photo.jpg');
  assert.deepStrictEqual(receivedOptions, {
    text: 'IOS',
    position: 'bottom-right',
    rotateDegree: 15,
    colorCode: '#80FFFFFF',
    margins: { top: 0, right: 9, bottom: 8, left: 0 },
  });
  reactNativeMock.Platform.OS = 'android';

  await assert.rejects(function () {
    return inspectLocalImage('', 'Text', 'center', 0, '#FFFFFF', {});
  }, /non-empty string/);

  await assert.rejects(function () {
    return inspectLocalImage(
      'file:///tmp/photo.jpg',
      'Text',
      'top-center',
      0,
      '#FFFFFF',
      { top: 10, right: -1, bottom: 0, left: 0 }
    );
  }, /margins\.right/);

  await assert.rejects(function () {
    return inspectLocalImage(
      'file:///tmp/photo.jpg',
      'Text',
      'middle',
      0,
      '#FFFFFF',
      {}
    );
  }, /position must be one of/);

  console.log('✓ Delegated a trimmed local URI to RNImageInspector');
  console.log('✓ Supported Android and iOS platform guards');
  console.log('✓ Normalized default color and margins');
  console.log('✓ Rejected invalid URI, position, and margin input');
  console.log('✓ Returned native image width and height');
  console.log('Local package smoke test passed.');
}

main().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
