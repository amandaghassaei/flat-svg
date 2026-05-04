[**@amandaghassaei/flat-svg**](../README.md)

***

[@amandaghassaei/flat-svg](../README.md) / FlatSVG

# Class: FlatSVG

## Constructors

### Constructor

> **new FlatSVG**(`string`, `options?`): `FlatSVG`

Parse an SVG string and eagerly flatten elements/paths/segments.

#### Parameters

##### string

`string`

SVG document to parse.

##### options?

Optional settings.

###### preserveArcs

`boolean`

Keep arcs (and circle/ellipse encodings) as
    `A` commands in paths/segments. Defaults to false, which approximates
    arcs as cubic beziers via svgpath's .unarc().

#### Returns

`FlatSVG`

## Accessors

### root

#### Get Signature

> **get** **root**(): [`SVGParserElementNode`](../type-aliases/SVGParserElementNode.md)

Raw svg-parser parse tree root. Untouched by flat-svg's flattening —
useful for inspecting attributes the library doesn't surface explicitly.

##### Returns

[`SVGParserElementNode`](../type-aliases/SVGParserElementNode.md)

#### Set Signature

> **set** **root**(`_value`): `void`

##### Parameters

###### \_value

[`SVGParserElementNode`](../type-aliases/SVGParserElementNode.md)

##### Returns

`void`

***

### viewBox

#### Get Signature

> **get** **viewBox**(): readonly \[`number`, `number`, `number`, `number`\]

Get the viewBox of the SVG as [min-x, min-y, width, height].

##### Returns

readonly \[`number`, `number`, `number`, `number`\]

#### Set Signature

> **set** **viewBox**(`_value`): `void`

##### Parameters

###### \_value

readonly \[`number`, `number`, `number`, `number`\]

##### Returns

`void`

***

### units

#### Get Signature

> **get** **units**(): [`FlatSVGUnit`](../type-aliases/FlatSVGUnit.md)

Length units detected from the SVG's width/height attribute suffixes
(e.g. 'in', 'mm', 'px'). Defaults to 'px' when no unit suffix is present.

##### Returns

[`FlatSVGUnit`](../type-aliases/FlatSVGUnit.md)

#### Set Signature

> **set** **units**(`_value`): `void`

##### Parameters

###### \_value

[`FlatSVGUnit`](../type-aliases/FlatSVGUnit.md)

##### Returns

`void`

***

### defs

#### Get Signature

> **get** **defs**(): readonly [`FlatSVGDef`](../interfaces/FlatSVGDef.md)[]

Definition items (clipPath, mask, linearGradient, etc.) collected from
top-level <defs> blocks in the SVG. Excludes <style> children (those feed
the global CSS rules instead). Each entry has `tagName` and optional `id`.

##### Returns

readonly [`FlatSVGDef`](../interfaces/FlatSVGDef.md)[]

#### Set Signature

> **set** **defs**(`_value`): `void`

##### Parameters

###### \_value

readonly [`FlatSVGDef`](../interfaces/FlatSVGDef.md)[]

##### Returns

`void`

***

### warnings

#### Get Signature

> **get** **warnings**(): readonly `string`[]

Parse-time warnings: anything flat-svg couldn't fully interpret but kept
going from (malformed transforms, CSS parse failures, skipped children,
unconvertible paths, etc.). Fully populated by end-of-constructor.

##### Returns

readonly `string`[]

#### Set Signature

> **set** **warnings**(`_value`): `void`

##### Parameters

###### \_value

readonly `string`[]

##### Returns

`void`

***

### elements

#### Get Signature

> **get** **elements**(): readonly [`FlatElement`](../type-aliases/FlatElement.md)[]

Flattened geometry elements (line / rect / polyline / polygon / circle /
ellipse / path) with composed ancestor transforms. Coordinates remain in
source space — apply `element.transform` for viewBox-space geometry.

##### Returns

readonly [`FlatElement`](../type-aliases/FlatElement.md)[]

#### Set Signature

> **set** **elements**(`_value`): `void`

##### Parameters

###### \_value

readonly [`FlatElement`](../type-aliases/FlatElement.md)[]

##### Returns

`void`

***

### paths

#### Get Signature

> **get** **paths**(): readonly [`FlatPath`](../type-aliases/FlatPath.md)[]

Geometry re-encoded as `<path>` records with absolute coordinates and
ancestor transforms baked into `properties.d`. One FlatPath per element.

##### Returns

readonly [`FlatPath`](../type-aliases/FlatPath.md)[]

#### Set Signature

> **set** **paths**(`_value`): `void`

##### Parameters

###### \_value

readonly [`FlatPath`](../type-aliases/FlatPath.md)[]

##### Returns

`void`

***

### segments

#### Get Signature

> **get** **segments**(): readonly [`FlatSegment`](../type-aliases/FlatSegment.md)[]

Per-edge segments split out of FlatSVG.paths — lines, quadratic/cubic
beziers, and (when `preserveArcs`) arcs. Coordinates in viewBox space.

##### Returns

readonly [`FlatSegment`](../type-aliases/FlatSegment.md)[]

#### Set Signature

> **set** **segments**(`_value`): `void`

##### Parameters

###### \_value

readonly [`FlatSegment`](../type-aliases/FlatSegment.md)[]

##### Returns

`void`

***

### elementsAsSVG

#### Get Signature

> **get** **elementsAsSVG**(): `string`

Reconstructed SVG document from FlatSVG.elements — same `<svg>` wrapper
as the input, with each element re-emitted as its original tag.

##### Returns

`string`

#### Set Signature

> **set** **elementsAsSVG**(`_value`): `void`

##### Parameters

###### \_value

`string`

##### Returns

`void`

***

### pathsAsSVG

#### Get Signature

> **get** **pathsAsSVG**(): `string`

Reconstructed SVG document from FlatSVG.paths — same `<svg>` wrapper
as the input, with every shape re-emitted as a `<path>`.

##### Returns

`string`

#### Set Signature

> **set** **pathsAsSVG**(`_value`): `void`

##### Parameters

###### \_value

`string`

##### Returns

`void`

***

### segmentsAsSVG

#### Get Signature

> **get** **segmentsAsSVG**(): `string`

Reconstructed SVG document from FlatSVG.segments — every edge re-emitted
as its own `<line>` or `<path>` element under the original `<svg>` wrapper.

##### Returns

`string`

#### Set Signature

> **set** **segmentsAsSVG**(`_value`): `void`

##### Parameters

###### \_value

`string`

##### Returns

`void`

***

### unsupportedElements

#### Get Signature

> **get** **unsupportedElements**(): readonly [`FlatUnsupportedElement`](../interfaces/FlatUnsupportedElement.md)[]

Elements flat-svg can't convert to paths/segments (<use>, <text>, <image>,
<foreignObject>, nested <svg>, unknown tags). Routed here at flatten time
with transform/properties preserved; do NOT appear in elements/paths/
segments/*AsSVG outputs.

##### Returns

readonly [`FlatUnsupportedElement`](../interfaces/FlatUnsupportedElement.md)[]

#### Set Signature

> **set** **unsupportedElements**(`_value`): `void`

##### Parameters

###### \_value

readonly [`FlatUnsupportedElement`](../interfaces/FlatUnsupportedElement.md)[]

##### Returns

`void`

***

### containsClipPaths

#### Get Signature

> **get** **containsClipPaths**(): `boolean`

True iff any element has a non-empty clipPaths chain. flat-svg does NOT
perform geometric clipping — clipped elements appear unclipped in
elements/paths/segments. Use this to warn consumers about ignored masks.

##### Returns

`boolean`

#### Set Signature

> **set** **containsClipPaths**(`_value`): `void`

##### Parameters

###### \_value

`boolean`

##### Returns

`void`

***

### zeroLengthSegmentIndices

#### Get Signature

> **get** **zeroLengthSegmentIndices**(): readonly `number`[]

Indices into FlatSVG.segments of zero-length segments. A segment is
zero-length iff endpoints coincide AND no geometry strays away and
returns:
  - Line: p1 === p2
  - Bezier: p1 === p2 AND every control point === p1 (otherwise the
    curve traces a loop with nonzero arc length)
  - Arc: p1 === p2 (per SVG spec, identical endpoints render nothing
    regardless of radii)
Returned as indices for use with the `excluded[]` filter pattern.

##### Returns

readonly `number`[]

#### Set Signature

> **set** **zeroLengthSegmentIndices**(`_value`): `void`

##### Parameters

###### \_value

readonly `number`[]

##### Returns

`void`

***

### strayVertices

#### Get Signature

> **get** **strayVertices**(): readonly [`FlatSVGStrayVertex`](../interfaces/FlatSVGStrayVertex.md)[]

Isolated points from degenerate elements that produce no edges (single-
point polylines, single-point polygons, moveto-only paths). Position is
in viewBox coordinates (transforms applied). Zero-radius circles/ellipses
and zero-size rects are NOT stray vertices — they produce zero-length
segments via `zeroLengthSegmentIndices` instead.

##### Returns

readonly [`FlatSVGStrayVertex`](../interfaces/FlatSVGStrayVertex.md)[]

#### Set Signature

> **set** **strayVertices**(`_value`): `void`

##### Parameters

###### \_value

readonly [`FlatSVGStrayVertex`](../interfaces/FlatSVGStrayVertex.md)[]

##### Returns

`void`

## Methods

### viewBox()

> `static` **viewBox**(`string`): \[`number`, `number`, `number`, `number`\] \| `undefined`

Read viewBox without doing a full FlatSVG construction — useful for
thumbnails / preview sizing. Returns [min-x, min-y, width, height] for a
valid viewBox or one derived from root x/y/width/height when no viewBox
attribute is present; returns undefined when the viewBox attribute is
present but malformed (per SVG 2 §8.2).

#### Parameters

##### string

`string`

SVG string to parse.

#### Returns

\[`number`, `number`, `number`, `number`\] \| `undefined`

Parsed/derived viewBox tuple, or undefined on malformed input.

***

### units()

> `static` **units**(`string`): [`FlatSVGUnit`](../type-aliases/FlatSVGUnit.md)

Read units without doing a full FlatSVG construction. Returns one of
the SVG-spec unit suffixes; defaults to 'px' if no suffix is present
on width/height.

#### Parameters

##### string

`string`

SVG string to parse.

#### Returns

[`FlatSVGUnit`](../type-aliases/FlatSVGUnit.md)

***

### metadata()

> `static` **metadata**(`string`): `object`

Read root-level SVG metadata in a single parse — saves a round trip when
multiple fields are needed. Each field follows the contract of its
dedicated static helper (e.g. `FlatSVG.viewBox`, `FlatSVG.units`).

#### Parameters

##### string

`string`

SVG string to parse.

#### Returns

`object`

Object with metadata fields derived from the SVG root.

##### viewBox

> **viewBox**: \[`number`, `number`, `number`, `number`\] \| `undefined`

##### units

> **units**: [`FlatSVGUnit`](../type-aliases/FlatSVGUnit.md)

***

### filterElementIndicesByStyle()

> **filterElementIndicesByStyle**(`filter`, `exclude?`): `number`[]

Filter FlatSVG.elements by style properties, returning matching indices.
Useful when threading an `excluded[]` tracker through multiple filter steps.

#### Parameters

##### filter

[`FlatSVGStyleFilter`](../type-aliases/FlatSVGStyleFilter.md) \| [`FlatSVGStyleFilter`](../type-aliases/FlatSVGStyleFilter.md)[]

FlatSVGStyle properties to filter for.

##### exclude?

`boolean`[]

Booleans matching elements length; true entries skip that element.

#### Returns

`number`[]

Indices into FlatSVG.elements of matching entries, ascending.

***

### filterElementsByStyle()

> **filterElementsByStyle**(`filter`, `exclude?`): [`FlatElement`](../type-aliases/FlatElement.md)[]

Like filterElementIndicesByStyle but returns the matching elements themselves.

#### Parameters

##### filter

[`FlatSVGStyleFilter`](../type-aliases/FlatSVGStyleFilter.md) \| [`FlatSVGStyleFilter`](../type-aliases/FlatSVGStyleFilter.md)[]

FlatSVGStyle properties to filter for.

##### exclude?

`boolean`[]

Booleans matching elements length; true entries skip that element.

#### Returns

[`FlatElement`](../type-aliases/FlatElement.md)[]

Matching elements in source order.

***

### filterPathIndicesByStyle()

> **filterPathIndicesByStyle**(`filter`, `exclude?`): `number`[]

Filter FlatSVG.paths by style properties, returning matching indices.

#### Parameters

##### filter

[`FlatSVGStyleFilter`](../type-aliases/FlatSVGStyleFilter.md) \| [`FlatSVGStyleFilter`](../type-aliases/FlatSVGStyleFilter.md)[]

FlatSVGStyle properties to filter for.

##### exclude?

`boolean`[]

Booleans matching paths length; true entries skip that path.

#### Returns

`number`[]

Indices into FlatSVG.paths of matching entries, ascending.

***

### filterPathsByStyle()

> **filterPathsByStyle**(`filter`, `exclude?`): [`FlatPath`](../type-aliases/FlatPath.md)[]

Like filterPathIndicesByStyle but returns the matching paths themselves.

#### Parameters

##### filter

[`FlatSVGStyleFilter`](../type-aliases/FlatSVGStyleFilter.md) \| [`FlatSVGStyleFilter`](../type-aliases/FlatSVGStyleFilter.md)[]

FlatSVGStyle properties to filter for.

##### exclude?

`boolean`[]

Booleans matching paths length; true entries skip that path.

#### Returns

[`FlatPath`](../type-aliases/FlatPath.md)[]

Matching paths in source order.

***

### filterSegmentIndicesByStyle()

> **filterSegmentIndicesByStyle**(`filter`, `exclude?`): `number`[]

Filter FlatSVG.segments by style properties, returning matching indices.

#### Parameters

##### filter

[`FlatSVGStyleFilter`](../type-aliases/FlatSVGStyleFilter.md) \| [`FlatSVGStyleFilter`](../type-aliases/FlatSVGStyleFilter.md)[]

FlatSVGStyle properties to filter for.

##### exclude?

`boolean`[]

Booleans matching segments length; true entries skip that segment.

#### Returns

`number`[]

Indices into FlatSVG.segments of matching entries, ascending.

***

### filterSegmentsByStyle()

> **filterSegmentsByStyle**(`filter`, `exclude?`): [`FlatSegment`](../type-aliases/FlatSegment.md)[]

Like filterSegmentIndicesByStyle but returns the matching segments themselves.

#### Parameters

##### filter

[`FlatSVGStyleFilter`](../type-aliases/FlatSVGStyleFilter.md) \| [`FlatSVGStyleFilter`](../type-aliases/FlatSVGStyleFilter.md)[]

FlatSVGStyle properties to filter for.

##### exclude?

`boolean`[]

Booleans matching segments length; true entries skip that segment.

#### Returns

[`FlatSegment`](../type-aliases/FlatSegment.md)[]

Matching segments in source order.

***

### analyze()

> **analyze**(): [`FlatSVGAnalysis`](../interfaces/FlatSVGAnalysis.md)

Aggregate JSON-serializable overview — counts, color histograms, and
diagnostic arrays in one object.

#### Returns

[`FlatSVGAnalysis`](../interfaces/FlatSVGAnalysis.md)

FlatSVGAnalysis snapshot of the parsed SVG.
