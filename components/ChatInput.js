import React, { useState } from 'react';
import { 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  TextInput, 
  ActivityIndicator,
  View 
} from 'react-native';
import { Button } from 'react-native-paper';

const ChatInput = ({ onSendMessage, loading }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() === '') return;
    
    onSendMessage(message);
    setMessage('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={styles.container}
    >
      <View style={styles.inputContainer}>
        <View style={styles.textInputContainer}>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Type your message here..."
            placeholderTextColor="#888"
            multiline={true}
            maxHeight={100}
            blurOnSubmit={false}
            editable={!loading}
          />
        </View>
        <Button
          mode="contained"
          onPress={handleSend}
          loading={loading}
          disabled={message.trim() === '' || loading}
          style={styles.sendButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          buttonColor={message.trim() === '' || loading ? '#b0d0c4' : '#4ae383'}
        >
          Send
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'flex-end',
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 8,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 45,
    color: '#333',
  },
  sendButton: {
    borderRadius: 20,
    minWidth: 60,
  },
  buttonContent: {
    height: 45,
    paddingHorizontal: 12,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  }
});

export default ChatInput; 