module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath:
          'import com.reactnativewatermark.WatermarkPackage;',
        packageInstance: 'new WatermarkPackage()',
      },
    },
  },
};
