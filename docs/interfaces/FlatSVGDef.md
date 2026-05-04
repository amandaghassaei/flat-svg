[**@amandaghassaei/flat-svg**](../README.md)

***

[@amandaghassaei/flat-svg](../README.md) / FlatSVGDef

# Interface: FlatSVGDef

A <defs> child definition (clipPath, mask, gradient, symbol, marker, pattern,
...). flat-svg records what's defined but does NOT resolve url(#id)
references — cross-reference by id yourself.

## Properties

### tagName

> `readonly` **tagName**: `string`

Element tag, e.g. 'clipPath', 'mask', 'linearGradient', 'symbol'.

***

### id?

> `readonly` `optional` **id?**: `string`

id attribute, if present — what url(#id) references resolve against.
