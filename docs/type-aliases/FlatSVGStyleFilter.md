[**@amandaghassaei/flat-svg**](../README.md)

***

[@amandaghassaei/flat-svg](../README.md) / FlatSVGStyleFilter

# Type Alias: FlatSVGStyleFilter

> **FlatSVGStyleFilter** = `object`

Spec passed to `FlatSVG.filter*ByStyle`. Matches against the element's
resolved value for `key`; `tolerance` is permissible distance — Delta
E2000 in [0, 1] for colors, raw numeric distance for numbers.

`value` type must match `key`:
- color keys (`stroke`, `fill`, `color`): `string | Colord`
- numeric keys (`stroke-width`, `opacity`, `stroke-opacity`, ...): `number`
- `stroke-dasharray`: `number[] | string`

Mismatched pairs throw at runtime.

## Properties

### key

> **key**: `string`

***

### value

> **value**: `string` \| `number` \| `number`[] \| `Colord`

***

### tolerance?

> `optional` **tolerance?**: `number`
