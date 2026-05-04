[**@amandaghassaei/flat-svg**](../README.md)

***

[@amandaghassaei/flat-svg](../README.md) / FlatElementBase

# Interface: FlatElementBase

A flattened SVG element. IMPORTANT: `properties` coordinates (x/y/cx/cy/
points/...) are in source coordinates — ancestor transforms are NOT applied.
`transform` exposes the composed ancestor matrix for callers who want to
apply it themselves. For viewBox coordinates, use FlatSVG.paths (transform
baked into `properties.d`) or FlatSVG.segments (baked into p1/p2).

## Extended by

- [`FlatLineElement`](FlatLineElement.md)
- [`FlatRectElement`](FlatRectElement.md)
- [`FlatPolylineElement`](FlatPolylineElement.md)
- [`FlatPolygonElement`](FlatPolygonElement.md)
- [`FlatCircleElement`](FlatCircleElement.md)
- [`FlatEllipseElement`](FlatEllipseElement.md)
- [`FlatPathElement`](FlatPathElement.md)
- [`FlatUnsupportedElement`](FlatUnsupportedElement.md)

## Properties

### transform?

> `readonly` `optional` **transform?**: `Readonly`\<[`FlatSVGTransform`](FlatSVGTransform.md)\>

Ancestor-composed transform matrix (ancestor-first × self). Per SVG spec
`transform` doesn't inherit as a property — each ancestor's matrix
multiplies through; flat-svg collapses the composition onto each leaf.
Immutable; siblings sharing an ancestor may share this matrix by reference.

***

### clipPaths?

> `readonly` `optional` **clipPaths?**: readonly `string`[]

`clip-path` attribute values from outermost ancestor to self (e.g.
`"url(#mask1)"`). Per SVG spec clip-path doesn't inherit — every link in
the chain clips the result below it, so all entries apply simultaneously.
Immutable; siblings may share this array by reference.

***

### masks?

> `readonly` `optional` **masks?**: readonly `string`[]

`mask` chain — same semantics as clipPaths.

***

### filters?

> `readonly` `optional` **filters?**: readonly `string`[]

`filter` chain — same semantics as clipPaths.

***

### ancestorIds?

> `readonly` `optional` **ancestorIds?**: `string`

Space-joined chain of ancestor `<g>` ids, outermost first. Excludes this
element's own id (on `properties.id`). flat-svg-internal lineage metadata
— not a real SVG attribute. Resolve from a path/segment via
sourceElementIndex.

***

### ancestorClasses?

> `readonly` `optional` **ancestorClasses?**: `string`

Space-joined chain of ancestor `<g>` classes, outermost first. Excludes
this element's own class. Multiple classes per ancestor concatenate; per-
ancestor grouping is not preserved. Same rationale as ancestorIds.
