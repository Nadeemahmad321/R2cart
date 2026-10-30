const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const LOGO_PATH = path.resolve(__dirname, '../src/assets/images/logo.png');
const ICON_OUT_DIR = path.resolve(__dirname, '../google_play_assets/app_icon');
const RES_DIR = path.resolve(__dirname, '../android/app/src/main/res');

if (!fs.existsSync(ICON_OUT_DIR)) {
  fs.mkdirSync(ICON_OUT_DIR, { recursive: true });
}

async function buildAllIcons() {
  console.log('--- Generating App Icons with Top-Left Logo (logo.png) ---');

  // 1. Trim transparency from original logo.png
  const trimmedBuf = await sharp(LOGO_PATH).trim().toBuffer();
  const trimmedMeta = await sharp(trimmedBuf).metadata();
  console.log(`Trimmed logo dimensions: ${trimmedMeta.width}x${trimmedMeta.height}`);

  // Calculate scaled dimensions to fit nicely within 512x512
  // We want width ~430px so there is comfortable padding on sides, safe from squircle mask
  const targetW = 430;
  const targetH = Math.round(targetW * (trimmedMeta.height / trimmedMeta.width));
  console.log(`Target logo dimensions on 512x512 canvas: ${targetW}x${targetH}`);

  const resizedLogoBuf = await sharp(trimmedBuf)
    .resize(targetW, targetH, { fit: 'contain' })
    .toBuffer();

  const topPos = Math.round((512 - targetH) / 2);
  const leftPos = Math.round((512 - targetW) / 2);

  // 1. PRIMARY: Clean Pure White 512x512 (Official Google Play Store Standard)
  const primary512Path = path.join(ICON_OUT_DIR, 'playstore_icon_512x512.png');
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([
    {
      input: resizedLogoBuf,
      top: topPos,
      left: leftPos
    }
  ])
  .png({ quality: 100, compressionLevel: 9 })
  .toFile(primary512Path);

  const primaryStats = fs.statSync(primary512Path);
  console.log(`✓ Generated Primary 512x512: ${primary512Path} (${(primaryStats.size / 1024).toFixed(1)} KB)`);

  // 2. VARIANT A: Brand Mint Tint (#ECFDF5)
  const mint512Path = path.join(ICON_OUT_DIR, 'playstore_icon_mint_512x512.png');
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 236, g: 253, b: 245, alpha: 1 }
    }
  })
  .composite([
    {
      input: resizedLogoBuf,
      top: topPos,
      left: leftPos
    }
  ])
  .png({ quality: 100, compressionLevel: 9 })
  .toFile(mint512Path);
  console.log(`✓ Generated Mint Variant 512x512: ${mint512Path}`);

  // 3. VARIANT B: Branded with Subtle Category Pill
  const badgeSvg = Buffer.from(`
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="#FFFFFF" />
      <g transform="translate(156, 335)">
        <rect x="0" y="0" width="200" height="34" rx="17" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1.5" />
        <text x="100" y="22" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="bold" fill="#047857" text-anchor="middle" letter-spacing="0.5">EXPRESS GROCERY</text>
      </g>
    </svg>
  `);
  const badge512Path = path.join(ICON_OUT_DIR, 'playstore_icon_with_badge_512x512.png');
  await sharp(badgeSvg)
  .composite([
    {
      input: resizedLogoBuf,
      top: 195,
      left: leftPos
    }
  ])
  .png({ quality: 100, compressionLevel: 9 })
  .toFile(badge512Path);
  console.log(`✓ Generated Badge Variant 512x512: ${badge512Path}`);

  // 4. ANDROID LAUNCHER MIPMAP ICONS (Square and Round)
  const mipmaps = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
  ];

  console.log('Generating Android Launcher Icons (mipmap folders)...');
  for (const m of mipmaps) {
    const targetFolder = path.join(RES_DIR, m.dir);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    // Proportional logo inside icon: width = 85% of size
    const iconLogoW = Math.round(m.size * 0.85);
    const iconLogoH = Math.max(1, Math.round(iconLogoW * (trimmedMeta.height / trimmedMeta.width)));
    const iconTop = Math.round((m.size - iconLogoH) / 2);
    const iconLeft = Math.round((m.size - iconLogoW) / 2);

    const scaledBuf = await sharp(trimmedBuf)
      .resize(iconLogoW, iconLogoH, { fit: 'contain' })
      .toBuffer();

    // Square launcher icon
    const squareIconPath = path.join(targetFolder, 'ic_launcher.png');
    await sharp({
      create: {
        width: m.size,
        height: m.size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([{ input: scaledBuf, top: iconTop, left: iconLeft }])
    .png()
    .toFile(squareIconPath);

    // Round launcher icon
    const radius = m.size / 2;
    const roundSvg = Buffer.from(`
      <svg width="${m.size}" height="${m.size}">
        <circle cx="${radius}" cy="${radius}" r="${radius}" fill="#FFFFFF" />
      </svg>
    `);
    const roundIconPath = path.join(targetFolder, 'ic_launcher_round.png');
    await sharp(roundSvg)
    .composite([{ input: scaledBuf, top: iconTop, left: iconLeft }])
    .png()
    .toFile(roundIconPath);

    console.log(`  ✓ ${m.dir} (${m.size}x${m.size}): ic_launcher.png & ic_launcher_round.png`);
  }

  console.log('--- All App Icons Successfully Generated! ---');
}

buildAllIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
