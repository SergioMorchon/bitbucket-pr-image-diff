// node_modules/pixelmatch/index.js
function isPixelData(arr) {
  return ArrayBuffer.isView(arr) && arr.constructor.BYTES_PER_ELEMENT === 1;
}
function antialiased(img, x1, y1, width, height, img2) {
  const x0 = Math.max(x1 - 1, 0);
  const y0 = Math.max(y1 - 1, 0);
  const x2 = Math.min(x1 + 1, width - 1);
  const y2 = Math.min(y1 + 1, height - 1);
  const pos = (y1 * width + x1) * 4;
  let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;
  let min = 0;
  let max = 0;
  let minX, minY, maxX, maxY;
  for (let x = x0;x <= x2; x++) {
    for (let y = y0;y <= y2; y++) {
      if (x === x1 && y === y1)
        continue;
      const delta = colorDelta(img, img, pos, (y * width + x) * 4, true);
      if (delta === 0) {
        zeroes++;
        if (zeroes > 2)
          return false;
      } else if (delta < min) {
        min = delta;
        minX = x;
        minY = y;
      } else if (delta > max) {
        max = delta;
        maxX = x;
        maxY = y;
      }
    }
  }
  if (min === 0 || max === 0)
    return false;
  return hasManySiblings(img, minX, minY, width, height) && hasManySiblings(img2, minX, minY, width, height) || hasManySiblings(img, maxX, maxY, width, height) && hasManySiblings(img2, maxX, maxY, width, height);
}
function hasManySiblings(img, x1, y1, width, height) {
  const x0 = Math.max(x1 - 1, 0);
  const y0 = Math.max(y1 - 1, 0);
  const x2 = Math.min(x1 + 1, width - 1);
  const y2 = Math.min(y1 + 1, height - 1);
  const pos = (y1 * width + x1) * 4;
  let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;
  for (let x = x0;x <= x2; x++) {
    for (let y = y0;y <= y2; y++) {
      if (x === x1 && y === y1)
        continue;
      const pos2 = (y * width + x) * 4;
      if (img[pos] === img[pos2] && img[pos + 1] === img[pos2 + 1] && img[pos + 2] === img[pos2 + 2] && img[pos + 3] === img[pos2 + 3])
        zeroes++;
      if (zeroes > 2)
        return true;
    }
  }
  return false;
}
function colorDelta(img1, img2, k, m, yOnly) {
  let r1 = img1[k + 0];
  let g1 = img1[k + 1];
  let b1 = img1[k + 2];
  let a1 = img1[k + 3];
  let r2 = img2[m + 0];
  let g2 = img2[m + 1];
  let b2 = img2[m + 2];
  let a2 = img2[m + 3];
  if (a1 === a2 && r1 === r2 && g1 === g2 && b1 === b2)
    return 0;
  if (a1 < 255) {
    a1 /= 255;
    r1 = blend(r1, a1);
    g1 = blend(g1, a1);
    b1 = blend(b1, a1);
  }
  if (a2 < 255) {
    a2 /= 255;
    r2 = blend(r2, a2);
    g2 = blend(g2, a2);
    b2 = blend(b2, a2);
  }
  const y1 = rgb2y(r1, g1, b1);
  const y2 = rgb2y(r2, g2, b2);
  const y = y1 - y2;
  if (yOnly)
    return y;
  const i = rgb2i(r1, g1, b1) - rgb2i(r2, g2, b2);
  const q = rgb2q(r1, g1, b1) - rgb2q(r2, g2, b2);
  const delta = 0.5053 * y * y + 0.299 * i * i + 0.1957 * q * q;
  return y1 > y2 ? -delta : delta;
}
function rgb2y(r, g, b) {
  return r * 0.29889531 + g * 0.58662247 + b * 0.11448223;
}
function rgb2i(r, g, b) {
  return r * 0.59597799 - g * 0.2741761 - b * 0.32180189;
}
function rgb2q(r, g, b) {
  return r * 0.21147017 - g * 0.52261711 + b * 0.31114694;
}
function blend(c, a) {
  return 255 + (c - 255) * a;
}
function drawPixel(output, pos, r, g, b) {
  output[pos + 0] = r;
  output[pos + 1] = g;
  output[pos + 2] = b;
  output[pos + 3] = 255;
}
function drawGrayPixel(img, i, alpha, output) {
  const r = img[i + 0];
  const g = img[i + 1];
  const b = img[i + 2];
  const val = blend(rgb2y(r, g, b), alpha * img[i + 3] / 255);
  drawPixel(output, i, val, val, val);
}
var defaultOptions = {
  threshold: 0.1,
  includeAA: false,
  alpha: 0.1,
  aaColor: [255, 255, 0],
  diffColor: [255, 0, 0],
  diffColorAlt: null,
  diffMask: false
};
function pixelmatch(img1, img2, output, width, height, options) {
  if (!isPixelData(img1) || !isPixelData(img2) || output && !isPixelData(output))
    throw new Error("Image data: Uint8Array, Uint8ClampedArray or Buffer expected.");
  if (img1.length !== img2.length || output && output.length !== img1.length)
    throw new Error("Image sizes do not match.");
  if (img1.length !== width * height * 4)
    throw new Error("Image data size does not match width/height.");
  options = Object.assign({}, defaultOptions, options);
  const len = width * height;
  const a32 = new Uint32Array(img1.buffer, img1.byteOffset, len);
  const b32 = new Uint32Array(img2.buffer, img2.byteOffset, len);
  let identical = true;
  for (let i = 0;i < len; i++) {
    if (a32[i] !== b32[i]) {
      identical = false;
      break;
    }
  }
  if (identical) {
    if (output && !options.diffMask) {
      for (let i = 0;i < len; i++)
        drawGrayPixel(img1, 4 * i, options.alpha, output);
    }
    return 0;
  }
  const maxDelta = 35215 * options.threshold * options.threshold;
  let diff = 0;
  for (let y = 0;y < height; y++) {
    for (let x = 0;x < width; x++) {
      const pos = (y * width + x) * 4;
      const delta = colorDelta(img1, img2, pos, pos);
      if (Math.abs(delta) > maxDelta) {
        if (!options.includeAA && (antialiased(img1, x, y, width, height, img2) || antialiased(img2, x, y, width, height, img1))) {
          if (output && !options.diffMask)
            drawPixel(output, pos, ...options.aaColor);
        } else {
          if (output) {
            drawPixel(output, pos, ...delta < 0 && options.diffColorAlt || options.diffColor);
          }
          diff++;
        }
      } else if (output) {
        if (!options.diffMask)
          drawGrayPixel(img1, pos, options.alpha, output);
      }
    }
  }
  return diff;
}

// src/index.ts
var getImageContainers = () => Array.from(document.querySelectorAll("[data-qa=bk-file__header]")).map((element) => {
  const path = element.querySelector("[data-qa=bk-filepath]")?.textContent;
  if (!path?.endsWith(".png")) {
    return;
  }
  return element.parentNode?.querySelector("[data-qa=bk-file__content");
}).filter(Boolean);
var IMAGE_DIFF_PROCESSED_DATA_ATTRIBUTE = "data-image-diff-processed";
var getImageData = (image, width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No canvas context");
  }
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, width, height).data;
};
var getImageSize = (img) => ({
  width: img.naturalWidth,
  height: img.naturalHeight
});
var hasSize = (size) => size.width > 0 && size.height > 0;
var waitForNaturalSize = async (img) => new Promise((resolve, reject) => {
  const size = getImageSize(img);
  if (hasSize(size)) {
    return resolve(size);
  }
  const interval = setInterval((img2) => {
    const size2 = getImageSize(img2);
    if (hasSize(size2)) {
      clearInterval(interval);
      return resolve(size2);
    }
  }, 200, img);
});
var processContainers = () => {
  getImageContainers().forEach(async (container) => {
    const [before, after] = container.querySelectorAll("[data-testid=image-diff] img");
    if (before.hasAttribute(IMAGE_DIFF_PROCESSED_DATA_ATTRIBUTE)) {
      return;
    }
    before.setAttribute(IMAGE_DIFF_PROCESSED_DATA_ATTRIBUTE, "");
    const [beforeSize, afterSize] = await Promise.all([
      waitForNaturalSize(before),
      waitForNaturalSize(after)
    ]);
    const width = Math.max(beforeSize.width, afterSize.width);
    const height = Math.max(beforeSize.height, afterSize.height);
    const outputImageData = new ImageData(width, height);
    const beforeData = getImageData(before, width, height);
    const afterData = getImageData(after, width, height);
    pixelmatch(beforeData, afterData, outputImageData.data, outputImageData.width, outputImageData.height, {
      threshold: 0.1
    });
    const output = document.createElement("canvas");
    after.parentElement?.appendChild(output);
    output.width = width;
    output.height = height;
    output.style.width = "calc(100% / 3)";
    output.getContext("2d")?.putImageData(outputImageData, 0, 0);
    container.querySelector("[data-testid=image-diff]")?.insertAdjacentElement("afterend", output);
    after.setAttribute(IMAGE_DIFF_PROCESSED_DATA_ATTRIBUTE, "");
  });
};
processContainers();
new MutationObserver(() => {
  processContainers();
}).observe(document.documentElement, {
  childList: true,
  subtree: true
});
