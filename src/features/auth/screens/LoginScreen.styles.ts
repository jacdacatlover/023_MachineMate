import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 24,
    borderRadius: 20,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  formSection: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  errorText: {
    marginTop: -12,
    marginBottom: 8,
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    marginVertical: 8,
  },
  loader: {
    marginVertical: 24,
  },
  signupPrompt: {
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 8,
    color: '#666',
  },
});
