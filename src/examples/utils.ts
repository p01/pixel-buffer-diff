import * as fs from "fs";
import * as fastPng from "fast-png";
import { decode } from "jpeg-js";
import * as hrTimer from "./hrTimer";

export const loadJpgAsImageData = (path: string): ImageData => {
  hrTimer.tick("read files");
  const pb = fs.readFileSync(path);
  hrTimer.tick("read files");
  hrTimer.tick("decode jpg");
  const decodedJpg = decode(pb);
  hrTimer.tick("decode jpg");

  const { width, height }= decodedJpg;
  const data = new Uint8ClampedArray(decodedJpg.data.buffer, 0, width * height * 4);
  return { width, height, data } as ImageData;
};

export const loadPngAsImageData = (path: string): ImageData => {
  hrTimer.tick("read files");
  const pb = fs.readFileSync(path);
  hrTimer.tick("read files");
  hrTimer.tick("decode png");
  const decodedPng = fastPng.decode(pb);
  hrTimer.tick("decode png");

  const rawData = decodedPng.data;
  const { width, height, channels, palette} = decodedPng;
  let data: Uint8ClampedArray;

  if (palette && channels === 1) {
    hrTimer.tick("png convert palette -> 32 bits");
    const paletteRGBA = new Uint32Array(palette.length);
    for (let i=0; i<palette.length; i++) {
      const color = palette[i];
      paletteRGBA[i] = (color[0] << 24) | (color[1]<< 16) | (color[2] << 8) | 255; 
    }
    
    data = new Uint8ClampedArray(width * height * 4);
    const data32 = new Uint32Array(data.buffer, 0, width * height);
    for (let i=0;i<data32.length;i++) {
      data32[i] = paletteRGBA[rawData[i]];
    }
    hrTimer.tick("png convert palette -> 32 bits");
  } else if(channels === 3) {
    hrTimer.tick("png convert 24 -> 32 bits");
    data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0, j = 0; i < rawData.length; ) {
      data[j++] = rawData[i++];
      data[j++] = rawData[i++];
      data[j++] = rawData[i++];
      data[j++] = 255;
    }
    hrTimer.tick("png convert 24 -> 32 bits");
  } else {
    data = new Uint8ClampedArray(rawData, 0, width * height * 4);
  } 

  return {width, height, data} as ImageData;
};

export const padImageDataTo16 = (src: ImageData): ImageData => {
  const width = Math.ceil(src.width / 16) * 16; 
  const height = Math.ceil(src.height / 16) * 16; 
  if (src.width === width && src.height === height) {
    return src;
  }
  const data = new Uint8ClampedArray(width * height * 4);
  const data32 = new Uint32Array(data.buffer, 0, width * height);
  const dst = {width, height, data} as ImageData;

  const paddingARGB = 0x0ff7f7f7f;

  // Vertical padding
  data32.fill(paddingARGB, width * src.height, width * height);

  if (src.width === width) {
    return dst;
  }

  // Horizontal padding
  const srcWidthX4 = src.width * 4;
  for (let y = 0; y <src.height; y++) {
    const srcIndex = y * srcWidthX4;
    const dstIndex32 = y * width;
    const dstIndex = dstIndex32 * 4;
    // copy the src
    data.set(src.data.subarray(srcIndex, srcWidthX4), dstIndex);
    // pad
    data32.fill(paddingARGB, dstIndex32 + srcWidthX4, dstIndex32 + width);
  }

  return dst;
}
