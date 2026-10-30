

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const USER_UPLOADED_DIR = 'C:/Users/ACER/.gemini/antigravity-ide/brain/f6de9ba1-8f0b-4e37-81b0-ab0ec51c28fc/.user_uploaded/';
const ASSETS_IMAGES_DIR = path.resolve(__dirname, '../src/assets/images');
const OUTPUT_BASE_DIR = path.resolve(__dirname, '../google_play_assets');

// Source screenshot mappings from user upload
const SCREENSHOT_MAP = {
  home: path.join(USER_UPLOADED_DIR, 'media_1793175860135.png'),
  categories: path.join(USER_UPLOADED_DIR, 'media_1793175843421.png'),
  cart: path.join(USER_UPLOADED_DIR, 'media_1793175851198.png'),
  signin: path.join(USER_UPLOADED_DIR, 'media_1793175876691.png'),
  signup: path.join(USER_UPLOADED_DIR, 'media_1793175869196.png'),
};

const LOGO_PATH = path.join(ASSETS_IMAGES_DIR, 'logo.png');
const ICON_PATH = path.join(ASSETS_IMAGES_DIR, 'app-icon.png');

// Ensure output directories exist
const DIRS = {
  icon: path.join(OUTPUT_BASE_DIR, 'app_icon'),
  feature: path.join(OUTPUT_BASE_DIR, 'feature_graphic'),
  phone: path.join(OUTPUT_BASE_DIR, 'phone_screenshots'),
  tablet7: path.join(OUTPUT_BASE_DIR, 'tablet_7inch_screenshots'),
  tablet10: path.join(OUTPUT_BASE_DIR, 'tablet_10inch_screenshots'),
};

Object.values(DIRS).forEach(d => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
});

async function generateAppIcon() {
  console.log('Generating Google Play App Icon (512x512)...');
  const targetPath = path.join(DIRS.icon, 'playstore_icon_512x512.png');

  // Clean, high quality 512x512 icon
  await sharp(ICON_PATH)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(targetPath);

  console.log(`✓ Generated: ${targetPath}`);
}

async function generateFeatureGraphic() {
  console.log('Generating Google Play Feature Graphic (1024x500)...');
  const targetPath = path.join(DIRS.feature, 'feature_graphic_1024x500.png');

  // Load logo resized to fit cleanly on left side
  const logoBuf = await sharp(LOGO_PATH)
    .resize({ width: 340, height: 110, fit: 'inside' })
    .toBuffer();

  // Load a cropped preview of the home screen / category fruit card to show real app preview
  const previewBuf = await sharp(SCREENSHOT_MAP.home)
    .resize({ width: 340, height: 480, fit: 'cover', position: 'top' })
    .composite([
      // Add subtle rounded corner / frame to preview
      {
        input: Buffer.from(`
          <svg width="340" height="480">
            <rect x="0" y="0" width="340" height="480" rx="20" ry="20" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="4"/>
          </svg>
        `),
        top: 0,
        left: 0
      }
    ])
    .toBuffer();

  // SVG background with rich brand gradient, patterns, and prominent typography
  const bgSvg = `
    <svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#047857" />
          <stop offset="45%" stop-color="#059669" />
          <stop offset="100%" stop-color="#0F766E" />
        </linearGradient>
        <radialGradient id="glow" cx="80%" cy="30%" r="50%">
          <stop offset="0%" stop-color="#34D399" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#059669" stop-opacity="0" />
        </radialGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.3"/>
        </filter>
      </defs>

      <!-- Main Background -->
      <rect width="1024" height="500" fill="url(#bgGrad)" />
      <rect width="1024" height="500" fill="url(#glow)" />

      <!-- Modern Decorative Circles -->
      <circle cx="920" cy="80" r="140" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="32" />
      <circle cx="100" cy="460" r="180" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="40" />

      <!-- Left Content Box -->
      <!-- Delivery Speed Pill Badge -->
      <g transform="translate(60, 48)">
        <rect x="0" y="0" width="260" height="36" rx="18" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />
        <circle cx="20" cy="18" r="6" fill="#FDE047" />
        <text x="36" y="24" font-family="Arial, Helvetica, sans-serif" font-size="13.5" font-weight="bold" fill="#FFFFFF">15-20 MINS EXPRESS DELIVERY</text>
      </g>

      <!-- Headings -->
      <text x="60" y="235" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" fill="#FFFFFF" letter-spacing="-0.5">
        Fresh Groceries &amp;
      </text>
      <text x="60" y="278" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" fill="#FEF08A" letter-spacing="-0.5">
        Daily Essentials
      </text>

      <text x="60" y="325" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="500" fill="#E6FFFA">
        Doorstep Grocery Delivery Across Hathua, Bihar
      </text>

      <!-- Feature Bullet Badges -->
      <g transform="translate(60, 365)">
        <!-- Badge 1 -->
        <rect x="0" y="0" width="155" height="34" rx="8" fill="rgba(0,0,0,0.18)" />
        <text x="14" y="22" font-family="Arial, Helvetica, sans-serif" font-size="12.5" font-weight="bold" fill="#FFFFFF">🍏 Farm Fresh Produce</text>

        <!-- Badge 2 -->
        <rect x="168" y="0" width="138" height="34" rx="8" fill="rgba(0,0,0,0.18)" />
        <text x="14" y="22" font-family="Arial, Helvetica, sans-serif" font-size="12.5" font-weight="bold" fill="#FFFFFF">🥛 Dairy &amp; Bakery</text>

        <!-- Badge 3 -->
        <rect x="318" y="0" width="145" height="34" rx="8" fill="rgba(0,0,0,0.18)" />
        <text x="14" y="22" font-family="Arial, Helvetica, sans-serif" font-size="12.5" font-weight="bold" fill="#FFFFFF">💰 Best Local Prices</text>
      </g>

      <!-- Bottom Hathua Notice -->
      <text x="60" y="445" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="bold" fill="rgba(255,255,255,0.7)">
        Serving: Hathua Town, Wards, &amp; Nearby Village Areas
      </text>
    </svg>
  `;

  // White container for logo
  const logoCard = Buffer.from(`
    <svg width="360" height="90">
      <rect x="0" y="0" width="360" height="90" rx="16" fill="#FFFFFF" />
    </svg>
  `);

  await sharp(Buffer.from(bgSvg))
    .composite([
      // Logo card background
      {
        input: logoCard,
        top: 98,
        left: 60,
      },
      // Logo image
      {
        input: logoBuf,
        top: 108,
        left: 70,
      },
      // App preview phone on the right side
      {
        input: previewBuf,
        top: 10,
        left: 640,
      }
    ])
    .png({ quality: 100 })
    .toFile(targetPath);

  console.log(`✓ Generated: ${targetPath}`);
}

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const PHONE_CONFIGS = [
  {
    key: 'home',
    badge: '⚡ 15-20 MINS EXPRESS DELIVERY',
    title: 'Fresh Groceries in Hathua',
    sub: 'Fruits, veggies, dairy, snacks & kitchen staples at best prices',
    outName: '01_home_screen.png'
  },
  {
    key: 'categories',
    badge: '🛒 1000+ PRODUCTS IN STOCK',
    title: 'Explore All Categories',
    sub: 'Easy category browsing with quick 1-tap add to cart',
    outName: '02_categories_screen.png'
  },
  {
    key: 'cart',
    badge: '📦 INSTANT & SCHEDULED DELIVERY',
    title: 'Convenient Doorstep Checkout',
    sub: 'Choose Instant delivery or schedule for your preferred time slot',
    outName: '03_cart_basket_screen.png'
  },
  {
    key: 'signin',
    badge: '🔒 SAFE & SECURE AUTHENTICATION',
    title: 'Easy One-Tap Access',
    sub: 'Quick sign in with email, phone number & password',
    outName: '04_sign_in_screen.png'
  },
  {
    key: 'signup',
    badge: '🎉 JOIN R2CART TODAY',
    title: 'Instant OTP Registration',
    sub: 'Create your account, save Hathua addresses & start saving',
    outName: '05_create_account_screen.png'
  }
];

async function generatePhoneScreenshots() {
  console.log('Generating Google Play Phone Screenshots (1080x2160, exactly 1:2 ratio)...');

  for (const cfg of PHONE_CONFIGS) {
    const srcImg = SCREENSHOT_MAP[cfg.key];
    const targetPath = path.join(DIRS.phone, cfg.outName);

    // Resize actual screenshot to fit phone frame (width: 860, height: 1530)
    const screenBuf = await sharp(srcImg)
      .resize({ width: 840, height: 1540, fit: 'fill' })
      .composite([
        {
          input: Buffer.from(`
            <svg width="840" height="1540">
              <rect x="0" y="0" width="840" height="1540" rx="36" ry="36" fill="none" stroke="#CBD5E1" stroke-width="4"/>
            </svg>
          `),
          top: 0,
          left: 0
        }
      ])
      .toBuffer();

    const frameSvg = `
      <svg width="1080" height="2160" viewBox="0 0 1080 2160" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="headerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#059669" />
            <stop offset="100%" stop-color="#047857" />
          </linearGradient>
          <filter id="cardShadow" x="-10%" y="-5%" width="120%" height="115%">
            <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#0F172A" flood-opacity="0.25"/>
          </filter>
        </defs>

        <!-- Solid Background -->
        <rect width="1080" height="2160" fill="#F8FAFC" />

        <!-- Top Header Card -->
        <rect width="1080" height="480" fill="url(#headerGrad)" />
        <circle cx="1000" cy="60" r="160" fill="rgba(255,255,255,0.08)" />

        <!-- Badge -->
        <g transform="translate(120, 90)">
          <rect x="0" y="0" width="380" height="44" rx="22" fill="rgba(255,255,255,0.22)" />
          <text x="26" y="29" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="bold" fill="#FEF08A">${escapeXml(cfg.badge)}</text>
        </g>

        <!-- Main Title -->
        <text x="120" y="210" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="900" fill="#FFFFFF" letter-spacing="-0.5">
          ${escapeXml(cfg.title)}
        </text>

        <!-- Subtitle -->
        <text x="120" y="275" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="500" fill="#E6FFFA">
          ${escapeXml(cfg.sub)}
        </text>

        <!-- Mockup Device Frame Shadow & Container -->
        <g filter="url(#cardShadow)">
          <rect x="110" y="470" width="860" height="1560" rx="44" fill="#0F172A" />
        </g>
      </svg>
    `;

    await sharp(Buffer.from(frameSvg))
      .composite([
        {
          input: screenBuf,
          top: 480,
          left: 120,
        }
      ])
      .png({ quality: 95 })
      .toFile(targetPath);

    console.log(`✓ Generated Phone: ${targetPath}`);
  }
}

async function generateTabletScreenshots() {
  console.log('Generating Google Play 7-Inch Tablet Screenshots (1200x1920)...');
  const tabletKeys = ['home', 'categories', 'cart', 'signin'];

  for (let i = 0; i < tabletKeys.length; i++) {
    const key = tabletKeys[i];
    const cfg = PHONE_CONFIGS.find(c => c.key === key);
    const srcImg = SCREENSHOT_MAP[key];

    // --- 7-Inch Tablet (1200 x 1920) ---
    const t7Path = path.join(DIRS.tablet7, `0${i + 1}_tablet7_${key}.png`);
    const screen7Buf = await sharp(srcImg)
      .resize({ width: 780, height: 1400, fit: 'fill' })
      .composite([
        {
          input: Buffer.from(`
            <svg width="780" height="1400">
              <rect x="0" y="0" width="780" height="1400" rx="30" ry="30" fill="none" stroke="#CBD5E1" stroke-width="4"/>
            </svg>
          `),
          top: 0,
          left: 0
        }
      ])
      .toBuffer();

    const t7Svg = `
      <svg width="1200" height="1920" viewBox="0 0 1200 1920" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="t7Grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#059669" />
            <stop offset="100%" stop-color="#047857" />
          </linearGradient>
          <filter id="t7Shadow" x="-10%" y="-5%" width="120%" height="115%">
            <feDropShadow dx="0" dy="20" stdDeviation="28" flood-color="#000" flood-opacity="0.3"/>
          </filter>
        </defs>

        <rect width="1200" height="1920" fill="#F1F5F9" />
        <rect width="1200" height="380" fill="url(#t7Grad)" />

        <g transform="translate(140, 70)">
          <rect x="0" y="0" width="380" height="40" rx="20" fill="rgba(255,255,255,0.25)" />
          <text x="24" y="26" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="bold" fill="#FEF08A">${escapeXml(cfg.badge)}</text>
        </g>

        <text x="140" y="180" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="900" fill="#FFFFFF">${escapeXml(cfg.title)}</text>
        <text x="140" y="240" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="500" fill="#E6FFFA">${escapeXml(cfg.sub)}</text>

        <g filter="url(#t7Shadow)">
          <rect x="195" y="380" width="810" height="1430" rx="36" fill="#0F172A" />
        </g>
      </svg>
    `;

    await sharp(Buffer.from(t7Svg))
      .composite([{ input: screen7Buf, top: 395, left: 210 }])
      .png({ quality: 95 })
      .toFile(t7Path);

    console.log(`✓ Generated Tablet 7": ${t7Path}`);

    // --- 10-Inch Tablet (1600 x 2560) ---
    console.log(`Generating Google Play 10-Inch Tablet Screenshot (${key})...`);
    const t10Path = path.join(DIRS.tablet10, `0${i + 1}_tablet10_${key}.png`);
    const screen10Buf = await sharp(srcImg)
      .resize({ width: 1040, height: 1880, fit: 'fill' })
      .composite([
        {
          input: Buffer.from(`
            <svg width="1040" height="1880">
              <rect x="0" y="0" width="1040" height="1880" rx="38" ry="38" fill="none" stroke="#CBD5E1" stroke-width="5"/>
            </svg>
          `),
          top: 0,
          left: 0
        }
      ])
      .toBuffer();

    const t10Svg = `
      <svg width="1600" height="2560" viewBox="0 0 1600 2560" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="t10Grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#047857" />
            <stop offset="100%" stop-color="#065F46" />
          </linearGradient>
          <filter id="t10Shadow" x="-10%" y="-5%" width="120%" height="115%">
            <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="#000" flood-opacity="0.32"/>
          </filter>
        </defs>

        <rect width="1600" height="2560" fill="#F1F5F9" />
        <rect width="1600" height="500" fill="url(#t10Grad)" />

        <g transform="translate(180, 100)">
          <rect x="0" y="0" width="460" height="54" rx="27" fill="rgba(255,255,255,0.22)" />
          <text x="30" y="35" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="bold" fill="#FEF08A">${escapeXml(cfg.badge)}</text>
        </g>

        <text x="180" y="240" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="900" fill="#FFFFFF">${escapeXml(cfg.title)}</text>
        <text x="180" y="320" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="500" fill="#E6FFFA">${escapeXml(cfg.sub)}</text>

        <g filter="url(#t10Shadow)">
          <rect x="260" y="520" width="1080" height="1920" rx="46" fill="#0F172A" />
        </g>
      </svg>
    `;

    await sharp(Buffer.from(t10Svg))
      .composite([{ input: screen10Buf, top: 540, left: 280 }])
      .png({ quality: 95 })
      .toFile(t10Path);

    console.log(`✓ Generated Tablet 10": ${t10Path}`);
  }
}

async function main() {
  try {
    console.log('--- Starting Play Store Graphics Generation ---');
    await generateAppIcon();
    await generateFeatureGraphic();
    await generatePhoneScreenshots();
    await generateTabletScreenshots();
    console.log('--- All Assets Successfully Generated! ---');
  } catch (err) {
    console.error('Asset Generation Error:', err);
    process.exit(1);
  }
}

main();
