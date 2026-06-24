'use strict';

var ReactNative = require('react-native');

/**
 * Sends a local image URI to the native bridge. The native module
 * verifies that the URI is readable, writes a newly named watermarked image,
 * creates a detached native ImageView/UIImageView, and resolves the final local URI.
 */
function inspectLocalImage(
  localUri,
  text,
  position,
  rotateDegree,
  colorCode,
  margins
) {
  if (typeof localUri !== 'string' || localUri.trim().length === 0) {
    return Promise.reject(new TypeError('localUri must be a non-empty string.'));
  }

  if (typeof text !== 'string' || text.trim().length === 0) {
    return Promise.reject(new TypeError('text must be a non-empty string.'));
  }

  var validPositions = [
    'top-left',
    'top-center',
    'top-right',
    'center-left',
    'center',
    'center-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
  ];
  if (validPositions.indexOf(position) === -1) {
    return Promise.reject(
      new TypeError('position must be one of: ' + validPositions.join(', ') + '.')
    );
  }

  if (typeof rotateDegree !== 'number' || !Number.isFinite(rotateDegree)) {
    return Promise.reject(new TypeError('rotateDegree must be a finite number.'));
  }

  var resolvedColorCode = colorCode === undefined ? '#FFFFFF' : colorCode;
  var hexColorPattern = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
  if (
    typeof resolvedColorCode !== 'string' ||
    !hexColorPattern.test(resolvedColorCode)
  ) {
    return Promise.reject(
      new TypeError(
        'colorCode must be a hexadecimal color such as #FFF, #FFFFFF, or #80FFFFFF.'
      )
    );
  }

  var resolvedMargins = margins === undefined ? {} : margins;
  if (
    resolvedMargins === null ||
    typeof resolvedMargins !== 'object' ||
    Array.isArray(resolvedMargins)
  ) {
    return Promise.reject(new TypeError('margins must be an object.'));
  }
  var normalizedMargins = {};
  var marginDirections = ['top', 'right', 'bottom', 'left'];
  for (var marginIndex = 0; marginIndex < marginDirections.length; marginIndex += 1) {
    var direction = marginDirections[marginIndex];
    var margin = resolvedMargins[direction] === undefined ? 0 : resolvedMargins[direction];
    if (typeof margin !== 'number' || !Number.isFinite(margin) || margin < 0) {
      return Promise.reject(
        new TypeError(
          'margins.' + direction + ' must be a finite number greater than or equal to 0.'
        )
      );
    }
    normalizedMargins[direction] = margin;
  }

  if (
    !ReactNative.Platform ||
    (ReactNative.Platform.OS !== 'android' && ReactNative.Platform.OS !== 'ios')
  ) {
    return Promise.reject(
      new Error('inspectLocalImage is currently supported only on Android and iOS.')
    );
  }

  var nativeModule = ReactNative.NativeModules.RNImageInspector;
  if (!nativeModule || typeof nativeModule.inspectLocalImage !== 'function') {
    return Promise.reject(
      new Error(
        'RNImageInspector is not linked. Rebuild the native application after installing the package.'
      )
    );
  }

  return nativeModule.inspectLocalImage(
    localUri.trim(),
    text.trim(),
    position,
    rotateDegree,
    resolvedColorCode,
    normalizedMargins
  );
}

module.exports = inspectLocalImage;
module.exports.default = inspectLocalImage;
module.exports.inspectLocalImage = inspectLocalImage;
