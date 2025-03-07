import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Avatar, ActivityIndicator, Button, IconButton } from 'react-native-paper';
import SQLResultChart from '../services/SQLResultChart';

const ChatMessage = ({ message, isLastBotMessage = false, onRegenerateMessage }) => {
  const isBot = message.sender === 'bot';
  const isError = message.error === true;
  
  // If this is a bot message with SQL chart data, we'll render two separate bubbles
  if (isBot && message.sqlChartData && !message.loading) {
    return (
      <>
        {/* First bubble with description */}
        {message.extractedContent && (
          <View style={[styles.messageRow, { marginTop: 16, marginBottom: 8 }]}>
            <Avatar.Text 
              size={40} 
              label={isError ? "!" : "G"} 
              style={{ backgroundColor: isError ? "#e74c3c" : "#4ae383" }}
              labelStyle={{ color: 'white' }}
            />
            <View style={[
              styles.messageBubble,
              styles.botBubble,
              isError && styles.errorBubble
            ]}>
              <Text style={styles.messageText}>
                {message.extractedContent}
              </Text>
            </View>
          </View>
        )}
        
        {/* Second bubble with chart only */}
        <View style={[styles.messageRow, { marginBottom: 16, marginTop: message.extractedContent ? 0 : 12 }]}>
          <View style={{ width: 40, opacity: 0 }} />
          <View style={[
            styles.messageBubble,
            styles.botBubble,
            { marginLeft: 8 }
          ]}>
            <SQLResultChart 
              data={message.sqlChartData}
              error={message.sqlError}
            />
          </View>
        </View>
        
        {/* Regenerate button for last bot message */}
        {isLastBotMessage && (
          <View style={styles.regenerateContainer}>
            <IconButton
              icon="refresh"
              size={16}
              onPress={onRegenerateMessage}
              style={styles.regenerateButton}
              iconColor="#666"
            />
          </View>
        )}
      </>
    );
  }
  
  // Standard message rendering for non-SQL or loading messages
  return (
    <View style={styles.messageContainer}>
      <View style={[
        styles.messageRow,
        isBot ? styles.botMessageContainer : styles.userMessageContainer
      ]}>
        {isBot && (
          <Avatar.Text 
            size={40} 
            label={isError ? "!" : "G"} 
            style={{ backgroundColor: isError ? "#e74c3c" : "#4ae383" }}
            labelStyle={{ color: 'white' }}
          />
        )}
        <View style={[
          styles.messageBubble,
          isBot ? styles.botBubble : styles.userBubble,
          isError && styles.errorBubble
        ]}>
          {message.loading ? (
            <ActivityIndicator animating={true} color="#4ae383" size={24} />
          ) : (
            <Text style={[
              styles.messageText,
              isBot ? styles.botText : styles.userText
            ]}>
              {isBot ? (message.extractedContent || message.text) : message.text}
            </Text>
          )}
        </View>
      </View>
      
      {/* Regenerate button for last bot message */}
      {isBot && isLastBotMessage && !message.loading && (
        <View style={styles.regenerateContainer}>
          <IconButton
            icon="refresh"
            size={16}
            onPress={onRegenerateMessage}
            style={styles.regenerateButton}
            iconColor="#666"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 8,
    width: '100%',
  },
  botMessageContainer: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    width: '100%',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 20,
    maxWidth: '85%',
  },
  botBubble: {
    backgroundColor: '#e5e5ea',
    borderTopLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#4ae383',
    borderTopRightRadius: 4,
    marginLeft: 'auto',
  },
  errorBubble: {
    backgroundColor: '#ffebee',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  botText: {
    color: '#333',
  },
  userText: {
    color: '#fff',
  },
  regenerateContainer: {
    alignSelf: 'flex-start',
    marginLeft: 48, // Align with bot messages
    marginTop: -4,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  regenerateButton: {
    margin: 0,
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
    borderColor: '#dddddd',
    borderWidth: 0.5,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
});

export default ChatMessage; 