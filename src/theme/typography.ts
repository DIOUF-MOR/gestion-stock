import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    light: 'System',
  },
  android: {
    regular: 'Roboto',
    medium: 'Roboto',
    bold: 'Roboto',
    light: 'Roboto',
  },
  default: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    light: 'System',
  },
});

export const typography = {
  // Font sizes
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
    '6xl': 42,
  },

  // Font weights
  fontWeight: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Predefined text styles
  styles: {
    h1: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 40,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 28,
      fontWeight: '700',
      lineHeight: 36,
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 32,
    },
    h4: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
    },
    h5: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
    },
    h6: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
    },
    body1: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
    },
    body2: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 24,
      letterSpacing: 0.5,
    },
    overline: {
      fontSize: 10,
      fontWeight: '600',
      lineHeight: 16,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    price: {
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 32,
    },
    stat: {
      fontSize: 28,
      fontWeight: '800',
      lineHeight: 36,
    },
  },
};

export default typography;
