/**
 * LoginScreen
 *
 * Email/password authentication screen with error handling
 * and navigation to signup.
 */

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Text, TextInput, HelperText, ActivityIndicator } from 'react-native-paper';

import PrimaryButton from '@shared/components/PrimaryButton';
import { createLogger } from '@shared/logger';

import { useSession } from '../hooks';
import { styles } from './LoginScreen.styles';
import heroLogo from '../../../../assets/icon.png';

type AuthStackNavigationProp = NativeStackNavigationProp<any>;

const logger = createLogger('auth.LoginScreen');

export default function LoginScreen() {
  const navigation = useNavigation<AuthStackNavigationProp>();
  const { signIn, error, clearError } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleLogin = async () => {
    // Clear previous errors
    clearError();
    setLocalError(null);

    // Basic validation
    if (!email.trim()) {
      setLocalError('Please enter your email address');
      return;
    }

    if (!password) {
      setLocalError('Please enter your password');
      return;
    }

    if (!email.includes('@')) {
      setLocalError('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      await signIn(email.toLowerCase().trim(), password);
      // Navigation handled automatically by auth state change
      logger.info('Login successful');
    } catch (err) {
      // Extract error message from caught exception, not hook state
      const errorMessage = err instanceof Error
        ? err.message
        : error?.message || 'An error occurred during login. Please try again.';

      logger.error('Login failed', {
        error: err,
        errorMessage,
        hasHookError: !!error
      });

      setLocalError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = () => {
    navigation.navigate('Signup');
  };

  const errorMessage = localError || error?.message;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroSection}>
          <Image source={heroLogo} style={styles.logo} />
          <Text variant="headlineMedium" style={styles.title}>
            Welcome Back
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Sign in to access your workout library and history
          </Text>
        </View>

        <View style={styles.formSection}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errorMessage) {
                clearError();
                setLocalError(null);
              }
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            mode="outlined"
            style={styles.input}
            disabled={isLoading}
            error={!!errorMessage}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errorMessage) {
                clearError();
                setLocalError(null);
              }
            }}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            mode="outlined"
            style={styles.input}
            disabled={isLoading}
            error={!!errorMessage}
          />

          {errorMessage && (
            <HelperText type="error" visible={true} style={styles.errorText}>
              {errorMessage}
            </HelperText>
          )}

          <View style={styles.buttonContainer}>
            {isLoading ? (
              <ActivityIndicator size="large" style={styles.loader} />
            ) : (
              <>
                <PrimaryButton
                  label="Sign In"
                  onPress={handleLogin}
                  style={styles.button}
                />
                <Text variant="bodyMedium" style={styles.signupPrompt}>
                  {"Don't have an account?"}
                </Text>
                <PrimaryButton
                  label="Create Account"
                  onPress={handleSignup}
                  mode="outlined"
                  style={styles.button}
                />
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
