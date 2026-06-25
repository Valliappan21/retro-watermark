'use strict';

var ReactNative = require('react-native');

/**
 * Sends a local image URI to the native bridge. The native module
 * verifies that the URI is readable, writes a newly named watermarked image,
 * creates a detached native ImageView/UIImageView, and resolves the final local URI.
 */
function inspectLocalImage(options) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    return Promise.reject(new TypeError('options must be an object.'));
  }

  if (typeof options.localUri !== 'string' || options.localUri.trim().length === 0) {
    return Promise.reject(new TypeError('localUri must be a non-empty string.'));
  }

  if (typeof options.text !== 'string' || options.text.trim().length === 0) {
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
  var resolvedPosition =
    options.position === undefined ? 'top-center' : options.position;
  if (validPositions.indexOf(resolvedPosition) === -1) {
    return Promise.reject(
      new TypeError('position must be one of: ' + validPositions.join(', ') + '.')
    );
  }

  var resolvedRotateDegree =
    options.rotateDegree === undefined ? 0 : options.rotateDegree;
  if (
    typeof resolvedRotateDegree !== 'number' ||
    !Number.isFinite(resolvedRotateDegree)
  ) {
    return Promise.reject(new TypeError('rotateDegree must be a finite number.'));
  }

  var resolvedFontSize = options.fontSize;
  if (
    resolvedFontSize !== undefined &&
    (typeof resolvedFontSize !== 'number' ||
      !Number.isFinite(resolvedFontSize) ||
      resolvedFontSize <= 0)
  ) {
    return Promise.reject(
      new TypeError('fontSize must be a finite number greater than 0.')
    );
  }

  var resolvedColorCode = options.colorCode === undefined ? '#FFFFFF' : options.colorCode;
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

  var resolvedMargins = options.margins === undefined ? {} : options.margins;
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

  var nativeOptions = {
    localUri: options.localUri.trim(),
    text: options.text.trim(),
    position: resolvedPosition,
    rotateDegree: resolvedRotateDegree,
    colorCode: resolvedColorCode,
    margins: normalizedMargins,
  };
  if (resolvedFontSize !== undefined) {
    nativeOptions.fontSize = resolvedFontSize;
  }

  return nativeModule.inspectLocalImage(nativeOptions);
}

module.exports = inspectLocalImage;
module.exports.default = inspectLocalImage;
module.exports.inspectLocalImage = inspectLocalImage;
