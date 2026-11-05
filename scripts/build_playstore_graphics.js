/**
 * Production-Grade Google Play Store Asset Generator for R2Cart
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
    badge: '⚡ 10-30 MINS EXPRESS DELIVERY',
    badgeColor: '#FEF08A',
    title: 'Superfast Grocery Delivery',
    subtitle: 'Fresh fruits, vegetables, dairy & staples delivered at your door',
    gradientStart: '#047857',
    gradientEnd: '#064E3B',
  },
  {
    key: 'categories',
    order: '02',
    outName: '02_categories_screen.png',
    badge: '🛒 1000+ PRODUCTS & CATEGORIES',
    badgeColor: '#6EE7B7',
    title: 'Explore Endless Variety',
    subtitle: 'Farm fresh produce, daily essentials, munchies & cold drinks',
    gradientStart: '#0F766E',
    gradientEnd: '#064E3B',
  },
  {
    key: 'cart',
    order: '03',
    outName: '03_cart_screen.png',
    badge: '💳 SMART CART & EASY CHECKOUT',
    badgeColor: '#FDE047',
    title: 'Instant & Scheduled Slots',
    subtitle: 'Free delivery, coupon savings & custom doorstep instructions',
    gradientStart: '#047857',
    gradientEnd: '#022C22',
  },
  {
    key: 'orders',
    order: '04',
    outName: '04_orders_screen.png',
    badge: '🚚 REAL-TIME LIVE TRACKING',
    badgeColor: '#A7F3D0',
    title: 'Track Orders Seamlessly',
    subtitle: 'Live order status updates, complete invoices & 1-tap re-order',
    gradientStart: '#065F46',
    gradientEnd: '#0F172A',
  },
  {
    key: 'account',
    order: '05',
    outName: '05_account_screen.png',
    badge: '👤 MULTI-LANGUAGE & 24/7 SUPPORT',
    badgeColor: '#FEF08A',
    title: 'Personalized For You',
    subtitle: 'English & Hindi support, saved addresses, wishlist & quick help',
    gradientStart: '#047857',
    gradientEnd: '#0D2E20',
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
  // 1. Crop status bar and bottom gesture bar
  const cropped = await sharp(srcPath)
    .extract({ left: 0, top: 46, width: 460, height: 954 })
    .toBuffer();

  // 2. SVG mask with exact rounded corners
  const maskSvg = Buffer.from(`
    <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${targetW}" height="${targetH}" rx="${radius}" ry="${radius}" fill="#ffffff" />
    </svg>
  `);

  // 3. Resize and mask
  return sharp(cropped)
    .resize(targetW, targetH, { fit: 'fill' })
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

/**
 * 1. PHONE SCREENSHOTS (1080 x 2280)
 */
async function generatePhoneScreenshots() {
  console.log('--- Generating 5x Phone Screenshots (1080 x 2280) ---');
  const canvasW = 1080;
  const canvasH = 2280;

  const phoneW = 880;
  const phoneH = 1720;
  const phoneX = 100;
  const phoneY = 460;
  const phoneRadius = 50;

  const screenInset = 16;
  const screenW = phoneW - (screenInset * 2); // 848
  const screenH = phoneH - (screenInset * 2); // 1688
  const screenX = phoneX + screenInset;       // 116
  const screenY = phoneY + screenInset;       // 476
  const screenRadius = 36;

  for (const cfg of SCREEN_CONFIGS) {
    const srcPath = SCREENSHOT_MAP[cfg.key];
    const outPath = path.join(DIRS.phone, cfg.outName);

    const screenBuffer = await prepareScreenContent(srcPath, screenW, screenH, screenRadius);

    // SVG frame overlay with dynamic island, notch, borders, and drop shadow
    const backgroundSvg = `
      <svg width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${cfg.gradientStart}" />
            <stop offset="100%" stop-color="${cfg.gradientEnd}" />
          </linearGradient>
          <radialGradient id="topGlow" cx="80%" cy="20%" r="60%">
            <stop offset="0%" stop-color="#34D399" stop-opacity="0.32" />
            <stop offset="100%" stop-color="${cfg.gradientStart}" stop-opacity="0" />
          </radialGradient>
          <filter id="phoneShadow" x="-20%" y="-10%" width="140%" height="130%">
            <feDropShadow dx="0" dy="28" stdDeviation="34" flood-color="#022C22" flood-opacity="0.4" />
          </filter>
        </defs>

        <!-- Canvas Background -->
        <rect width="${canvasW}" height="${canvasH}" fill="#F8FAFC" />

        <!-- Header Hero Section -->
        <rect width="${canvasW}" height="540" fill="url(#headerGrad)" />
        <rect width="${canvasW}" height="540" fill="url(#topGlow)" />

        <!-- Decorative Subtle Accent Rings -->
        <circle cx="980" cy="80" r="140" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="28" />
        <circle cx="80" cy="460" r="160" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="36" />

        <!-- Badge Pill -->
        <g transform="translate(${canvasW / 2}, 85)">
          <rect x="-240" y="0" width="480" height="46" rx="23" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)" stroke-width="1.5" />
          <text x="0" y="30" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="800" fill="${cfg.badgeColor}" letter-spacing="0.5">
            ${escapeXml(cfg.badge)}
          </text>
        </g>

        <!-- Main Title -->
        <text x="${canvasW / 2}" y="200" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="52" font-weight="900" fill="#FFFFFF" letter-spacing="-0.5">
          ${escapeXml(cfg.title)}
        </text>

        <!-- Subtitle -->
        <text x="${canvasW / 2}" y="265" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="22" font-weight="500" fill="#E6FFFA">
          ${escapeXml(cfg.subtitle)}
        </text>

        <!-- Phone Mockup Body & Shadow -->
        <g filter="url(#phoneShadow)">
          <!-- Outer Phone Bezel -->
          <rect x="${phoneX}" y="${phoneY}" width="${phoneW}" height="${phoneH}" rx="${phoneRadius}" ry="${phoneRadius}" fill="#0F172A" stroke="#334155" stroke-width="2" />
        </g>
      </svg>
    `;

    // Foreground SVG: Camera punch-hole / Dynamic Island & Home indicator
    const overlaySvg = Buffer.from(`
      <svg width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}" xmlns="http://www.w3.org/2000/svg">
        <!-- Dynamic Island Cutout -->
        <rect x="${(canvasW - 120) / 2}" y="${screenY + 12}" width="120" height="28" rx="14" fill="#030712" />
        <circle cx="${canvasW / 2 + 35}" cy="${screenY + 26}" r="5" fill="#0F172A" />
        <circle cx="${canvasW / 2 + 36}" cy="${screenY + 25}" r="1.5" fill="#38BDF8" opacity="0.8" />

        <!-- Home Bar Indicator -->
        <rect x="${(canvasW - 160) / 2}" y="${screenY + screenH - 14}" width="160" height="4.5" rx="2.5" fill="#94A3B8" opacity="0.9" />
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
 */
async function generateTablet7Screenshots() {
  console.log('--- Generating 5x 7-Inch Tablet Screenshots (1200 x 1920) ---');
  const canvasW = 1200;
  const canvasH = 1920;

  const tabletW = 860;
  const tabletH = 1430;
  const tabletX = 170;
  const tabletY = 410;
  const tabletRadius = 42;

  const screenInset = 16;
  const screenW = tabletW - (screenInset * 2); // 828
  const screenH = tabletH - (screenInset * 2); // 1398
  const screenX = tabletX + screenInset;
  const screenY = tabletY + screenInset;
  const screenRadius = 28;

  for (const cfg of SCREEN_CONFIGS) {
    const srcPath = SCREENSHOT_MAP[cfg.key];
    const outName = `${cfg.order}_tablet7_${cfg.key}.png`;
    const outPath = path.join(DIRS.tablet7, outName);

    const screenBuffer = await prepareScreenContent(srcPath, screenW, screenH, screenRadius);

    const backgroundSvg = `
      <svg width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="t7Grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${cfg.gradientStart}" />
            <stop offset="100%" stop-color="${cfg.gradientEnd}" />
          </linearGradient>
          <filter id="t7Shadow" x="-20%" y="-10%" width="140%" height="130%">
            <feDropShadow dx="0" dy="24" stdDeviation="30" flood-color="#022C22" flood-opacity="0.38" />
          </filter>
        </defs>

        <rect width="${canvasW}" height="${canvasH}" fill="#F8FAFC" />
        <rect width="${canvasW}" height="490" fill="url(#t7Grad)" />

        <circle cx="1060" cy="70" r="140" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="28" />

        <!-- Badge -->
        <g transform="translate(${canvasW / 2}, 75)">
          <rect x="-240" y="0" width="480" height="44" rx="22" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)" stroke-width="1.5" />
          <text x="0" y="29" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="800" fill="${cfg.badgeColor}">
            ${escapeXml(cfg.badge)}
          </text>
        </g>

        <!-- Title & Subtitle -->
        <text x="${canvasW / 2}" y="190" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="48" font-weight="900" fill="#FFFFFF">
          ${escapeXml(cfg.title)}
        </text>
        <text x="${canvasW / 2}" y="250" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="22" font-weight="500" fill="#E6FFFA">
          ${escapeXml(cfg.subtitle)}
        </text>

        <!-- Tablet Mockup Bezel -->
        <g filter="url(#t7Shadow)">
          <rect x="${tabletX}" y="${tabletY}" width="${tabletW}" height="${tabletH}" rx="${tabletRadius}" ry="${tabletRadius}" fill="#0F172A" stroke="#334155" stroke-width="2" />
        </g>
      </svg>
    `;

    const overlaySvg = Buffer.from(`
      <svg width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${canvasW / 2}" cy="${screenY + 12}" r="5" fill="#030712" />
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
 */
async function generateTablet10Screenshots() {
  console.log('--- Generating 5x 10-Inch Tablet Screenshots (1600 x 2560) ---');
  const canvasW = 1600;
  const canvasH = 2560;

  const tabletW = 1160;
  const tabletH = 1910;
  const tabletX = 220;
  const tabletY = 550;
  const tabletRadius = 48;

  const screenInset = 20;
  const screenW = tabletW - (screenInset * 2); // 1120
  const screenH = tabletH - (screenInset * 2); // 1870
  const screenX = tabletX + screenInset;
  const screenY = tabletY + screenInset;
  const screenRadius = 32;

  for (const cfg of SCREEN_CONFIGS) {
    const srcPath = SCREENSHOT_MAP[cfg.key];
    const outName = `${cfg.order}_tablet10_${cfg.key}.png`;
    const outPath = path.join(DIRS.tablet10, outName);

    const screenBuffer = await prepareScreenContent(srcPath, screenW, screenH, screenRadius);

    const backgroundSvg = `
      <svg width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="t10Grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${cfg.gradientStart}" />
            <stop offset="100%" stop-color="${cfg.gradientEnd}" />
          </linearGradient>
          <filter id="t10Shadow" x="-20%" y="-10%" width="140%" height="130%">
            <feDropShadow dx="0" dy="32" stdDeviation="40" flood-color="#022C22" flood-opacity="0.4" />
          </filter>
        </defs>

        <rect width="${canvasW}" height="${canvasH}" fill="#F8FAFC" />
        <rect width="${canvasW}" height="650" fill="url(#t10Grad)" />

        <circle cx="1450" cy="100" r="180" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="36" />

        <!-- Badge -->
        <g transform="translate(${canvasW / 2}, 100)">
          <rect x="-290" y="0" width="580" height="56" rx="28" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)" stroke-width="1.5" />
          <text x="0" y="37" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="20" font-weight="800" fill="${cfg.badgeColor}">
            ${escapeXml(cfg.badge)}
          </text>
        </g>

        <!-- Title & Subtitle -->
        <text x="${canvasW / 2}" y="250" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="62" font-weight="900" fill="#FFFFFF">
          ${escapeXml(cfg.title)}
        </text>
        <text x="${canvasW / 2}" y="330" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="28" font-weight="500" fill="#E6FFFA">
          ${escapeXml(cfg.subtitle)}
        </text>

        <!-- Tablet Mockup Bezel -->
        <g filter="url(#t10Shadow)">
          <rect x="${tabletX}" y="${tabletY}" width="${tabletW}" height="${tabletH}" rx="${tabletRadius}" ry="${tabletRadius}" fill="#0F172A" stroke="#334155" stroke-width="2.5" />
        </g>
      </svg>
    `;

    const overlaySvg = Buffer.from(`
      <svg width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${canvasW / 2}" cy="${screenY + 14}" r="6" fill="#030712" />
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
 * 4. FEATURE GRAPHIC (1024 x 500)
 */
async function generateFeatureGraphic() {
  console.log('--- Generating Google Play Feature Graphic (1024 x 500) ---');
  const targetPath = path.join(DIRS.feature, 'feature_graphic_1024x500.png');

  // Load and resize logo
  const logoBuf = await sharp(LOGO_PATH)
    .resize({ width: 330, height: 110, fit: 'inside' })
    .toBuffer();

  // Dual elevated preview mockups
  // Mockup 1: Primary Home screen preview (230 x 440)
  const homeScreen = await prepareScreenContent(SCREENSHOT_MAP.home, 214, 420, 22);
  const homeMockupSvg = Buffer.from(`
    <svg width="230" height="440" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="fShadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#022C22" flood-opacity="0.5" />
        </filter>
      </defs>
      <rect x="0" y="0" width="230" height="440" rx="30" ry="30" fill="#0F172A" stroke="#334155" stroke-width="2" filter="url(#fShadow)" />
    </svg>
  `);

  const primaryMockup = await sharp(homeMockupSvg)
    .composite([
      { input: homeScreen, top: 10, left: 8 },
      {
        input: Buffer.from(`
          <svg width="230" height="440" xmlns="http://www.w3.org/2000/svg">
            <rect x="75" y="16" width="80" height="18" rx="9" fill="#030712" />
          </svg>
        `),
        top: 0,
        left: 0
      }
    ])
    .png()
    .toBuffer();

  // Mockup 2: Secondary Cart/Category preview (190 x 370)
  const cartScreen = await prepareScreenContent(SCREENSHOT_MAP.cart, 178, 354, 18);
  const cartMockupSvg = Buffer.from(`
    <svg width="190" height="370" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="cShadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#022C22" flood-opacity="0.4" />
        </filter>
      </defs>
      <rect x="0" y="0" width="190" height="370" rx="24" ry="24" fill="#0F172A" stroke="#1E293B" stroke-width="1.5" filter="url(#cShadow)" />
    </svg>
  `);

  const secondaryMockup = await sharp(cartMockupSvg)
    .composite([{ input: cartScreen, top: 8, left: 6 }])
    .png()
    .toBuffer();

  // Rich vector background
  const bgSvg = `
    <svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#022C22" />
          <stop offset="40%" stop-color="#047857" />
          <stop offset="100%" stop-color="#0F766E" />
        </linearGradient>
        <radialGradient id="fgGlow" cx="75%" cy="35%" r="55%">
          <stop offset="0%" stop-color="#34D399" stop-opacity="0.38" />
          <stop offset="100%" stop-color="#047857" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Background -->
      <rect width="1024" height="500" fill="url(#fgGrad)" />
      <rect width="1024" height="500" fill="url(#fgGlow)" />

      <!-- Decorative Pattern Elements -->
      <circle cx="940" cy="70" r="160" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="32" />
      <circle cx="560" cy="460" r="140" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="24" />

      <!-- Left Content -->
      <!-- White card container for logo -->
      <rect x="56" y="44" width="350" height="84" rx="16" fill="#FFFFFF" />

      <!-- Pill Badge -->
      <g transform="translate(56, 146)">
        <rect x="0" y="0" width="270" height="34" rx="17" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.3)" stroke-width="1.2" />
        <circle cx="18" cy="17" r="5" fill="#FDE047" />
        <text x="32" y="23" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="800" fill="#FEF08A">
          10-30 MINS EXPRESS DELIVERY
        </text>
      </g>

      <!-- Main Headline -->
      <text x="56" y="228" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="36" font-weight="900" fill="#FFFFFF" letter-spacing="-0.5">
        Fresh Groceries &amp;
      </text>
      <text x="56" y="272" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="36" font-weight="900" fill="#FEF08A" letter-spacing="-0.5">
        Daily Essentials
      </text>

      <!-- Subtitle -->
      <text x="56" y="318" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="15" font-weight="500" fill="#E6FFFA">
        Fruits, Veggies, Dairy, Snacks &amp; Staples at Best Prices
      </text>

      <!-- Feature Pill Badges -->
      <g transform="translate(56, 355)">
        <rect x="0" y="0" width="145" height="34" rx="8" fill="rgba(0,0,0,0.22)" />
        <text x="14" y="22" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="12" font-weight="bold" fill="#FFFFFF">🍏 Farm Fresh</text>

        <rect x="156" y="0" width="138" height="34" rx="8" fill="rgba(0,0,0,0.22)" />
        <text x="14" y="22" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="12" font-weight="bold" fill="#FFFFFF">⚡ Superfast</text>

        <rect x="304" y="0" width="142" height="34" rx="8" fill="rgba(0,0,0,0.22)" />
        <text x="14" y="22" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="12" font-weight="bold" fill="#FFFFFF">💰 Best Deals</text>
      </g>

      <!-- Bottom Tag -->
      <g transform="translate(56, 424)">
        <text x="0" y="16" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="12.5" font-weight="700" fill="#A7F3D0">
          ⭐ 4.8★ Rated Grocery App • Cash on Delivery &amp; UPI Available
        </text>
      </g>
    </svg>
  `;

  await sharp(Buffer.from(bgSvg))
    .composite([
      // Logo on white card
      { input: logoBuf, top: 54, left: 66 },
      // Secondary mockup (in background)
      { input: secondaryMockup, top: 65, left: 565 },
      // Primary mockup (in foreground)
      { input: primaryMockup, top: 30, left: 730 }
    ])
    .png({ quality: 98 })
    .toFile(targetPath);

  console.log(`✓ Feature Graphic: feature_graphic_1024x500.png`);
}

async function main() {
  try {
    console.log('=== STARTING PRODUCTION PLAY STORE GRAPHICS GENERATION ===');
    await generatePhoneScreenshots();
    await generateTablet7Screenshots();
    await generateTablet10Screenshots();
    await generateFeatureGraphic();
    console.log('=== ALL PLAY STORE ASSETS GENERATED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Fatal Asset Generation Error:', err);
    process.exit(1);
  }
}

main();
