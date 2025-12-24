/**
 * Icon Generator for AI Translator
 *
 * 使用方法:
 * 1. 安装依赖: npm install canvas
 * 2. 运行: npm run icon
 */

const fs = require('fs');
const path = require('path');

try {
  const { createCanvas } = require('canvas');

  const sizes = [16, 32, 48, 128];
  const iconsDir = path.join(__dirname, '..', 'icons');

  // 绘制圆角矩形
  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // 绘制双气泡图案
  function drawBubbles(ctx, size, color1, color2) {
    const s = size / 128;
    const centerX = size / 2;
    const centerY = size / 2;

    ctx.save();
    ctx.translate(centerX, centerY);

    // 左侧气泡（较大，代表源语言）
    ctx.fillStyle = color1;
    const leftBubbleX = -20 * s;
    const leftBubbleY = -6 * s;
    const leftBubbleW = 30 * s;
    const leftBubbleH = 22 * s;
    const leftRadius = 6 * s;

    roundRect(ctx, leftBubbleX, leftBubbleY, leftBubbleW, leftBubbleH, leftRadius);
    ctx.fill();

    // 左气泡尾巴
    ctx.beginPath();
    ctx.moveTo(leftBubbleX + 4 * s, leftBubbleY + leftBubbleH - 2 * s);
    ctx.lineTo(leftBubbleX - 4 * s, leftBubbleY + leftBubbleH + 10 * s);
    ctx.lineTo(leftBubbleX + 14 * s, leftBubbleY + leftBubbleH - 2 * s);
    ctx.fill();

    // 右侧气泡（较小，代表目标语言）
    ctx.fillStyle = color2;
    const rightBubbleX = 4 * s;
    const rightBubbleY = -18 * s;
    const rightBubbleW = 24 * s;
    const rightBubbleH = 18 * s;
    const rightRadius = 5 * s;

    roundRect(ctx, rightBubbleX, rightBubbleY, rightBubbleW, rightBubbleH, rightRadius);
    ctx.fill();

    // 右气泡尾巴
    ctx.beginPath();
    ctx.moveTo(rightBubbleX + rightBubbleW - 8 * s, rightBubbleY + rightBubbleH - 2 * s);
    ctx.lineTo(rightBubbleX + rightBubbleW + 6 * s, rightBubbleY + rightBubbleH + 8 * s);
    ctx.lineTo(rightBubbleX + rightBubbleW - 2 * s, rightBubbleY + rightBubbleH - 2 * s);
    ctx.fill();

    ctx.restore();
  }

  // 生成深色模式图标
  function generateDarkIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.44;

    // 渐变背景
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#7c5cff');
    gradient.addColorStop(1, '#5c8cff');

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // 绘制双气泡（白色）
    drawBubbles(ctx, size, 'white', 'rgba(255,255,255,0.75)');

    return canvas.toBuffer('image/png');
  }

  // 生成浅色模式图标
  function generateLightIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.44;
    const borderWidth = Math.max(1.5, size * 0.05);

    // 渐变边框
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#7c5cff');
    gradient.addColorStop(1, '#5c8cff');

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // 白色内圆
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - borderWidth, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    // 绘制双气泡（渐变色）
    drawBubbles(ctx, size, '#7c5cff', '#5c8cff');

    return canvas.toBuffer('image/png');
  }

  // 生成所有图标
  sizes.forEach(size => {
    const darkBuffer = generateDarkIcon(size);
    fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), darkBuffer);
    console.log(`✓ icon${size}.png`);

    const lightBuffer = generateLightIcon(size);
    fs.writeFileSync(path.join(iconsDir, `icon${size}-light.png`), lightBuffer);
    console.log(`✓ icon${size}-light.png`);
  });

  console.log('\n✅ 图标生成完成！');

} catch (error) {
  console.error('错误:', error.message);
  console.log('\n请先安装 canvas: npm install canvas');
}
