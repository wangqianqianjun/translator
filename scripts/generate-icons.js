/**
 * Icon Generator for AI Translator
 * 
 * 使用方法:
 * 1. 安装依赖: npm install canvas
 * 2. 运行: node scripts/generate-icons.js
 * 
 * 或者打开 icons/generate-icons.html 在浏览器中手动下载
 */

const fs = require('fs');
const path = require('path');

// 尝试使用 canvas 库，如果没有安装则提供简单的占位图标
try {
  const { createCanvas } = require('canvas');
  
  const sizes = [16, 32, 48, 128];
  const iconsDir = path.join(__dirname, '..', 'icons');

  // 生成深色模式图标（紫蓝渐变背景 + 白字）
  function generateDarkIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.44;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#7c5cff');
    gradient.addColorStop(1, '#5c8cff');

    // Draw circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw text
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('译', centerX, centerY + size * 0.02);

    return canvas.toBuffer('image/png');
  }

  // 生成浅色模式图标（白色背景 + 紫蓝渐变边框和文字）
  function generateLightIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.44;
    const borderWidth = Math.max(1, size * 0.06);

    // 渐变色定义
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#7c5cff');
    gradient.addColorStop(1, '#5c8cff');

    // Draw border circle (gradient)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw inner white circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - borderWidth, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    // Draw text with gradient color
    ctx.fillStyle = gradient;
    ctx.font = `bold ${size * 0.45}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('译', centerX, centerY + size * 0.02);

    return canvas.toBuffer('image/png');
  }

  // 生成所有图标
  sizes.forEach(size => {
    // 深色图标
    const darkBuffer = generateDarkIcon(size);
    fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), darkBuffer);
    console.log(`Generated icon${size}.png (dark)`);

    // 浅色图标
    const lightBuffer = generateLightIcon(size);
    fs.writeFileSync(path.join(iconsDir, `icon${size}-light.png`), lightBuffer);
    console.log(`Generated icon${size}-light.png (light)`);
  });

  console.log('\n✅ All icons generated successfully!');
  console.log('   - Dark theme: icon16.png, icon32.png, icon48.png, icon128.png');
  console.log('   - Light theme: icon16-light.png, icon32-light.png, icon48-light.png, icon128-light.png');
} catch (error) {
  console.log('canvas 库未安装，创建简单占位图标...');
  console.log('提示: 运行 npm install canvas 来生成精美图标');
  console.log('或者打开 icons/generate-icons.html 在浏览器中下载');
  
  // 创建简单的单色 PNG 占位图标
  createSimpleIcons();
}

function createSimpleIcons() {
  const iconsDir = path.join(__dirname, '..', 'icons');
  const sizes = [16, 32, 48, 128];
  
  sizes.forEach(size => {
    // 深色图标 (紫色背景)
    const darkBuffer = createMinimalPNG(size, [124, 92, 255]);
    fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), darkBuffer);
    console.log(`Created placeholder icon${size}.png (dark)`);

    // 浅色图标 (浅紫色背景)
    const lightBuffer = createMinimalPNG(size, [200, 180, 255]);
    fs.writeFileSync(path.join(iconsDir, `icon${size}-light.png`), lightBuffer);
    console.log(`Created placeholder icon${size}-light.png (light)`);
  });

  console.log('\n⚠️  Placeholder icons created (simple colored squares)');
  console.log('   For better icons, install canvas: npm install canvas');
  console.log('   Or open icons/generate-icons.html in a browser');
}

// 创建最小的纯色 PNG
function createMinimalPNG(size, rgb) {
  // PNG 文件头
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdr = createIHDR(size, size);
  
  // IDAT chunk (简化的纯色图像数据)
  const idat = createIDAT(size, size, rgb);
  
  // IEND chunk
  const iend = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createIHDR(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;  // bit depth
  data[9] = 2;  // color type (RGB)
  data[10] = 0; // compression
  data[11] = 0; // filter
  data[12] = 0; // interlace
  
  return createChunk('IHDR', data);
}

function createIDAT(width, height, rgb) {
  const zlib = require('zlib');
  
  // 创建原始图像数据 (每行以 filter byte 0 开始)
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(rowSize * height);
  
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    rawData[rowStart] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 3;
      rawData[pixelStart] = rgb[0];
      rawData[pixelStart + 1] = rgb[1];
      rawData[pixelStart + 2] = rgb[2];
    }
  }
  
  const compressed = zlib.deflateSync(rawData);
  return createChunk('IDAT', compressed);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 计算
function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  const table = getCRC32Table();
  
  for (let i = 0; i < buffer.length; i++) {
    crc = table[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
  }
  
  return crc ^ 0xFFFFFFFF;
}

function getCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

