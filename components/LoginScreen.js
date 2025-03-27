import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../services/AuthContext';

const LoginScreen = ({ onLoginSuccess }) => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [loginAttempted, setLoginAttempted] = useState(false);
  const { 
    login, 
    loginWithMicrosoft, 
    authType, 
    isAuthenticated, 
    userData, 
    apiKey: authApiKey, 
    loading, 
    error 
  } = useAuth();
  
  // Reset error state when switching between login methods
  useEffect(() => {
    if (showApiKeyInput) {
      setLoginAttempted(false);
    }
  }, [showApiKeyInput]);
  
  // Handle authentication result
  useEffect(() => {
    if (isAuthenticated) {
      if (authType === 'API_KEY' && authApiKey) {
        console.log('Successfully authenticated with API key');
        onLoginSuccess(authApiKey);
      } else if (authType === 'MICROSOFT' && userData) {
        console.log('Successfully authenticated with Microsoft Entra ID', userData.displayName);
        onLoginSuccess(authApiKey || userData.id);
      }
    } else if (loginAttempted && !loading && error) {
      // Show error only after an attempted login that failed
      console.log('Authentication failed:', error);
    }
  }, [isAuthenticated, authType, userData, authApiKey, loading, error, loginAttempted]);
  
  const handleApiKeyLogin = async () => {
    // Validate API key format (Databricks API keys typically start with 'dapi' followed by alphanumeric characters)
    const apiKeyPattern = /^dapi[a-zA-Z0-9]{32,}$/;
    if (!apiKey || !apiKeyPattern.test(apiKey.trim())) {
      Alert.alert(
        'Invalid API Key',
        'Please enter a valid Databricks API key. It should start with "dapi" followed by alphanumeric characters.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setLoginAttempted(true);
    await login(apiKey);
  };

  const handleMicrosoftLogin = async () => {
    try {
      setLoginAttempted(true);
      await loginWithMicrosoft();
      // The login completion is handled in the useEffect above
    } catch (error) {
      console.error('Error during Microsoft login:', error);
    }
  };
  
  const renderErrorMessage = () => {
    if (!error || !loginAttempted) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error.includes('Authentication error') 
            ? 'Authentication failed. Please try again.' 
            : error}
        </Text>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
      >
        <View style={styles.loginContainer}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Genie Chat</Text>
          </View>
          
          <View style={styles.formContainer}>
            <Text style={styles.label}>Sign in to Genie Chat</Text>
            
            {/* Error message */}
            {renderErrorMessage()}
            
            {/* Microsoft Entra ID Login Button */}
            <TouchableOpacity
              style={[
                styles.microsoftButton, 
                loading && !showApiKeyInput && styles.buttonDisabled
              ]}
              onPress={handleMicrosoftLogin}
              disabled={loading}
            >
              <View style={styles.microsoftButtonContent}>
                {loading && !showApiKeyInput ? (
                  <ActivityIndicator size="small" color="white" style={{ marginRight: 10 }} />
                ) : null}
                <Text style={styles.microsoftButtonText}>
                  {loading && !showApiKeyInput ? 'Signing in...' : 'Sign in with Microsoft Entra ID'}
                </Text>
              </View>
            </TouchableOpacity>
            
            {/* API Key Input Section */}
            <View style={styles.apiKeySection}>
              {!showApiKeyInput ? (
                <TouchableOpacity
                  style={styles.apiKeyToggle}
                  onPress={() => setShowApiKeyInput(true)}
                  disabled={loading}
                >
                  <Text style={styles.apiKeyToggleText}>
                    Use API key instead
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.apiKeyContent}>
                  <View style={styles.apiKeyHeader}>
                    <Text style={styles.apiKeyLabel}>
                      Enter your Databricks API Key:
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowApiKeyInput(false)}
                      disabled={loading}
                    >
                      <Text style={styles.apiKeyToggleText}>Hide</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <TextInput
                    style={[
                      styles.input,
                      loading && styles.inputDisabled
                    ]}
                    placeholder="Enter API Key..."
                    value={apiKey}
                    onChangeText={setApiKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={true}
                    editable={!loading}
                  />
                  
                  <TouchableOpacity
                    style={[styles.loginButton, loading && styles.buttonDisabled]}
                    onPress={handleApiKeyLogin}
                    disabled={loading}
                  >
                    <Text style={styles.loginButtonText}>
                      {loading ? 'Logging in...' : 'Log In with API Key'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          
          <Text style={styles.footerText}>
            Authentication credentials are stored locally on your device
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4ae383',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '90%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  // Microsoft Login Button Styles
  microsoftButton: {
    backgroundColor: '#2F2F2F',
    borderRadius: 6,
    padding: 12,
    marginBottom: 20,
  },
  microsoftButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  microsoftButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  // API Key Section Styles
  apiKeySection: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
  apiKeyToggle: {
    alignItems: 'center',
  },
  apiKeyToggleText: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
  },
  apiKeyContent: {
    marginTop: 8,
  },
  apiKeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  apiKeyLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputDisabled: {
    backgroundColor: '#e5e5e5',
    color: '#999',
  },
  loginButton: {
    backgroundColor: '#4ae383',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginTop: 16,
  },
});

export default LoginScreen; 