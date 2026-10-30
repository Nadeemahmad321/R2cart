import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Linking,
  KeyboardAvoidingView,
  Platform,
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
import { Skeleton } from '../../components/common/Skeleton';

// Clean Outline Card Skeleton Loader
const ProfileSkeleton = () => (
  <View style={styles.skeletonContainer}>
    {/* Profile Card Skeleton */}
    <View style={styles.skeletonCard}>
      <Skeleton width={48} height={48} borderRadius={24} style={{ marginRight: 12 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width={130} height={16} borderRadius={4} />
        <Skeleton width={90} height={12} borderRadius={4} />
      </View>
      <Skeleton width={48} height={26} borderRadius={8} />
    </View>

    {/* Quick Rail Skeleton */}
    <View style={styles.skeletonCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingVertical: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={{ alignItems: 'center' }}>
            <Skeleton width={42} height={42} borderRadius={21} />
            <Skeleton width={38} height={10} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
    </View>

    {/* Menu Card Skeleton */}
    <View style={styles.skeletonCard}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
        <View key={i} style={styles.skeletonMenuRow}>
          <Skeleton width={20} height={20} borderRadius={4} style={{ marginRight: 12 }} />
          <Skeleton width={120 + (i % 2) * 20} height={14} borderRadius={4} style={{ flex: 1 }} />
          <Skeleton width={14} height={14} borderRadius={4} />
        </View>
      ))}
    </View>
  </View>
);

export const ProfileScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user, logout, refreshProfile } = useAuth();
  const { notify } = useToast();
  const { lang, setLang } = useLanguage();

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Edit Profile Modal
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editMobile, setEditMobile] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [deletingAccount, setDeletingAccount] = useState<boolean>(false);
  const [policyModalVisible, setPolicyModalVisible] = useState<boolean>(false);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [activePolicy, setActivePolicy] = useState<{
    title: string;
    sections: { heading: string; body: string }[];
    url: string;
  } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const isHindi = lang === 'hi';

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('HomeTab');
    }
  };

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', `Cannot open: ${url}`);
    }
  };

  const fetchProfileDetails = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const meRes = await api.getMe();
      if (meRes?.data) {
        const u = meRes.data;
        setProfileData(u);
        setEditName(u.name || '');
        setEditMobile(u.mobile || '');
        setEditEmail(u.email || '');
      }
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProfileDetails();
    } else {
      setProfileData(null);
      setEditName('');
      setEditMobile('');
      setEditEmail('');
      setLoading(false);
    }
  }, [user, fetchProfileDetails]);

  // Fetch real backend store settings & legal policy configuration
  useEffect(() => {
    api
      .getSettings()
      .then(res => {
        if (res?.data) {
          setStoreSettings(res.data);
        }
      })
      .catch(() => { });
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfileDetails();
  };

  const handleOpenEdit = () => {
    setEditName(profileData?.name || user?.name || '');
    setEditMobile(profileData?.mobile || user?.mobile || '');
    setEditEmail(profileData?.email || user?.email || '');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    const trimmedName = editName.trim();
    const cleanMobile = editMobile.replace(/\D/g, '');
    const cleanEmail = editEmail.trim();

    if (trimmedName.length < 2) {
      Alert.alert(isHindi ? 'अमान्य नाम' : 'Invalid Name', isHindi ? 'कृपया अपना पूरा नाम दर्ज करें।' : 'Please enter your full name (minimum 2 characters).');
      return;
    }
    if (cleanMobile.length !== 10) {
      Alert.alert(isHindi ? 'अमान्य मोबाइल' : 'Invalid Mobile', isHindi ? 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (cleanEmail && !/\S+@\S+\.\S+/.test(cleanEmail)) {
      Alert.alert(isHindi ? 'अमान्य ईमेल' : 'Invalid Email', isHindi ? 'कृपया एक वैध ईमेल पता दर्ज करें।' : 'Please enter a valid email address.');
      return;
    }

    setSavingProfile(true);
    try {
      const payload: any = {
        name: trimmedName,
        mobile: cleanMobile,
      };
      if (cleanEmail) {
        payload.email = cleanEmail;
      }

      const res = await api.updateProfile(payload);
      if (res?.data) {
        setProfileData(res.data);
      }
      await refreshProfile();
      notify(isHindi ? 'प्रोफ़ाइल अपडेट हो गई' : 'Profile updated successfully', 'success');
      setEditModalVisible(false);
    } catch (err: any) {
      Alert.alert(isHindi ? 'त्रुटि' : 'Update Failed', err.message || (isHindi ? 'प्रोफ़ाइल सहेजने में विफल' : 'Could not update profile details.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      isHindi ? 'लॉग आउट' : 'Sign Out',
      isHindi ? 'क्या आप साइन आउट करना चाहते हैं?' : 'Are you sure you want to log out?',
      [
        { text: isHindi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: isHindi ? 'लॉग आउट' : 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            // 1. Immediately purge local profile state
            setProfileData(null);
            setEditName('');
            setEditMobile('');
            setEditEmail('');
            // 2. Clear global auth session & tokens
            await logout();
            notify(isHindi ? 'सफलतापूर्वक साइन आउट किया गया' : 'Signed out successfully', 'info');
          },
        },
      ]
    );
  };

  const openPolicy = (type: 'privacy' | 'terms' | 'refund' | 'grievance') => {
    const pol = storeSettings?.policies || {};
    const storeName = storeSettings?.storeName?.trim() || 'R2Cart';
    const legalEntity = pol.legalName?.trim() || `${storeName} Retail Pvt. Ltd.`;
    const supportPhone = pol.supportPhone?.trim() || storeSettings?.contactNumber?.trim() || '+91 80000 10001';
    const supportEmail = pol.supportEmail?.trim() || storeSettings?.email?.trim() || 'support@r2cart.in';
    const supportHours =
      pol.supportHours?.trim() ||
      (storeSettings?.openingTime && storeSettings?.closingTime
        ? `${storeSettings.openingTime} - ${storeSettings.closingTime} IST (Daily)`
        : '07:00 AM - 11:00 PM IST (Daily)');
    const officeAddress =
      pol.officeAddress?.trim() ||
      storeSettings?.address?.trim() ||
      'Bailey Road, Patna, Bihar - 800001, India';

    const grievanceName = pol.grievanceOfficerName?.trim() || 'Mr. Nadeem Ahmad';
    const grievanceRole = pol.grievanceOfficerRole?.trim() || 'Grievance Redressal Officer & Operations Lead';
    const grievanceEmail = pol.grievanceOfficerEmail?.trim() || 'grievance@r2cart.in';
    const grievancePhone = pol.grievanceOfficerPhone?.trim() || supportPhone;
    const grievanceAddress = pol.grievanceOfficerAddress?.trim() || officeAddress;

    // Check if backend policies has custom policy page configured in admin dashboard
    const customPage = pol.customPages?.[type];
    if (customPage && Array.isArray(customPage.sections) && customPage.sections.length > 0) {
      const customSections = customPage.sections.map((s: any) => ({
        heading: s.title || s.heading || '',
        body: s.text || s.body || (Array.isArray(s.bullets) ? s.bullets.join('\n- ') : ''),
      }));
      setActivePolicy({
        title:
          customPage.title ||
          (type === 'grievance'
            ? 'Grievance Redressal Policy'
            : type === 'privacy'
              ? 'Privacy Policy'
              : type === 'terms'
                ? 'Terms & Conditions'
                : 'Refund Policy'),
        url: `https://www.r2cart.in/${type === 'grievance' ? 'grievance' : type === 'privacy' ? 'privacy' : type === 'terms' ? 'terms' : 'refund-policy'
          }`,
        sections: customSections,
      });
      setPolicyModalVisible(true);
      return;
    }

    if (type === 'grievance') {
      setActivePolicy({
        title: isHindi ? 'शिकायत निवारण नीति' : 'Grievance Redressal Policy',
        url: 'https://www.r2cart.in/grievance',
        sections: [
          {
            heading: isHindi ? '1. सांविधिक अनुपालन (उपभोक्ता संरक्षण अधिनियम, 2019)' : '1. Statutory Consumer Protection Compliance',
            body: isHindi
              ? `सूचना प्रौद्योगिकी अधिनियम, 2000 और उपभोक्ता संरक्षण (ई-कॉमर्स) नियम, 2020 के अनुपालन में, ${legalEntity} ने उपभोक्ता शिकायतों के त्वरित और पारदर्शी समाधान के लिए एक नामित वैधानिक शिकायत अधिकारी नियुक्त किया है।`
              : `In compliance with the Information Technology Act, 2000, the Consumer Protection Act, 2019, and the Consumer Protection (E-Commerce) Rules, 2020, ${legalEntity} has designated a statutory Grievance Redressal Officer to address all customer complaints and escalations efficiently.`,
          },
          {
            heading: isHindi ? '2. नामित शिकायत अधिकारी (Designated Officer)' : '2. Designated Grievance Officer',
            body: isHindi
              ? `- अधिकारी का नाम: ${grievanceName}\n- पद / भूमिका: ${grievanceRole}\n- आधिकारिक ईमेल: ${grievanceEmail} (CC: ${supportEmail})\n- फोन / हेल्पलाइन: ${grievancePhone}\n- कार्यालय का पता: ${grievanceAddress}\n- कार्य समय: ${supportHours}`
              : `- Officer Name: ${grievanceName}\n- Designation: ${grievanceRole}\n- Official Email: ${grievanceEmail} (CC: ${supportEmail})\n- Contact Number: ${grievancePhone}\n- Official Address: ${grievanceAddress}\n- Working Hours: ${supportHours}`,
          },
          {
            heading: isHindi ? '3. पावती व निवारण समय-सीमा (SLA)' : '3. Acknowledgment & Resolution SLA',
            body: isHindi
              ? '- पावती (Acknowledgment): शिकायत प्राप्त होने के 48 घंटे के भीतर ग्राहक को एक विशिष्ट टिकट नंबर के साथ पावती जारी की जाती है।\n- अंतिम समाधान (Resolution): प्रत्येक शिकायत की निष्पक्ष जांच कर प्राप्ति के 15 कार्य दिवसों के भीतर पूर्ण समाधान प्रदान किया जाता है।'
              : '- Acknowledgment: Every consumer complaint is acknowledged within 48 hours with a unique grievance tracking ticket.\n- Final Resolution: In accordance with statutory rules, all grievances are thoroughly investigated and resolved within 15 working days.',
          },
          {
            heading: isHindi ? '4. स्तरीय सहायता डेस्क' : '4. Support Escalation Desk',
            body: isHindi
              ? `ऑर्डर और सामान्य सहायता के लिए सबसे पहले हमारी सहायता टीम (${supportEmail} | ${supportPhone}) से संपर्क करें। असंतोष की स्थिति में शिकायत अधिकारी को सीधे अग्रेषित करें।`
              : `For day-to-day order queries or product quality queries, contact Level 1 Customer Care (${supportEmail} | ${supportPhone}). If unresolved, escalate directly to the Grievance Officer.`,
          },
        ],
      });
    } else if (type === 'privacy') {
      setActivePolicy({
        title: isHindi ? 'गोपनीयता नीति (Privacy Policy)' : 'Privacy Policy & Data Safety',
        url: 'https://www.r2cart.in/privacy',
        sections: [
          {
            heading: isHindi ? '1. हम कौन सा डेटा एकत्र करते हैं' : '1. Information We Collect',
            body: isHindi
              ? `${storeName} आपकी किराना डिलीवरी पूरी करने के लिए आपका नाम, 10-अंकीय मोबाइल नंबर, डिलीवरी पता और डिवाइस टोकन एकत्र करता है।`
              : `${storeName} collects your name, verified 10-digit mobile number, delivery addresses, and push notification tokens strictly for order fulfillment and real-time delivery tracking.`,
          },
          {
            heading: isHindi ? '2. डेटा का उपयोग और सुरक्षा' : '2. How We Use & Secure Data',
            body: isHindi
              ? `आपका डेटा केवल ${legalEntity} द्वारा आपके ऑर्डर्स प्रोसेस करने के लिए उपयोग किया जाता है। हम आपका व्यक्तिगत डेटा कभी भी तीसरे पक्ष को नहीं बेचते।`
              : `Your data is strictly processed by ${legalEntity} for grocery delivery, billing, and customer support. We never sell or rent your personal information to third-party marketing brokers.`,
          },
          {
            heading: isHindi ? '3. खाता व डेटा हटाने का अधिकार (Play Store Compliant)' : '3. User Rights & Data Deletion',
            body: isHindi
              ? 'आप इस ऐप में "खाता हटाएं" विकल्प पर क्लिक करके किसी भी समय अपना खाता और सभी संबंधित डेटा तुरंत मिटा सकते हैं। इसके अलावा वेब अनुरोध के लिए r2cart.in/contact पर भी जा सकते हैं।'
              : 'You have full rights to request permanent deletion of your account and personal records anytime via the in-app "Delete Account" button or via r2cart.in/contact.',
          },
        ],
      });
    } else if (type === 'terms') {
      setActivePolicy({
        title: isHindi ? 'नियम व शर्तें (Terms of Service)' : 'Terms of Service',
        url: 'https://www.r2cart.in/terms',
        sections: [
          {
            heading: isHindi ? '1. सेवा का उपयोग व डिलीवरी क्षेत्र' : '1. Service & Delivery Zones',
            body: isHindi
              ? `${storeName} हथुआ और आसपास के सर्विस योग्य क्षेत्रों में ताजे फल, सब्जियां, डेयरी और किराना सामान डिलीवर करता है। ऑर्डर्स वास्तविक पते और वैध मोबाइल नंबर पर ही स्वीकार किए जाते हैं।`
              : `${storeName} provides instant and scheduled grocery deliveries in Hathua, Bihar and designated serviceable coverage areas.`,
          },
          {
            heading: isHindi ? '2. भुगतान व कीमतें' : '2. Pricing & Payments',
            body: isHindi
              ? 'सभी कीमतें भारतीय रुपये (₹) में हैं और लागू कर शामिल हैं। आप कैश ऑन डिलीवरी (COD) या समर्थित डिजिटल मोड से भुगतान कर सकते हैं।'
              : 'All prices are displayed in Indian Rupees (INR) inclusive of applicable taxes. Orders can be paid via Cash on Delivery (COD) or supported digital payments.',
          },
        ],
      });
    } else if (type === 'refund') {
      setActivePolicy({
        title: isHindi ? 'रिफंड व रद्दीकरण नीति' : 'Refund & Cancellation Policy',
        url: 'https://www.r2cart.in/refund-policy',
        sections: [
          {
            heading: isHindi ? '1. ऑर्डर रद्दीकरण' : '1. Order Cancellation',
            body: isHindi
              ? 'आप अपने ऑर्डर को डिलीवरी पार्टनर द्वारा पैक होने या रवाना होने से पहले सपोर्ट या चैट के माध्यम से बिना किसी शुल्क के रद्द कर सकते हैं।'
              : 'Orders can be cancelled before dispatch via the support desk or customer chat at zero cancellation penalty.',
          },
          {
            heading: isHindi ? '2. ताज़गी गारंटी व रिफंड' : '2. Freshness Guarantee & Refund',
            body: isHindi
              ? 'यदि कोई वस्तु क्षतिग्रस्त, खराब या गायब मिले, तो डिलीवरी के 24 घंटे के भीतर रिपोर्ट करें। तुरंत रिप्लेसमेंट या रिफंड प्रदान किया जाएगा।'
              : 'If any grocery item arrives damaged, sub-standard, or missing, report within 24 hours for an immediate replacement or full refund.',
          },
        ],
      });
    }
    setPolicyModalVisible(true);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      isHindi ? 'खाता स्थायी रूप से हटाएं?' : 'Delete Account & Data?',
      isHindi
        ? 'क्या आप वाकई अपना R2Cart खाता और सभी संबंधित डेटा स्थायी रूप से हटाना चाहते हैं?\n\n- आपकी प्रोफ़ाइल और मोबाइल नंबर हटा दिए जाएंगे\n- आपके सहेजे गए पते और कार्ट डेटा मिटा दिए जाएंगे\n- यह कार्रवाई स्थायी है और वापस नहीं की जा सकती।'
        : 'Are you sure you want to delete your R2Cart account and personal data?\n\n- Your profile and mobile number will be deleted\n- Your saved addresses and basket items will be erased\n- This action is permanent and cannot be undone.',
      [
        { text: isHindi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: isHindi ? 'हाँ, खाता हटाएं' : 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await api.deleteAccount();
              setProfileData(null);
              setEditName('');
              setEditMobile('');
              setEditEmail('');
              await logout();
              Alert.alert(
                isHindi ? 'खाता हटा दिया गया' : 'Account Deleted',
                isHindi
                  ? 'आपका खाता और व्यक्तिगत डेटा सफलतापूर्वक हटा दिया गया है।'
                  : 'Your account and personal data have been permanently removed from R2Cart.'
              );
            } catch (err: any) {
              Alert.alert(
                isHindi ? 'त्रुटि' : 'Error',
                err.message || (isHindi ? 'खाता हटाने में विफल। कृपया पुन: प्रयास करें।' : 'Failed to delete account. Please try again or contact support.')
              );
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  // User name and contact display - strictly tied to active authenticated session
  const displayName = user
    ? (profileData?.name || user.name || (isHindi ? 'ग्राहक' : 'Customer'))
    : (isHindi ? 'अतिथि ग्राहक' : 'Guest User');
  const displayEmail = user ? (profileData?.email || user.email || '') : '';
  const displayMobile = user ? (profileData?.mobile || user.mobile || '') : '';

  return (
    <View style={styles.container}>
      {/* 1. Top Header with Back Chevron and "Profile" title */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="chevron-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isHindi ? 'प्रोफ़ाइल' : 'Profile'}</Text>
        </View>

        {/* Right: Language Switch */}
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

      {/* 2. Loading State vs Clean Card Layout */}
      {loading && !refreshing ? (
        <ProfileSkeleton />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 60 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={user ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} /> : undefined}
        >
          {/* 3. Profile Card (with subtle 1px border outline) */}
          <View style={styles.profileCard}>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={user ? handleOpenEdit : () => navigation.navigate('CustomerLogin')}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarText}>
                {user && displayName ? displayName.charAt(0).toUpperCase() : '👤'}
              </Text>
            </TouchableOpacity>

            <View style={styles.profileMeta}>
              <View style={styles.nameRow}>
                <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
                {user && (
                  <View style={styles.verifiedDot}>
                    <Feather name="check" size={9} color="#FFFFFF" />
                  </View>
                )}
              </View>

              {user && displayMobile ? (
                <Text style={styles.userSub}>+91 {displayMobile}</Text>
              ) : user && displayEmail ? (
                <Text style={styles.userSub} numberOfLines={1}>{displayEmail}</Text>
              ) : null}

              {!user && (
                <Text style={styles.guestHint}>
                  {isHindi ? 'साइन इन करके तुरंत ऑर्डर करें' : 'Sign in to access orders & offers'}
                </Text>
              )}
            </View>

            {user ? (
              <TouchableOpacity style={styles.editBtn} onPress={handleOpenEdit} activeOpacity={0.7}>
                <Feather name="edit-2" size={12} color={Colors.primary} style={{ marginRight: 3 }} />
                <Text style={styles.editBtnText}>{isHindi ? 'एडिट' : 'Edit'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={() => navigation.navigate('CustomerLogin')}
                activeOpacity={0.85}
              >
                <Text style={styles.loginBtnText}>{isHindi ? 'साइन इन' : 'Sign In'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 4. Horizontal Quick Actions Card (Icons in app theme color) */}
          <View style={styles.quickRailCard}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => (user ? navigation.navigate('OrdersTab') : navigation.navigate('CustomerLogin'))}
              activeOpacity={0.7}
            >
              <View style={styles.quickIconCircle}>
                <Feather name="package" size={19} color={Colors.primary} />
              </View>
              <Text style={styles.quickLabel}>{isHindi ? 'ऑर्डर्स' : 'Orders'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => (user ? navigation.navigate('Addresses') : navigation.navigate('CustomerLogin'))}
              activeOpacity={0.7}
            >
              <View style={styles.quickIconCircle}>
                <Feather name="map-pin" size={19} color={Colors.primary} />
              </View>
              <Text style={styles.quickLabel}>{isHindi ? 'पते' : 'Addresses'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => (user ? navigation.navigate('Favorites') : navigation.navigate('CustomerLogin'))}
              activeOpacity={0.7}
            >
              <View style={styles.quickIconCircle}>
                <Feather name="heart" size={19} color={Colors.primary} />
              </View>
              <Text style={styles.quickLabel}>{isHindi ? 'विशलिस्ट' : 'Wishlist'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Coupons')}
              activeOpacity={0.7}
            >
              <View style={styles.quickIconCircle}>
                <Feather name="tag" size={19} color={Colors.primary} />
              </View>
              <Text style={styles.quickLabel}>{isHindi ? 'ऑफर' : 'Offers'}</Text>
            </TouchableOpacity>
          </View>

          {/* 5. Menu List Card (with subtle 1px border outline & app theme icons) */}
          <View style={styles.menuCard}>
            {/* My Orders */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => (user ? navigation.navigate('OrdersTab') : navigation.navigate('CustomerLogin'))}
              activeOpacity={0.65}
            >
              <Feather name="package" size={17} color={Colors.primary} style={styles.rowIcon} />
              <Text style={styles.menuTitle}>{isHindi ? 'मेरे ऑर्डर्स' : 'My Orders'}</Text>
              <Feather name="chevron-right" size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Delivery Addresses */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => (user ? navigation.navigate('Addresses') : navigation.navigate('CustomerLogin'))}
              activeOpacity={0.65}
            >
              <Feather name="map-pin" size={17} color={Colors.primary} style={styles.rowIcon} />
              <Text style={styles.menuTitle}>{isHindi ? 'डिलीवरी पते' : 'Delivery Addresses'}</Text>
              <Feather name="chevron-right" size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Wishlist */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => (user ? navigation.navigate('Favorites') : navigation.navigate('CustomerLogin'))}
              activeOpacity={0.65}
            >
              <Feather name="heart" size={17} color={Colors.primary} style={styles.rowIcon} />
              <Text style={styles.menuTitle}>{isHindi ? 'मेरी विशलिस्ट' : 'My Wishlist'}</Text>
              <Feather name="chevron-right" size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Offers & Coupons */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate('Coupons')}
              activeOpacity={0.65}
            >
              <Feather name="tag" size={17} color={Colors.primary} style={styles.rowIcon} />
              <Text style={styles.menuTitle}>{isHindi ? 'ऑफ़र्स व कूपन' : 'Offers & Coupons'}</Text>
              <Feather name="chevron-right" size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Help & Support */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate('Support')}
              activeOpacity={0.65}
            >
              <Feather name="headphones" size={17} color={Colors.primary} style={styles.rowIcon} />
              <Text style={styles.menuTitle}>{isHindi ? 'हेल्प व सपोर्ट डेस्क' : 'Help & Support'}</Text>
              <Feather name="chevron-right" size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* About Us */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => openUrl('https://www.r2cart.in/about')}
              activeOpacity={0.65}
            >
              <Feather name="info" size={17} color={Colors.primary} style={styles.rowIcon} />
              <Text style={styles.menuTitle}>{isHindi ? 'हमारे बारे में' : 'About Us'}</Text>
              <Feather name="external-link" size={14} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Contact Us */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => openUrl('https://www.r2cart.in/contact')}
              activeOpacity={0.65}
            >
              <Feather name="phone-call" size={17} color={Colors.primary} style={styles.rowIcon} />
              <Text style={styles.menuTitle}>{isHindi ? 'संपर्क करें' : 'Contact Us'}</Text>
              <Feather name="external-link" size={14} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Grievance Redressal */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => openPolicy('grievance')}
              activeOpacity={0.65}
            >
              <Feather name="alert-circle" size={17} color={Colors.primary} style={styles.rowIcon} />
              <Text style={styles.menuTitle}>{isHindi ? 'शिकायत निवारण' : 'Grievance Redressal'}</Text>
              <Feather name="chevron-right" size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Refund & Cancellation Policy */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => openPolicy('refund')}
              activeOpacity={0.65}
            >
              <Feather name="rotate-ccw" size={17} color={Colors.primary} style={styles.rowIcon} />
              <Text style={styles.menuTitle}>{isHindi ? 'रिफंड व रद्दीकरण नीति' : 'Refund & Cancellation'}</Text>
              <Feather name="chevron-right" size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Privacy Policy */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => openPolicy('privacy')}
              activeOpacity={0.65}
            >
              <Feather name="shield" size={17} color={Colors.primary} style={styles.rowIcon} />
              <Text style={styles.menuTitle}>{isHindi ? 'गोपनीयता नीति (Privacy Policy)' : 'Privacy Policy & Data Safety'}</Text>
              <Feather name="chevron-right" size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Terms & Conditions */}
            <TouchableOpacity
              style={[styles.menuRow, !user && { borderBottomWidth: 0 }]}
              onPress={() => openPolicy('terms')}
              activeOpacity={0.65}
            >
              <Feather name="file-text" size={17} color={Colors.primary} style={styles.rowIcon} />
              <Text style={styles.menuTitle}>{isHindi ? 'नियम व शर्तें' : 'Terms & Conditions'}</Text>
              <Feather name="chevron-right" size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Delete Account (In-App Account & Data Deletion - Play Store Mandated) */}
            {user && (
              <TouchableOpacity
                style={styles.menuRow}
                onPress={handleDeleteAccount}
                activeOpacity={0.65}
                disabled={deletingAccount}
              >
                <Feather name="trash-2" size={17} color="#DC2626" style={styles.rowIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuTitle, { color: '#DC2626' }]}>
                    {isHindi ? 'खाता हटाएं' : 'Delete Account'}
                  </Text>
                  <Text style={styles.menuSubHint}>
                    {isHindi ? 'खाता व व्यक्तिगत डेटा स्थायी रूप से मिटाएं' : 'Permanently erase account & personal data'}
                  </Text>
                </View>
                {deletingAccount ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <Feather name="chevron-right" size={16} color="#FCA5A5" />
                )}
              </TouchableOpacity>
            )}

            {/* Sign Out */}
            {user && (
              <TouchableOpacity
                style={[styles.menuRow, { borderBottomWidth: 0 }]}
                onPress={handleLogout}
                activeOpacity={0.65}
              >
                <Feather name="log-out" size={17} color="#DC2626" style={styles.rowIcon} />
                <Text style={[styles.menuTitle, { color: '#DC2626', fontWeight: '800' }]}>
                  {isHindi ? 'साइन आउट' : 'Sign Out'}
                </Text>
                <Feather name="chevron-right" size={16} color="#FCA5A5" />
              </TouchableOpacity>
            )}
          </View>

          {/* Minimal Clean Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>R2Cart v1.0.0</Text>
          </View>
        </ScrollView>
      )}

      {/* Simple, Neat & Clean Edit Profile Bottom Sheet with Keyboard Scrolling */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          Keyboard.dismiss();
          setEditModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetOverlay}
        >
          {/* Backdrop touch to dismiss */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setEditModalVisible(false);
            }}
          >
            <View style={styles.sheetBackdropBg} />
          </TouchableOpacity>

          <View
            style={[
              styles.sheetCard,
              {
                paddingBottom: Math.max(insets.bottom, 16),
                marginBottom: Platform.OS === 'android' ? keyboardHeight : 0,
                maxHeight:
                  keyboardHeight > 0
                    ? Math.max(260, Dimensions.get('window').height - keyboardHeight - insets.top - 20)
                    : Dimensions.get('window').height * 0.85,
              },
            ]}
          >
            {/* Grabber handle */}
            <View style={styles.sheetHandle} />

            {/* Clean Simple Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{isHindi ? 'प्रोफ़ाइल बदलें' : 'Edit Profile'}</Text>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setEditModalVisible(false);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.sheetCloseBtn}
              >
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Form Content */}
            <ScrollView
              style={styles.sheetScrollView}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              bounces={false}
              contentContainerStyle={styles.sheetScrollContent}
            >
              {/* Full Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{isHindi ? 'नाम' : 'Full Name'}</Text>
                <View style={styles.fieldBox}>
                  <Feather name="user" size={16} color={Colors.primary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.fieldInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder={isHindi ? 'पूरा नाम दर्ज करें' : 'Enter full name'}
                    placeholderTextColor="#94A3B8"
                    autoCorrect={false}
                  />
                  {editName.length > 0 && (
                    <TouchableOpacity onPress={() => setEditName('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Feather name="x-circle" size={14} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Mobile Number */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{isHindi ? 'मोबाइल नंबर' : 'Mobile Number'}</Text>
                <View style={styles.fieldBox}>
                  <Text style={styles.phonePrefix}>+91</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={editMobile}
                    onChangeText={setEditMobile}
                    placeholder="10-digit number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                  {editMobile.length > 0 && (
                    <TouchableOpacity onPress={() => setEditMobile('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Feather name="x-circle" size={14} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Email Address */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{isHindi ? 'ईमेल' : 'Email Address'}</Text>
                <View style={styles.fieldBox}>
                  <Feather name="mail" size={16} color={Colors.primary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.fieldInput}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder={isHindi ? 'ईमेल पता' : 'name@example.com'}
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {editEmail.length > 0 && (
                    <TouchableOpacity onPress={() => setEditEmail('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Feather name="x-circle" size={14} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveBtn, savingProfile && { opacity: 0.7 }]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
                activeOpacity={0.88}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>{isHindi ? 'सहेजें' : 'Save Changes'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Play Store & Compliance Policy Viewer Modal */}
      <Modal
        visible={policyModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setPolicyModalVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setPolicyModalVisible(false)}
          >
            <View style={styles.sheetBackdropBg} />
          </TouchableOpacity>

          <View
            style={[
              styles.sheetCard,
              {
                paddingBottom: Math.max(insets.bottom, 18),
                maxHeight: Dimensions.get('window').height * 0.88,
              },
            ]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { fontSize: 16 }]} numberOfLines={1}>
                {activePolicy?.title || 'Policy'}
              </Text>
              <TouchableOpacity
                onPress={() => setPolicyModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.sheetCloseBtn}
              >
                <Feather name="x" size={19} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ paddingHorizontal: 18 }}
              contentContainerStyle={{ paddingVertical: 12, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {activePolicy?.sections.map((sec, idx) => (
                <View key={idx} style={styles.policySection}>
                  <Text style={styles.policyHeading}>{sec.heading}</Text>
                  <Text style={styles.policyBody}>{sec.body}</Text>
                </View>
              ))}

              {activePolicy?.url && (
                <TouchableOpacity
                  style={styles.policyWebBtn}
                  onPress={() => {
                    const u = activePolicy.url;
                    setPolicyModalVisible(false);
                    openUrl(u);
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="external-link" size={14} color={Colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.policyWebBtnText}>
                    {isHindi ? 'वेबसाइट पर पूरा दस्तावेज़ पढ़ें' : 'View Full Document on Website'}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
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
  },
  backBtn: {
    paddingRight: 6,
    paddingVertical: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 2,
  },
  langSwitch: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 2,
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  langBtnActive: {
    backgroundColor: Colors.primary,
  },
  langText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  langTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
  },
  // Cards with subtle light outline border
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primary,
  },
  profileMeta: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  verifiedDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  guestHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  editBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  // Horizontal Quick Actions Rail Card
  quickRailCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-around',
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  quickLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  // Menu Card with subtle outline border
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  rowIcon: {
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  menuTitle: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 28,
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // Skeleton Styles
  skeletonContainer: {
    flex: 1,
    padding: 14,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skeletonMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  // Simple, Neat & Clean Bottom Sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdropBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  sheetScrollView: {
    flexShrink: 1,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScrollContent: {
    paddingTop: 4,
    paddingBottom: 20,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 5,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFC',
  },
  fieldInput: {
    flex: 1,
    height: '100%',
    fontSize: 13.5,
    color: '#0F172A',
  },
  phonePrefix: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 6,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
  menuSubHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  policySection: {
    marginBottom: 16,
  },
  policyHeading: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  policyBody: {
    fontSize: 12.5,
    lineHeight: 19,
    color: '#475569',
  },
  policyWebBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  policyWebBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.primary,
  },
});
