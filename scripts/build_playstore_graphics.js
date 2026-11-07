/**
 * Ultra-Premium Google Play Store Asset Generator for R2Cart
 * Quick-Commerce Aesthetic (Zepto / Blinkit / Apple App Store featured style)
 * Generates:
 * 1. 5x Phone Screenshots (1080 x 2280)
 * 2. 5x 7-Inch Tablet Screenshots (1200 x 1920)
 * 3. 5x 10-Inch Tablet Screenshots (1600 x 2560)
 * 4. 1x Feature Graphic (1024 x 500)
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const USER_UPLOADED_DIR = 'C:/Users/ACER/.gemini/antigravity/brain/7a53e94c-42b8-4b01-b4fd-5819b0abfba9/.user_uploaded/';
const ASSETS_IMAGES_DIR = path.resolve(__dirname, '../src/assets/images');
const OUTPUT_BASE_DIR = path.resolve(__dirname, '../google_play_assets');

const DIRS = {
  phone: path.join(OUTPUT_BASE_DIR, 'phone_screenshots'),
  tablet7: path.join(OUTPUT_BASE_DIR, 'tablet_7inch_screenshots'),
  tablet10: path.join(OUTPUT_BASE_DIR, 'tablet_10inch_screenshots'),
  feature: path.join(OUTPUT_BASE_DIR, 'feature_graphic'),
};

Object.values(DIRS).forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const SCREENSHOT_MAP = {
  home: path.join(USER_UPLOADED_DIR, 'media_1793893669146_2f17bda8.jpg'),
  categories: path.join(USER_UPLOADED_DIR, 'media_1793893679732_b4b4d7f4.jpg'),
  cart: path.join(USER_UPLOADED_DIR, 'media_1793893704309_05af7597.jpg'),
  orders: path.join(USER_UPLOADED_DIR, 'media_1793893688033_e241c97b.jpg'),
  account: path.join(USER_UPLOADED_DIR, 'media_1793893695712_4fafaf40.jpg'),
};

const LOGO_PATH = path.join(ASSETS_IMAGES_DIR, 'logo.png');

const SCREEN_CONFIGS = [
  {
    key: 'home',
    order: '01',
    outName: '01_home_screen.png',
    badge: '⚡ 10-20 MINS EXPRESS DELIVERY',
    badgeColor: '#FEF08A',
    titleLine1: 'Groceries Delivered',
    titleLine2: 'In 10 to 20 Minutes',
    highlightColor: '#FDE047',
    subtitle: 'Farm-fresh veggies, dairy, staples & daily essentials at lowest prices',
    gradientStart: '#064E3B',
    gradientMid: '#022C22',
    gradientEnd: '#031712',
    glowColor: '#10B981',
    accentColor: '#34D399',
    card1: {
      pos: 'right',
      icon: '⚡',
      iconBg: '#ECFDF5',
      iconColor: '#059669',
      title: '10-20 Mins Delivery',
      sub: 'Lightning-fast doorstep ETA',
    },
    card2: {
      pos: 'left',
      icon: '🥬',
      iconBg: '#F0FDF4',
      iconColor: '#16A34A',
      title: '100% Farm Fresh',
      sub: 'Handpicked daily quality',
    },
  },
  {
    key: 'categories',
    order: '02',
    outName: '02_categories_screen.png',
    badge: '🛒 1000+ PRODUCTS & CATEGORIES',
    badgeColor: '#6EE7B7',
    titleLine1: 'Explore 1,000+ Items',
    titleLine2: 'Everything You Need',
    highlightColor: '#6EE7B7',
    subtitle: 'From daily milk & snacks to fresh produce, drinks & household essentials',
    gradientStart: '#0F766E',
    gradientMid: '#042F2E',
    gradientEnd: '#021817',
    glowColor: '#2DD4BF',
    accentColor: '#14B8A6',
    card1: {
      pos: 'right',
      icon: '🏷️',
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      title: 'Best Price Deals',
      sub: 'Flat ₹100 OFF first order',
    },
    card2: {
      pos: 'left',
      icon: '🍎',
      iconBg: '#FEE2E2',
      iconColor: '#DC2626',
      title: 'Fresh Fruits & Veg',
      sub: 'Cleaned, packed & hygienic',
    },
  },
  {
    key: 'cart',
    order: '03',
    outName: '03_cart_screen.png',
    badge: '💳 SMART SAVINGS & FREE DELIVERY',
    badgeColor: '#FDE047',
    titleLine1: 'Instant Checkout &',
    titleLine2: 'Free Delivery Slots',
    highlightColor: '#FDE047',
    subtitle: 'Apply promo coupons, choose doorstep slots & pay securely with zero fuss',
    gradientStart: '#065F46',
    gradientMid: '#064E3B',
    gradientEnd: '#022C22',
    glowColor: '#F59E0B',
    accentColor: '#10B981',
    card1: {
      pos: 'right',
      icon: '🎉',
      iconBg: '#ECFDF5',
      iconColor: '#059669',
      title: 'FREE Delivery',
      sub: 'Unlocked on your cart',
    },
    card2: {
      pos: 'left',
      icon: '💳',
      iconBg: '#EFF6FF',
      iconColor: '#2563EB',
      title: '1-Tap Easy Checkout',
      sub: 'UPI, Cards & Cash on Delivery',
    },
  },
  {
    key: 'orders',
    order: '04',
    outName: '04_orders_screen.png',
    badge: '🚚 REAL-TIME LIVE TRACKING',
    badgeColor: '#38BDF8',
    titleLine1: 'Live Order Tracking',
    titleLine2: 'Straight to Your Door',
    highlightColor: '#38BDF8',
    subtitle: 'Watch your delivery partner arrive live on map with timely status updates',
    gradientStart: '#0E7490',
    gradientMid: '#064E3B',
    gradientEnd: '#030712',
    glowColor: '#06B6D4',
    accentColor: '#38BDF8',
    card1: {
      pos: 'right',
      icon: '📍',
      iconBg: '#E0F2FE',
      iconColor: '#0284C7',
      title: 'Live Rider Status',
      sub: 'Packed & out for delivery',
    },
    card2: {
      pos: 'left',
      icon: '⏱️',
      iconBg: '#ECFDF5',
      iconColor: '#059669',
      title: 'On-Time Guarantee',
      sub: 'Timely doorstep fulfillment',
    },
  },
  {
    key: 'account',
    order: '05',
    outName: '05_account_screen.png',
    badge: '👤 MULTI-LANGUAGE & 24/7 SUPPORT',
    badgeColor: '#FEF08A',
    titleLine1: 'Your Neighborhood Mart',
    titleLine2: 'Always At Your Service',
    highlightColor: '#FDE047',
    subtitle: 'English & Hindi support, saved addresses, re-orders & instant priority help',
    gradientStart: '#047857',
    gradientMid: '#1E1B4B',
    gradientEnd: '#051310',
    glowColor: '#818CF8',
    accentColor: '#34D399',
    card1: {
      pos: 'right',
      icon: '⭐',
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      title: '4.9★ Customer Rating',
      sub: 'Loved by thousands of shoppers',
    },
    card2: {
      pos: 'left',
      icon: '🇮🇳',
      iconBg: '#F0FDF4',
      iconColor: '#15803D',
      title: 'हिंदी & English App',
      sub: '1-tap language switch',
    },
  },
];

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Prepares clean app screenshot:
 * Crops top 46px (status bar) and bottom 20px (home navigation bar)
 * Scales to exact width/height and clips to rounded corners
 */
async function prepareScreenContent(srcPath, targetW, targetH, radius) {
  const cropped = await sharp(srcPath)
    .extract({ left: 0, top: 46, width: 460, height: 954 })
    .toBuffer();

  const maskSvg = Buffer.from(`
    <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${targetW}" height="${targetH}" rx="${radius}" ry="${radius}" fill="#ffffff" />
    </svg>
  `);

  return sharp(cropped)
    .resize(targetW, targetH, { fit: 'fill' })
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

/**
 * 1. PHONE SCREENSHOTS (1080 x 2280)
 * Ultra-premium quick commerce look with full-bleed mesh gradient,
 * titanium device frame, subtle glare reflection, dynamic island,
 * and 3D floating badge cards overlapping the phone bezel.
 */
async function generatePhoneScreenshots() {
  console.log('--- Generating 5x Ultra-Premium Phone Screenshots (1080 x 2280) ---');
  const canvasW = 1080;
  const canvasH = 2280;

  // Phone Mockup Dimensions
  const phoneW = 840;
  const phoneH = 1680;
  const phoneX = (canvasW - phoneW) / 2; // 120
  const phoneY = 490;
  const phoneRadius = 52;

  const bezelWidth = 14;
  const screenW = phoneW - (bezelWidth * 2); // 812
  const screenH = phoneH - (bezelWidth * 2); // 1652
  const screenX = phoneX + bezelWidth;       // 134
  const screenY = phoneY + bezelWidth;       // 504
  const screenRadius = 40;

  for (const cfg of SCREEN_CONFIGS) {
    const srcPath = SCREENSHOT_MAP[cfg.key];
    const outPath = path.join(DIRS.phone, cfg.outName);

    const screenBuffer = await prepareScreenContent(srcPath, screenW, screenH, screenRadius);

    // Dynamic Island dimensions
    const islandW = 126;
    const islandH = 30;
    const islandX = screenX + (screenW - islandW) / 2;
    const islandY = screenY + 12;

    // Floating Card 1 (Top-Right overlap)
    const card1W = 340;
    const card1H = 82;
    const card1X = canvasW - card1W - 40;
    const card1Y = phoneY + 130;

    // Floating Card 2 (Bottom-Left overlap)
    const card2W = 340;
    const card2H = 82;
    const card2X = 40;
    const card2Y = phoneY + phoneH - 170;

    // Background SVG with full-bleed mesh, lighting glows, typography, titanium frame & drop shadows
    const backgroundSvg = `
      <svg width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Full-Bleed Mesh Gradient -->
          <linearGradient id="meshGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${cfg.gradientStart}" />
            <stop offset="45%" stop-color="${cfg.gradientMid}" />
            <stop offset="100%" stop-color="${cfg.gradientEnd}" />
          </linearGradient>

          <!-- Top Ambient Spotlight Glow -->
          <radialGradient id="topSpotlight" cx="50%" cy="12%" r="48%">
            <stop offset="0%" stop-color="${cfg.glowColor}" stop-opacity="0.42" />
            <stop offset="60%" stop-color="${cfg.glowColor}" stop-opacity="0.12" />
            <stop offset="100%" stop-color="${cfg.gradientStart}" stop-opacity="0" />
          </radialGradient>

          <!-- Side Accent Glow -->
          <radialGradient id="accentGlow" cx="90%" cy="65%" r="45%">
            <stop offset="0%" stop-color="${cfg.accentColor}" stop-opacity="0.25" />
            <stop offset="100%" stop-color="${cfg.gradientEnd}" stop-opacity="0" />
          </radialGradient>

          <!-- Realistic Phone Deep Drop Shadow -->
          <filter id="phoneShadow" x="-30%" y="-15%" width="160%" height="150%">
            <feDropShadow dx="0" dy="48" stdDeviation="46" flood-color="#000000" flood-opacity="0.65" />
            <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#011812" flood-opacity="0.45" />
          </filter>

          <!-- Floating Pill Shadow -->
          <filter id="pillShadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000000" flood-opacity="0.38" />
          </filter>

          <!-- Titanium Bezel Metallic Stroke Gradient -->
          <linearGradient id="titaniumStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#94A3B8" />
            <stop offset="30%" stop-color="#334155" />
            <stop offset="70%" stop-color="#64748B" />
            <stop offset="100%" stop-color="#1E293B" />
          </linearGradient>

          <!-- Front Glass Reflection Gloss Gradient -->
          <linearGradient id="glassGloss" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.14" />
            <stop offset="35%" stop-color="#FFFFFF" stop-opacity="0.04" />
            <stop offset="70%" stop-color="#FFFFFF" stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- Full-Bleed Background -->
        <rect width="${canvasW}" height="${canvasH}" fill="url(#meshGrad)" />
        <rect width="${canvasW}" height="${canvasH}" fill="url(#topSpotlight)" />
        <rect width="${canvasW}" height="${canvasH}" fill="url(#accentGlow)" />

        <!-- Subtle Ambient Geometry / Rings -->
        <circle cx="960" cy="120" r="220" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="38" />
        <circle cx="120" cy="480" r="180" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="28" />
        <circle cx="920" cy="1800" r="300" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="48" />

        <!-- Frosted Glass Category Chip -->
        <g transform="translate(${canvasW / 2}, 82)">
          <rect x="-240" y="0" width="480" height="46" rx="23" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.28)" stroke-width="1.2" />
          <text x="0" y="30" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="15" font-weight="800" fill="${cfg.badgeColor}" letter-spacing="0.8">
            ${escapeXml(cfg.badge)}
          </text>
        </g>

        <!-- Main Title Line 1 -->
        <text x="${canvasW / 2}" y="194" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="58" font-weight="900" fill="#FFFFFF" letter-spacing="-0.8">
          ${escapeXml(cfg.titleLine1)}
        </text>

        <!-- Main Title Line 2 (Punchy Accent) -->
        <text x="${canvasW / 2}" y="262" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="60" font-weight="900" fill="${cfg.highlightColor}" letter-spacing="-0.8">
          ${escapeXml(cfg.titleLine2)}
        </text>

        <!-- Subtitle -->
        <text x="${canvasW / 2}" y="324" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="22" font-weight="500" fill="#E2E8F0" letter-spacing="0.2">
          ${escapeXml(cfg.subtitle)}
        </text>

        <!-- Titanium Phone Mockup Frame & Shadows -->
        <g filter="url(#phoneShadow)">
          <!-- Outer Phone Frame -->
          <rect x="${phoneX}" y="${phoneY}" width="${phoneW}" height="${phoneH}" rx="${phoneRadius}" ry="${phoneRadius}" fill="#0F172A" stroke="url(#titaniumStroke)" stroke-width="3" />
          <!-- Inner OLED Bezel Background -->
          <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${screenH}" rx="${screenRadius}" ry="${screenRadius}" fill="#020617" />
        </g>
      </svg>
    `;

    // Foreground SVG: Dynamic Island, Glass reflection, Home bar, and Floating 3D Cards
    const overlaySvg = Buffer.from(`
      <svg width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="ovPillShadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#000000" flood-opacity="0.45" />
          </filter>
        </defs>

        <!-- Front Screen Diagonal Glass Gloss Reflection -->
        <path d="M ${screenX} ${screenY} L ${screenX + screenW} ${screenY} L ${screenX + screenW} ${screenY + 360} L ${screenX} ${screenY + 700} Z" fill="url(#glassGloss)" opacity="0.6" />

        <!-- Dynamic Island Cutout -->
        <rect x="${islandX}" y="${islandY}" width="${islandW}" height="${islandH}" rx="${islandH / 2}" fill="#020617" />
        <!-- Front Camera Lens & Optical Glare -->
        <circle cx="${islandX + islandW - 28}" cy="${islandY + islandH / 2}" r="5.5" fill="#0B1329" />
        <circle cx="${islandX + islandW - 27}" cy="${islandY + islandH / 2 - 1}" r="2" fill="#38BDF8" opacity="0.85" />
        <circle cx="${islandX + 28}" cy="${islandY + islandH / 2}" r="3.5" fill="#0B1329" />

        <!-- Home Bar Indicator -->
        <rect x="${(canvasW - 180) / 2}" y="${screenY + screenH - 16}" width="180" height="5" rx="2.5" fill="#CBD5E1" opacity="0.85" />

        <!-- 3D Floating Feature Card 1 (Top-Right) -->
        <g transform="translate(${card1X}, ${card1Y})" filter="url(#ovPillShadow)">
          <rect x="0" y="0" width="${card1W}" height="${card1H}" rx="22" fill="#FFFFFF" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" />
          <!-- Icon Circle -->
          <circle cx="44" cy="41" r="24" fill="${cfg.card1.iconBg}" />
          <text x="44" y="48" text-anchor="middle" font-size="20">${cfg.card1.icon}</text>
          <!-- Text -->
          <text x="82" y="34" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="800" fill="#0F172A">
            ${escapeXml(cfg.card1.title)}
          </text>
          <text x="82" y="56" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="600" fill="${cfg.card1.iconColor}">
            ${escapeXml(cfg.card1.sub)}
          </text>
        </g>

        <!-- 3D Floating Feature Card 2 (Bottom-Left) -->
        <g transform="translate(${card2X}, ${card2Y})" filter="url(#ovPillShadow)">
          <rect x="0" y="0" width="${card2W}" height="${card2H}" rx="22" fill="#FFFFFF" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" />
          <!-- Icon Circle -->
          <circle cx="44" cy="41" r="24" fill="${cfg.card2.iconBg}" />
          <text x="44" y="48" text-anchor="middle" font-size="20">${cfg.card2.icon}</text>
          <!-- Text -->
          <text x="82" y="34" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="800" fill="#0F172A">
            ${escapeXml(cfg.card2.title)}
          </text>
          <text x="82" y="56" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="600" fill="${cfg.card2.iconColor}">
            ${escapeXml(cfg.card2.sub)}
          </text>
        </g>
      </svg>
    `);

    await sharp(Buffer.from(backgroundSvg))
      .composite([
        { input: screenBuffer, top: screenY, left: screenX },
        { input: overlaySvg, top: 0, left: 0 }
      ])
      .png({ quality: 96 })
      .toFile(outPath);

    console.log(`✓ Phone: ${cfg.outName}`);
  }
}

/**
 * 2. 7-INCH TABLET SCREENSHOTS (1200 x 1920)
 * Scaled and balanced for 7-inch tablet displays
 */
async function generateTablet7Screenshots() {
  console.log('--- Generating 5x Ultra-Premium 7-Inch Tablet Screenshots (1200 x 1920) ---');
  const canvasW = 1200;
  const canvasH = 1920;

  const tabletW = 860;
  const tabletH = 1380;
  const tabletX = (canvasW - tabletW) / 2; // 170
  const tabletY = 440;
  const tabletRadius = 44;

  const bezelWidth = 14;
  const screenW = tabletW - (bezelWidth * 2); // 832
  const screenH = tabletH - (bezelWidth * 2); // 1352
  const screenX = tabletX + bezelWidth;       // 184
  const screenY = tabletY + bezelWidth;       // 454
  const screenRadius = 34;

  for (const cfg of SCREEN_CONFIGS) {
    const srcPath = SCREENSHOT_MAP[cfg.key];
    const outName = `${cfg.order}_tablet7_${cfg.key}.png`;
    const outPath = path.join(DIRS.tablet7, outName);

    const screenBuffer = await prepareScreenContent(srcPath, screenW, screenH, screenRadius);

    // Floating Card 1 & 2
    const card1W = 320;
    const card1H = 76;
    const card1X = canvasW - card1W - 50;
    const card1Y = tabletY + 110;

    const card2W = 320;
    const card2H = 76;
    const card2X = 50;
    const card2Y = tabletY + tabletH - 140;

    const backgroundSvg = `
      <svg width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="t7Grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${cfg.gradientStart}" />
            <stop offset="45%" stop-color="${cfg.gradientMid}" />
            <stop offset="100%" stop-color="${cfg.gradientEnd}" />
          </linearGradient>

          <radialGradient id="t7Glow" cx="50%" cy="12%" r="50%">
            <stop offset="0%" stop-color="${cfg.glowColor}" stop-opacity="0.4" />
            <stop offset="100%" stop-color="${cfg.gradientStart}" stop-opacity="0" />
          </radialGradient>

          <filter id="t7Shadow" x="-25%" y="-15%" width="150%" height="140%">
            <feDropShadow dx="0" dy="40" stdDeviation="42" flood-color="#000000" flood-opacity="0.6" />
          </filter>
        </defs>

        <rect width="${canvasW}" height="${canvasH}" fill="url(#t7Grad)" />
        <rect width="${canvasW}" height="${canvasH}" fill="url(#t7Glow)" />

        <circle cx="1080" cy="110" r="200" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="32" />
        <circle cx="100" cy="420" r="160" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="26" />

        <!-- Badge -->
        <g transform="translate(${canvasW / 2}, 72)">
          <rect x="-230" y="0" width="460" height="44" rx="22" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.28)" stroke-width="1.2" />
          <text x="0" y="29" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14.5" font-weight="800" fill="${cfg.badgeColor}" letter-spacing="0.7">
            ${escapeXml(cfg.badge)}
          </text>
        </g>

        <!-- Title Lines -->
        <text x="${canvasW / 2}" y="176" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="52" font-weight="900" fill="#FFFFFF" letter-spacing="-0.8">
          ${escapeXml(cfg.titleLine1)}
        </text>
        <text x="${canvasW / 2}" y="238" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="54" font-weight="900" fill="${cfg.highlightColor}" letter-spacing="-0.8">
          ${escapeXml(cfg.titleLine2)}
        </text>

        <!-- Subtitle -->
        <text x="${canvasW / 2}" y="296" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="20.5" font-weight="500" fill="#E2E8F0">
          ${escapeXml(cfg.subtitle)}
        </text>

        <!-- Tablet Mockup Bezel -->
        <g filter="url(#t7Shadow)">
          <rect x="${tabletX}" y="${tabletY}" width="${tabletW}" height="${tabletH}" rx="${tabletRadius}" ry="${tabletRadius}" fill="#0F172A" stroke="#334155" stroke-width="2.5" />
          <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${screenH}" rx="${screenRadius}" ry="${screenRadius}" fill="#020617" />
        </g>
      </svg>
    `;

    const overlaySvg = Buffer.from(`
      <svg width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="t7PillShadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000000" flood-opacity="0.4" />
          </filter>
        </defs>

        <!-- Front Camera Pin -->
        <circle cx="${canvasW / 2}" cy="${screenY + 12}" r="4.5" fill="#020617" />

        <!-- Floating Card 1 (Top-Right) -->
        <g transform="translate(${card1X}, ${card1Y})" filter="url(#t7PillShadow)">
          <rect x="0" y="0" width="${card1W}" height="${card1H}" rx="20" fill="#FFFFFF" stroke="rgba(255,255,255,0.9)" stroke-width="1.2" />
          <circle cx="38" cy="38" r="22" fill="${cfg.card1.iconBg}" />
          <text x="38" y="45" text-anchor="middle" font-size="18">${cfg.card1.icon}</text>
          <text x="74" y="32" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="15" font-weight="800" fill="#0F172A">
            ${escapeXml(cfg.card1.title)}
          </text>
          <text x="74" y="52" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="12" font-weight="600" fill="${cfg.card1.iconColor}">
            ${escapeXml(cfg.card1.sub)}
          </text>
        </g>

        <!-- Floating Card 2 (Bottom-Left) -->
        <g transform="translate(${card2X}, ${card2Y})" filter="url(#t7PillShadow)">
          <rect x="0" y="0" width="${card2W}" height="${card2H}" rx="20" fill="#FFFFFF" stroke="rgba(255,255,255,0.9)" stroke-width="1.2" />
          <circle cx="38" cy="38" r="22" fill="${cfg.card2.iconBg}" />
          <text x="38" y="45" text-anchor="middle" font-size="18">${cfg.card2.icon}</text>
          <text x="74" y="32" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="15" font-weight="800" fill="#0F172A">
            ${escapeXml(cfg.card2.title)}
          </text>
          <text x="74" y="52" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="12" font-weight="600" fill="${cfg.card2.iconColor}">
            ${escapeXml(cfg.card2.sub)}
          </text>
        </g>
      </svg>
    `);

    await sharp(Buffer.from(backgroundSvg))
      .composite([
        { input: screenBuffer, top: screenY, left: screenX },
        { input: overlaySvg, top: 0, left: 0 }
      ])
      .png({ quality: 96 })
      .toFile(outPath);

    console.log(`✓ Tablet 7": ${outName}`);
  }
}

/**
 * 3. 10-INCH TABLET SCREENSHOTS (1600 x 2560)
 * High-definition graphics tailored for large tablet displays
 */
async function generateTablet10Screenshots() {
  console.log('--- Generating 5x Ultra-Premium 10-Inch Tablet Screenshots (1600 x 2560) ---');
  const canvasW = 1600;
  const canvasH = 2560;

  const tabletW = 1180;
  const tabletH = 1860;
  const tabletX = (canvasW - tabletW) / 2; // 210
  const tabletY = 580;
  const tabletRadius = 54;

  const bezelWidth = 18;
  const screenW = tabletW - (bezelWidth * 2); // 1144
  const screenH = tabletH - (bezelWidth * 2); // 1824
  const screenX = tabletX + bezelWidth;       // 228
  const screenY = tabletY + bezelWidth;       // 598
  const screenRadius = 42;

  for (const cfg of SCREEN_CONFIGS) {
    const srcPath = SCREENSHOT_MAP[cfg.key];
    const outName = `${cfg.order}_tablet10_${cfg.key}.png`;
    const outPath = path.join(DIRS.tablet10, outName);

    const screenBuffer = await prepareScreenContent(srcPath, screenW, screenH, screenRadius);

    const card1W = 420;
    const card1H = 98;
    const card1X = canvasW - card1W - 70;
    const card1Y = tabletY + 160;

    const card2W = 420;
    const card2H = 98;
    const card2X = 70;
    const card2Y = tabletY + tabletH - 180;

    const backgroundSvg = `
      <svg width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="t10Grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${cfg.gradientStart}" />
            <stop offset="45%" stop-color="${cfg.gradientMid}" />
            <stop offset="100%" stop-color="${cfg.gradientEnd}" />
          </linearGradient>

          <radialGradient id="t10Glow" cx="50%" cy="12%" r="50%">
            <stop offset="0%" stop-color="${cfg.glowColor}" stop-opacity="0.42" />
            <stop offset="100%" stop-color="${cfg.gradientStart}" stop-opacity="0" />
          </radialGradient>

          <filter id="t10Shadow" x="-25%" y="-15%" width="150%" height="140%">
            <feDropShadow dx="0" dy="50" stdDeviation="55" flood-color="#000000" flood-opacity="0.65" />
          </filter>
        </defs>

        <rect width="${canvasW}" height="${canvasH}" fill="url(#t10Grad)" />
        <rect width="${canvasW}" height="${canvasH}" fill="url(#t10Glow)" />

        <circle cx="1450" cy="140" r="260" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="42" />
        <circle cx="140" cy="560" r="220" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="34" />

        <!-- Badge -->
        <g transform="translate(${canvasW / 2}, 95)">
          <rect x="-300" y="0" width="600" height="58" rx="29" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.28)" stroke-width="1.5" />
          <text x="0" y="38" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="19" font-weight="800" fill="${cfg.badgeColor}" letter-spacing="0.8">
            ${escapeXml(cfg.badge)}
          </text>
        </g>

        <!-- Title Lines -->
        <text x="${canvasW / 2}" y="235" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="68" font-weight="900" fill="#FFFFFF" letter-spacing="-1">
          ${escapeXml(cfg.titleLine1)}
        </text>
        <text x="${canvasW / 2}" y="315" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="70" font-weight="900" fill="${cfg.highlightColor}" letter-spacing="-1">
          ${escapeXml(cfg.titleLine2)}
        </text>

        <!-- Subtitle -->
        <text x="${canvasW / 2}" y="390" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="27" font-weight="500" fill="#E2E8F0">
          ${escapeXml(cfg.subtitle)}
        </text>

        <!-- Tablet Mockup Bezel -->
        <g filter="url(#t10Shadow)">
          <rect x="${tabletX}" y="${tabletY}" width="${tabletW}" height="${tabletH}" rx="${tabletRadius}" ry="${tabletRadius}" fill="#0F172A" stroke="#334155" stroke-width="3" />
          <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${screenH}" rx="${screenRadius}" ry="${screenRadius}" fill="#020617" />
        </g>
      </svg>
    `;

    const overlaySvg = Buffer.from(`
      <svg width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="t10PillShadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000000" flood-opacity="0.45" />
          </filter>
        </defs>

        <circle cx="${canvasW / 2}" cy="${screenY + 16}" r="6" fill="#020617" />

        <!-- Floating Card 1 (Top-Right) -->
        <g transform="translate(${card1X}, ${card1Y})" filter="url(#t10PillShadow)">
          <rect x="0" y="0" width="${card1W}" height="${card1H}" rx="26" fill="#FFFFFF" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" />
          <circle cx="50" cy="49" r="28" fill="${cfg.card1.iconBg}" />
          <text x="50" y="58" text-anchor="middle" font-size="24">${cfg.card1.icon}</text>
          <text x="96" y="42" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="19" font-weight="800" fill="#0F172A">
            ${escapeXml(cfg.card1.title)}
          </text>
          <text x="96" y="68" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="15" font-weight="600" fill="${cfg.card1.iconColor}">
            ${escapeXml(cfg.card1.sub)}
          </text>
        </g>

        <!-- Floating Card 2 (Bottom-Left) -->
        <g transform="translate(${card2X}, ${card2Y})" filter="url(#t10PillShadow)">
          <rect x="0" y="0" width="${card2W}" height="${card2H}" rx="26" fill="#FFFFFF" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" />
          <circle cx="50" cy="49" r="28" fill="${cfg.card2.iconBg}" />
          <text x="50" y="58" text-anchor="middle" font-size="24">${cfg.card2.icon}</text>
          <text x="96" y="42" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="19" font-weight="800" fill="#0F172A">
            ${escapeXml(cfg.card2.title)}
          </text>
          <text x="96" y="68" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="15" font-weight="600" fill="${cfg.card2.iconColor}">
            ${escapeXml(cfg.card2.sub)}
          </text>
        </g>
      </svg>
    `);

    await sharp(Buffer.from(backgroundSvg))
      .composite([
        { input: screenBuffer, top: screenY, left: screenX },
        { input: overlaySvg, top: 0, left: 0 }
      ])
      .png({ quality: 96 })
      .toFile(outPath);

    console.log(`✓ Tablet 10": ${outName}`);
  }
}

/**
 * 4. ULTRA-PREMIUM FEATURE GRAPHIC (1024 x 500)
 * Showstopper hero banner with floating brand badge,
 * dynamic emerald volumetric lighting, dual perspective mockups,
 * value prop badges, and high-converting typography.
 */
async function generateFeatureGraphic() {
  console.log('--- Generating Ultra-Premium Google Play Feature Graphic (1024 x 500) ---');
  const targetPath = path.join(DIRS.feature, 'feature_graphic_1024x500.png');

  // Load and resize logo
  const logoBuf = await sharp(LOGO_PATH)
    .resize({ width: 230, height: 75, fit: 'inside' })
    .toBuffer();

  // Dual mockups:
  // Primary (Home) Mockup: width = 236, height = 450
  const homeScreenW = 222;
  const homeScreenH = 434;
  const homeScreen = await prepareScreenContent(SCREENSHOT_MAP.home, homeScreenW, homeScreenH, 22);

  const primaryMockupSvg = Buffer.from(`
    <svg width="236" height="450" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#94A3B8" />
          <stop offset="50%" stop-color="#475569" />
          <stop offset="100%" stop-color="#1E293B" />
        </linearGradient>
        <filter id="mShadow" x="-25%" y="-15%" width="150%" height="140%">
          <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000000" flood-opacity="0.65" />
        </filter>
      </defs>
      <g filter="url(#mShadow)">
        <rect x="0" y="0" width="236" height="450" rx="30" ry="30" fill="#0F172A" stroke="url(#mStroke)" stroke-width="2.5" />
      </g>
    </svg>
  `);

  const primaryMockup = await sharp(primaryMockupSvg)
    .composite([
      { input: homeScreen, top: 8, left: 7 },
      {
        input: Buffer.from(`
          <svg width="236" height="450" xmlns="http://www.w3.org/2000/svg">
            <!-- Dynamic Island -->
            <rect x="76" y="14" width="84" height="20" rx="10" fill="#020617" />
            <circle cx="142" cy="24" r="3.5" fill="#0B1329" />
            <circle cx="143" cy="23.5" r="1.2" fill="#38BDF8" opacity="0.8" />
            <!-- Home Bar -->
            <rect x="78" y="434" width="80" height="4" rx="2" fill="#CBD5E1" opacity="0.8" />
          </svg>
        `),
        top: 0,
        left: 0
      }
    ])
    .png()
    .toBuffer();

  // Secondary (Cart) Mockup: width = 200, height = 380
  const cartScreenW = 188;
  const cartScreenH = 366;
  const cartScreen = await prepareScreenContent(SCREENSHOT_MAP.cart, cartScreenW, cartScreenH, 18);

  const secondaryMockupSvg = Buffer.from(`
    <svg width="200" height="380" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="secShadow" x="-25%" y="-15%" width="150%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000000" flood-opacity="0.5" />
        </filter>
      </defs>
      <g filter="url(#secShadow)">
        <rect x="0" y="0" width="200" height="380" rx="26" ry="26" fill="#0F172A" stroke="#334155" stroke-width="2" />
      </g>
    </svg>
  `);

  const secondaryMockup = await sharp(secondaryMockupSvg)
    .composite([
      { input: cartScreen, top: 7, left: 6 },
      {
        input: Buffer.from(`
          <svg width="200" height="380" xmlns="http://www.w3.org/2000/svg">
            <rect x="65" y="12" width="70" height="16" rx="8" fill="#020617" />
          </svg>
        `),
        top: 0,
        left: 0
      }
    ])
    .png()
    .toBuffer();

  // Rich Vector Background
  const bgSvg = `
    <svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Full-Bleed Mesh Gradient -->
        <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#022C22" />
          <stop offset="40%" stop-color="#064E3B" />
          <stop offset="85%" stop-color="#047857" />
          <stop offset="100%" stop-color="#0F766E" />
        </linearGradient>

        <!-- Ambient Volumetric Lighting -->
        <radialGradient id="heroSpotlight" cx="72%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#34D399" stop-opacity="0.45" />
          <stop offset="60%" stop-color="#10B981" stop-opacity="0.18" />
          <stop offset="100%" stop-color="#064E3B" stop-opacity="0" />
        </radialGradient>

        <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity="0.3" />
        </filter>
      </defs>

      <!-- Backgrounds -->
      <rect width="1024" height="500" fill="url(#heroGrad)" />
      <rect width="1024" height="500" fill="url(#heroSpotlight)" />

      <!-- Geometric Rings -->
      <circle cx="850" cy="180" r="200" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="36" />
      <circle cx="980" cy="420" r="140" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="24" />
      <circle cx="200" cy="480" r="160" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="28" />

      <!-- Brand Logo Glassmorphic Container -->
      <g transform="translate(54, 40)" filter="url(#badgeShadow)">
        <rect x="0" y="0" width="260" height="72" rx="18" fill="rgba(255,255,255,0.95)" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" />
      </g>

      <!-- Pill Tag -->
      <g transform="translate(54, 134)">
        <rect x="0" y="0" width="280" height="34" rx="17" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.3)" stroke-width="1.2" />
        <circle cx="18" cy="17" r="4.5" fill="#FDE047" />
        <text x="32" y="23" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="800" fill="#FEF08A" letter-spacing="0.6">
          ⚡ 10-20 MINS EXPRESS DELIVERY
        </text>
      </g>

      <!-- Main Headline -->
      <text x="54" y="214" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="38" font-weight="900" fill="#FFFFFF" letter-spacing="-0.8">
        Superfast Groceries
      </text>
      <text x="54" y="258" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="38" font-weight="900" fill="#FDE047" letter-spacing="-0.8">
        Delivered In Minutes
      </text>

      <!-- Subtitle -->
      <text x="54" y="302" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="15.5" font-weight="500" fill="#E2E8F0">
        Farm-fresh vegetables, fruits, dairy, munchies &amp; daily staples
      </text>

      <!-- 3 Glassmorphic Feature Value Pills -->
      <g transform="translate(54, 338)">
        <rect x="0" y="0" width="136" height="36" rx="18" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" stroke-width="1" />
        <text x="14" y="23" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="12.5" font-weight="700" fill="#FFFFFF">⚡ 10-20 Mins</text>

        <rect x="148" y="0" width="150" height="36" rx="18" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" stroke-width="1" />
        <text x="14" y="23" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="12.5" font-weight="700" fill="#FFFFFF">🥬 100% Fresh</text>

        <rect x="310" y="0" width="144" height="36" rx="18" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" stroke-width="1" />
        <text x="14" y="23" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="12.5" font-weight="700" fill="#FFFFFF">💰 Best Prices</text>
      </g>

      <!-- Trust Badge -->
      <g transform="translate(54, 420)">
        <text x="0" y="16" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="#A7F3D0" letter-spacing="0.2">
          ⭐ 4.9★ Rated Grocery App • Zero Minimum Order • UPI &amp; COD
        </text>
      </g>
    </svg>
  `;

  // Floating Offer Badge on right mockups
  const offerBadgeSvg = Buffer.from(`
    <svg width="190" height="52" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="fBadgeShadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity="0.45" />
        </filter>
      </defs>
      <g filter="url(#fBadgeShadow)">
        <rect x="0" y="0" width="190" height="52" rx="16" fill="#FFFFFF" stroke="rgba(255,255,255,0.9)" stroke-width="1.2" />
        <circle cx="28" cy="26" r="16" fill="#FEF3C7" />
        <text x="28" y="32" text-anchor="middle" font-size="14">🏷️</text>
        <text x="52" y="24" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="12.5" font-weight="800" fill="#0F172A">FLAT ₹100 OFF</text>
        <text x="52" y="40" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="10.5" font-weight="700" fill="#D97706">Code: FRESH100</text>
      </g>
    </svg>
  `);

  await sharp(Buffer.from(bgSvg))
    .composite([
      // Logo on white card container
      { input: logoBuf, top: 48, left: 68 },
      // Secondary mockup (in background, left)
      { input: secondaryMockup, top: 60, left: 565 },
      // Primary mockup (in foreground, right)
      { input: primaryMockup, top: 25, left: 735 },
      // Floating offer badge
      { input: offerBadgeSvg, top: 380, left: 630 }
    ])
    .png({ quality: 98 })
    .toFile(targetPath);

  console.log(`✓ Feature Graphic: feature_graphic_1024x500.png`);
}

async function main() {
  try {
    console.log('=== STARTING ULTRA-PREMIUM PLAY STORE GRAPHICS GENERATION ===');
    await generatePhoneScreenshots();
    await generateTablet7Screenshots();
    await generateTablet10Screenshots();
    await generateFeatureGraphic();
    console.log('=== ALL ULTRA-PREMIUM PLAY STORE ASSETS GENERATED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Fatal Asset Generation Error:', err);
    process.exit(1);
  }
}

main();
