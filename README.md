# @amandaghassaei/flat-svg

[![NPM Package](https://img.shields.io/npm/v/@amandaghassaei/flat-svg)](https://www.npmjs.com/package/@amandaghassaei/flat-svg)
[![Build Size](https://img.shields.io/bundlephobia/min/@amandaghassaei/flat-svg)](https://bundlephobia.com/result?p=@amandaghassaei/flat-svg)
[![NPM Downloads](https://img.shields.io/npm/dw/@amandaghassaei/flat-svg)](https://www.npmtrends.com/@amandaghassaei/flat-svg)
[![License](https://img.shields.io/npm/l/@amandaghassaei/flat-svg)](https://github.com/amandaghassaei/flat-svg/blob/main/LICENSE)
![](https://img.shields.io/badge/Coverage-100%25-83A603.svg?prefix=$coverage$)

A TypeScript library for converting nested SVGs into a flat list of elements, paths, or segments with style information preserved. Also contains helper functions for filtering flattened SVGs by style (e.g. stroke, fill, opacity, dash-array, etc).

Try it out: [apps.amandaghassaei.com/flat-svg/demo/](https://apps.amandaghassaei.com/flat-svg/demo/)

Key features:

-   Flattens and removes groups and applies transforms
-   Applies any id/class-based SVG styles onto child components
-   Exposes flattened SVG geometry in several formats: as original SVG element type (e.g. circle, rect, polyline, path, etc), geometry converted to SVG paths, or geometry split into segments. Segments are essentially split paths and may be lines, quadratic/cubic beziers, or arcs (if preserveArcs flag is true)
-   Exposes helper functions for filtering by element style (e.g. stroke color, dash-array, opacity)
-   Converts all `<path>` coordinates to absolute coordinates
-   Extracts top-level `<defs>` and `<style>` tags during flattening
-   Option to preserve arcs when exporting as paths/segments, as arcs cannot be exactly represented via cubic beziers
-   Written in Typescript with exported type declarations
-   Includes unit tests with 100% coverage
<!-- - Option to flip y-axis (move origin to bottom left). -->

If you are having trouble with an SVG file, try debugging in the [demo page](https://apps.amandaghassaei.com/flat-svg/demo/). When submitting an issue, please attach an example SVG that is not working so I can add it to the suite of test cases. This library has been extensively tested with SVGs from Adobe Illustrator.

Contents:

-   [Installation](#installation)
-   [Use](#use)
-   [Limitations](#limitations)
-   [License](#license)
-   [Development](#development)

## Installation

### Install via npm

```sh
npm install @amandaghassaei/flat-svg
```

Then import via:

```js
import { FlatSVG } from '@amandaghassaei/flat-svg';
```

### Import into HTML

_OR_ in the browser you can add [bundle/flat-svg.js](https://github.com/amandaghassaei/flat-svg/blob/main/bundle/flat-svg.js) or [bundle/flat-svg.min.js](https://github.com/amandaghassaei/flat-svg/blob/main/bundle/flat-svg.min.js) to your html:

```html
<html>
    <head>
        ....
        <script src="flat-svg.min.js"></script>
    </head>
    <body></body>
</html>
```

Then in your js files, you can access the global variable `FlatSVGLib`:

```js
const { FlatSVG } = FlatSVGLib;
```

## Use

Complete API in the [docs](https://github.com/amandaghassaei/flat-svg/tree/main/docs).

```js
import { FlatSVG } from '@amandaghassaei/flat-svg';

// Init with svgString and options.
// options.preserveArcs defaults to false.
const flatSVG = new FlatSVG(svgString, { preserveArcs: true });
// Get a flat list of elements, paths, or segments from your svgString:
// flatSVG.elements returns a flattened list of SVG geometry
//      (e.g. circle, rect, polyline, path, etc).
//      Elements have structure: { tagName, properties, transform? }
// flatSVG.paths returns a flattened list SVG paths w abs coordinates
//      (converts other SVG element types to path)
//      Paths have structure: { properties }
// flatSVG.segments returns a flattened list of segments w abs coordinates
//      Segments may be lines, quadratic/cubic beziers, or arcs.
//      Segments have structure: { p1, p2, properties, controlPoints? }
//      If preserveArcs flag is true, arc segments have structure:
//        { p1, p2, rx, ry, xAxisRotation, largeArcFlag, sweepFlag, properties }
const { elements, paths, segments } = flatSVG;

// Check if FlatSVG encountered any errors or warnings during parsing,
// (must call this *after* querying for elements, paths, or segments).
const { errors, warnings } = flatSVG;

// Query other svg properties.
const { units, viewBox, defs } = flatSVG;

// You can also get elements, paths, and segments as an SVG string:
const { elementsAsSVG, pathsAsSVG, segmentsAsSVG } = flatSVG;
```

In addition, flat-svg exposes some helper functions for filtering elements by style:

```js
const redElements = flatSVG.filterElementsByStyle({
    key: 'stroke',
    value: 'red',
    // Optionally add a tolerance, defaults to 0.
    // For colors, tolerance is based on the the perceived color difference
    // for two colors according to Delta E2000 in the [0, 1] range
    // https://en.wikipedia.org/wiki/Color_difference#CIEDE2000
    tolerance: 0.1,
});

// Acceptable formats for color values:
// "#FFF"
// "#ffffff"
// "#ffffffff"
// "rgb(255, 255, 255)"
// "rgba(255, 255, 255, 0.5)"
// "rgba(100% 100% 100% / 50%)"
// "hsl(90, 100%, 100%)"
// "hsla(90, 100%, 100%, 0.5)"
// "hsla(90deg 100% 100% / 50%)"
// "tomato"

// Pass in an array of filters to get items that pass all filters.
const bluePathsFilled = flatSVG.filterPathsByStyle([
    {
        key: 'fill',
        value: '#00f',
    },
    {
        key: 'stroke-weight',
        value: 0,
        tolerance: 0.001,
    },
]);

// Optionally pass in an array of booleans to indicate elements
// to exclude from filter.
// "excluded" array should have same length as items you are filtering.
// This is useful when you want to apply more complex boolean logic to your filters.
const transparentSegmentsWithExclusions = flatSVG.filterSegmentsByStyle(
    {
        key: 'opacity',
        value: 0.5,
        tolerance: 0.25,
    },
    [false, false, false, false, false, true, false, false, false]
);
```

In the case that your SVG contains both an [opacity](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/opacity) and [stroke](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke) in the form `rgba()`, stroke alpha is mixed with opacity to get the true opacity of an object. In general this library expects that most information about an object's styling is stored in its stroke properties, as the main use case for this library is parsing designs comprised of many lines (as opposed to filled shapes), such as origami crease patterns and vector files for laser cutting or pen plotting.

## Limitations

Some limitations of this library:

-   flat-svg should preserve clipping mask definitions, but does not apply clipping masks during flattening (this would be cool to add, see [Development](#development)).
-   Currently does not handle Style Attribute (Entity References) from `AI > File > Save As... > SVG > Style Attribute (Entity References)`. I'm not sure how common this is in the wild?
-   This library does not currently support indirect values such as [currentcolor](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/color). I'm not sure how common this is in the wild?
-   Does not support units on width/height properties SVG child elements, for example:

```xml
<rect x="100" y="100" width="50mm" height="50mm" />
```

## License

This work is distributed under an [MIT license](https://github.com/amandaghassaei/flat-svg/blob/main/LICENSE). Please note the licenses of its dependencies as well:

-   [svg-parser](https://www.npmjs.com/package/svg-parser) (MIT License)
-   [svgpath](https://www.npmjs.com/package/svgpath) (MIT License)
-   [colord](https://www.npmjs.com/package/colord) (MIT license)
-   [@adobe/css-tools](https://www.npmjs.com/package/@adobe/css-tools) (MIT license)
-   [@amandaghassaei/type-checks](https://github.com/amandaghassaei/type-checks) (MIT license)
-   Additionally, some code was borrowed from [svg-flatten](https://www.npmjs.com/package/svg-flatten), which is distributed under an [ISC license](https://github.com/stadline/svg-flatten/blob/master/LICENSE).

Big thanks to the contributors of these packages for making their code available!

## Development

To build:

```sh
npm install
npm run build
```

Pull requests welcome! If you are having trouble with a file, try debugging in the [demo page](https://apps.amandaghassaei.com/flat-svg/demo/). When submitting an issue, please attach an example SVG that is not working so I can add it to the suite of test cases.

Some useful things to add next:

-   Apply clipping masks to SVG geometry (this will require calculating intersections between mask and underlying geometry).

### Testing

To run unit tests with mocha/chai:

```sh
npm run test
```

or, optionally:

```sh
npm run test-with-coverage
```

### Demo

To serve demo locally:

```sh
npm run serve
```

Then open [localhost:8080/demo](http://localhost:8080/demo) in your browser.
