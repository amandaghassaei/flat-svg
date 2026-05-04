[**@amandaghassaei/flat-svg**](../README.md)

***

[@amandaghassaei/flat-svg](../README.md) / SVGElementProperties

# Interface: SVGElementProperties

Catch-all attribute bag for any SVG element at parse time — superset of
`FlatSVGStyle` plus every geometry attribute. `clip-path`/`mask`/`filter`
appear here because they reach the parse tree, but they surface to consumers
as chains on `FlatElementBase` (not via this bag); `style` is expanded into
individual style properties during flattening.

## Extends

- [`FlatSVGStyle`](FlatSVGStyle.md)

## Properties

### stroke-width?

> `optional` **stroke-width?**: `number`

#### Inherited from

[`FlatSVGStyle`](FlatSVGStyle.md).[`stroke-width`](FlatSVGStyle.md#stroke-width)

***

### stroke?

> `optional` **stroke?**: `string`

#### Inherited from

[`FlatSVGStyle`](FlatSVGStyle.md).[`stroke`](FlatSVGStyle.md#stroke)

***

### stroke-opacity?

> `optional` **stroke-opacity?**: `number`

#### Inherited from

[`FlatSVGStyle`](FlatSVGStyle.md).[`stroke-opacity`](FlatSVGStyle.md#stroke-opacity)

***

### stroke-linecap?

> `optional` **stroke-linecap?**: `string`

#### Inherited from

[`FlatSVGStyle`](FlatSVGStyle.md).[`stroke-linecap`](FlatSVGStyle.md#stroke-linecap)

***

### stroke-linejoin?

> `optional` **stroke-linejoin?**: `string`

#### Inherited from

[`FlatSVGStyle`](FlatSVGStyle.md).[`stroke-linejoin`](FlatSVGStyle.md#stroke-linejoin)

***

### stroke-miterlimit?

> `optional` **stroke-miterlimit?**: `number`

#### Inherited from

[`FlatSVGStyle`](FlatSVGStyle.md).[`stroke-miterlimit`](FlatSVGStyle.md#stroke-miterlimit)

***

### fill?

> `optional` **fill?**: `string`

#### Inherited from

[`FlatSVGStyle`](FlatSVGStyle.md).[`fill`](FlatSVGStyle.md#fill)

***

### fill-opacity?

> `optional` **fill-opacity?**: `number`

#### Inherited from

[`FlatSVGStyle`](FlatSVGStyle.md).[`fill-opacity`](FlatSVGStyle.md#fill-opacity)

***

### opacity?

> `optional` **opacity?**: `number`

#### Inherited from

[`FlatSVGStyle`](FlatSVGStyle.md).[`opacity`](FlatSVGStyle.md#opacity)

***

### color?

> `optional` **color?**: `string`

#### Inherited from

[`FlatSVGStyle`](FlatSVGStyle.md).[`color`](FlatSVGStyle.md#color)

***

### stroke-dasharray?

> `optional` **stroke-dasharray?**: `string` \| `number`

#### Inherited from

[`FlatSVGStyle`](FlatSVGStyle.md).[`stroke-dasharray`](FlatSVGStyle.md#stroke-dasharray)

***

### display?

> `optional` **display?**: `string`

#### Inherited from

[`FlatSVGStyle`](FlatSVGStyle.md).[`display`](FlatSVGStyle.md#display)

***

### visibility?

> `optional` **visibility?**: `string`

#### Inherited from

[`FlatSVGStyle`](FlatSVGStyle.md).[`visibility`](FlatSVGStyle.md#visibility)

***

### viewBox?

> `optional` **viewBox?**: `string`

***

### id?

> `optional` **id?**: `string`

***

### class?

> `optional` **class?**: `string`

***

### x1?

> `optional` **x1?**: `number`

***

### y1?

> `optional` **y1?**: `number`

***

### x2?

> `optional` **x2?**: `number`

***

### y2?

> `optional` **y2?**: `number`

***

### x?

> `optional` **x?**: `string`

***

### y?

> `optional` **y?**: `string`

***

### width?

> `optional` **width?**: `string`

***

### height?

> `optional` **height?**: `string`

***

### points?

> `optional` **points?**: `string`

***

### d?

> `optional` **d?**: `string`

***

### cx?

> `optional` **cx?**: `number`

***

### cy?

> `optional` **cy?**: `number`

***

### rx?

> `optional` **rx?**: `number`

***

### ry?

> `optional` **ry?**: `number`

***

### r?

> `optional` **r?**: `number`

***

### transform?

> `optional` **transform?**: `string`

***

### clip-path?

> `optional` **clip-path?**: `string`

***

### mask?

> `optional` **mask?**: `string`

***

### filter?

> `optional` **filter?**: `string`

***

### style?

> `optional` **style?**: `string`
