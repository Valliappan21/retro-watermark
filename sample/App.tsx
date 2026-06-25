import React, { useMemo, useState } from 'react';
import {
  Image,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import type { Asset } from 'react-native-image-picker';
import { inspectLocalImage } from 'retro-watermark';
import type { WatermarkMargins, WatermarkPosition } from 'retro-watermark';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const WATERMARK_COLORS = ['#FF004D', '#00E5FF', '#FFE66D', '#7CFF6B', '#FFFFFF'];
const WATERMARK_POSITIONS: WatermarkPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'center',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];
const ROTATION_OPTIONS = [-45, 0, 15, 45, 90];
const MARGIN_DIRECTIONS: Array<keyof WatermarkMargins> = [
  'top',
  'right',
  'bottom',
  'left',
];
const DEFAULT_WATERMARK_MARGINS: Required<WatermarkMargins> = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

async function requestPhotoPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) >= 33) {
    return true;
  }

  const permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const alreadyGranted = await PermissionsAndroid.check(permission);
  if (alreadyGranted) {
    return true;
  }

  const result = await PermissionsAndroid.request(permission, {
    title: 'Photo library access',
    message: 'Choose a photo to preview it with a native watermark.',
    buttonPositive: 'Allow',
    buttonNegative: 'Cancel',
  });

  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function App() {
  const [selectedImage, setSelectedImage] = useState<Asset | null>(null);
  const [watermarkText, setWatermarkText] = useState('created with retro-watermark');
  const [watermarkColor, setWatermarkColor] = useState('#FF004D');
  const [watermarkPosition, setWatermarkPosition] =
    useState<WatermarkPosition>('top-center');
  const [watermarkRotation, setWatermarkRotation] = useState(0);
  const [watermarkFontSize, setWatermarkFontSize] = useState(48);
  const [watermarkMargins, setWatermarkMargins] = useState(
    DEFAULT_WATERMARK_MARGINS,
  );
  const [isSelecting, setIsSelecting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [message, setMessage] = useState(
    'Import an image, tune the watermark, then let the native module stamp the final file.',
  );

  const imageMeta = useMemo(() => {
    if (!selectedImage) {
      return 'Awaiting image signal';
    }

    const size =
      selectedImage.width && selectedImage.height
        ? `${selectedImage.width} × ${selectedImage.height}`
        : 'size unknown';

    return `${selectedImage.fileName || 'local image'} · ${size}`;
  }, [selectedImage]);

  const updateMargin = (
    direction: keyof WatermarkMargins,
    nextValue: string,
  ) => {
    const numericValue = Number(nextValue.replace(/[^0-9.]/g, ''));
    setWatermarkMargins(current => ({
      ...current,
      [direction]: Number.isFinite(numericValue) ? numericValue : 0,
    }));
  };

  const updateFontSize = (nextValue: string) => {
    const numericValue = Number(nextValue.replace(/[^0-9.]/g, ''));
    setWatermarkFontSize(
      Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1,
    );
  };

  const importImage = async () => {
    setIsSelecting(true);

    try {
      const hasPermission = await requestPhotoPermission();
      if (!hasPermission) {
        setMessage('Photo permission was denied. Enable it in system settings.');
        return;
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 1,
      });

      if (result.didCancel) {
        setMessage('Image selection was cancelled.');
        return;
      }

      if (result.errorCode) {
        setMessage(
          result.errorMessage || `Image picker error: ${result.errorCode}`,
        );
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        setMessage('The selected image could not be loaded.');
        return;
      }

      setSelectedImage(asset);
      setMessage('Image loaded. Configure the stamp and press APPLY WATERMARK.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to import image.',
      );
    } finally {
      setIsSelecting(false);
    }
  };

  const applyWatermark = async () => {
    if (!selectedImage?.uri) {
      setMessage('Select an image first.');
      return;
    }

    if (!watermarkText.trim()) {
      setMessage('Watermark text cannot be empty.');
      return;
    }

    setIsApplying(true);

    try {
      const result = await inspectLocalImage({
        localUri: selectedImage.uri,
        text: watermarkText,
        position: watermarkPosition,
        rotateDegree: watermarkRotation,
        fontSize: watermarkFontSize,
        colorCode: watermarkColor,
        margins: watermarkMargins,
      });

      setSelectedImage(current =>
        current
          ? {
              ...current,
              uri: result.uri,
              fileName: result.fileName,
              width: result.width,
              height: result.height,
            }
          : current,
      );
      setMessage(
        `Native watermark saved: ${result.fileName} (${result.width} × ${result.height})`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to apply watermark.',
      );
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#1B1026" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.screen}>
          <View style={styles.hero}>
            <Text style={styles.kicker}>RN WATERMARK // {Platform.OS.toUpperCase()} NATIVE</Text>
            <Text style={styles.heading}>Retro watermark </Text>
            <Text style={styles.intro}>
              Pick a local image, pass its URI into the package, and preview the
              native-generated watermarked copy.
            </Text>
          </View>

          <View style={styles.statusPanel}>
            <Text style={styles.statusLabel}>SYSTEM MESSAGE</Text>
            <Text style={styles.statusText}>{message}</Text>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              disabled={isSelecting}
              onPress={importImage}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                isSelecting && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {isSelecting ? 'OPENING LIBRARY…' : 'IMPORT IMAGE'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={!selectedImage?.uri || isApplying}
              onPress={applyWatermark}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
                (!selectedImage?.uri || isApplying) && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                {isApplying ? 'STAMPING…' : 'APPLY WATERMARK'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.deck}>
            <View style={styles.previewCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Preview monitor</Text>
                <View style={styles.led} />
              </View>

              {selectedImage?.uri ? (
                <View style={styles.previewFrame}>
                  <Image
                    accessibilityLabel="Selected image preview"
                    resizeMode="contain"
                    source={{ uri: selectedImage.uri }}
                    style={styles.previewImage}
                  />
                </View>
              ) : (
                <View style={styles.emptyPreview}>
                  <Text style={styles.emptyPreviewIcon}>▧</Text>
                  <Text style={styles.emptyPreviewText}>No image selected</Text>
                </View>
              )}

              <Text style={styles.metadata}>{imageMeta}</Text>
            </View>

            <View style={styles.controlCard}>
              <Text style={styles.cardTitle}>Watermark console</Text>

              <Text style={styles.label}>Text</Text>
              <TextInput
                autoCapitalize="characters"
                onChangeText={setWatermarkText}
                placeholder="created with retro-watermark"
                placeholderTextColor="#8B7A9E"
                style={styles.input}
                value={watermarkText}
              />

              <Text style={styles.label}>Font size</Text>
              <TextInput
                accessibilityLabel="Watermark font size"
                inputMode="numeric"
                keyboardType="numeric"
                onChangeText={updateFontSize}
                style={styles.input}
                value={String(watermarkFontSize)}
              />

              <Text style={styles.label}>Color code</Text>
              <View style={styles.colorOptions}>
                {WATERMARK_COLORS.map(color => (
                  <Pressable
                    accessibilityLabel={`Use watermark color ${color}`}
                    accessibilityRole="button"
                    key={color}
                    onPress={() => setWatermarkColor(color)}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color },
                      watermarkColor === color && styles.colorSwatchSelected,
                    ]}
                  />
                ))}
              </View>

              <Text style={styles.label}>Position</Text>
              <View style={styles.chipGrid}>
                {WATERMARK_POSITIONS.map(position => (
                  <Pressable
                    accessibilityRole="button"
                    key={position}
                    onPress={() => setWatermarkPosition(position)}
                    style={[
                      styles.chip,
                      watermarkPosition === position && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        watermarkPosition === position && styles.chipTextActive,
                      ]}
                    >
                      {position}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Rotation</Text>
              <View style={styles.chipGrid}>
                {ROTATION_OPTIONS.map(rotation => (
                  <Pressable
                    accessibilityRole="button"
                    key={rotation}
                    onPress={() => setWatermarkRotation(rotation)}
                    style={[
                      styles.rotationChip,
                      watermarkRotation === rotation && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        watermarkRotation === rotation && styles.chipTextActive,
                      ]}
                    >
                      {rotation}°
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Margins</Text>
              <View style={styles.marginGrid}>
                {MARGIN_DIRECTIONS.map(direction => (
                  <View key={direction} style={styles.marginCell}>
                    <Text style={styles.marginLabel}>{direction}</Text>
                    <TextInput
                      accessibilityLabel={`Watermark ${direction} margin`}
                      inputMode="numeric"
                      keyboardType="numeric"
                      onChangeText={value => updateMargin(direction, value)}
                      style={styles.marginInput}
                      value={String(watermarkMargins[direction])}
                    />
                  </View>
                ))}
              </View>

              <View style={styles.configStrip}>
                <Text style={styles.configText}>
                  font {watermarkFontSize}px ·{' '}
                  margins {JSON.stringify(watermarkMargins)} · native output URI
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1B1026' },
  screen: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 56,
    backgroundColor: '#1B1026',
  },
  hero: {
    borderWidth: 2,
    borderColor: '#FFB000',
    borderRadius: 22,
    padding: 20,
    backgroundColor: '#2B1740',
    shadowColor: '#FF004D',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 8,
  },
  kicker: {
    color: '#00E5FF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  heading: {
    marginTop: 8,
    color: '#FFE66D',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
  },
  intro: {
    marginTop: 10,
    color: '#F7D7FF',
    fontSize: 15,
    lineHeight: 22,
  },
  statusPanel: {
    marginTop: 18,
    borderWidth: 2,
    borderColor: '#00E5FF',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#071E2B',
  },
  statusLabel: {
    color: '#7CFF6B',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  statusText: {
    marginTop: 6,
    color: '#E9F8FF',
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: { gap: 12, marginTop: 18 },
  primaryButton: {
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFE66D',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 15,
    backgroundColor: '#FF004D',
  },
  secondaryButton: {
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF004D',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 15,
    backgroundColor: '#FFE66D',
  },
  buttonPressed: { transform: [{ translateX: 2 }, { translateY: 2 }] },
  buttonDisabled: { opacity: 0.45 },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  secondaryButtonText: {
    color: '#271236',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  deck: { gap: 18, marginTop: 18 },
  previewCard: {
    borderWidth: 2,
    borderColor: '#5E3A7D',
    borderRadius: 22,
    padding: 14,
    backgroundColor: '#12091D',
  },
  controlCard: {
    borderWidth: 2,
    borderColor: '#5E3A7D',
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#241038',
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  led: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#7CFF6B',
  },
  previewFrame: {
    height: 360,
    borderWidth: 8,
    borderColor: '#35204A',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#050409',
  },
  previewImage: { width: '100%', height: '100%' },
  metadata: {
    marginTop: 12,
    color: '#C9BAD8',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
    borderWidth: 2,
    borderColor: '#5E3A7D',
    borderStyle: 'dashed',
    borderRadius: 18,
    backgroundColor: '#0B0712',
  },
  emptyPreviewIcon: { color: '#FFB000', fontSize: 48 },
  emptyPreviewText: {
    marginTop: 8,
    color: '#C9BAD8',
    fontSize: 15,
    fontWeight: '800',
  },
  label: {
    marginTop: 18,
    marginBottom: 8,
    color: '#FFE66D',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 2,
    borderColor: '#8E5FB6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#12091D',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorSwatch: {
    width: 42,
    height: 42,
    borderWidth: 2,
    borderColor: '#12091D',
    borderRadius: 6,
  },
  colorSwatchSelected: {
    borderColor: '#FFFFFF',
    transform: [{ rotate: '-4deg' }],
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 2,
    borderColor: '#5E3A7D',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#12091D',
  },
  rotationChip: {
    minWidth: 62,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#5E3A7D',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#12091D',
  },
  chipActive: {
    borderColor: '#00E5FF',
    backgroundColor: '#073040',
  },
  chipText: {
    color: '#C9BAD8',
    fontSize: 12,
    fontWeight: '900',
  },
  chipTextActive: { color: '#FFFFFF' },
  marginGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  marginCell: {
    minWidth: 92,
    flexGrow: 1,
    borderWidth: 2,
    borderColor: '#5E3A7D',
    borderRadius: 14,
    padding: 10,
    backgroundColor: '#12091D',
  },
  marginLabel: {
    color: '#00E5FF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  marginInput: {
    marginTop: 6,
    borderWidth: 2,
    borderColor: '#35204A',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#050409',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  configStrip: {
    marginTop: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#7CFF6B',
    padding: 10,
    backgroundColor: '#12091D',
  },
  configText: {
    color: '#C9BAD8',
    fontSize: 12,
    fontWeight: '800',
  },
});

export default App;
