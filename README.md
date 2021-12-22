# **Pixel-buffer-diff** aka **Pbd** 

[![npm package version](https://img.shields.io/npm/v/pixel-buffer-diff.svg?label=npm+package)](https://www.npmjs.com/package/pixel-buffer-diff) [![npm bundle size](https://img.shields.io/bundlephobia/minzip/pixel-buffer-diff?label=bundle+size)](https://bundlephobia.com/package/pixel-buffer-diff)

**Pbd** is a **Pixel Buffer Diff** library designed for visual regression tests. With zero dependencies and a bundle size under 2kb, **Pbd** works as a drop-in replacement for Pixelmatch and runs 8-10x faster.

Unlike other image diffing library that only show which pixels changed, **Pbd** shows if pixel changes were actually added or removed according the brightness theme of the baseline image, and represent the pixel changes in a way similar to code changes in a Pull Request to provide more context for each pixel change and make the view more easily actionable.

Additionaly, **Pbd** can detect changes visible accross multiple images, and overlay a low resolution highlight to help spot isolated pixel changes.

Update your `package.json`, and import or require statements, to save significant time and money on your visual regression pipeline and approval workflow.


## Usage

```typescript
const pbdDiffResult = diff(baselinePixelBuffer, candidatePixelBuffer, diffPixelBuffer, width, height, options);
```

## Features

### Added/Removed changes to understand the pixel differences

**Pbd** samples the baseline image to determine if it uses light or dark theme and show whether each changed pixel in the candidate image was added or removed.

This result in a diff image similar to changes in a Pull Request.

### Side by side diff image to contextualize changes and simplify the visual regression report

Provided a diff pixel buffer that is 3x the width of the baseline pixel buffer, **Pbd** makes a collage showing the baseline image on the left hand side, the diff in the center and the candidate on the right side. This helps put the diff image in context by showing the baseline and candidate side by side.

Having a single image to get full context can prove easier to integrate in your visual regression report and approval workflow if the baseline, candidate and diff images require to be authenticated to different online storage.

### Minimap overlay to spot isolated pixel changes

Since it can be difficult to spot subtle or isolated pixel differences in full size screenshots, **Pbd** can add a minimap, a low resolution, overlay on top of the diff to quickly locate the areas of interest and not miss any visual change.

### Hash of the changes for easier deduplication

**Pbd** returns a simple hash of the pixel differences. This enables to de-duplicate changes than span accross many images.

For instance, if you change the padding in a button that is used accross many visual components of your application, this simple change will be visible in all their screenshots. Thanks to the hash of the changes, your visual regression report can show this change just once and enable you and your team to focus on unique visual changes.

### Cumulated change to discard anti-aliasing differences

Often times, visual tests that run on your Continuous Integration pipeline will run on different machines and show anti-aliasing differences ( small differences along the visible edges in your images ). Using the `threshold` of difference per pixel alone would show even the slightest difference. However **Pbd** returns the `cumulatedDiff`, the sum of threshold difference of every pixel change, to let you discard anti-aliasing changes which amount to 

## Demo images

Baseline|Candidate|Side by side diff with minimap overlay
-|-|-
![](https://raw.githubusercontent.com/p01/pixel-buffer-diff/main/images/baselines/2.png)|![](https://raw.githubusercontent.com/p01/pixel-buffer-diff/main/images/candidates/2.png)|![](https://raw.githubusercontent.com/p01/pixel-buffer-diff/main/images/baselines-candidates/2.png)
![](https://raw.githubusercontent.com/p01/pixel-buffer-diff/main/images/baselines/6.png)|![](https://raw.githubusercontent.com/p01/pixel-buffer-diff/main/images/candidates/6.png)|![](https://raw.githubusercontent.com/p01/pixel-buffer-diff/main/images/baselines-candidates/6.png)
![](https://raw.githubusercontent.com/p01/pixel-buffer-diff/main/images/baselines/7.png)|![](https://raw.githubusercontent.com/p01/pixel-buffer-diff/main/images/candidates/7.png)|![](https://raw.githubusercontent.com/p01/pixel-buffer-diff/main/images/baselines-candidates/7.png)
![](https://raw.githubusercontent.com/p01/pixel-buffer-diff/main/images/baselines/cypress.png)|![](https://raw.githubusercontent.com/p01/pixel-buffer-diff/main/images/candidates/cypress.png)|![](https://raw.githubusercontent.com/p01/pixel-buffer-diff/main/images/baselines-candidates/cypress.png)
![](https://raw.githubusercontent.com/p01/pixel-buffer-diff/main/images/baselines/jpg/tiger.jpg)|![](https://raw.githubusercontent.com/p01/pixel-buffer-diff/main/images/candidates/jpg/tiger.jpg)|![](https://raw.githubusercontent.com/p01/pixel-buffer-diff/main/images/baselines-candidates/jpg/tiger.png)


Images courtesy of Pixematch and odiff

## API

**Pbd** exports two methods, `diff` and `diffImageDatas` which work as a drop in replacement for Pixelmatch or directly with ImageData objects. They are exactly the same in term of functionnality and return value, so use either at your convenience.

### The `diff` method

The `diff` method is a drop in replacement for Pixelmatch.

```typescript
const diff: (
  baseline8: Uint8Array | Uint8ClampedArray,
  candidate8: Uint8Array | Uint8ClampedArray,
  diff8: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  options?: { threshold?: number; cumulatedThreshold?: number; enableMinimap?: boolean }
): { diff: number; hash: number; cumulatedDiff: number }
```

* `baseline8`, `candidate8` and `diff8` are `Uint8Array` or `Uint8ClampedArray` holding the 32bits pixel data for the baseline, candidate and diff images.
* `width` and `height` are the width and height of the images.
* `options` is an optional argument with the following properties:
  * `threshold` specifies the individual pixel matching threshold between `0` and `1`. Smaller values make the comparison more sensitive. Defaults to `0.03`
  * `cumulatedThreshold` specifies the cumulated pixel matching threshold. Smaller values make the comparision more sensitive to anti-aliasing differences. Default to `.5`
  *  `enabledMinimap` enables the low resolution overlay. Defaults to `false`

### The `diffImageDatas` method

The `diffImageData` method takes ImageData as arguments for a simpler API.


```typescript
const diffImageDatas: (
  baseline: ImageData,
  candidate: ImageData,
  diff: ImageData,
  options?: { threshold?: number, cumulatedThreshold?: number; enableMinimap?: boolean,  }
): { diff: number; hash: number; cumulatedDiff: number }
```

* `baseline`, `candidate` and `diff` are `ImageData` holding the 32bits pixel data for the baseline, candidate and diff images.
* `options` is an optional argument with the following properties:
   * `threshold` specifies the individual pixel matching threshold between `0` and `1`. Smaller values make the comparison more sensitive. Defaults to `0.03`
  * `cumulatedThreshold` specifies the cumulated pixel matching threshold. Smaller values make the comparision more sensitive to anti-aliasing differences. Default to `.5`
  *  `enabledMinimap` enables the low resolution overlay. Defaults to `false`

### Return value of `diff` and `diffImageData`

The `diff` and `diffImageDatas` methods mutate the diff pixel buffer they receive as argument and return an object with the following properties:

* `diff` a number showing the number of pixels that exceeded the `threshold`
* `hash` a numeric hash representing the pixel change between the two images. This hash allows to de-duplicate changes across multiple images to only show unique changes in your visual regression report and approval workflow. 
* `cumulatedDiff` a number representing the cumulated difference of every pixel change in the two images. This can used to discard changes that only effect subtle differences like anti-aliasing pixels.

These properties are all set to `0` if the two images are within the cumulatedThreshold.



## Example usage

```typescript
import * as fs from "fs";
import * as fastPng from "fast-png";
import { diff } from "pixel-buffer-diff";

// Read and decode baseline and candidate pngs
const pngBaseline = fastPng.decode(fs.readFileSync("baseline.png"));
const pngCandidate = fastPng.decode(fs.readFileSync("candidate.png"));

// Get necessary properties
const { width, height } = pngBaseline;

// Create diff ImageData: 3x wider to get side by side diff
const diffImageData = {
  width: 3 * width,
  height,
  data: new Uint8ClampedArray(3 * width * height * 4)
};

// Diff images with 1% threshold and minimap overlay to spot isolated changes
const result = diff(
  pngBaseline.data,
  pngCandidate.data,
  diffImageData.data,
  width,
  height,
  {
    threshold: 0.01,
    enableMinimap: true
  });

// Output the result
console.log({...result});

// Save the diff if the cumulated delta is significant
if (result.cumulatedDiff > 0) {
  fs.writeFileSync("diff.png", fastPng.encode(diff as fastPng.IImageData));
}
```


💘 @p01