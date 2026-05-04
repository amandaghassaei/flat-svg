[**@amandaghassaei/flat-svg**](../README.md)

***

[@amandaghassaei/flat-svg](../README.md) / FlatArcSegment

# Type Alias: FlatArcSegment

> **FlatArcSegment** = `object`

Elliptical arc from p1 to p2 — semantics match the SVG path `A` command,
`xAxisRotation` in degrees. Only emitted when `FlatSVG` was constructed
with `preserveArcs: true`; otherwise arcs are approximated as cubic beziers.

## Properties

### type

> `readonly` **type**: *typeof* [`FLAT_SEGMENT_ARC`](../variables/FLAT_SEGMENT_ARC.md)

***

### p1

> `readonly` **p1**: [`FlatSVGPoint`](FlatSVGPoint.md)

***

### p2

> `readonly` **p2**: [`FlatSVGPoint`](FlatSVGPoint.md)

***

### rx

> `readonly` **rx**: `number`

***

### ry

> `readonly` **ry**: `number`

***

### xAxisRotation

> `readonly` **xAxisRotation**: `number`

***

### largeArcFlag

> `readonly` **largeArcFlag**: `boolean`

***

### sweepFlag

> `readonly` **sweepFlag**: `boolean`

***

### properties

> `readonly` **properties**: `Readonly`\<[`SVGBaseProperties`](../interfaces/SVGBaseProperties.md)\>

***

### sourceElementIndex

> `readonly` **sourceElementIndex**: `number`

Index of the source element in FlatSVG.elements.
