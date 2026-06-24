# retro-watermark

```
╔══════════════════════════════════════╗
║  RETRO WATERMARK                     ║
║  native image stamping for RN apps   ║
╚══════════════════════════════════════╝
```

`retro-watermark` is a React Native native module for stamping text onto a
local image and receiving a newly written image URI back in JavaScript.

It ships native implementations for:

- Android: Kotlin bitmap rendering
- iOS: Objective-C image rendering

No React or React Native version is pinned in `peerDependencies`; both are
declared as `"*"`, so consuming apps can choose their own React Native version.

## Install

```sh
npm install retro-watermark
```

Then rebuild the native app so React Native autolinking can register the native
module:

```sh
# Android
npx react-native run-android

# iOS
cd ios
pod install
cd ..
npx react-native run-ios
```

## What gets packed for npm

The package includes the files needed by consuming apps:

- `index.js`
- `index.d.ts`
- `react-native.config.js`
- `retro-watermark.podspec`
- `android/build.gradle`
- `android/src/**`
- `ios/**`
- `README.md`
- `LICENSE`

## Usage

```ts
import { inspectLocalImage } from 'retro-watermark';

const result = await inspectLocalImage(
  imageUri,
  'CONFIDENTIAL',
  'top-center',
  0,
  '#FF004D',
  {
    top: 10,
    right: 20,
    bottom: 30,
    left: 40,
  },
);

console.log(result.uri);      // final watermarked image URI
console.log(result.fileName); // generated file name
console.log(result.width);
console.log(result.height);
```

## API

```ts
inspectLocalImage(
  localUri: string,
  text: string,
  position: WatermarkPosition,
  rotateDegree: number,
  colorCode?: string,
  margins?: WatermarkMargins,
): Promise<LocalImageDimensions>
```

### `position`

```ts
type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';
```

### `colorCode`

Accepts:

- `#RGB`
- `#ARGB`
- `#RRGGBB`
- `#AARRGGBB`

Default: `#FFFFFF`

### `margins`

```ts
type WatermarkMargins = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};
```

Every margin defaults to `0`.

Edge positions use their matching margin as an inset. Center positions use:

- horizontal offset: `left - right`
- vertical offset: `top - bottom`

The native code clamps placement so the text remains inside the image.

## Native behavior

The native module:

1. Validates the local URI.
2. Checks file/read access.
3. Decodes the image.
4. Draws the text watermark at native level.
5. Writes a new image with a generated file name.
6. Returns the new image URI, source URI, file name, width, and height.

Android accepts readable `file://` and `content://` URIs.

iOS accepts readable local `file://` URIs, such as images copied into the app
sandbox by an image picker.

## Error codes

The promise can reject with:

- `E_IMAGE_NOT_FOUND`
- `E_INVALID_URI`
- `E_UNSUPPORTED_URI`
- `E_PERMISSION_DENIED`
- `E_IMAGE_READ_FAILED`
- `E_INVALID_TEXT`
- `E_INVALID_POSITION`
- `E_INVALID_COLOR`
- `E_INVALID_MARGIN`
- `E_INVALID_IMAGE`
- `E_IMAGE_PROCESSING`

## Local sample

A bare React Native sample app lives in [`sample`](./sample).

```sh
cd sample
npm install
npm start
npm run android
npm run ios
```

The sample imports `retro-watermark` with `"file:.."`, lets you choose an image,
configure text/color/position/rotation/margins, and preview the saved native
output.

## License

MIT
