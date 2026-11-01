import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Keyboard,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';

const ISSUE_TYPES = [
  {
    id: 'Order issue',
    title: 'Order issue',
    hindi: 'ऑर्डर समस्या',
    desc: 'Wrong items, packaging damage, or cancel request',
    descHi: 'गलत सामान, पैकिंग क्षति या रद्द करने का अनुरोध',
    icon: 'package',
  },
  {
    id: 'Payment issue',
    title: 'Payment issue',
    hindi: 'पेमेंट समस्या',
    desc: 'Money deducted, failed transactions, refund status',
    descHi: 'पैसे कटे, असफल लेनदेन या रिफंड की स्थिति',
    icon: 'credit-card',
  },
  {
    id: 'Delivery issue',
    title: 'Delivery issue',
    hindi: 'डिलीवरी समस्या',
    desc: 'Delivery delay, rider tracking, or location assistance',
    descHi: 'डिलीवरी में देरी, राइडर ट्रैकिंग या पता सहायता',
    icon: 'truck',
  },
  {
    id: 'Product issue',
    title: 'Product issue',
    hindi: 'प्रोडक्ट / क्वालिटी समस्या',
    desc: 'Expired, missing, or poor quality grocery items',
    descHi: 'खराब, गायब या गुणवत्ता संबंधित शिकायतें',
    icon: 'shopping-bag',
  },
  {
    id: 'General query',
    title: 'General query',
    hindi: 'सामान्य पूछताछ',
    desc: 'Store timings, delivery zones, or general questions',
    descHi: 'स्टोर का समय, डिलीवरी क्षेत्र या सामान्य प्रश्न',
    icon: 'message-circle',
  },
  {
    id: 'Suggestions',
    title: 'Suggestions',
    hindi: 'सुझाव व फीडबैक',
    desc: 'Recommend new products or help improve our service',
    descHi: 'नए उत्पादों का सुझाव दें या सेवा बेहतर बनाने में मदद करें',
    icon: 'zap',
  },
] as const;

type IssueType = (typeof ISSUE_TYPES)[number]['id'];

const COMMON_ISSUE_REASONS: Record<IssueType, Array<{ title: string; hindi: string }>> = {
  'Order issue': [
    { title: 'Item missing from order', hindi: 'सामान गायब है' },
    { title: 'Wrong items delivered', hindi: 'गलत सामान मिला' },
    { title: 'Packaging damaged / leaking', hindi: 'पैकेट क्षतिग्रस्त या फटा हुआ' },
    { title: 'Order cancelled by mistake', hindi: 'गलती से ऑर्डर रद्द हुआ' },
  ],
  'Payment issue': [
    { title: 'Money deducted twice', hindi: 'दो बार पैसे कटे' },
    { title: 'Refund not credited', hindi: 'रिफंड नहीं मिला' },
    { title: 'Payment failed but charged', hindi: 'भुगतान विफल पर पैसे कटे' },
    { title: 'Coupon / Offer not applied', hindi: 'ऑफर लागू नहीं हुआ' },
  ],
  'Delivery issue': [
    { title: 'Delivery is delayed', hindi: 'डिलीवरी में बहुत देरी है' },
    { title: 'Rider is unreachable', hindi: 'राइडर से संपर्क नहीं हो रहा' },
    { title: 'Delivered to wrong address', hindi: 'गलत पते पर डिलीवरी' },
    { title: 'Rider was unprofessional', hindi: 'राइडर का अनुचित व्यवहार' },
  ],
  'Product issue': [
    { title: 'Expired product received', hindi: 'एक्सपायर सामान मिला' },
    { title: 'Poor vegetable / fruit quality', hindi: 'सब्जी या फल खराब है' },
    { title: 'Broken seal / contaminated', hindi: 'सील टूटी हुई है' },
    { title: 'Weight or quantity mismatch', hindi: 'मात्रा या वजन कम है' },
  ],
  'General query': [
    { title: 'Store timings inquiry', hindi: 'दुकान खुलने का समय' },
    { title: 'Delivery area serviceability', hindi: 'डिलीवरी क्षेत्र की जानकारी' },
    { title: 'Account / Login assistance', hindi: 'खाता या लॉगिन मदद' },
    { title: 'Bulk order inquiry', hindi: 'थोक ऑर्डर सहायता' },
  ],
  'Suggestions': [
    { title: 'Suggest a new product', hindi: 'नया उत्पाद सुझाव' },
    { title: 'App feature feedback', hindi: 'ऐप सुधार सुझाव' },
    { title: 'Packaging improvement', hindi: 'पैकिंग सुधार सुझाव' },
    { title: 'Delivery experience feedback', hindi: 'डिलीवरी अनुभव सुझाव' },
  ],
};

const FAQS = [
  {
    q: 'How quickly will my order arrive?',
    qHi: 'मेरा ऑर्डर कितनी जल्दी पहुंचेगा?',
    a: 'Most orders arrive within 10-30 minutes across Hathua and nearby areas, depending on live order demand.',
    aHi: 'हथुआ और आसपास के क्षेत्रों में अधिकांश ऑर्डर 10-30 मिनट के भीतर तुरंत डिलीवर हो जाते हैं।',
  },
  {
    q: 'Can I change an order after placing it?',
    qHi: 'क्या मैं ऑर्डर देने के बाद उसमें बदलाव कर सकता हूँ?',
    a: 'Contact support immediately via this page. Changes are possible until the store starts packing your bag.',
    aHi: 'तुरंत सपोर्ट से संपर्क करें। जब तक स्टोर पैकिंग शुरू नहीं करता तब तक बदलाव संभव है।',
  },
  {
    q: 'What if an item is missing or damaged?',
    qHi: 'अगर कोई सामान गायब या खराब निकले तो क्या करें?',
    a: 'Raise a product issue ticket with details and our team will review and issue an instant replacement or refund.',
    aHi: 'प्रोडक्ट इशू टिकट दर्ज करें, हमारी टीम तुरंत समीक्षा कर प्रतिस्थापन या रिफंड प्रदान करेगी।',
  },
  {
    q: 'How do refunds work?',
    qHi: 'रिफंड कैसे काम करता है?',
    a: 'Approved refunds return to the original payment source or UPI within 5-7 business days.',
    aHi: 'स्वीकृत रिफंड 5-7 कार्य दिवसों में आपके मूल बैंक खाते या यूपीआई में वापस जमा हो जाते हैं।',
  },
];

const ORDER_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  DELIVERED: { label: 'Delivered', color: '#059669', bg: '#D1FAE5' },
  COMPLETED: { label: 'Completed', color: '#059669', bg: '#D1FAE5' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: '#0284C7', bg: '#E0F2FE' },
  IN_TRANSIT: { label: 'In Transit', color: '#0284C7', bg: '#E0F2FE' },
  PACKING: { label: 'Packing', color: '#D97706', bg: '#FEF3C7' },
  CONFIRMED: { label: 'Confirmed', color: '#D97706', bg: '#FEF3C7' },
  NEW: { label: 'Placed', color: '#7C3AED', bg: '#EDE9FE' },
  CANCELLED: { label: 'Cancelled', color: '#DC2626', bg: '#FEE2E2' },
  FAILED: { label: 'Failed', color: '#DC2626', bg: '#FEE2E2' },
};

const TICKET_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Open', color: '#D97706', bg: '#FEF3C7' },
  PENDING: { label: 'Pending', color: '#2563EB', bg: '#DBEAFE' },
  RESOLVED: { label: 'Resolved', color: '#059669', bg: '#D1FAE5' },
};

export const SupportScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { notify } = useToast();
  const { lang, setLang } = useLanguage();
  const isHindi = lang === 'hi';

  const scrollRef = useRef<any>(null);
  const formScrollRef = useRef<any>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  // Keyboard listener for modal scrolling
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardOpen(true);
        if (e.endCoordinates?.height) {
          setKeyboardHeight(e.endCoordinates.height);
        }
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardOpen(false);
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Initial params
  const paramCategory = route?.params?.defaultCategory;
  const paramSubject = route?.params?.defaultSubject || (route?.params?.orderId ? `Issue with Order #${route.params.orderId}` : '');
  const paramMessage = route?.params?.defaultMessage || '';
  const paramOrderId = route?.params?.orderId || null;

  // Form State
  const [issueType, setIssueType] = useState<IssueType>('Order issue');
  const [orderId, setOrderId] = useState<string | null>(paramOrderId);
  const [subject, setSubject] = useState<string>(paramSubject);
  const [description, setDescription] = useState<string>(paramMessage);
  const [mobile, setMobile] = useState<string>(user?.mobile || '');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [isCustomReason, setIsCustomReason] = useState<boolean>(false);
  const [editMobile, setEditMobile] = useState<boolean>(false);

  // Modal / Dropdown state
  const [ticketModalVisible, setTicketModalVisible] = useState<boolean>(false);
  const [issuePickerOpen, setIssuePickerOpen] = useState<boolean>(false);
  const [orderPickerOpen, setOrderPickerOpen] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<'mobile' | 'subject' | 'desc' | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<'all' | 'tickets'>('all');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [sentTicket, setSentTicket] = useState<any | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Sync route params if changed
  useEffect(() => {
    if (paramSubject) {
      setSubject(paramSubject);
    }
    if (paramMessage) setDescription(paramMessage);
    if (paramOrderId) setOrderId(paramOrderId);
    if (paramCategory) {
      const match = ISSUE_TYPES.find(i => i.title.toLowerCase().includes(paramCategory.toLowerCase()));
      if (match) {
        setIssueType(match.id);
        setTicketModalVisible(true);
      }
    }
  }, [paramSubject, paramMessage, paramOrderId, paramCategory]);

  useEffect(() => {
    if (user?.mobile && !mobile) {
      setMobile(user.mobile);
    }
  }, [user?.mobile]);

  // Load customer tickets from backend GET /support
  const loadTickets = useCallback(async () => {
    if (!user) {
      setTickets([]);
      return;
    }
    try {
      const res = await api.getSupportTickets();
      if (res?.data) {
        setTickets(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err: any) {
      console.warn('Could not load tickets:', err.message);
    }
  }, [user]);

  // Load customer orders from backend GET /orders
  const loadOrders = useCallback(async () => {
    if (!user) {
      setUserOrders([]);
      return;
    }
    try {
      const res = await api.getOrders();
      if (res?.data) {
        setUserOrders(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err: any) {
      console.warn('Could not load orders for support:', err.message);
    }
  }, [user]);

  const loadAllData = useCallback(async () => {
    await Promise.all([loadTickets(), loadOrders()]);
    setLoading(false);
    setRefreshing(false);
  }, [loadTickets, loadOrders]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // Click on any of the 6 cards opens the Ticket Raise Form
  const handleCardClick = (type: IssueType) => {
    setIssueType(type);
    setSentTicket(null);
    setIssuePickerOpen(false);
    setOrderPickerOpen(false);

    if (user?.mobile && !mobile) {
      setMobile(user.mobile);
    }

    setTicketModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!user) {
      notify(
        isHindi ? 'सपोर्ट टिकट दर्ज करने के लिए कृपया साइन इन करें।' : 'Please sign in to raise a support ticket.',
        'error'
      );
      return;
    }

    const trimmedSubject = subject.trim();
    const trimmedDesc = description.trim();
    const cleanMobile = (mobile || user?.mobile || '').replace(/\D/g, '');

    if (!issueType) {
      notify(
        isHindi ? 'कृपया समस्या का प्रकार चुनें।' : 'Please select an issue type.',
        'error'
      );
      return;
    }

    if (trimmedSubject.length < 4) {
      notify(
        isHindi ? 'कृपया कम से कम 4 अक्षरों का विषय लिखें।' : 'Please briefly describe the issue (minimum 4 characters).',
        'error'
      );
      return;
    }

    if (trimmedDesc.length < 10) {
      notify(
        isHindi
          ? 'कृपया विवरण में कम से कम 10 अक्षर लिखें।'
          : 'Please enter at least 10 characters in description.',
        'error'
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        issueType,
        orderId: orderId || null,
        subject: trimmedSubject,
        description: trimmedDesc,
      };
      if (cleanMobile.length === 10) {
        payload.mobile = cleanMobile;
      }

      const res = await api.createSupportTicket(payload);
      const ticket = res?.data || { ticketNumber: 'TKT-NEW' };
      setSentTicket(ticket);
      setSubject('');
      setDescription('');
      notify(isHindi ? `टिकट ${ticket.ticketNumber} दर्ज हुआ` : `Ticket ${ticket.ticketNumber} submitted`, 'success');
      await loadTickets();
    } catch (err: any) {
      Alert.alert(isHindi ? 'त्रुटि' : 'Submission Failed', err.message || (isHindi ? 'टिकट दर्ज करने में विफल' : 'Could not submit support ticket'));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedIssueObj = ISSUE_TYPES.find(i => i.id === issueType) || ISSUE_TYPES[0];
  const selectedOrderObj = userOrders.find(o => o.id === orderId);

  const renderTicketsCard = (isFullView: boolean = false) => {
    if (!user) {
      if (!isFullView) return null;
      return (
        <View style={styles.cardContainer}>
          <View style={styles.guestNoticeBox}>
            <View style={styles.guestIconCircle}>
              <Feather name="user-check" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.guestNoticeTitle}>
              {isHindi ? 'साइन इन आवश्यक है' : 'Sign In Required'}
            </Text>
            <Text style={styles.guestNoticeText}>
              {isHindi
                ? 'अपने पूर्व टिकट और सपोर्ट रिप्लाई देखने के लिए साइन इन करें।'
                : 'Please sign in to view your submitted support tickets and replies.'}
            </Text>
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={() => navigation.navigate('CustomerLogin')}
              activeOpacity={0.85}
            >
              <Text style={styles.signInBtnText}>{isHindi ? 'साइन इन करें' : 'Sign In'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.cardContainer}>
        <View style={styles.cardTitleRow}>
          <Feather name="inbox" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.cardHeading}>
            {isHindi ? 'हालिया टिकट' : 'Recent Tickets'}
          </Text>
          {loading && <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 'auto' }} />}
        </View>

        {tickets.length === 0 ? (
          <View style={styles.emptyTickets}>
            <View style={styles.emptyTicketsIcon}>
              <Feather name="check-circle" size={24} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTicketsTitle}>
              {isHindi ? 'कोई ओपन टिकट नहीं है' : 'No support tickets raised yet'}
            </Text>
            <Text style={styles.emptyTicketsSub}>
              {isHindi
                ? 'यदि किसी ऑर्डर या डिलीवरी में परेशानी हो, तो ऊपर दिए गए कार्ड पर क्लिक करके टिकट दर्ज करें।'
                : 'When you submit a ticket, its real-time progress and replies will appear here.'}
            </Text>
          </View>
        ) : (
          tickets.map(ticket => {
            const statusInfo = TICKET_STATUS_MAP[ticket.status] || {
              label: ticket.status || 'Open',
              color: '#64748B',
              bg: '#F1F5F9',
            };
            return (
              <View key={ticket.id} style={styles.ticketRowItem}>
                <View style={styles.ticketTopRow}>
                  <View style={styles.ticketNumberBadge}>
                    <Text style={styles.ticketNumberText}>{ticket.ticketNumber || `TKT-${ticket.id.slice(0, 6)}`}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                  </View>
                </View>

                <Text style={styles.ticketSubjectText}>{ticket.subject}</Text>
                {ticket.description ? (
                  <Text style={styles.ticketDescText} numberOfLines={2}>
                    {ticket.description}
                  </Text>
                ) : null}

                {ticket.messages && ticket.messages.length > 0 && (
                  <View style={styles.replyBubble}>
                    <View style={styles.replyHeader}>
                      <Feather name="corner-down-right" size={12} color="#059669" style={{ marginRight: 4 }} />
                      <Text style={styles.replyAuthor}>
                        {isHindi ? 'सपोर्ट टीम का उत्तर:' : 'Latest Reply from Support Team:'}
                      </Text>
                    </View>
                    <Text style={styles.replyContent}>
                      {ticket.messages[ticket.messages.length - 1]?.message}
                    </Text>
                  </View>
                )}

                <View style={styles.ticketFooter}>
                  <Text style={styles.ticketDateText}>
                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }) : ''}
                  </Text>
                  {ticket.issueType && (
                    <View style={styles.ticketTypeBadge}>
                      <Text style={styles.ticketTypeTag}>{ticket.issueType}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Bar with Back Button & Language Pill */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isHindi ? 'हेल्प व सपोर्ट' : 'Help & Support'}</Text>
        </View>

        <View style={styles.langSwitch}>
          <TouchableOpacity
            style={[styles.langBtn, !isHindi && styles.langBtnActive]}
            onPress={() => setLang('en')}
            activeOpacity={0.8}
          >
            <Text style={[styles.langText, !isHindi && styles.langTextActive]}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, isHindi && styles.langBtnActive]}
            onPress={() => setLang('hi')}
            activeOpacity={0.8}
          >
            <Text style={[styles.langText, isHindi && styles.langTextActive]}>हिं</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        >
          {/* 2. Top Segmented Capsules: "FAQs & Support" & "Recent Tickets" */}
          <View style={styles.capsuleRow}>
            <TouchableOpacity
              style={[styles.capsuleBtn, activeTab === 'all' && styles.capsuleBtnActive]}
              onPress={() => setActiveTab('all')}
              activeOpacity={0.8}
            >
              <Text style={[styles.capsuleText, activeTab === 'all' && styles.capsuleTextActive]}>
                {isHindi ? 'सवाल व सहायता' : 'FAQs & Support'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.capsuleBtn, activeTab === 'tickets' && styles.capsuleBtnActive]}
              onPress={() => setActiveTab('tickets')}
              activeOpacity={0.8}
            >
              <Text style={[styles.capsuleText, activeTab === 'tickets' && styles.capsuleTextActive]}>
                {isHindi ? 'हालिया टिकट' : 'Recent Tickets'}
              </Text>
              {tickets.length > 0 && (
                <View style={[styles.capsuleBadge, activeTab === 'tickets' && styles.capsuleBadgeActive]}>
                  <Text style={[styles.capsuleBadgeText, activeTab === 'tickets' && styles.capsuleBadgeTextActive]}>
                    {tickets.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {activeTab === 'all' ? (
            <>
              {/* 3. 6 Interactive Issue Cards: Clicking ANY card opens the Ticket Form Sheet */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>
                  {isHindi ? 'समस्या का प्रकार चुनें' : 'What do you need help with?'}
                </Text>
                <Text style={styles.sectionSubHeading}>
                  {isHindi ? 'टिकट दर्ज करने के लिए कार्ड पर क्लिक करें' : 'Tap any category below to raise a ticket'}
                </Text>
              </View>

              <View style={styles.issueGrid}>
                {ISSUE_TYPES.map(item => {
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.issueCard}
                      onPress={() => handleCardClick(item.id)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.issueIconWrap}>
                        <Feather
                          name={item.icon as any}
                          size={19}
                          color={Colors.primary}
                        />
                      </View>
                      <Text style={styles.issueCardTitle}>
                        {isHindi ? item.hindi : item.title}
                      </Text>
                      <View style={styles.issueLinkRow}>
                        <Text style={styles.issueLinkText}>
                          {isHindi ? 'टिकट खोलें' : 'Raise ticket'}
                        </Text>
                        <Feather
                          name="arrow-right"
                          size={11}
                          color="#059669"
                          style={{ marginLeft: 3 }}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 4. Quick Action Button to Open Ticket Form Directly */}
              <TouchableOpacity
                style={styles.openTicketBar}
                onPress={() => handleCardClick('General query')}
                activeOpacity={0.8}
              >
                <View style={styles.openTicketBarLeft}>
                  <View style={styles.openTicketIconWrap}>
                    <Feather name="message-square" size={17} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.openTicketBarTitle}>
                      {isHindi ? 'सीधे सपोर्ट टिकट दर्ज करें' : 'Raise a Support Ticket Directly'}
                    </Text>
                    <Text style={styles.openTicketBarSub}>
                      {isHindi ? 'हमारी टीम 4 घंटे के भीतर संपर्क करेगी' : 'Our team will respond within 4 working hours'}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color="#059669" />
              </TouchableOpacity>

              {/* 5. Frequently Asked Questions (Accordion) */}
              <View style={styles.cardContainer}>
                <View style={styles.cardTitleRow}>
                  <Feather name="help-circle" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.cardHeading}>
                    {isHindi ? 'अक्सर पूछे जाने वाले सवाल' : 'Frequently Asked Questions'}
                  </Text>
                </View>
                {FAQS.map((faq, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.faqItem, idx === FAQS.length - 1 && { borderBottomWidth: 0 }]}
                      onPress={() => setOpenFaq(isOpen ? null : idx)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.faqHeaderRow}>
                        <Text style={[styles.faqQuestion, isOpen && styles.faqQuestionActive]}>
                          {isHindi ? faq.qHi : faq.q}
                        </Text>
                        <View style={[styles.faqChevronWrap, isOpen && styles.faqChevronWrapActive]}>
                          <Feather
                            name={isOpen ? 'chevron-up' : 'chevron-down'}
                            size={15}
                            color={isOpen ? Colors.primaryDark : '#64748B'}
                          />
                        </View>
                      </View>
                      {isOpen && (
                        <Text style={styles.faqAnswer}>
                          {isHindi ? faq.aHi : faq.a}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 6. Live Backend: Recent Support Tickets (Preview) */}
              {user && tickets.length > 0 && renderTicketsCard(false)}
            </>
          ) : (
            <View>
              {renderTicketsCard(true)}
              <TouchableOpacity
                style={styles.switchRaiseBtn}
                onPress={() => handleCardClick('General query')}
                activeOpacity={0.85}
              >
                <Feather name="plus-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.switchRaiseBtnText}>
                  {isHindi ? 'नया टिकट दर्ज करें' : 'Raise a New Ticket'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ========================================================
          PRODUCTION SLIDE-UP BOTTOM SHEET: RAISE SUPPORT TICKET FORM
          (Neat, clean, next-level UI design)
          ======================================================== */}
      <Modal
        visible={ticketModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          Keyboard.dismiss();
          setTicketModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          {/* Backdrop Touch Dismiss */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setTicketModalVisible(false);
            }}
          >
            <View style={styles.modalBackdropBg} />
          </TouchableOpacity>

          <View
            style={[
              styles.modalSheetCard,
              {
                paddingBottom: Math.max(insets.bottom, 16),
                height: isKeyboardOpen ? Dimensions.get('window').height * 0.88 : undefined,
                maxHeight: Dimensions.get('window').height * 0.90,
              },
            ]}
          >
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            {/* Submitted Success View */}
            {sentTicket ? (
              <View style={styles.successBox}>
                <View style={styles.successIconOuter}>
                  <View style={styles.successIconInner}>
                    <Feather name="check" size={28} color="#059669" />
                  </View>
                </View>

                <Text style={styles.successTitle}>
                  {isHindi ? 'सपोर्ट टिकट दर्ज हो गया!' : 'Ticket Raised Successfully!'}
                </Text>
                <Text style={styles.successSub}>
                  {isHindi
                    ? 'हमारी हथुआ टीम आपके टिकट की समीक्षा कर रही है और जल्द ही समाधान प्रदान करेगी।'
                    : 'Our local Hathua support team is reviewing your ticket and will update you shortly.'}
                </Text>

                <View style={styles.successTicketCard}>
                  <View style={styles.successSummaryRow}>
                    <Text style={styles.successSummaryLabel}>{isHindi ? 'टिकट नंबर:' : 'Ticket ID:'}</Text>
                    <View style={styles.ticketIdPill}>
                      <Text style={styles.ticketIdPillText}>
                        {sentTicket.ticketNumber || `TKT-${sentTicket.id?.slice(0, 6)}`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.successSummaryDivider} />

                  <View style={styles.successSummaryRow}>
                    <Text style={styles.successSummaryLabel}>{isHindi ? 'श्रेणी:' : 'Category:'}</Text>
                    <Text style={styles.successSummaryValue}>{issueType}</Text>
                  </View>

                  {orderId && (
                    <>
                      <View style={styles.successSummaryDivider} />
                      <View style={styles.successSummaryRow}>
                        <Text style={styles.successSummaryLabel}>{isHindi ? 'ऑर्डर:' : 'Linked Order:'}</Text>
                        <Text style={styles.successSummaryValue}>#{selectedOrderObj?.orderNumber || orderId}</Text>
                      </View>
                    </>
                  )}

                  <View style={styles.successSummaryDivider} />

                  <View style={styles.successSummaryRow}>
                    <Text style={styles.successSummaryLabel}>{isHindi ? 'स्थिति:' : 'Status:'}</Text>
                    <View style={styles.openStatusTag}>
                      <Text style={styles.openStatusText}>{isHindi ? 'जाँच जारी है' : 'Under Review'}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.successActionButtons}>
                  <TouchableOpacity
                    style={styles.viewTicketsBtn}
                    onPress={() => {
                      setSentTicket(null);
                      setTicketModalVisible(false);
                      setActiveTab('tickets');
                    }}
                    activeOpacity={0.85}
                  >
                    <Feather name="list" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.viewTicketsBtnText}>
                      {isHindi ? 'हालिया टिकट देखें' : 'View Ticket Status'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.doneBtn}
                    onPress={() => {
                      setSentTicket(null);
                      setTicketModalVisible(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.doneBtnText}>
                      {isHindi ? 'बंद करें' : 'Done'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <ScrollView
                ref={formScrollRef}
                style={isKeyboardOpen ? { flex: 1 } : { flexGrow: 0, flexShrink: 1 }}
                contentContainerStyle={{
                  paddingBottom: isKeyboardOpen ? Math.max(keyboardHeight, 280) + 40 : 24,
                }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
                bounces={false}
              >
                {/* Header Row: "Raise a support ticket" + Dismiss X */}
                <View style={styles.formHeaderRow}>
                  <Text style={styles.formMainHeading}>
                    {isHindi ? 'सपोर्ट टिकट दर्ज करें' : 'Raise a support ticket'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      setTicketModalVisible(false);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.formCloseBtn}
                    activeOpacity={0.7}
                  >
                    <Feather name="x" size={20} color="#4B5563" />
                  </TouchableOpacity>
                </View>

                {/* 1. Issue type */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {isHindi ? 'समस्या का प्रकार' : 'Issue type'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.dropdownSelectBox, issuePickerOpen && styles.dropdownSelectBoxActive]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setIssuePickerOpen(true);
                      setOrderPickerOpen(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.dropdownSelectText, !issueType && styles.dropdownSelectPlaceholder]}>
                      {issueType || (isHindi ? 'समस्या चुनें' : 'Select an issue')}
                    </Text>
                    <Feather name="chevron-down" size={18} color="#4B5563" />
                  </TouchableOpacity>
                </View>

                {/* 2. Related order */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {isHindi ? 'संबंधित ऑर्डर' : 'Related order'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.dropdownSelectBox, orderPickerOpen && styles.dropdownSelectBoxActive]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setOrderPickerOpen(true);
                      setIssuePickerOpen(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.dropdownSelectText} numberOfLines={1}>
                      {selectedOrderObj
                        ? `#${selectedOrderObj.orderNumber || selectedOrderObj.id} - ₹${selectedOrderObj.grandTotal}`
                        : (isHindi ? 'ऑर्डर से संबंधित नहीं' : 'Not order related')}
                    </Text>
                    <Feather name="chevron-down" size={18} color="#4B5563" />
                  </TouchableOpacity>
                </View>

                {/* 3. Contact mobile number */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {isHindi ? 'संपर्क मोबाइल नंबर' : 'Contact mobile number'}
                  </Text>
                  <View style={[styles.formInputBox, focusedField === 'mobile' && styles.formInputBoxFocused]}>
                    <TextInput
                      style={styles.formInput}
                      value={mobile}
                      onChangeText={setMobile}
                      onFocus={() => setFocusedField('mobile')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="9973942356"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </View>

                {/* 4. Subject */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {isHindi ? 'विषय' : 'Subject'}
                  </Text>
                  <View style={[styles.formInputBox, focusedField === 'subject' && styles.formInputBoxFocused]}>
                    <TextInput
                      style={styles.formInput}
                      value={subject}
                      onChangeText={setSubject}
                      onFocus={() => {
                        setFocusedField('subject');
                        setTimeout(() => {
                          formScrollRef.current?.scrollTo({ y: 150, animated: true });
                        }, 120);
                      }}
                      onBlur={() => setFocusedField(null)}
                      placeholder={isHindi ? 'समस्या का संक्षिप्त विवरण' : 'Briefly describe the issue'}
                      placeholderTextColor="#9CA3AF"
                      maxLength={120}
                    />
                  </View>
                </View>

                {/* 5. Description */}
                <View style={styles.formGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={[styles.formLabel, { marginBottom: 0 }]}>
                      {isHindi ? 'विवरण' : 'Description'}
                    </Text>
                    <Text style={{ fontSize: 11, color: description.trim().length >= 10 ? '#059669' : '#94A3B8', fontWeight: '600' }}>
                      {description.trim().length}/10 {isHindi ? 'अक्षर' : 'min'}
                    </Text>
                  </View>
                  <View style={[styles.formInputBox, styles.formTextareaBox, focusedField === 'desc' && styles.formInputBoxFocused]}>
                    <TextInput
                      style={[styles.formInput, styles.formTextarea]}
                      value={description}
                      onChangeText={setDescription}
                      onFocus={() => {
                        setFocusedField('desc');
                        setTimeout(() => {
                          formScrollRef.current?.scrollToEnd({ animated: true });
                        }, 120);
                      }}
                      onBlur={() => setFocusedField(null)}
                      placeholder={isHindi ? 'कम से कम 10 अक्षरों का विवरण साझा करें...' : 'Share details (minimum 10 characters)...'}
                      placeholderTextColor="#9CA3AF"
                      multiline={true}
                      scrollEnabled={false}
                      textAlignVertical="top"
                      maxLength={2000}
                    />
                  </View>
                </View>

                {/* 6. Submit ticket Button */}
                <TouchableOpacity
                  style={[styles.exactSubmitBtn, submitting && styles.exactSubmitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.88}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.exactSubmitBtnText}>
                      {isHindi ? 'टिकट सबमिट करें' : 'Submit ticket'}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* Dedicated Issue Type Selection Drawer */}
            {issuePickerOpen && (
              <View style={styles.inModalOverlay}>
                <TouchableOpacity
                  style={StyleSheet.absoluteFill}
                  activeOpacity={1}
                  onPress={() => setIssuePickerOpen(false)}
                >
                  <View style={styles.inModalBackdrop} />
                </TouchableOpacity>

                <View style={styles.inModalPickerTray}>
                  <View style={styles.inModalPickerHeader}>
                    <Text style={styles.inModalPickerTitle}>
                      {isHindi ? 'समस्या का प्रकार चुनें' : 'Select Issue Type'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setIssuePickerOpen(false)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.inModalCloseBtn}
                      activeOpacity={0.7}
                    >
                      <Feather name="x" size={18} color="#4B5563" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.pickerScrollView} showsVerticalScrollIndicator={false}>
                    {ISSUE_TYPES.map(item => {
                      const isSel = issueType === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.pickerOptionRow, isSel && styles.pickerOptionRowActive]}
                          onPress={() => {
                            setIssueType(item.id);
                            setIssuePickerOpen(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.pickerOptionIconWrap, isSel && styles.pickerOptionIconWrapActive]}>
                            <Feather name={item.icon as any} size={16} color={isSel ? '#059669' : '#6B7280'} />
                          </View>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={[styles.pickerOptionTitle, isSel && styles.pickerOptionTitleActive]}>
                              {isHindi ? item.hindi : item.title}
                            </Text>
                            <Text style={styles.pickerOptionSub}>
                              {isHindi ? item.descHi : item.desc}
                            </Text>
                          </View>
                          <View style={[styles.pickerRadio, isSel && styles.pickerRadioActive]}>
                            {isSel && <View style={styles.pickerRadioDot} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            )}

            {/* Dedicated Related Order Selection Drawer */}
            {orderPickerOpen && (
              <View style={styles.inModalOverlay}>
                <TouchableOpacity
                  style={StyleSheet.absoluteFill}
                  activeOpacity={1}
                  onPress={() => setOrderPickerOpen(false)}
                >
                  <View style={styles.inModalBackdrop} />
                </TouchableOpacity>

                <View style={styles.inModalPickerTray}>
                  <View style={styles.inModalPickerHeader}>
                    <Text style={styles.inModalPickerTitle}>
                      {isHindi ? 'संबंधित ऑर्डर चुनें' : 'Select Related Order'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setOrderPickerOpen(false)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.inModalCloseBtn}
                      activeOpacity={0.7}
                    >
                      <Feather name="x" size={18} color="#4B5563" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.pickerScrollView} showsVerticalScrollIndicator={false}>
                    {/* Option 1: Not order related */}
                    <TouchableOpacity
                      style={[styles.pickerOptionRow, !orderId && styles.pickerOptionRowActive]}
                      onPress={() => {
                        setOrderId(null);
                        setOrderPickerOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.pickerOptionIconWrap, !orderId && styles.pickerOptionIconWrapActive]}>
                        <Feather name="slash" size={16} color={!orderId ? '#059669' : '#6B7280'} />
                      </View>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.pickerOptionTitle, !orderId && styles.pickerOptionTitleActive]}>
                          {isHindi ? 'ऑर्डर से संबंधित नहीं' : 'Not order related'}
                        </Text>
                        <Text style={styles.pickerOptionSub}>
                          {isHindi ? 'सामान्य पूछताछ या खाता संबंधित समस्या' : 'General query or account assistance'}
                        </Text>
                      </View>
                      <View style={[styles.pickerRadio, !orderId && styles.pickerRadioActive]}>
                        {!orderId && <View style={styles.pickerRadioDot} />}
                      </View>
                    </TouchableOpacity>

                    {/* Live Orders from Backend */}
                    {userOrders.map(order => {
                      const isSel = orderId === order.id;
                      const statusInfo = ORDER_STATUS_MAP[order.status] || {
                        label: order.status,
                        color: '#059669',
                        bg: '#D1FAE5',
                      };
                      return (
                        <TouchableOpacity
                          key={order.id}
                          style={[styles.pickerOptionRow, isSel && styles.pickerOptionRowActive]}
                          onPress={() => {
                            setOrderId(order.id);
                            setOrderPickerOpen(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.pickerOptionIconWrap, isSel && styles.pickerOptionIconWrapActive]}>
                            <Feather name="package" size={16} color={isSel ? '#059669' : '#6B7280'} />
                          </View>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                              <Text style={[styles.pickerOptionTitle, isSel && styles.pickerOptionTitleActive]}>
                                #{order.orderNumber || order.id}
                              </Text>
                              <View style={[styles.orderStatusPill, { backgroundColor: statusInfo.bg }]}>
                                <Text style={[styles.orderStatusPillText, { color: statusInfo.color }]}>
                                  {statusInfo.label}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.pickerOptionSub}>
                              ₹{order.grandTotal} - {order.items?.length || 1} items
                              {order.createdAt ? ` - ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                            </Text>
                          </View>
                          <View style={[styles.pickerRadio, isSel && styles.pickerRadioActive]}>
                            {isSel && <View style={styles.pickerRadioDot} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}

                    {userOrders.length === 0 && (
                      <View style={styles.dropdownEmptyRow}>
                        <Feather name="inbox" size={24} color="#9CA3AF" style={{ marginBottom: 6 }} />
                        <Text style={styles.dropdownEmptyText}>
                          {isHindi ? 'कोई पिछला ऑर्डर नहीं मिला' : 'No previous orders found'}
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  langSwitch: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 7,
    padding: 2,
  },
  langBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  langBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  langText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  langTextActive: {
    color: Colors.primaryDark,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 14,
  },
  // Capsule Tabs
  capsuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  capsuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  capsuleBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  capsuleText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  capsuleTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  capsuleBadge: {
    marginLeft: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  capsuleBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  capsuleBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#059669',
  },
  capsuleBadgeTextActive: {
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  sectionSubHeading: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  // 6 Issue Cards Grid
  issueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
    rowGap: 10,
  },
  issueCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  issueIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  issueCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  issueLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  issueLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  // Open Ticket Direct Bar
  openTicketBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  openTicketBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  openTicketIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  openTicketBarTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  openTicketBarSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  // Card Container with 1px subtle outline
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  // FAQ
  faqItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  faqHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    paddingRight: 10,
  },
  faqQuestionActive: {
    color: Colors.primaryDark,
  },
  faqChevronWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqChevronWrapActive: {
    backgroundColor: '#ECFDF5',
  },
  faqAnswer: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginTop: 6,
  },
  // Exact Clean Form Styles matching user screenshot
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 4,
  },
  formMainHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  formCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 7,
  },
  dropdownSelectBox: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownSelectBoxActive: {
    borderColor: '#10B981',
  },
  dropdownSelectText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  dropdownSelectPlaceholder: {
    color: '#9CA3AF',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 6,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownMenuItemActive: {
    backgroundColor: '#ECFDF5',
  },
  dropdownMenuItemText: {
    fontSize: 13.5,
    color: '#1F2937',
    fontWeight: '600',
  },
  dropdownMenuItemTextActive: {
    color: '#065F46',
    fontWeight: '700',
  },
  dropdownMenuItemSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  dropdownEmptyRow: {
    padding: 14,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 12.5,
    color: '#9CA3AF',
  },
  formInputBox: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  formInputBoxFocused: {
    borderColor: '#10B981',
  },
  formInput: {
    fontSize: 14,
    color: '#111827',
    padding: 0,
    height: '100%',
  },
  formTextareaBox: {
    minHeight: 110,
    height: undefined,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 14,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  formTextarea: {
    minHeight: 90,
    height: undefined,
    textAlignVertical: 'top',
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    color: '#111827',
  },
  exactSubmitBtn: {
    backgroundColor: '#10B981',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  exactSubmitBtnDisabled: {
    opacity: 0.7,
  },
  exactSubmitBtnText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  switchRaiseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  switchRaiseBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Guest notice
  guestNoticeBox: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
  },
  guestIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  guestNoticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  guestNoticeText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 12,
  },
  signInBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12.5,
  },
  // Past Tickets
  emptyTickets: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyTicketsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTicketsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 3,
  },
  emptyTicketsSub: {
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  ticketRowItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ticketTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ticketNumberBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  ticketNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  ticketSubjectText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  ticketDescText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 6,
  },
  replyBubble: {
    backgroundColor: '#ECFDF5',
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
    padding: 9,
    borderRadius: 6,
    marginBottom: 6,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  replyAuthor: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  replyContent: {
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 16,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  ticketDateText: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  ticketTypeBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ticketTypeTag: {
    fontSize: 10.5,
    color: '#059669',
    fontWeight: '700',
  },
  // Modal / Bottom Sheet
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdropBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  modalSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
    minHeight: 460,
  },
  sheetHandle: {
    width: 40,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 12,
  },

  // Success View inside Sheet
  successBox: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  successIconOuter: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successIconInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#065F46',
    marginBottom: 6,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 12.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  successTicketCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  successSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successSummaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  ticketIdPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  ticketIdPillText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  successSummaryDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  successSummaryValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  openStatusTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  openStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  successActionButtons: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  viewTicketsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    height: 44,
    borderRadius: 10,
  },
  viewTicketsBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  doneBtn: {
    paddingHorizontal: 20,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },

  // In-Modal Bottom Sheet Picker Overlay
  inModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    zIndex: 9999,
    elevation: 20,
  },
  inModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  inModalPickerTray: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
  },
  inModalPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 6,
  },
  inModalPickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  inModalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  pickerScrollView: {
    maxHeight: 320,
  },
  pickerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 3,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  pickerOptionRowActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  pickerOptionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerOptionIconWrapActive: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  pickerOptionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  pickerOptionTitleActive: {
    color: '#059669',
    fontWeight: '800',
  },
  pickerOptionSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  pickerRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  pickerRadioActive: {
    borderColor: '#059669',
  },
  pickerRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#059669',
  },
  orderStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  orderStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
