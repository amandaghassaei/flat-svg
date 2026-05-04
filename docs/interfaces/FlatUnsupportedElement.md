[**@amandaghassaei/flat-svg**](../README.md)

***

[@amandaghassaei/flat-svg](../README.md) / FlatUnsupportedElement

# Interface: FlatUnsupportedElement

SVG element whose tagName flat-svg can't convert to paths/segments — e.g.
`<use>`, `<text>`, `<image>`, `<foreignObject>`, nested `<svg>`, unknown
tags. Same `FlatElementBase` shape as `FlatElement` (transform / clip-path
chains, ancestor lineage), but `tagName` is open-ended and `properties`
carries only the inherited cascade styles — the element's own SVG attributes
(e.g. `<text>` x/y, `<use>` href) are NOT collected here.

## Extends

- [`FlatElementBase`](FlatElementBase.md)

## Properties

### transform?

> `readonly` `optional` **transform?**: `Readonly`\<[`FlatSVGTransform`](FlatSVGTransform.md)\>

Ancestor-composed transform matrix (ancestor-first × self). Per SVG spec
`transform` doesn't inherit as a property — each ancestor's matrix
multiplies through; flat-svg collapses the composition onto each leaf.
Immutable; siblings sharing an ancestor may share this matrix by reference.

#### Inherited from

[`FlatElementBase`](FlatElementBase.md).[`transform`](FlatElementBase.md#transform)

***

### clipPaths?

> `readonly` `optional` **clipPaths?**: readonly `string`[]

`clip-path` attribute values from outermost ancestor to self (e.g.
`"url(#mask1)"`). Per SVG spec clip-path doesn't inherit — every link in
the chain clips the result below it, so all entries apply simultaneously.
Immutable; siblings may share this array by reference.

#### Inherited from

[`FlatElementBase`](FlatElementBase.md).[`clipPaths`](FlatElementBase.md#clippaths)

***

### masks?

> `readonly` `optional` **masks?**: readonly `string`[]

`mask` chain — same semantics as clipPaths.

#### Inherited from

[`FlatElementBase`](FlatElementBase.md).[`masks`](FlatElementBase.md#masks)

***

### filters?

> `readonly` `optional` **filters?**: readonly `string`[]

`filter` chain — same semantics as clipPaths.

#### Inherited from

[`FlatElementBase`](FlatElementBase.md).[`filters`](FlatElementBase.md#filters)

***

### ancestorIds?

> `readonly` `optional` **ancestorIds?**: `string`

Space-joined chain of ancestor `<g>` ids, outermost first. Excludes this
element's own id (on `properties.id`). flat-svg-internal lineage metadata
— not a real SVG attribute. Resolve from a path/segment via
sourceElementIndex.

#### Inherited from

[`FlatElementBase`](FlatElementBase.md).[`ancestorIds`](FlatElementBase.md#ancestorids)

***

### ancestorClasses?

> `readonly` `optional` **ancestorClasses?**: `string`

Space-joined chain of ancestor `<g>` classes, outermost first. Excludes
this element's own class. Multiple classes per ancestor concatenate; per-
ancestor grouping is not preserved. Same rationale as ancestorIds.

#### Inherited from

[`FlatElementBase`](FlatElementBase.md).[`ancestorClasses`](FlatElementBase.md#ancestorclasses)

***

### tagName

> `readonly` **tagName**: `string`

***

### properties

> `readonly` **properties**: `Readonly`\<[`FlatSVGStyle`](FlatSVGStyle.md)\>
