const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];
const inputImage = 'public/logo.png'; // Your source logo
const outputDir = 'public/icons';

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Check if input image exists
if (!fs.existsSync(inputImage)) {
  console.error(`Error: Input image not found at ${inputImage}`);
  console.log('Please ensure you have a logo.png file in the public directory');
  process.exit(1);
}

console.log('Generating PWA icons...\n');

// Generate standard icons
const standardPromises = sizes.map(size => {
  return sharp(inputImage)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 17, g: 24, b: 39, alpha: 1 } // Dark background matching theme
    })
    .toFile(path.join(outputDir, `icon-${size}x${size}.png`))
    .then(() => console.log(`✓ Generated icon-${size}x${size}.png`))
    .catch(err => console.error(`✗ Failed to generate icon-${size}x${size}.png:`, err.message));
});

// Generate maskable icons with padding (for Android adaptive icons)
const maskableSizes = [192, 512];
const maskablePromises = maskableSizes.map(size => {
  const iconSize = Math.floor(size * 0.8); // 80% of target size
  const padding = Math.floor((size - iconSize) / 2);

  return sharp(inputImage)
    .resize(iconSize, iconSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 99, g: 102, b: 241, alpha: 1 } // Theme color
    })
    .toFile(path.join(outputDir, `icon-maskable-${size}x${size}.png`))
    .then(() => console.log(`✓ Generated icon-maskable-${size}x${size}.png`))
    .catch(err => console.error(`✗ Failed to generate icon-maskable-${size}x${size}.png:`, err.message));
});

// Wait for all icons to be generated
Promise.all([...standardPromises, ...maskablePromises])
  .then(() => {
    console.log('\n✨ All PWA icons generated successfully!');
    console.log(`📁 Icons saved to: ${outputDir}`);
  })
  .catch(err => {
    console.error('\n❌ Error generating icons:', err);
    process.exit(1);
  });
