import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  StatusBar,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { api } from '../../services/api';
import { ChatMessage } from '../../types';

const QUICK_RESPONSES = [
  'On my way! ETA 5-10 mins',
  'I have reached your doorstep',
  'Please share landmark / floor',
  'Calling the doorbell',
];

export const DeliveryChatScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { orderId, orderNumber, customerName: initialCustomerName } = route.params;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [customerName, setCustomerName] = useState<string>(initialCustomerName || 'Customer');
  const [inputMsg, setInputMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardOpen(true);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardOpen(false);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const fetchChat = useCallback(async () => {
    try {
      const res = await api.getRiderChat(orderId);
      if (res?.data) {
        const data = res.data;
        const msgList = Array.isArray(data) ? data : (data.messages || []);
        setMessages(msgList);
        if (data.customer?.name) {
          setCustomerName(data.customer.name);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchChat();
    // Live polling every 4 seconds
    const interval = setInterval(fetchChat, 4000);
    return () => clearInterval(interval);
  }, [fetchChat]);

  const handleSendMessage = async (customText?: string) => {
    const text = (customText || inputMsg).trim();
    if (!text || sending) return;

    if (!customText) setInputMsg('');
    setSending(true);

    try {
      await api.sendRiderMessage(orderId, text);
      fetchChat();
    } catch {
      if (!customText) setInputMsg(text);
    } finally {
      setSending(false);
    }
  };

  const renderBubble = ({ item }: { item: any }) => {
    const isRider = item.sender === 'DELIVERY_PERSON' || item.senderRole === 'DELIVERY_PERSON';
    const timeStr = item.createdAt
      ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <View
        style={[
          styles.bubbleWrapper,
          isRider ? styles.bubbleWrapperMe : styles.bubbleWrapperOther,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isRider ? styles.bubbleMe : styles.bubbleOther,
          ]}
        >
          <Text style={[styles.bubbleSender, isRider ? styles.senderMe : styles.senderOther]}>
            {isRider ? 'You (Rider)' : customerName}
          </Text>
          <Text style={[styles.bubbleText, isRider ? styles.bubbleTextMe : styles.bubbleTextOther]}>
            {item.message}
          </Text>
          {timeStr ? (
            <Text style={[styles.bubbleTime, isRider ? styles.timeMe : styles.timeOther]}>
              {timeStr}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  const targetOrderNum = orderNumber || String(orderId).slice(-6).toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="chevron-left" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {customerName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{customerName}</Text>
          <View style={styles.headerSubRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.headerSub}>Order #{targetOrderNum} · Customer Chat</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 48 : 0}
      >
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loaderText}>Connecting to chat...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <View style={styles.emptyIconCircle}>
              <Feather name="message-square" size={26} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Direct Line with Customer</Text>
            <Text style={styles.emptySub}>
              Use chat to notify the customer about delivery ETA or request landmark details.
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
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Quick Response Chips */}
        <View style={styles.chipsRow}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={QUICK_RESPONSES}
            keyExtractor={(item, idx) => String(idx)}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.chip}
                activeOpacity={0.75}
                onPress={() => handleSendMessage(item)}
              >
                <Text style={styles.chipText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Input Bar */}
        <View style={[styles.inputContainer, { paddingBottom: isKeyboardOpen ? 8 : Math.max(insets.bottom, 10) }]}>
          <TextInput
            style={styles.textInput}
            placeholder="Type message to customer..."
            placeholderTextColor="#94A3B8"
            value={inputMsg}
            onChangeText={setInputMsg}
            onSubmitEditing={() => handleSendMessage()}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputMsg.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => handleSendMessage()}
            disabled={!inputMsg.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="send" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    paddingRight: 8,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 9,
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
  },
  messageList: {
    padding: 14,
    paddingBottom: 16,
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
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bubbleSender: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 3,
  },
  senderMe: {
    color: '#D1FAE5',
  },
  senderOther: {
    color: Colors.primary,
  },
  bubbleText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  bubbleTextMe: {
    color: '#FFFFFF',
  },
  bubbleTextOther: {
    color: '#0F172A',
  },
  bubbleTime: {
    fontSize: 9.5,
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  timeMe: {
    color: '#D1FAE5',
  },
  timeOther: {
    color: '#94A3B8',
  },
  chipsRow: {
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  textInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#0F172A',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748B',
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
