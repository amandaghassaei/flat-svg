[**@amandaghassaei/flat-svg**](../README.md)

***

[@amandaghassaei/flat-svg](../README.md) / FlatSVGAnalysis

# Interface: FlatSVGAnalysis

Aggregated diagnostic output from FlatSVG.analyze().
All fields are JSON-serializable — no class instances.

## Properties

### viewBox

> `readonly` **viewBox**: readonly \[`number`, `number`, `number`, `number`\]

***

### units

> `readonly` **units**: [`FlatSVGUnit`](../type-aliases/FlatSVGUnit.md)

***

### counts

> `readonly` **counts**: `Readonly`\<\{ `elements`: `number`; `paths`: `number`; `segments`: `number`; `zeroLengthSegments`: `number`; `strayVertices`: `number`; `defs`: `number`; `unsupportedElements`: `number`; \}\>

***

### strokeColors

> `readonly` **strokeColors**: [`FlatSVGColorHistogram`](FlatSVGColorHistogram.md)

***

### fillColors

> `readonly` **fillColors**: [`FlatSVGColorHistogram`](FlatSVGColorHistogram.md)

***

### containsClipPaths

> `readonly` **containsClipPaths**: `boolean`

***

### zeroLengthSegmentIndices

> `readonly` **zeroLengthSegmentIndices**: readonly `number`[]

Indices into FlatSVG.segments of zero-length segments.

***

### strayVertices

> `readonly` **strayVertices**: readonly [`FlatSVGStrayVertex`](FlatSVGStrayVertex.md)[]

***

### unsupportedElements

> `readonly` **unsupportedElements**: readonly [`FlatUnsupportedElement`](FlatUnsupportedElement.md)[]

Elements whose tagName flat-svg can't convert to paths/segments.

***

### warnings

> `readonly` **warnings**: readonly `string`[]
