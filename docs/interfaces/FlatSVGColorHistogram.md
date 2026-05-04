[**@amandaghassaei/flat-svg**](../README.md)

***

[@amandaghassaei/flat-svg](../README.md) / FlatSVGColorHistogram

# Interface: FlatSVGColorHistogram

Histogram of fill or stroke colors. `none` counts elements with explicit
'none' OR no attribute. `colors` keys are hex (`#RRGGBB`) for valid values,
raw string for unparseable. Alpha is not represented — colors with different
opacities collapse into the same hex bucket.

## Properties

### none

> `readonly` **none**: `number`

***

### colors

> `readonly` **colors**: `Readonly`\<\{\[`color`: `string`\]: `number`; \}\>
