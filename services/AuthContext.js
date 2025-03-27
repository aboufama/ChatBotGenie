import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAzureAuth from './MicrosoftAuthService';
import { Alert, Platform } from 'react-native';

// API token from .env - this is used after successful Microsoft authentication
// This approach separates auth credentials from Microsoft's token
const API_TOKEN = process.env.API_TOKEN;
if (!API_TOKEN) {
  throw new Error('API_TOKEN environment variable is required but was not set');
}

const API_KEY_STORAGE_KEY = 'DATABRICKS_API_KEY';
const AUTH_TYPE_KEY = 'AUTH_TYPE';
const LAST_AUTH_ATTEMPT_KEY = 'LAST_AUTH_ATTEMPT';

// Auth types
const AUTH_TYPES = {
  API_KEY: 'API_KEY',
  MICROSOFT: 'MICROSOFT',
};

// Create context for authentication
const AuthContext = createContext({
  apiKey: null,
  isAuthenticated: false,
  authType: null,
  userData: null,
  login: () => {},
  loginWithMicrosoft: () => {},
  logout: () => {},
  loading: true,
  error: null,
});

// Rate limiting constants
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_KEY = 'AUTH_RATE_LIMIT';

// Provider component that wraps the app
export const AuthProvider = ({ children }) => {
  const [apiKey, setApiKey] = useState(null);
  const [authType, setAuthType] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Initialize Microsoft Auth
  const {
    promptAsync,
    result,
    exchangeCodeForToken,
    getUserInfo,
    storeUserData,
    getUserData,
    clearUserData,
    signOut,
  } = useAzureAuth();
  
  // Prevent rapid repeated auth attempts (debounce)
  const preventRepeatedAttempts = async () => {
    try {
      const rateLimitData = await AsyncStorage.getItem(RATE_LIMIT_KEY);
      const now = Date.now();
      
      if (rateLimitData) {
        const { attempts, timestamp } = JSON.parse(rateLimitData);
        
        // Check if we're within the rate limit window
        if (now - timestamp < RATE_LIMIT_WINDOW) {
          // Check if we've exceeded max attempts
          if (attempts >= MAX_ATTEMPTS) {
            const remainingTime = Math.ceil((RATE_LIMIT_WINDOW - (now - timestamp)) / 1000);
            throw new Error(`Too many authentication attempts. Please try again in ${remainingTime} seconds.`);
          }
          
          // Update attempts count
          await AsyncStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({
            attempts: attempts + 1,
            timestamp
          }));
        } else {
          // Reset rate limit if window has passed
          await AsyncStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({
            attempts: 1,
            timestamp: now
          }));
        }
      } else {
        // Initialize rate limit data
        await AsyncStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({
          attempts: 1,
          timestamp: now
        }));
      }
      
      return true;
    } catch (error) {
      console.error('Rate limit error:', error);
      throw error;
    }
  };
  
  // Clear rate limit data on successful authentication
  const clearRateLimit = async () => {
    try {
      await AsyncStorage.removeItem(RATE_LIMIT_KEY);
    } catch (error) {
      console.error('Error clearing rate limit:', error);
    }
  };
  
  // Process Microsoft Auth result
  useEffect(() => {
    const processMicrosoftAuth = async () => {
      if (result?.type === 'success') {
        try {
          console.log('Microsoft auth successful, processing result');
          setLoading(true);
          
          const { code } = result.params;
          if (!code) {
            throw new Error('No authorization code received');
          }
          
          // Exchange code for token
          const tokenData = await exchangeCodeForToken(code);
          
          if (!tokenData?.access_token) {
            throw new Error('Failed to obtain access token');
          }
          
          // Get user info
          const userInfo = await getUserInfo(tokenData.access_token);
          
          if (!userInfo?.id) {
            throw new Error('Failed to retrieve user information');
          }
          
          // Store user data
          await storeUserData(userInfo, tokenData);
          
          // Set auth type
          await AsyncStorage.setItem(AUTH_TYPE_KEY, AUTH_TYPES.MICROSOFT);
          
          // Store the API token from .env for this user
          // This way we use Microsoft just for authentication but our own token for API access
          await AsyncStorage.setItem(API_KEY_STORAGE_KEY, API_TOKEN);
          
          // Update state
          setApiKey(API_TOKEN);  // Use our API token instead of Microsoft's
          setUserData(userInfo);
          setAuthType(AUTH_TYPES.MICROSOFT);
          setError(null);
          
          console.log('Microsoft authentication completed successfully');
        } catch (error) {
          console.error('Error in Microsoft auth process:', error);
          setError(`Authentication error: ${error.message}`);
          Alert.alert(
            'Authentication Error',
            `There was an error authenticating with Microsoft: ${error.message}`,
            [{ text: 'OK' }]
          );
          
          // Clear any partial auth data
          try {
            await signOut();
          } catch (e) {
            console.error('Error clearing partial auth data:', e);
          }
        } finally {
          setLoading(false);
        }
      } else if (result?.type === 'error') {
        console.error('Microsoft auth error:', result.error);
        setError(`Authentication error: ${result.error?.message || 'Unknown error'}`);
        setLoading(false);
      } else if (result?.type === 'cancel') {
        console.log('Microsoft auth cancelled by user');
        setError(null);
        setLoading(false);
      }
    };
    
    if (result) {
      processMicrosoftAuth();
    }
  }, [result]);

  // Check for stored auth on app initialization
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        console.log('Loading stored authentication data');
        const storedAuthType = await AsyncStorage.getItem(AUTH_TYPE_KEY);
        
        if (storedAuthType === AUTH_TYPES.API_KEY) {
          console.log('Found stored API key auth');
          const storedApiKey = await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
          if (storedApiKey) {
            setApiKey(storedApiKey);
            setAuthType(AUTH_TYPES.API_KEY);
          }
        } else if (storedAuthType === AUTH_TYPES.MICROSOFT) {
          console.log('Found stored Microsoft auth');
          
          // For Microsoft auth, we want both the user data and our API key
          const { userData: storedUserData } = await getUserData();
          const storedApiKey = await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
          
          if (storedUserData && storedApiKey) {
            setUserData(storedUserData);
            setApiKey(storedApiKey);
            setAuthType(AUTH_TYPES.MICROSOFT);
          } else {
            console.log('No valid Microsoft user data or API key found, clearing auth');
            await signOut();
            await AsyncStorage.removeItem(AUTH_TYPE_KEY);
            await AsyncStorage.removeItem(API_KEY_STORAGE_KEY);
          }
        } else {
          console.log('No stored authentication found');
        }
      } catch (error) {
        console.error('Error loading stored auth:', error);
        setError(`Error loading authentication: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  // Login with API key
  const login = async (newApiKey) => {
    try {
      if (!newApiKey || newApiKey.trim().length < 10) {
        throw new Error('Invalid API key');
      }
      
      setLoading(true);
      await AsyncStorage.setItem(API_KEY_STORAGE_KEY, newApiKey);
      await AsyncStorage.setItem(AUTH_TYPE_KEY, AUTH_TYPES.API_KEY);
      setApiKey(newApiKey);
      setAuthType(AUTH_TYPES.API_KEY);
      setError(null);
      console.log('Successfully logged in with API key');
      return true;
    } catch (error) {
      console.error('Error storing API key:', error);
      setError(`Login error: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Login with Microsoft
  const loginWithMicrosoft = async () => {
    try {
      console.log('Initiating Microsoft login');
      
      // Check rate limiting
      await preventRepeatedAttempts();
      
      setError(null);
      setLoading(true);
      
      // On Android, the return URL must be correctly registered
      if (Platform.OS === 'android') {
        try {
          await promptAsync({ useProxy: true });
        } catch (error) {
          if (error.message?.includes('returned an invalid')) {
            console.warn('Using proxy failed, trying direct mode');
            await promptAsync({ useProxy: false });
          } else {
            throw error;
          }
        }
      } else {
        await promptAsync();
      }
      
      // Clear rate limit on successful authentication
      await clearRateLimit();
      return true;
    } catch (error) {
      console.error('Error initiating Microsoft login:', error);
      setError(error.message || 'Microsoft login error');
      setLoading(false);
      return false;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      console.log('Logging out');
      setLoading(true);
      
      if (authType === AUTH_TYPES.MICROSOFT) {
        // Use the dedicated sign out function
        await signOut();
      }
      
      // Always clear local storage
      await AsyncStorage.removeItem(API_KEY_STORAGE_KEY);
      await AsyncStorage.removeItem(AUTH_TYPE_KEY);
      
      setApiKey(null);
      setUserData(null);
      setAuthType(null);
      setError(null);
      console.log('Successfully logged out');
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      setError(`Logout error: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    apiKey,
    userData,
    authType,
    isAuthenticated: !!(apiKey || userData),
    login,
    loginWithMicrosoft,
    logout,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 