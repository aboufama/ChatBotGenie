import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Register for the authentication callback
WebBrowser.maybeCompleteAuthSession();

// Constants for Microsoft Auth
const MS_USER_DATA_KEY = 'MS_USER_DATA';
const MS_TOKEN_KEY = 'MS_TOKEN_DATA';

// Generate PKCE code verifier and challenge
const generatePKCE = async () => {
  // Generate random string for code verifier (between 43-128 chars)
  const codeVerifier = Array(96)
    .fill(0)
    .map(() => {
      const charCode = Math.floor(Math.random() * (122 - 65 + 1) + 65);
      return String.fromCharCode(charCode);
    })
    .join('')
    .replace(/[^a-zA-Z0-9]/g, 'a');

  // Generate code challenge from verifier
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: 'base64' }
  );
  
  // Base64URL encoding
  const challenge = digest
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return { codeVerifier, codeChallenge: challenge };
};

// Load environment variables - access from process.env or from Constants.expoConfig.extra
// This covers both development and production scenarios
const getConfig = () => {
  // Fixed values from .env
  const AZURE_CLIENT_ID = '916fa8fd-5db5-4553-8ccf-ab08e1f07e5e';
  const AZURE_TENANT_ID = '0b031fc9-84e1-487c-945f-e6dbd618cd02';
  
  // If we're on a physical device, use the exp:// URI explicitly configured in .env
  // Otherwise, generate a URI compatible with Expo's development environment
  const useExplicitRedirectUri = process.env.REDIRECT_URI && Platform.OS !== 'web';
  const REDIRECT_URI = useExplicitRedirectUri 
    ? process.env.REDIRECT_URI 
    : AuthSession.makeRedirectUri({ 
        scheme: 'myapp',
        path: 'auth/callback' 
      });

  const AZURE_SCOPES = 'openid profile email User.Read';

  console.log('Microsoft Auth Config:', { 
    clientId: AZURE_CLIENT_ID,
    tenantId: AZURE_TENANT_ID,
    redirectUri: REDIRECT_URI,
    scopes: AZURE_SCOPES
  });

  return {
    clientId: AZURE_CLIENT_ID,
    tenantId: AZURE_TENANT_ID,
    redirectUri: REDIRECT_URI,
    scopes: AZURE_SCOPES.split(' ')
  };
};

// Create the auth request
const useAzureAuth = () => {
  const config = getConfig();

  // Create discovery document - this tells the auth provider where to find the endpoints
  const discovery = {
    authorizationEndpoint: `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`,
    tokenEndpoint: `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
    endSessionEndpoint: `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/logout`,
  };

  // Create the auth request with PKCE
  const [request, result, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: config.clientId,
      scopes: config.scopes,
      redirectUri: config.redirectUri,
      prompt: AuthSession.Prompt.Login,
      usePKCE: true,
      extraParams: {
        response_type: 'code',
      },
    },
    discovery
  );

  // Function to store user data
  const storeUserData = async (userData, tokenData) => {
    try {
      await AsyncStorage.setItem(MS_USER_DATA_KEY, JSON.stringify(userData));
      await AsyncStorage.setItem(MS_TOKEN_KEY, JSON.stringify(tokenData));
      return true;
    } catch (error) {
      console.error('Error storing MS auth data:', error);
      return false;
    }
  };

  // Function to get user data from storage
  const getUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem(MS_USER_DATA_KEY);
      const tokenData = await AsyncStorage.getItem(MS_TOKEN_KEY);
      return {
        userData: userData ? JSON.parse(userData) : null,
        tokenData: tokenData ? JSON.parse(tokenData) : null,
      };
    } catch (error) {
      console.error('Error getting MS auth data:', error);
      return { userData: null, tokenData: null };
    }
  };

  // Function to clear user data from storage
  const clearUserData = async () => {
    try {
      await AsyncStorage.removeItem(MS_USER_DATA_KEY);
      await AsyncStorage.removeItem(MS_TOKEN_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing MS auth data:', error);
      return false;
    }
  };

  // Function to exchange code for token
  const exchangeCodeForToken = async (code) => {
    try {
      console.log('Exchanging code for token');
      
      if (!code) {
        console.error('No authorization code provided');
        return null;
      }
      
      if (!request?.codeVerifier) {
        console.error('No code verifier available');
        return null;
      }
      
      const tokenResult = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          scope: config.scopes.join(' '),
          code,
          redirect_uri: config.redirectUri,
          grant_type: 'authorization_code',
          code_verifier: request.codeVerifier,
        }).toString(),
      });

      const tokenData = await tokenResult.json();
      
      if (tokenData.error) {
        // Log a generic error without exposing sensitive details
        console.error('Token exchange failed');
        return null;
      }
      
      console.log('Token exchange successful');
      return tokenData;
    } catch (error) {
      // Log a generic error without exposing sensitive details
      console.error('Authentication process failed');
      return null;
    }
  };

  // Function to get user info with the token
  const getUserInfo = async (accessToken) => {
    try {
      if (!accessToken) {
        console.error('Authentication failed: Missing token');
        return null;
      }
      
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (!response.ok) {
        // Log a generic error without exposing sensitive details
        console.error('Failed to retrieve user information');
        return null;
      }
      
      const userInfo = await response.json();
      console.log('User info retrieved successfully');
      return userInfo;
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  };

  // Sign out - based on recommendations, we're focusing on local sign-out only
  const signOut = async () => {
    try {
      await clearUserData();
      // Note: We're not attempting to sign out from Microsoft's side as this can be problematic
      // As per recommendations, we focus on clearing local tokens
      return true;
    } catch (error) {
      console.error('Error during sign out:', error);
      return false;
    }
  };

  return {
    request,
    result,
    promptAsync,
    exchangeCodeForToken,
    getUserInfo,
    storeUserData,
    getUserData,
    clearUserData,
    signOut,
  };
};

export default useAzureAuth; 