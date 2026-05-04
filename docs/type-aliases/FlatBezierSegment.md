[**@amandaghassaei/flat-svg**](../README.md)

***

[@amandaghassaei/flat-svg](../README.md) / FlatBezierSegment

# Type Alias: FlatBezierSegment

> **FlatBezierSegment** = `object`

Quadratic (`controlPoints.length === 1`) or cubic (`controlPoints.length === 2`)
Bézier from p1 to p2. For cubic, `controlPoints[0]` is the control near p1
and `controlPoints[1]` is the control near p2 (matching SVG `C` argument order).

## Properties

### type

> `readonly` **type**: *typeof* [`FLAT_SEGMENT_BEZIER`](../variables/FLAT_SEGMENT_BEZIER.md)

***

### p1

> `readonly` **p1**: [`FlatSVGPoint`](FlatSVGPoint.md)

***

### p2

> `readonly` **p2**: [`FlatSVGPoint`](FlatSVGPoint.md)

***

### controlPoints

> `readonly` **controlPoints**: `ReadonlyArray`\<[`FlatSVGPoint`](FlatSVGPoint.md)\>

***

### properties

> `readonly` **properties**: `Readonly`\<[`SVGBaseProperties`](../interfaces/SVGBaseProperties.md)\>

***

### sourceElementIndex

> `readonly` **sourceElementIndex**: `number`

Index of the source element in FlatSVG.elements.
