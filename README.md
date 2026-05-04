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
-   Applies any id/class-based SVG styles onto child components; preserves each element's own id/class and surfaces the ancestor (`<g>`) chain as `ancestorIds` / `ancestorClasses`
-   Exposes flattened SVG geometry in several formats: as original SVG element type (e.g. circle, rect, polyline, path, etc), geometry converted to SVG paths, or geometry split into segments. Segments are essentially split paths and may be lines, quadratic/cubic beziers, or arcs (if preserveArcs flag is true)
-   Exposes helper functions for filtering by element style (e.g. stroke color, dash-array, opacity), with both object-returning and index-returning variants for use in multi-step filter pipelines
-   Exposes diagnostic getters for surfacing problematic content in an imported SVG — zero-length segments, isolated points from degenerate shapes, and a `clip-path` flag — plus an `analyze()` method that bundles everything into one JSON-serializable overview
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
//      Elements have structure: {
//        tagName, properties,
//        transform?,                              // composed ancestor matrix
//        clipPaths?, masks?, filters?,            // ancestor chains (see Diagnostics)
//        ancestorIds?, ancestorClasses?,          // ancestor (<g>) id/class chain (see Element lineage)
//      }
// flatSVG.paths returns a flattened list of SVG paths w abs coordinates
//      (converts other SVG element types to path)
//      Paths have structure: { properties, sourceElementIndex }
// flatSVG.segments returns a flattened list of segments w abs coordinates
//      Segments may be lines, quadratic/cubic beziers, or arcs. Discriminate
//      by the `type` field (FLAT_SEGMENT_LINE / FLAT_SEGMENT_BEZIER /
//      FLAT_SEGMENT_ARC, exported as constants).
//      Line segments have structure:
//        { type, p1, p2, properties, sourceElementIndex }
//      Bezier segments have structure:
//        { type, p1, p2, controlPoints, properties, sourceElementIndex }
//      If preserveArcs flag is true, arc segments have structure:
//        { type, p1, p2, rx, ry, xAxisRotation, largeArcFlag, sweepFlag,
//          properties, sourceElementIndex }
//      sourceElementIndex on a path or segment is its index back into
//      flatSVG.elements (resolves to the FlatElement that produced it).
const { elements, paths, segments } = flatSVG;

// Check if FlatSVG encountered any warnings during parsing.
// `warnings` is fully populated by the time the constructor returns —
// the constructor eagerly walks elements/paths/segments so this list
// reflects the complete parse-time set, not just whatever getters you've
// touched.
const { warnings } = flatSVG;

// Query other svg properties.
const { units, viewBox, defs } = flatSVG;

// You can also get elements, paths, and segments as an SVG string:
const { elementsAsSVG, pathsAsSVG, segmentsAsSVG } = flatSVG;
```

### Coordinate spaces — `elements` vs `paths` / `segments`

`elements[].properties` is in **source coordinates**; `paths[].properties.d` and `segments[].p1`/`p2` are in **viewBox coordinates**. flat-svg composes ancestor transforms onto each element's `transform` field but leaves `properties` (x/y/cx/cy/points/...) untouched — these are the values the source SVG author wrote. Drawing from `properties` directly will place geometry at the wrong location whenever any ancestor has a `transform` attribute. To get rendered geometry, use `paths` or `segments`, which apply the transform during conversion.

```js
// Source: <svg><g transform="translate(50,50)"><circle cx="10" cy="10" r="5"/></g></svg>
flatSVG.elements[0].properties.cx;        // 10  (source — what the author wrote)
flatSVG.elements[0].transform;            // { a:1, b:0, c:0, d:1, e:50, f:50 }
flatSVG.paths[0].properties.d;            // "M65,60 A5,5 0 1,0 55,60 ..." (rendered)
flatSVG.segments[0].p1;                   // [..., ...] in viewBox coordinates
```

If you only need the `viewBox` or `units` of an SVG (e.g. to size a thumbnail
or preview without parsing the full geometry), use the lightweight static
helpers — they skip the element / path / segment walk entirely:

```js
import { FlatSVG } from '@amandaghassaei/flat-svg';

// Returns [min-x, min-y, width, height]; falls back to root x/y/width/height
// if no viewBox attribute is present.
const viewBox = FlatSVG.viewBox(svgString);

// Returns one of 'in' | 'cm' | 'mm' | 'px' | 'pt' | 'em' | 'ex' | 'pc'.
const units = FlatSVG.units(svgString);
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
        key: 'stroke-width',
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

### Filtering by index

`filterElementsByStyle` / `filterPathsByStyle` / `filterSegmentsByStyle` each have an index-returning companion that returns `number[]` — the indices of matches into `.elements` / `.paths` / `.segments`. These are useful when threading a shared `excluded[]` tracker through multiple filter steps (e.g. a wizard-style import that narrows the remaining pool on each step), since indices can be used directly without re-reconciling objects against the source array.

```js
// Wizard-style multi-step filtering: each step claims segments from the pool;
// excluded[] tracks what's been claimed so a final catch-all can scoop the rest.
const excluded = new Array(flatSVG.segments.length).fill(false);

const redIndices = flatSVG.filterSegmentIndicesByStyle(
    { key: 'stroke', value: 'red', tolerance: 0.1 },
    excluded,
);
for (const i of redIndices) excluded[i] = true;

const blueIndices = flatSVG.filterSegmentIndicesByStyle(
    { key: 'stroke', value: 'blue', tolerance: 0.1 },
    excluded,
);
for (const i of blueIndices) excluded[i] = true;

// Whatever's left — segments we didn't match by stroke color.
const unmatchedSegments = flatSVG.segments.filter((_, i) => !excluded[i]);
```

The index-returning methods have the same signature as their object-returning counterparts and share the internal computed-properties cache.

### Element lineage

flat-svg flattens away ancestor containers (`<g>`) but preserves their `id`/`class` lineage on each leaf element, so consumers can reason about ancestor structure after flattening:

-   **Own values:** The element's own `id` / `class` attributes stay on `properties.id` / `properties.class` and round-trip cleanly through `*AsSVG`.
-   **Ancestor chain:** The `id` / `class` of ancestor containers (excluding the element itself) is surfaced as top-level fields on the FlatElement: `ancestorIds` and `ancestorClasses`. Both are space-joined strings, ordered outermost first. They are NOT serialized into `*AsSVG` output — these aren't real SVG attributes, they're flat-svg-internal lineage metadata that don't round-trip.

```js
// <g id="layer1" class="cuts">
//   <g id="thick" class="primary">
//     <line id="seg1" class="bold" .../>
//   </g>
// </g>
const el = flatSVG.elements[0];
el.properties.id;       // "seg1"
el.properties.class;    // "bold"
el.ancestorIds;         // "layer1 thick"
el.ancestorClasses;     // "cuts primary"
```

Paths and segments don't carry the lineage chain themselves. To look it up, resolve via `sourceElementIndex` back to the source FlatElement:

```js
const path = flatSVG.paths[0];
flatSVG.elements[path.sourceElementIndex].ancestorIds;
```

### Diagnostics

`FlatSVG` exposes several getters that surface potentially-problematic content in an imported SVG — a `clip-path` flag, zero-length segments, isolated points from degenerate shapes, and elements whose tagName flat-svg can't convert to paths/segments. All results are subsets of `.elements` / `.segments` or cheap boolean / array checks, and are JSON-serializable.

```js
// True if any element has a clip-path applied (self or inherited).
// flat-svg does NOT perform geometric clipping — this flag lets consumers warn
// their users that the imported SVG uses clip-paths that won't be applied.
// Clipped elements are still present in their entirety in elements/paths/segments.
// (No equivalent flag for SVG <mask> — those are rare in this library's input
// domain. Detect them yourself with flatSVG.elements.some(e => e.masks?.length).)
const hasClipPaths = flatSVG.containsClipPaths;  // boolean

// Per SVG spec, clip-path / mask / filter do NOT inherit as CSS properties —
// instead they compose as a chain, with each link applying to the rendering
// of the result below it. flat-svg collects these chains on each FlatElement
// (ordered outermost ancestor first, self last). The element's own
// properties map does NOT contain these attributes — the chain is the
// source of truth.
//
//   <g clip-path="url(#a)">
//     <g clip-path="url(#b)">
//       <rect clip-path="url(#c)"/>
//     </g>
//   </g>
//   → rect.clipPaths === ['url(#a)', 'url(#b)', 'url(#c)']
//
// Each entry is the raw attribute value; consumers can parse url(#id) themselves.
const chainsByElement = flatSVG.elements.map((e) => ({
    clipPaths: e.clipPaths,  // ReadonlyArray<string> | undefined
    masks:     e.masks,      // ReadonlyArray<string> | undefined
    filters:   e.filters,    // ReadonlyArray<string> | undefined
}));

// Truly zero-length segments — segments that collapse to a single point:
//   - Line: p1 === p2
//   - Quadratic/cubic bezier: p1 === p2 AND all control points === p1
//     (a bezier where p1 === p2 but control points are elsewhere traces a loop
//     and has nonzero arc length; it is NOT flagged here)
//   - Arc: p1 === p2 AND rx === 0 AND ry === 0
//     (a full-loop arc with p1 === p2 and nonzero radii is NOT flagged)
// Sources include <line> with identical endpoints, degenerate paths, and
// zero-size shapes like <circle r="0"> / <ellipse rx="0"> / <rect width="0" height="0">
// whose path representations decompose to zero-length segments.
// Returns indices into flatSVG.segments — use the same `excluded[]` pattern as
// filterSegmentIndicesByStyle to drop them from a filter pipeline.
const zeroIndices = flatSVG.zeroLengthSegmentIndices;

// Isolated points from SVG elements that describe a single point with no
// connecting segments:
//   - <polyline> or <polygon> with only one point,
//   - <path> subpaths that are only moveto commands — e.g. "M x y", "M x y Z",
//     or any dangling M not followed by a draw command, as in "M 1 1 M 2 2 L 3 3"
//     (first M is dangling; one entry per dangling M).
// Zero-size rects / zero-radius circles and ellipses are NOT stray vertices —
// they flow through the normal pipeline and surface as zero-length segments in
// flatSVG.zeroLengthSegmentIndices.
// Each entry has { position: [x, y], cause, sourceElementIndex } where position
// is in viewBox coordinates (transforms applied), cause is one of the
// FLAT_SVG_STRAY_VERTEX_* constants, and sourceElementIndex points back into
// flatSVG.elements at the element that produced this stray vertex.
const strays = flatSVG.strayVertices;

// Elements whose tagName flat-svg can't convert to paths/segments — e.g.
// <use>, <text>, <image>, <foreignObject>, nested <svg>, <style>/<defs> that
// aren't direct children of the <svg> root (top-level <style>/<defs> are
// parsed normally), or unknown tags. These are routed here at flatten time
// and do NOT appear in elements / paths / segments / *AsSVG. Position info
// (transform, properties) is preserved so consumers can warn users about
// content that was filtered out, list affected tagNames, render placeholders, etc.
const unsupported = flatSVG.unsupportedElements;
const unsupportedTagNames = [...new Set(unsupported.map((e) => e.tagName))];
```

Stray-vertex `cause` values are exported as constants and as a union type:

```js
import {
    FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY,
    FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT,
    FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT,
    type FlatSVGStrayVertexCause,
} from '@amandaghassaei/flat-svg';

for (const stray of flatSVG.strayVertices) {
    if (stray.cause === FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY) { /* ... */ }
    const sourceElement = flatSVG.elements[stray.sourceElementIndex];
}
```

`analyze()` bundles everything above into one JSON-serializable object, useful for building a single diagnostic overview of an imported SVG:

```js
const analysis = flatSVG.analyze();
// {
//   viewBox, units,
//   counts: { elements, paths, segments,
//             zeroLengthSegments, strayVertices, defs,
//             unsupportedElements },
//   strokeColors: { none: number, colors: { [hex]: count } },
//   fillColors:   { none: number, colors: { [hex]: count } },
//   containsClipPaths: boolean,
//   zeroLengthSegmentIndices, strayVertices, unsupportedElements,
//   warnings,
// }
JSON.stringify(analysis);  // safe — no class instances
```

All output is typed `readonly` — TypeScript prevents mutation at compile time. In addition, sibling elements that share an ancestor may share `transform` / `clipPaths` / `masks` / `filters` / `properties` references in memory (the inheritance chain is collapsed onto leaves without per-leaf copies). If you need a mutable working copy, spread it yourself: `[...arr]` for arrays, `{ ...obj }` for objects.

### Finding elements by absence of paint

To find elements with no authored `stroke` or `fill` — explicit `"none"` or missing attribute — pass `value: 'none'` to any of the filter methods:

```js
// Elements where stroke is "none" OR no stroke attribute (self or inherited).
const noStroke = flatSVG.filterElementsByStyle({ key: 'stroke', value: 'none' });

// Elements where fill is "none" OR no fill attribute (self or inherited).
const noFill = flatSVG.filterElementsByStyle({ key: 'fill', value: 'none' });

// Elements with NEITHER stroke nor fill — filter arrays AND together.
const noPaint = flatSVG.filterElementsByStyle([
    { key: 'stroke', value: 'none' },
    { key: 'fill', value: 'none' },
]);

// Fill-only elements (has fill, no stroke) — exclude fillless from a strokeless filter.
const excluded = new Array(flatSVG.elements.length).fill(false);
for (const i of flatSVG.filterElementIndicesByStyle({ key: 'fill', value: 'none' })) excluded[i] = true;
const fillOnly = flatSVG.filterElementsByStyle({ key: 'stroke', value: 'none' }, excluded);
```

The `'none'` filter value is source-only: it matches elements whose resolved `stroke` or `fill` property is exactly the string `"none"` or missing. It does NOT treat `stroke="transparent"`, `stroke="rgba(0,0,0,0)"`, `stroke-opacity="0"`, or `opacity="0"` as strokeless — those are explicit color/opacity choices rather than absence of paint.

The same pattern works for `filterPathsByStyle` / `filterSegmentsByStyle` and their index-returning variants.

## Limitations

Some limitations of this library:

-   flat-svg preserves `<clipPath>`, `<mask>`, and `<filter>` definitions but does NOT apply them during flattening — geometry is returned unclipped/unmasked (this would be cool to add, see [Development](#development)). The `flatSVG.containsClipPaths` flag lets consumers warn users that clip-paths won't be applied; the per-element `clipPaths` / `masks` / `filters` chains expose the underlying references for advanced inspection.
-   Does not handle Adobe Illustrator's legacy Style Attribute (Entity References) SVG export option (DTD entities like `&st0;`). Rare in modern files — AI defaulted away from this option around 2012.
-   **`<use>` references are not expanded.** A `<use href="#id"/>` (and its subtree) lands in `flatSVG.unsupportedElements` rather than pulling the referenced geometry into `elements` / `paths` / `segments`. If your input depends on `<use>` expansion, preprocess upstream (e.g. svgo's `removeUseElems` plugin, or `inkscape --export-plain-svg` with clones flattened).
-   **`currentColor` is resolved on `fill` and `stroke` only.** flat-svg substitutes case-insensitively against the inherited `color` property at parse time, defaulting to `"black"` when none is set. Not resolved: `stop-color` / `flood-color` / `lighting-color`, recursive `color="currentColor"` (falls back to `"black"`), and other CSS indirections (`var(--foo)`, `inherit`, `color-mix()`).
-   Does not support units on width/height properties SVG child elements, for example:

```xml
<rect x="100" y="100" width="50mm" height="50mm" />
```

-   **Importing flat-svg extends [colord](https://www.npmjs.com/package/colord) globally.** flat-svg uses colord internally for color parsing and Delta E2000 distance, and registers colord's `names` and `lab` plugins at module load via `colord.extend(...)`. colord's plugin registry is a single process-wide singleton with no per-instance / per-bundle scope, so any other code in the same bundle that imports colord will see these plugins applied as a side effect of importing flat-svg. Both plugins are additive (they enable new parses / methods, not override existing behavior), so the practical impact is that some color strings — `"tomato"`, `"rebeccapurple"`, etc. — that previously failed to parse start succeeding. If you need an unextended colord, isolate it in a separate bundle.
-   **Pinned to `@adobe/css-tools@^4.3.0-rc.1`.** Versions of `@adobe/css-tools` newer than `4.3.0-rc.1` broke `<style>` parsing for flat-svg — see [@adobe/css-tools#116](https://github.com/adobe/css-tools/issues/116). If you depend on `@adobe/css-tools` directly in the same project, keep your resolution compatible with `^4.3.0-rc.1` until that upstream issue is resolved.

### Divergences from the SVG spec

These behaviors are deliberate choices that don't match strict spec conformance. Each one exists to align the library's output with what real-world authoring tools (Illustrator, Inkscape, Figma, Sketch, Affinity) actually emit, or to keep the flattened representation useful to downstream consumers. If you need strict spec behavior, you'll need to post-process flat-svg's output or re-parse the SVG yourself.

-   **Hidden elements (`display="none"` or `visibility="hidden"`) are kept in outputs, with the hidden state propagated to descendants.** flat-svg does not drop hidden elements during flattening — `elements`, `paths`, `segments`, and `*AsSVG` contain the complete flattened geometry regardless of render-tree visibility. To make consumer-side filtering practical, the library also treats `display` as an inherited property — diverging from the SVG spec, where `display` doesn't inherit (an ancestor's `display: none` removes its subtree from the render tree without setting any attribute on descendants). flat-svg instead copies `display="none"` down so each descendant carries it on its own `properties`. `visibility` is inherited per spec, with child-wins resolution (a child's `visibility="visible"` correctly overrides an ancestor's `visibility="hidden"`). To skip invisible elements:

    ```js
    const visible = flatSVG.elements.filter((e) => {
        const p = e.properties as any;
        return p.display !== 'none' && p.visibility !== 'hidden';
    });
    ```

    All current diagnostic APIs rely on this inherited-`display` behavior.

-   **Filters and color histograms only match explicitly authored values.** Elements with no `fill` or `stroke` attribute rely on SVG spec defaults (`fill="black"`, `stroke="none"`) for rendering, but flat-svg does NOT synthesize those defaults when filtering or counting — a filter for `fill: "black"` will NOT match `<rect/>` even though a browser would render it as a black square. This is deliberate: the source-query APIs answer "what colors did the author write?". In practice all major authoring tools write explicit `fill`/`stroke` attributes on every element, so this distinction rarely surfaces. To opt into rendering-aware behavior you can preprocess `elements` and write explicit `fill="black"` / `stroke="none"` onto any element missing those attributes before filtering.

-   **Zero-length `Z` close commands are dropped.** A `Z` (or `z`) closes the current subpath by drawing a line from the current point back to the most recent `M`. When the path is already at its start point, that close-line has zero length — flat-svg omits the resulting segment instead of emitting it. Every major SVG authoring tool exports closed paths as `... L startX,startY z` (an explicit line back to the start, followed by `z`), so emitting the redundant `z` segment would inflate segment counts and add non-diagnostic noise to `zeroLengthSegmentIndices` on essentially every real-world SVG.

-   **`<style>` selector matching covers `#id` and `.class` only.** flat-svg parses the full content of `<style>` blocks (top-level or inside `<defs>`) but only applies rules whose selector is a single id or class — `#header { fill: red }` and `.outline { stroke: black }` work; element-name selectors (`rect { fill: red }`), attribute selectors (`[data-tag] { ... }`), descendant/child combinators (`g > rect`), pseudo-classes, and any compound selector are silently ignored. Real SVGs from authoring tools mostly use class selectors so this rarely surfaces; hand-written stylesheets and some design-system exports may need preprocessing (e.g. inline the styles onto the elements before passing to flat-svg).

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

-   Apply clip-paths to SVG geometry (this will require calculating intersections between clip-path region and underlying geometry).

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
