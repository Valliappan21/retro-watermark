# Retro Watermark sample

Bare React Native CLI app that consumes the parent package through:

```json
"retro-watermark": "file:.."
```

The sample imports an image with `react-native-image-picker`, lets you configure
the watermark, then calls the native bridge on Android or iOS.

## Install

```sh
npm install
```

For iOS:

```sh
cd ios
pod install
cd ..
```

## Run

```sh
npm start
npm run android
npm run ios
```

After editing native package files, rebuild the app. If dependencies drift, run
`npm install` in this `sample` folder again.
