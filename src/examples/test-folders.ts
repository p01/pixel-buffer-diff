import * as fs from "fs";
import * as fastGlob from "fast-glob";
import { join, dirname } from "path";
import { diffImageDatas } from "../index";
import * as fastPng from "fast-png";
import * as hrTimer from "./hrTimer";
import * as utils from "./utils";

export type Changed = {
  path: string;
  hash: number;
  diff: number;
  cumulatedDiff: number;
};

export type Report = {
  changed: Changed[];
  unchanged: string[];
  added: string[];
  removed: string[];
};

const report: Report = {
  changed: [],
  unchanged: [],
  added: [],
  removed: [],
};

const imagesFolder = join("..", "images");

hrTimer.tick("✨ Recursive folders diffing ✨");
const baselineFolderName = "baselines";
const candidateFolderName = "candidates";
const baselineFolder = join(imagesFolder, baselineFolderName);
const candidateFolder = join(imagesFolder, candidateFolderName);
const diffFolder = join(
  imagesFolder,
  `${baselineFolderName}-${candidateFolderName}`
);
fs.mkdirSync(dirname(diffFolder), {recursive: true});

hrTimer.tick("glob images");
const pattern = "**/*.@(png|jpg|jpeg)";
const baselineImageRelPaths = fastGlob.sync(pattern, { cwd: baselineFolder }).sort();
const candidateImageRelPaths = fastGlob.sync(pattern, { cwd: candidateFolder }).sort();
hrTimer.tick("glob images");

const bil = baselineImageRelPaths.length;
const cil = candidateImageRelPaths.length;

console.log(`${bil + cil} unique images: ${bil} baseline ⚡ ${cil} candidate`);

// Go through the baseline and candidate image relPaths
hrTimer.tick("sort files");
let bi = 0;
let ci = 0;
const irpBoth: string[] = [];
while (bi + ci < bil + cil) {
  const birp = baselineImageRelPaths[bi] || "";
  const cirp = candidateImageRelPaths[ci] || "";
  if (bi === bil) {
    report.added.push(cirp);
    ci++;
  } else if (ci === cil) {
    report.removed.push(birp);
    bi++;
  } else if (birp < cirp) {
    report.removed.push(birp);
    bi++;
  } else if (cirp < birp) {
    report.added.push(cirp);
    ci++;
  } else if (birp === cirp) {
    irpBoth.push(birp);
    bi++;
    ci++;
  }
}
hrTimer.tick("sort files");

console.log(
  `${irpBoth.length * 2} images in common, ${
    report.removed.length
  } images removed and ${report.added.length} images added`
);

for (let i = 0; i < irpBoth.length; i++) {
  const irp = irpBoth[i];
  const isPNG = irp.endsWith(".png");

  const loadAsImageData = isPNG ? utils.loadPngAsImageData : utils.loadJpgAsImageData;
  const baselineImage = loadAsImageData(join(baselineFolder, irp));
  const candidateImage = loadAsImageData(join(candidateFolder, irp));

  const mep = 3;
  const { width, height } = baselineImage;
  const difxPng: ImageData = {
    width: width * mep,
    height,
    data: new Uint8ClampedArray(width * height * 4 * mep),
  };
  const options = { threshold: 0.03, enableMinimap: true };
  hrTimer.tick("diff images");
  const result = diffImageDatas(baselineImage, candidateImage, difxPng, options);
  hrTimer.tick("diff images");

  if (result.diff === 0) {
    report.unchanged.push(irp);
  } else {
    const change: Changed = Object.assign(result, { path: irp });

    report.changed.push(change);

    hrTimer.tick("encode images");
    const pngBuffer = fastPng.encode(difxPng as fastPng.IImageData);
    hrTimer.tick("encode images");

    const difxPath = join(diffFolder, irp.replace(/\.[a-z]+$/, ".png"));
    fs.mkdirSync(dirname(difxPath), { recursive: true });

    hrTimer.tick("write files");
    fs.writeFileSync(difxPath, pngBuffer);
    hrTimer.tick("write files");
  }
}

hrTimer.tick("get report json");
const reportJson = JSON.stringify(report);
hrTimer.tick("get report json");
hrTimer.tick("save report json");
const reportPath = join(diffFolder, "report.json");
fs.writeFileSync(reportPath, reportJson, { encoding: "utf-8" });
hrTimer.tick("save report json");

hrTimer.tick("✨ Recursive folders diffing ✨");

console.log(
  `load, decode & diff ${irpBoth.length * 2} images + encode & save ${
    report.changed.length
  } images`
);

console.table(hrTimer.summarize());
