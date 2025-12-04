/**
 * SignupScreen
 *
 * User registration screen with email/password and validation
 */

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Text, TextInput, HelperText, ActivityIndicator } from 'react-native-paper';

import PrimaryButton from '@shared/components/PrimaryButton';
import { createLogger } from '@shared/logger';

import { useSession } from '../hooks';
import { styles } from './LoginScreen.styles'; // Reusing the same styles
import heroLogo from '../../../../assets/icon.png';

type AuthStackNavigationProp = NativeStackNavigationProp<any>;

const logger = createLogger('auth.SignupScreen');

export default function SignupScreen() {
  const navigation = useNavigation<AuthStackNavigationProp>();
  const { signUp, error, clearError } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSignup = async () => {
    // Clear previous errors
    clearError();
    setLocalError(null);

    // Basic validation
    if (!email.trim()) {
      setLocalError('Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      setLocalError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setLocalError('Please enter a password');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      await signUp(email.toLowerCase().trim(), password);
      // Navigation handled automatically by auth state change
      logger.info('Signup successful');
    } catch (err) {
      // Extract error message from caught exception, not hook state
      const errorMessage = err instanceof Error
        ? err.message
        : error?.message || 'An error occurred during signup. Please try again.';

      logger.error('Signup failed', {
        error: err,
        errorMessage,
        hasHookError: !!error
      });

      setLocalError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.goBack();
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
            Create Account
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Join MachineMate to save your workout history and favorites
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
            autoComplete="password-new"
            textContentType="newPassword"
            mode="outlined"
            style={styles.input}
            disabled={isLoading}
            error={!!errorMessage}
          />

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errorMessage) {
                clearError();
                setLocalError(null);
              }
            }}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
            textContentType="newPassword"
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
                  label="Create Account"
                  onPress={handleSignup}
                  style={styles.button}
                />
                <Text variant="bodyMedium" style={styles.signupPrompt}>
                  Already have an account?
                </Text>
                <PrimaryButton
                  label="Sign In"
                  onPress={handleBackToLogin}
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
