import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCachedHindi, translateToHindi, prefetchTranslations } from '../utils/translator';

export type Language = 'en' | 'hi';

const LANG_STORAGE_KEY = 'r2cart_lang_preference';

// Comprehensive Category Translations (0ms instant lookup)
export const categoryTranslations: Record<string, string> = {
  'Vegetables & Fruits': 'सब्जियां और फल',
  'Fruits & Vegetables': 'सब्जियां और फल',
  'Dairy, Bread & Eggs': 'दूध, ब्रेड और अंडे',
  'Dairy, Bread & Egg': 'दूध, ब्रेड और अंडे',
  'Atta, Rice, Dal & Oil': 'आटा, चावल, दाल और तेल',
  'Atta, Rice & Dal': 'आटा, चावल और दाल',
  'Masalas & Dry Fruits': 'मसाले और सूखे मेवे',
  'Masala & Dry Fruits': 'मसाले और सूखे मेवे',
  'Cold Drinks & Juices': 'कोल्ड ड्रिंक्स और जूस',
  'Biscuits & Bakery': 'बिस्कुट और बेकरी',
  'Bakery & Biscuits': 'बेकरी और बिस्कुट',
  'Packaged Food': 'पैकेज्ड फूड',
  'Instant & Frozen Food': 'इंस्टेंट और फ्रोजन फूड',
  'Instant Food': 'नूडल्स व इंस्टेंट फूड',
  'Snacks & Munchies': 'स्नैक्स और नमकीन',
  'Snacks': 'स्नैक्स और नमकीन',
  'Tea, Coffee & Health Drinks': 'चाय, कॉफी व हेल्थ ड्रिंक्स',
  'Tea, Coffee & More': 'चाय, कॉफी व हेल्थ ड्रिंक्स',
  'Personal Care': 'पर्सनल केयर',
  'Household Care': 'सफाई और घरेलू सामान',
  'Cleaning Essentials': 'सफाई और किचन का सामान',
  'Cleaning & Kitchen': 'सफाई और किचन का सामान',
  'Home Care': 'होम केयर',
  'Baby Care': 'बेबी केयर',
  'Pet Care': 'पेट केयर',
  'Pooja Needs': 'पूजा सामग्री',
  'Jewellery': 'ज्वेलरी व आभूषण',
  'Pharma & Wellness': 'दवा और वेलनेस',
  'Stationery & Utilities': 'स्टेशनरी व उपयोगी सामान',
  'Resin Art': 'रेजिन आर्ट',
  'Organic & Gourmet': 'ऑर्गेनिक और गौरमेट',
  'Paan Corner': 'पान कॉर्नर',
  'Sweet Tooth': 'मिठाई और चॉकलेट',
  'Sweets & Chocolates': 'मिठाई और चॉकलेट',
  'Breakfast & Instant Food': 'नाश्ता और इंस्टेंट फूड',
};

// Comprehensive Common Product Name Translations (0ms instant lookup)
export const productTranslations: Record<string, string> = {
  // Fresh Produce
  'Fresh Red Onion': 'ताज़ा लाल प्याज',
  'Farm Fresh Potato': 'फार्म ताज़ा आलू',
  'Desi Hybrid Tomato': 'देसी हाइब्रिड टमाटर',
  'Fresh Green Peas (Matar)': 'ताज़ा हरी मटर',
  'Fresh Ginger (Adrak)': 'ताज़ा अदरक',
  'Desi Garlic (Lahsun)': 'देसी लहसुन',
  'Spicy Green Chilli': 'तीखी हरी मिर्च',
  'Fresh Coriander (Dhaniya)': 'ताज़ा हरा धनिया',
  'Green Capsicum (Shimla Mirch)': 'हरी शिमला मिर्च',
  'Juicy Yellow Lemon (Nimbu)': 'ताज़ा पीला नींबू',
  'Fresh Potato (Aloo)': 'ताज़ा आलू',
  'Fresh Onion (Pyaz)': 'ताज़ा प्याज',
  'Fresh Tomato (Tamatar)': 'ताज़ा टमाटर',
  'Green Chilli (Hari Mirch)': 'हरी मिर्च',
  'Fresh Cauliflower (Gobhi)': 'ताज़ा फूलगोभी',
  'Fresh Cabbage (Patta Gobhi)': 'ताज़ा पत्तागोभी',
  'Robusta Ripe Banana': 'रोबस्टा पका केला',
  'Robusta Banana': 'रोबस्टा केला',
  'Royal Gala Sweet Apple': 'रॉयल गाला मीठा सेब',
  'Royal Gala Apple': 'रॉयल गाला सेब',
  'Nagpur Sweet Orange': 'नागपुर संतरा',
  'Ruby Red Pomegranate (Anar)': 'ताज़ा लाल अनार',
  'Fresh Tomato': 'ताज़ा टमाटर',
  'Fresh Onion': 'ताज़ा प्याज',

  // Dairy & Breakfast
  'Amul Gold Full Cream Milk': 'अमूल गोल्ड फुल क्रीम दूध',
  'Amul Taaza Toned Milk': 'अमूल ताज़ा टोन्ड दूध',
  'Amul Taaza Milk': 'अमूल ताज़ा दूध',
  'Mother Dairy Cow Fresh Milk': 'मदर डेयरी गाय का दूध',
  'Mother Dairy Milk': 'मदर डेयरी दूध',
  'Amul Fresh Malai Paneer': 'अमूल ताज़ा मलाई पनीर',
  'Amul Pasteurized Salted Butter': 'अमूल बटर (मक्खन)',
  'Amul Butter': 'अमूल मक्खन',
  'Amul Masti Dahi': 'अमूल मस्ती दही',
  'Amul Cheese Block': 'अमूल चीज़ ब्लॉक',
  'Amul Pure Cow Ghee': 'अमूल शुद्ध गाय का घी',
  'Mother Dairy Shuddh Desi Ghee': 'मदर डेयरी शुद्ध देसी घी',
  'Britannia Processed Cheese Slices': 'ब्रिटानिया चीज़ स्लाइस',
  'Farm Fresh White Eggs': 'फार्म ताज़ा सफेद अंडे',
  'Farm Fresh Eggs': 'फार्म ताज़ा अंडे',
  'Paneer': 'पनीर',
  'Curd': 'दही',
  'Bread': 'ब्रेड',
  'Eggs': 'अंडे',
  'Sugar': 'चीनी',
  'Tea': 'चाय',
  'Rice': 'चावल',
  'Mustard Oil': 'सरसों का तेल',
  'Harvest Gold 100% Whole Wheat Bread': 'हार्वेस्ट गोल्ड होल व्हीट ब्रेड',
  'Harvest Gold Regular White Bread': 'हार्वेस्ट गोल्ड व्हाइट ब्रेड',
  'English Oven Soft Brown Bread': 'इंग्लिश ओवन ब्राउन ब्रेड',

  // Atta, Rice, Dal & Oil
  'Aashirvaad Shudh Chakki Atta': 'आशीर्वाद शुद्ध चक्की आटा',
  'Aashirvaad Atta': 'आशीर्वाद आटा',
  'Fortune Chakki Fresh Atta': 'फॉर्च्यून चक्की फ्रेश आटा',
  'India Gate Feast Rozzana Basmati Rice': 'इंडिया गेट रोज़ाना बासमती चावल',
  'India Gate Basmati Rice': 'इंडिया गेट बासमती चावल',
  'Fortune Biryani Special Basmati Rice': 'फॉर्च्यून बिरयानी बासमती चावल',
  'Tata Sampann Unpolished Toor Dal': 'टाटा सम्पन्न अनपॉलिश तूर दाल',
  'Tata Sampann Toor Dal': 'टाटा सम्पन्न तूर दाल',
  'Tata Sampann Desi Chana Dal': 'टाटा सम्पन्न देसी चना दाल',
  'Tata Sampann Yellow Moong Dal Dhuli': 'टाटा सम्पन्न मूंग दाल धुली',
  'Tata Sampann Desi Brown Kala Chana': 'टाटा सम्पन्न देसी काला चना',
  'Tata Sampann Big Kabuli Chana': 'टाटा सम्पन्न काबुली चना',
  'Himalayan Rajma Chitra': 'हिमालयन राजमा चित्रा',
  'Fortune Sunlite Sunflower Oil': 'फॉर्च्यून सूरजमुखी तेल',
  'Fortune Sunlite Refined Sunflower Oil': 'फॉर्च्यून सनलाइट रिफाइंड सनफ्लावर ऑयल',
  'Fortune Kachi Ghani Mustard Oil': 'फॉर्च्यून कच्ची घानी सरसों का तेल',
  'Saffola Gold Pro Healthy Heart Oil': 'सफ़ोला गोल्ड प्रो कुकिंग ऑयल',

  // Instant Food, Snacks & Spices
  'Maggi 2-Minute Masala Instant Noodles': 'मैगी 2-मिनट मसाला नूडल्स',
  'Maggi 2-Minute Noodles': 'मैगी 2-मिनट नूडल्स',
  'Maggi Masala Noodles': 'मैगी मसाला नूडल्स',
  'Sunfeast Yippee Magic Masala Noodles': 'यिप्पी मैजिक मसाला नूडल्स',
  'Tata Salt': 'टाटा नमक',
  'Tata Salt Vacuum Evaporated Iodised': 'टाटा नमक आयोडीन युक्त',
  'Everest Super Garam Masala': 'एवरेस्ट सुपर गरम मसाला',
  'MDH Deggi Mirch Natural Red': 'एमडीएच देगी मिर्च',
  'Catch Turmeric Powder (Haldi)': 'कैच हल्दी पाउडर',
  'Catch Red Chilli Powder (Lal Mirch)': 'कैच लाल मिर्च पाउडर',
  'Haldiram\'s Classic Bhujia Sev': 'हल्दीराम क्लासिक भुजिया सेव',
  'Haldiram\'s Aloo Bhujia': 'हल्दीराम आलू भुजिया',
  'Kurkure Masala Munch Crunchy Snack': 'कुरकुरे मसाला मंच स्नैक',
  'Kurkure Masala Munch': 'कुरकुरे मसाला मंच',
  'Lay\'s Classic Salted Chips': 'लेज़ क्लासिक साल्टेड चिप्स',
  'Lay\'s India\'s Magic Masala': 'लेज़ मैजिक मसाला',
  'Parle-G Original Gluco Biscuits': 'पारले-जी ग्लूको बिस्कुट',
  'Parle-G Gold Biscuits': 'पारले-जी गोल्ड बिस्कुट',
  'Parle-G Biscuits': 'पारले-जी बिस्कुट',
  'Britannia Good Day Butter Cookies': 'ब्रिटानिया गुड डे बटर कुकीज़',
  'Good Day Butter Cookies': 'गुड डे बटर कुकीज़',
  'Oreo Original Vanilla Cream Biscuits': 'ओरियो वैनिला क्रीम बिस्कुट',
  'Oreo Vanilla Creme Biscuits': 'ओरियो वेनिला बिस्कुट',

  // Beverages
  'Coca-Cola Soft Drink': 'कोका-कोला कोल्ड ड्रिंक',
  'Thums Up Charged Strong Cola': 'थम्स अप स्ट्रॉन्ग कोला',
  'Sprite Crisp Lemon-Lime Soda': 'स्प्राइट लेमन-लाइम सोडा',
  'Frooti Fresh Mango Drink': 'फ्रूटी मैंगो ड्रिंक',
  'Maaza Real Mango Pulp Drink': 'माज़ा मैंगो पल्प ड्रिंक',
  'Real Mixed Fruit Juice': 'रियल मिक्स्ड फ्रूट जूस',
  'Bisleri Packaged Drinking Water': 'बिसलेरी मिनरल वाटर',
  'Tata Tea Gold': 'टाटा टी गोल्ड',
  'Red Label Tea': 'रेड लेबल चाय',
  'Bru Instant Coffee': 'ब्रू इंस्टेंट कॉफी',
  'Nescafe Classic Coffee': 'नेस्कैफे क्लासिक कॉफी',

  // Cleaning & Personal Care
  'Surf Excel Easy Wash Detergent Powder': 'सर्फ एक्सेल ईज़ी वॉश डिटर्जेंट',
  'Surf Excel Quick Wash': 'सर्फ एक्सेल क्विक वॉश',
  'Tide Plus Double Power Lemon & Mint': 'टाइड प्लस डबल पावर डिटर्जेंट',
  'Vim Dishwash Gel': 'विम डिशवॉश जेल',
  'Vim Dishwash Bar with Polycoat': 'विम डिशवॉश साबुन',
  'Harpic Power Plus Disinfectant Toilet Cleaner': 'हार्पिक पावर प्लस टॉयलेट क्लीनर',
  'Lizol Disinfectant Floor Cleaner Citrus': 'लायज़ोल फ्लोर क्लीनर',
  'Colin Glass and Surface Cleaner Spray': 'कोलिन ग्लास क्लीनर स्प्रे',
  'Dettol Original Soap': 'डेटॉल ओरिजिनल साबुन',
  'Dettol Original Germ Protection Bath Soap': 'डेटॉल ओरिजिनल बाथिंग सोप',
  'Dove Cream Beauty Bar': 'डव ब्यूटी साबुन',
  'Colgate Strong Teeth Calcium Toothpaste': 'कोलगेट स्ट्रॉन्ग टीथ टूथपेस्ट',
  'Colgate MaxFresh Spicy Fresh Toothpaste': 'कोलगेट मैक्सफ्रेश टूथपेस्ट',
};

// Order & Delivery Status Translations
export const orderStatusTranslations: Record<string, string> = {
  PLACED: 'ऑर्डर दर्ज',
  PENDING: 'लंबित',
  ACCEPTED: 'स्वीकार किया गया',
  CONFIRMED: 'पुष्टि की गई',
  PROCESSING: 'तैयार किया जा रहा है',
  PACKED: 'पैक हो गया',
  ASSIGNED: 'राइडर असाइन हुआ',
  PICKED_UP: 'पिकअप हो गया',
  OUT_FOR_DELIVERY: 'डिलीवरी के लिए निकला',
  DELIVERY_PROOF_PENDING: 'सत्यापन लंबित',
  DELIVERED: 'सफलतापूर्वक डिलीवर',
  CANCELLED: 'रद्द किया गया',
  FAILED: 'असफल',
  DELIVERY_FAILED: 'डिलीवरी असफल',
  RETURNED: 'वापस किया गया',
  REFUNDED: 'रिफंड किया गया',
  ON_DUTY: 'ऑन-ड्यूटी',
  OFF_DUTY: 'ऑफ-ड्यूटी',
  ON_BREAK: 'ब्रेक पर',
};

// Category Notice & Announcement Translations (0ms instant lookup)
export const noticeTranslations: Record<string, string> = {
  // Preset Titles
  'Pan-India Shipping & Delivery Notice': 'अखिल भारतीय शिपिंग और डिलीवरी सूचना',
  'Pan-India Shipping & Handcrafted Order Notice': 'अखिल भारतीय शिपिंग और हस्तनिर्मित ऑर्डर सूचना',
  'Important Notice for Resin Art Customers': 'रेजिन आर्ट ग्राहकों के लिए महत्वपूर्ण सूचना',
  'Important: Custom Order & Policy Notice': 'महत्वपूर्ण: कस्टम ऑर्डर और पॉलिसी सूचना',
  'Important Notice & Customer Guidelines': 'महत्वपूर्ण सूचना एवं ग्राहक दिशानिर्देश',
  'Fragile Handling & Protective Transit Notice': 'सुरक्षित पारगमन और हैंडलिंग सूचना',
  'Pan India': 'पूरे भारत में डिलीवरी',
  'Local Store': 'लोकल स्टोर',

  // Preset Messages
  'We provide reliable Pan-India courier delivery directly to your doorstep within 5–10 business days with safe protective packaging.':
    'हम सुरक्षित सुरक्षात्मक पैकेजिंग के साथ 5-10 कार्य दिवसों के भीतर आपके घर तक विश्वसनीय अखिल भारतीय कूरियर डिलीवरी प्रदान करते हैं।',
  'We provide reliable Pan-India courier delivery directly to your doorstep within 5-10 business days with safe protective packaging.':
    'हम सुरक्षित सुरक्षात्मक पैकेजिंग के साथ 5-10 कार्य दिवसों के भीतर आपके घर तक विश्वसनीय अखिल भारतीय कूरियर डिलीवरी प्रदान करते हैं।',
  'We provide reliable Pan-India courier delivery directly to your doorstep within 4–7 business days with safe protective packaging.':
    'हम सुरक्षित सुरक्षात्मक पैकेजिंग के साथ 5-10 कार्य दिवसों के भीतर आपके घर तक विश्वसनीय अखिल भारतीय कूरियर डिलीवरी प्रदान करते हैं।',
  'We provide reliable Pan-India courier delivery directly to your doorstep within 4-7 business days with safe protective packaging.':
    'हम सुरक्षित सुरक्षात्मक पैकेजिंग के साथ 5-10 कार्य दिवसों के भीतर आपके घर तक विश्वसनीय अखिल भारतीय कूरियर डिलीवरी प्रदान करते हैं।',
  'We provide reliable Pan-India courier delivery directly to your doorstep within 3–7 business days with safe protective packaging.':
    'हम सुरक्षित सुरक्षात्मक पैकेजिंग के साथ 5-10 कार्य दिवसों के भीतर आपके घर तक विश्वसनीय अखिल भारतीय कूरियर डिलीवरी प्रदान करते हैं।',
  'We provide reliable Pan-India courier delivery directly to your doorstep within 3-7 business days with safe protective packaging.':
    'हम सुरक्षित सुरक्षात्मक पैकेजिंग के साथ 5-10 कार्य दिवसों के भीतर आपके घर तक विश्वसनीय अखिल भारतीय कूरियर डिलीवरी प्रदान करते हैं।',
  'Every piece is meticulously handcrafted with premium resin and undergoes an artistic curing process. Because each item is custom-crafted specifically for you, orders cannot be cancelled or modified once crafting begins.':
    'प्रत्येक वस्तु प्रीमियम रेजिन से सावधानीपूर्वक हस्तनिर्मित है। क्योंकि प्रत्येक आइटम विशेष रूप से आपके लिए तैयार किया जाता है, एक बार निर्माण शुरू होने पर ऑर्डर रद्द या संशोधित नहीं किए जा सकते हैं।',
  'All fragile resin artworks are packed in multi-layer shockproof bubble wrap to ensure complete protection during all-India courier transit.':
    'अखिल भारतीय कूरियर पारगमन के दौरान पूर्ण सुरक्षा सुनिश्चित करने के लिए सभी रेजिन कलाकृतियों को बहु-स्तरीय शॉकप्रूफ बबल रैप में सुरक्षित पैक किया जाता है।',
};

// Common UI Strings
export const uiTranslations: Record<Language, Record<string, string>> = {
  en: {
    home: 'Home',
    categories: 'Categories',
    search: 'Search',
    cart: 'Cart',
    myCart: 'My Basket',
    orders: 'Orders',
    account: 'Account',
    profile: 'Profile',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    welcomeBack: 'Welcome',
    helloSignIn: 'Sign In',
    deliveryIn: 'Delivery in',
    deliveryPaused: 'Delivery Paused',
    selectAddress: 'Select Address',
    searchPlaceholder: 'Search for milk, chips, veggies...',
    seeAll: 'See all',
    offers: 'Offers',
    new: 'NEW',
    items: 'items',
    item: 'item',
    inStock: 'In stock',
    outOfStock: 'Out of stock',
    off: 'OFF',
    add: 'ADD',
    addedToBasket: 'Added to basket',
    subtotal: 'Item Total',
    deliveryFee: 'Delivery Fee',
    freeDelivery: 'FREE Delivery',
    totalPayable: 'To Pay',
    proceedToCheckout: 'Proceed to Pay',
    emptyCart: 'Your basket is empty',
    startShopping: 'Start Shopping',
    shopByCategory: 'Shop by Category',
    bestSellers: 'Best Sellers',
    topPicks: 'Picked for You',
    recommended: 'Recommended for You',
    specialOffers: 'Special Offers',
    recentlyViewed: 'Recently Viewed',
    comingSoon: 'Coming Soon',
    soon: 'SOON',
    soonBadge: 'Soon',
    categoryComingSoonTitle: 'Opening Soon',
    categoryComingSoonDesc: 'We are stocking up fresh products for this category. Check back shortly!',
    pleaseRemove: 'Please remove',
    removeToCheckout: 'Remove to checkout',
    cartOosAlertTitle: 'Items Out of Stock',
    cartOosAlertDesc: 'Please remove out of stock items from your basket before placing order.',
    remove: 'Remove',
    shopNow: 'Shop Now',
    exploreMore: 'Explore more fresh daily essentials',
    paymentMethod: 'Payment Method',
    cashOnDelivery: 'Cash on Delivery (COD)',
    deliveryAddress: 'Delivery Address',
    addAddress: 'Add New Address',
    orderSummary: 'Order Summary',
    saved: 'SAVED',
    viewDetails: 'View Details',
    cancelOrder: 'Cancel Order',
    trackOrder: 'Track Order',
    needHelp: 'Need Help?',
  },
  hi: {
    home: 'होम',
    categories: 'कैटेगरी',
    search: 'सर्च',
    cart: 'कार्ट',
    myCart: 'मेरी टोकरी',
    orders: 'ऑर्डर्स',
    account: 'अकाउंट',
    profile: 'प्रोफाइल',
    signIn: 'साइन इन',
    signOut: 'लॉग आउट',
    welcomeBack: 'स्वागत है',
    helloSignIn: 'साइन इन',
    deliveryIn: 'डिलीवरी समय',
    deliveryPaused: 'डिलीवरी रुकी हुई है',
    selectAddress: 'डिलीवरी पता चुनें',
    searchPlaceholder: 'दूध, प्याज, ब्रेड, नमकीन खोजें...',
    seeAll: 'सभी देखें',
    offers: 'ऑफ़र्स',
    new: 'नया',
    items: 'सामान',
    item: 'सामान',
    inStock: 'उपलब्ध है',
    outOfStock: 'स्टॉक में नहीं है',
    off: 'छूट',
    add: 'जोड़ें',
    addedToBasket: 'टोकरी में जोड़ दिया',
    subtotal: 'सामान का मूल्य',
    deliveryFee: 'डिलीवरी शुल्क',
    freeDelivery: 'मुफ़्त डिलीवरी',
    totalPayable: 'कुल भुगतान',
    proceedToCheckout: 'भुगतान के लिए आगे बढ़ें',
    emptyCart: 'आपकी टोकरी खाली है',
    startShopping: 'खरीदारी शुरू करें',
    shopByCategory: 'कैटेगरी के अनुसार खरीदें',
    bestSellers: 'सर्वाधिक बिकने वाले',
    topPicks: 'खास आपके लिए',
    recommended: 'सुझाए गए उत्पाद',
    specialOffers: 'विशेष बचत ऑफर्स',
    recentlyViewed: 'हाल ही में देखे गए',
    comingSoon: 'जल्द आ रहा है',
    soon: 'जल्द आएगा',
    soonBadge: 'जल्द',
    categoryComingSoonTitle: 'जल्द शुरू हो रहा है',
    categoryComingSoonDesc: 'हम इस कैटेगरी के लिए ताज़ा उत्पाद ला रहे हैं। जल्द ही उपलब्ध होगा!',
    pleaseRemove: 'कृपया हटाएं',
    removeToCheckout: 'ऑर्डर के लिए हटाएं',
    cartOosAlertTitle: 'सामान स्टॉक में नहीं है',
    cartOosAlertDesc: 'ऑर्डर करने से पहले कृपया स्टॉक में न होने वाले सामान को हटाएं।',
    remove: 'हटाएं',
    shopNow: 'अभी खरीदें',
    exploreMore: 'ताज़ा रोज़मर्रा का सामान खरीदें',
    paymentMethod: 'भुगतान का तरीका',
    cashOnDelivery: 'कैश ऑन डिलीवरी (COD)',
    deliveryAddress: 'डिलीवरी पता',
    addAddress: 'नया पता जोड़ें',
    orderSummary: 'ऑर्डर विवरण',
    saved: 'बचत',
    viewDetails: 'विवरण देखें',
    cancelOrder: 'ऑर्डर रद्द करें',
    trackOrder: 'ऑर्डर ट्रैक करें',
    needHelp: 'मदद चाहिए?',
  },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string, fallback?: string) => string;
  tCat: (name: string) => string;
  tProd: (input: any) => string;
  tText: (text: string) => string;
  tStatus: (status: string) => string;
  tEta: (eta: string) => string;
  prefetchTranslations: (items: any[]) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
  t: (key: string, fallback = '') => fallback || key,
  tCat: (name: string) => name || '',
  tProd: (input: any) => (typeof input === 'object' && input ? input.name || '' : String(input || '')),
  tText: (text: string) => text || '',
  tStatus: (status: string) => status || '',
  tEta: (eta: string) => eta || '',
  prefetchTranslations: () => {},
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>('en');
  const [, setRerenderTick] = useState(0);

  // Load language preference from local storage on launch
  useEffect(() => {
    AsyncStorage.getItem(LANG_STORAGE_KEY)
      .then(stored => {
        if (stored === 'hi' || stored === 'en') {
          setLangState(stored);
        }
      })
      .catch(() => {});
  }, []);

  // Listen to background auto-translation updates to re-render UI in real time
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('R2CART_TRANSLATION_UPDATED', () => {
      setRerenderTick(t => t + 1);
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    AsyncStorage.setItem(LANG_STORAGE_KEY, newLang).catch(() => {});
  }, []);

  const toggleLang = useCallback(() => {
    setLangState(prev => {
      const next = prev === 'hi' ? 'en' : 'hi';
      AsyncStorage.setItem(LANG_STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const t = useCallback(
    (key: string, fallback = ''): string => {
      return uiTranslations[lang]?.[key] || fallback || key;
    },
    [lang]
  );

  /**
   * Category Translation with Instant Lookup + Live Auto-Translate fallback
   */
  const tCat = useCallback(
    (name: string): string => {
      if (!name) return '';
      if (lang !== 'hi') return name;

      const trimmed = name.trim();
      if (categoryTranslations[trimmed]) {
        return categoryTranslations[trimmed];
      }
      for (const [enKey, hiVal] of Object.entries(categoryTranslations)) {
        if (trimmed.toLowerCase() === enKey.toLowerCase()) {
          return hiVal;
        }
      }

      // Check auto-translation cache
      const cached = getCachedHindi(trimmed);
      if (cached) return cached;

      // Asynchronously translate from live backend data and auto-cache
      translateToHindi(trimmed).catch(() => {});
      return name;
    },
    [lang]
  );

  /**
   * Product Name Translation with Backend DB Fields + Instant Dictionary + Live Auto-Translate
   */
  const tProd = useCallback(
    (input: any): string => {
      if (!input) return '';
      const rawName =
        typeof input === 'object' && input
          ? input.nameHi || input.name_hi || input.metadata?.nameHi || input.name || ''
          : String(input || '');

      if (lang !== 'hi') {
        return typeof input === 'object' && input ? input.name || rawName : rawName;
      }

      // 1. If backend database provided nameHi directly, prioritize it
      if (typeof input === 'object' && input && (input.nameHi || input.name_hi || input.metadata?.nameHi)) {
        return input.nameHi || input.name_hi || input.metadata?.nameHi;
      }

      const trimmed = rawName.trim();
      if (!trimmed) return '';

      // 2. Instant dictionary match (0ms)
      if (productTranslations[trimmed]) {
        return productTranslations[trimmed];
      }
      for (const [enName, hiName] of Object.entries(productTranslations)) {
        if (trimmed.toLowerCase() === enName.toLowerCase()) {
          return hiName;
        }
      }

      // 3. Persistent Auto-Translation Cache
      const autoCached = getCachedHindi(trimmed);
      if (autoCached) {
        return autoCached;
      }

      // 4. Asynchronously translate live product name from backend
      translateToHindi(trimmed).catch(() => {});
      return trimmed;
    },
    [lang]
  );

  /**
   * Arbitrary Text / Description & Notice Translation
   */
  const tText = useCallback(
    (text: string): string => {
      if (!text || typeof text !== 'string') return '';
      if (lang !== 'hi') return text;

      const trimmed = text.trim();
      if (!trimmed) return '';

      // 1. Instant notice dictionary match (0ms)
      if (noticeTranslations[trimmed]) {
        return noticeTranslations[trimmed];
      }
      for (const [enKey, hiVal] of Object.entries(noticeTranslations)) {
        if (trimmed.toLowerCase() === enKey.toLowerCase()) {
          return hiVal;
        }
      }

      // 2. Persistent Auto-Translation Cache
      const cached = getCachedHindi(trimmed);
      if (cached) return cached;

      // 3. Asynchronously translate via engine and auto-cache
      translateToHindi(trimmed).catch(() => {});
      return trimmed;
    },
    [lang]
  );

  /**
   * Order & Delivery Status Translation
   */
  const tStatus = useCallback(
    (status: string): string => {
      if (!status) return '';
      if (lang !== 'hi') return status;
      const clean = status.trim().toUpperCase();
      return orderStatusTranslations[clean] || status;
    },
    [lang]
  );

  const tEta = useCallback(
    (eta: string): string => {
      if (!eta) return lang === 'hi' ? '15–20 मिनट' : '15–20 mins';
      let formatted = String(eta)
        .replace(/3-7/g, '5-10')
        .replace(/3–7/g, '5-10')
        .replace(/4-7/g, '5-10')
        .replace(/4–7/g, '5-10');
      if (lang !== 'hi') return formatted;
      return formatted
        .replace(/minutes/gi, 'मिनट')
        .replace(/minute/gi, 'मिनट')
        .replace(/mins/gi, 'मिनट')
        .replace(/min/gi, 'मिनट')
        .replace(/Business Days/gi, 'कार्य दिवस')
        .replace(/Days/gi, 'दिन')
        .replace(/Day/gi, 'दिन')
        .replace(/Courier/gi, 'कूरियर')
        .replace(/delivery in/gi, 'डिलीवरी समय');
    },
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang,
      t,
      tCat,
      tProd,
      tText,
      tStatus,
      tEta,
      prefetchTranslations,
    }),
    [lang, setLang, toggleLang, t, tCat, tProd, tText, tStatus, tEta]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
