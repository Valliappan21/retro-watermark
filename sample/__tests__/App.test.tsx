/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Platform, Text, TextInput } from 'react-native';
import App from '../App';

const mockLaunchImageLibrary = jest.fn();
const mockInspectLocalImage = jest.fn();

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: mockLaunchImageLibrary,
}));

jest.mock('retro-watermark', () => ({
  inspectLocalImage: mockInspectLocalImage,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: require('react-native').View,
}));

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => 'ios',
  });
});

function hasText(renderer: ReactTestRenderer.ReactTestRenderer, value: string) {
  return renderer.root
    .findAllByType(Text)
    .some(node => JSON.stringify(node.props.children).includes(value));
}

function findMarginInput(
  renderer: ReactTestRenderer.ReactTestRenderer,
  direction: string,
) {
  return renderer.root.findByProps({
    accessibilityLabel: `Watermark ${direction} margin`,
  });
}

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

test('renders editable margin controls and updates the margin config', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const topMarginInput = findMarginInput(renderer, 'top');
  const rightMarginInput = findMarginInput(renderer, 'right');
  const bottomMarginInput = findMarginInput(renderer, 'bottom');
  const leftMarginInput = findMarginInput(renderer, 'left');

  expect(topMarginInput.type).toBe(TextInput);
  expect(topMarginInput.props.value).toBe('0');
  expect(rightMarginInput.props.value).toBe('0');
  expect(bottomMarginInput.props.value).toBe('0');
  expect(leftMarginInput.props.value).toBe('0');

  await ReactTestRenderer.act(() => {
    topMarginInput.props.onChangeText('12');
    rightMarginInput.props.onChangeText('24');
    bottomMarginInput.props.onChangeText('36');
    leftMarginInput.props.onChangeText('48');
  });

  expect(findMarginInput(renderer, 'top').props.value).toBe('12');
  expect(findMarginInput(renderer, 'right').props.value).toBe('24');
  expect(findMarginInput(renderer, 'bottom').props.value).toBe('36');
  expect(findMarginInput(renderer, 'left').props.value).toBe('48');
  expect(hasText(renderer, 'native output URI')).toBe(true);
});
