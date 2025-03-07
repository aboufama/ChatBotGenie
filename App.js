import React, { useState, useRef, useEffect, Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  LogBox,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';

// Custom theme for React Native Paper
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4ae383',
    accent: '#4ae383',
  },
};

// Import our new components
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';

// Error boundary component to catch rendering errors
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'red', marginBottom: 20 }}>
                Something went wrong
              </Text>
              <Text style={{ textAlign: 'center', marginBottom: 20 }}>
                {this.state.error?.toString() || "An unexpected error occurred"}
              </Text>
              <TouchableOpacity 
                style={{ marginTop: 10, padding: 15, backgroundColor: '#4ae383', borderRadius: 10 }}
                onPress={this.resetError}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Try Again</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      );
    }

    return this.props.children;
  }
}

// Import components conditionally with error handling
let SQLResultChart = () => null;
let useChatService = () => ({ 
  messages: [{ id: '1', text: 'Welcome! Chat service is initializing...', sender: 'bot' }],
  loading: false,
  error: null,
  sendMessage: () => console.log('Chat service not initialized'),
  clearChat: () => console.log('Chat service not initialized')
});

// Disable yellow box warnings
LogBox.ignoreLogs(['Warning:']);

// Try to load the services with error handling
try {
  const ChatServiceModule = require('./services/useChatService');
  useChatService = ChatServiceModule.useChatService;
  SQLResultChart = require('./services/SQLResultChart').default;
  console.log('Successfully loaded chat services');
} catch (err) {
  console.error('Error loading services:', err);
}

function AppContent() {
  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState(null);
  const [networkAvailable, setNetworkAvailable] = useState(true);
  const [lastUserMessage, setLastUserMessage] = useState('');
  
  // Safe initialization of chat service
  let chatServiceResult = { messages: [], loading: false, error: null, sendMessage: () => {}, clearChat: () => {} };
  try {
    chatServiceResult = useChatService();
  } catch (err) {
    console.error('Error initializing chat service:', err);
    setInitError(`Failed to initialize chat service: ${err.message || 'Unknown error'}`);
    setInitializing(false);
    return; // Stop execution
  }
  
  const { messages, loading, error, sendMessage, clearChat } = chatServiceResult;
  const [inputText, setInputText] = useState('');
  
  const flatListRef = useRef(null);

  // Function to handle sending messages
  const handleSendMessage = (text) => {
    // Save the user message for potential regeneration
    setLastUserMessage(text);
    sendMessage(text);
  };

  // Function to regenerate the last response
  const handleRegenerateMessage = () => {
    if (lastUserMessage) {
      // Simply send the message again with the regeneration flag
      // The sendMessage function in useChatService will handle
      // finding and replacing the last bot message
      sendMessage(lastUserMessage, true);
    }
  };

  // Check network connectivity
  useEffect(() => {
    const checkConnectivity = async () => {
      try {
        const response = await fetch('https://www.google.com', { 
          method: 'HEAD',
          timeout: 5000
        });
        setNetworkAvailable(response.ok);
      } catch (error) {
        console.log('Network connectivity check failed:', error);
        setNetworkAvailable(false);
      }
    };
    
    checkConnectivity();
    
    // Check connectivity periodically
    const intervalId = setInterval(checkConnectivity, 30000);
    return () => clearInterval(intervalId);
  }, []);

  // Initialization completion
  useEffect(() => {
    console.log('App mounted, initializing...');
    
    // Longer initialization time to ensure all modules are loaded
    setTimeout(() => {
      setInitializing(false);
    }, 2000);
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      try {
        flatListRef.current.scrollToEnd({ animated: true });
      } catch (err) {
        console.error('Error scrolling to end:', err);
      }
    }
  }, [messages]);

  // Find the last bot message
  const getIsLastBotMessage = (message, index) => {
    // Skip the first welcome message (has id '1')
    if (message.id === '1' || message.sender !== 'bot' || message.loading) return false;
    
    // Check if any bot message is currently loading
    const anyMessageLoading = messages.some(msg => msg.sender === 'bot' && msg.loading);
    if (anyMessageLoading) return false;
    
    // Check if this is the last bot message in the conversation
    for (let i = index + 1; i < messages.length; i++) {
      if (messages[i].sender === 'bot' && !messages[i].loading) {
        return false;
      }
    }
    return true;
  };

  // If still initializing, show loading screen
  if (initializing) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color="#4ae383" />
            <Text style={{ marginTop: 20, fontSize: 16 }}>Loading Genie Chat...</Text>
          </SafeAreaView>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  // If there was an initialization error
  if (initError) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'red', marginBottom: 20 }}>Error Initializing App</Text>
            <Text style={{ textAlign: 'center' }}>{initError}</Text>
            <TouchableOpacity 
              style={{ marginTop: 30, padding: 15, backgroundColor: '#4ae383', borderRadius: 10 }}
              onPress={() => setInitializing(true)}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Try Again</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" />
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Genie Chat</Text>
            <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
              <Text style={styles.clearButtonText}>Clear Chat</Text>
            </TouchableOpacity>
          </View>
          
          {!networkAvailable && (
            <View style={styles.networkWarning}>
              <Text style={styles.networkWarningText}>
                No internet connection. Some features may not work.
              </Text>
            </View>
          )}
          
          <View style={styles.chatContainer}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={({ item, index }) => (
                <ChatMessage 
                  message={item} 
                  isLastBotMessage={getIsLastBotMessage(item, index)}
                  onRegenerateMessage={handleRegenerateMessage}
                />
              )}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.messageList}
            />
          </View>
          
          <ChatInput 
            onSendMessage={handleSendMessage} 
            loading={loading} 
          />
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </SafeAreaView>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PaperProvider theme={theme}>
        <AppContent />
      </PaperProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#4ae383',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  clearButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  clearButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageList: {
    paddingVertical: 16,
  },
  messageBubble: {
    marginVertical: 8,
    maxWidth: '85%',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  botBubble: {
    alignSelf: 'flex-start',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  botAvatarContainer: {
    marginRight: 8,
  },
  botAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4ae383',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botAvatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  messageTextContainer: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
    maxWidth: '90%',
  },
  botTextContainer: {
    backgroundColor: '#e5e5ea',
    borderTopLeftRadius: 4,
  },
  userTextContainer: {
    backgroundColor: '#4ae383',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  botMessageText: {
    color: '#333',
  },
  userMessageText: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    fontSize: 16,
    minHeight: 45,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#4ae383',
    borderRadius: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    height: 45,
  },
  sendButtonDisabled: {
    backgroundColor: '#b0d0c4',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#ffcdd2',
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    fontSize: 14,
  },
  botAvatarError: {
    backgroundColor: '#e74c3c',
  },
  botTextContainerError: {
    backgroundColor: '#ffebee',
    borderTopLeftRadius: 4,
  },
  botMessageTextError: {
    color: '#d32f2f',
  },
  networkWarning: {
    backgroundColor: '#fff3cd',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ffeeba',
  },
  networkWarningText: {
    color: '#856404',
    textAlign: 'center',
    fontSize: 14,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  copyButton: {
    backgroundColor: '#4ae383',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginBottom: 5,
  },
  copyButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  jsonScrollView: {
    maxHeight: 500,
    width: '100%',
  },
  jsonText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  extractedContentContainer: {
    marginBottom: 10,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4ae383',
  },
  extractedContentTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  extractedContent: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
  },
  separator: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 10,
  },
  rawJsonTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  cleanContent: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
  },
});
