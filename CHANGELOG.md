# Changelog

All notable changes to `retro-watermark` are documented here.

## 1.1.0

### Breaking Changes

- Changed `inspectLocalImage` from positional parameters to a single options
  object.

  Before:

  ```ts
  await inspectLocalImage(
    imageUri,
    'CONFIDENTIAL',
    'top-center',
    0,
    '#FF004D',
    { top: 10, right: 20, bottom: 30, left: 40 },
  );
  ```

  After:

  ```ts
  await inspectLocalImage({
    localUri: imageUri,
    text: 'CONFIDENTIAL',
    position: 'top-center',
    rotateDegree: 0,
    fontSize: 48,
    colorCode: '#FF004D',
    margins: { top: 10, right: 20, bottom: 30, left: 40 },
  });
  ```

### Added

- Added optional `fontSize` support.
- Added default values for optional fields:
  - `position`: `'top-center'`
  - `rotateDegree`: `0`
  - `fontSize`: `7%` of the smaller image side
  - `colorCode`: `'#FFFFFF'`
  - `margins`: `{ top: 0, right: 0, bottom: 0, left: 0 }`
- Added native-side options object handling for Android and iOS.

### Changed

- Updated the sample app to use the options object API.
- Updated README usage and API documentation for the new object-based call.
- Updated smoke tests to cover the new API shape and `fontSize` validation.
