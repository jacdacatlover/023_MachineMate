import { MD3DarkTheme } from 'react-native-paper';

// Modern dark theme inspired by Discord, VS Code, and Material Design
export const colors = {
  // Dark backgrounds (Material Design + VS Code inspired)
  background: '#121212', // Material Design dark background (not pure black)
  surface: '#1E1E1E', // VS Code-like surface color
  surfaceVariant: '#2D2D30', // Elevated surfaces

  // Discord Blurple as primary (signature color)
  primary: '#5865F2', // Discord's Blurple
  primaryLight: '#7289DA', // Lighter blurple for hover
  primaryDark: '#4752C4', // Darker blurple for pressed states

  // Accent colors (modern coding aesthetic)
  accent: '#00D9FF', // Bright cyan (Discord online status inspired)
  accentSecondary: '#9D84FF', // Soft purple (Dracula theme inspired)
  accentTertiary: '#57F287', // Discord green

  // Text colors (desaturated for better dark mode readability)
  text: '#DCDDDE', // Light gray (Discord primary text)
  textSecondary: '#B9BBBE', // Medium gray (Discord secondary text)
  textTertiary: '#72767D', // Muted gray (Discord muted text)

  // Status colors (vibrant but not harsh)
  success: '#57F287', // Discord green
  warning: '#FEE75C', // Discord yellow
  error: '#ED4245', // Discord red
  info: '#00D9FF', // Cyan

  // UI elements
  border: '#2F3136', // Subtle border (Discord channel list)
  borderActive: '#5865F2', // Blurple border for active states
  shadow: '#000000',
  white: '#FFFFFF',

  // Gradient colors for special effects
  gradientStart: '#121212',
  gradientEnd: '#1E1E2E',
};

// React Native Paper theme configuration
export const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryDark,
    secondary: colors.accent,
    secondaryContainer: colors.accentSecondary,
    tertiary: colors.accentSecondary,
    surface: colors.surface,
    surfaceVariant: colors.surfaceVariant,
    background: colors.background,
    error: colors.error,
    errorContainer: colors.error + '20',
    onPrimary: colors.white,
    onSecondary: colors.background,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
    onBackground: colors.text,
    outline: colors.border,
    outlineVariant: colors.borderActive,
    inverseSurface: colors.text,
    inverseOnSurface: colors.background,
    inversePrimary: colors.primaryLight,
    shadow: colors.shadow,
    scrim: colors.shadow,
    backdrop: colors.shadow + '80',
  },
  fonts: {
    // Display variants (largest text) - Space Grotesk for impact
    displayLarge: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 57,
      fontWeight: '700' as const,
      letterSpacing: 0,
      lineHeight: 64,
    },
    displayMedium: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 45,
      fontWeight: '700' as const,
      letterSpacing: 0,
      lineHeight: 52,
    },
    displaySmall: {
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 36,
      fontWeight: '600' as const,
      letterSpacing: 0,
      lineHeight: 44,
    },

    // Headline variants - Space Grotesk for headers
    headlineLarge: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 32,
      fontWeight: '700' as const,
      letterSpacing: 0,
      lineHeight: 40,
    },
    headlineMedium: {
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 28,
      fontWeight: '600' as const,
      letterSpacing: 0,
      lineHeight: 36,
    },
    headlineSmall: {
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 24,
      fontWeight: '600' as const,
      letterSpacing: 0,
      lineHeight: 32,
    },

    // Title variants - Space Grotesk for section titles
    titleLarge: {
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 22,
      fontWeight: '600' as const,
      letterSpacing: 0,
      lineHeight: 28,
    },
    titleMedium: {
      fontFamily: 'SpaceGrotesk_500Medium',
      fontSize: 16,
      fontWeight: '500' as const,
      letterSpacing: 0.15,
      lineHeight: 24,
    },
    titleSmall: {
      fontFamily: 'SpaceGrotesk_500Medium',
      fontSize: 14,
      fontWeight: '500' as const,
      letterSpacing: 0.1,
      lineHeight: 20,
    },

    // Label variants - Inter for UI labels
    labelLarge: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
      lineHeight: 20,
    },
    labelMedium: {
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      fontWeight: '500' as const,
      letterSpacing: 0.5,
      lineHeight: 16,
    },
    labelSmall: {
      fontFamily: 'Inter_500Medium',
      fontSize: 11,
      fontWeight: '500' as const,
      letterSpacing: 0.5,
      lineHeight: 16,
    },

    // Body variants - Inter for readable body text
    bodyLarge: {
      fontFamily: 'Inter_400Regular',
      fontSize: 16,
      fontWeight: '400' as const,
      letterSpacing: 0.5,
      lineHeight: 24,
    },
    bodyMedium: {
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      fontWeight: '400' as const,
      letterSpacing: 0.25,
      lineHeight: 20,
    },
    bodySmall: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      fontWeight: '400' as const,
      letterSpacing: 0.4,
      lineHeight: 16,
    },

    // Legacy font shortcuts
    regular: {
      fontFamily: 'Inter_400Regular',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'Inter_500Medium',
      fontWeight: '500' as const,
    },
    bold: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontWeight: '700' as const,
    },
  },
  roundness: 8,
};

// Navigation theme
export const navigationTheme = {
  dark: true,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
  fonts: {
    regular: {
      fontFamily: 'Inter_400Regular',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'Inter_500Medium',
      fontWeight: '500' as const,
    },
    bold: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontWeight: '700' as const,
    },
    heavy: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontWeight: '700' as const,
    },
  },
};