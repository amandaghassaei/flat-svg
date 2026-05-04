[**@amandaghassaei/flat-svg**](../README.md)

***

[@amandaghassaei/flat-svg](../README.md) / FlatPath

# Type Alias: FlatPath

> **FlatPath** = `object`

Flattened SVG element re-encoded as a `<path>` — output of path conversion.
Distinct from `FlatPathElement`, which is the source-element shape when the
input SVG had a `<path>`. `properties.d` is in viewBox coordinates.

## Properties

### properties

> `readonly` **properties**: `Readonly`\<[`SVGPathProperties`](../interfaces/SVGPathProperties.md)\>

***

### sourceElementIndex

> `readonly` **sourceElementIndex**: `number`

Index of the source element in FlatSVG.elements.
