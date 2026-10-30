import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';
import { ChatMessage } from '../../types';
import { ChatBubbleSkeleton } from '../../components/common/Skeleton';

export const CustomerChatScreen = ({ route }: any) => {
  const { orderId, orderNumber } = route.params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const flatListRef = useRef<FlatList>(null);

  const fetchChat = async () => {
    try {
      const res = await api.getCustomerChat(orderId);
      if (res?.data) {
        const msgList = Array.isArray(res.data) ? res.data : (res.data.messages || []);
        setMessages(msgList);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChat();
    // Poll chat every 5 seconds for new rider messages
    const interval = setInterval(fetchChat, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  const handleSendMessage = async () => {
    const text = inputMsg.trim();
    if (!text || sending) return;

    setInputMsg('');
    setSending(true);

    try {
      await api.sendCustomerMessage(orderId, text);
      fetchChat();
    } catch {
      setInputMsg(text);
    } finally {
      setSending(false);
    }
  };

  const renderBubble = ({ item }: { item: ChatMessage }) => {
    const isMe = item.sender === 'CUSTOMER';
    return (
      <View
        style={[
          styles.bubbleWrapper,
          isMe ? styles.bubbleWrapperMe : styles.bubbleWrapperOther,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
          ]}
        >
          <Text style={[styles.bubbleSender, isMe ? styles.senderMe : styles.senderOther]}>
            {isMe ? 'You' : '🚴 Delivery Partner'}
          </Text>
          <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
            {item.message}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.topInfoBar}>
        <Text style={styles.topOrderTag}>Order #{orderNumber}</Text>
        <Text style={styles.topNotice}>Direct line with your assigned delivery partner</Text>
      </View>

      {loading ? (
        <ChatBubbleSkeleton />
      ) : messages.length === 0 ? (
        <View style={styles.emptyChat}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>Need help with your delivery?</Text>
          <Text style={styles.emptySub}>
            Send a message to your delivery partner regarding location or directions.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderBubble}
          keyExtractor={(item, index) => item.id || String(index)}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* Input Row */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Type directions or message..."
          placeholderTextColor={Colors.muted}
          value={inputMsg}
          onChangeText={setInputMsg}
          onSubmitEditing={handleSendMessage}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputMsg.trim() && styles.sendBtnDisabled]}
          onPress={handleSendMessage}
          disabled={!inputMsg.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendIcon}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FA',
  },
  topInfoBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  topOrderTag: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.dark,
  },
  topNotice: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 2,
  },
  messageList: {
    padding: 16,
    paddingBottom: 20,
  },
  bubbleWrapper: {
    marginBottom: 10,
    flexDirection: 'row',
  },
  bubbleWrapperMe: {
    justifyContent: 'flex-end',
  },
  bubbleWrapperOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  bubbleSender: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
  },
  senderMe: {
    color: '#D1FAE5',
  },
  senderOther: {
    color: Colors.primaryDark,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: '#FFFFFF',
  },
  bubbleTextOther: {
    color: Colors.dark,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  textInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#F2F2F7',
    borderRadius: 21,
    paddingHorizontal: 16,
    fontSize: 14,
    color: Colors.dark,
    marginRight: 10,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.muted,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.dark,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
