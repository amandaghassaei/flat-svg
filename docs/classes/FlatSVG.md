[@amandaghassaei/flat-svg](../README.md) / FlatSVG

# Class: FlatSVG

## Table of contents

### Properties

- [defs](FlatSVG.md#defs)
- [errors](FlatSVG.md#errors)
- [warnings](FlatSVG.md#warnings)

### Constructors

- [constructor](FlatSVG.md#constructor)

### Accessors

- [root](FlatSVG.md#root)
- [viewBox](FlatSVG.md#viewbox)
- [units](FlatSVG.md#units)
- [elements](FlatSVG.md#elements)
- [elementsAsSVG](FlatSVG.md#elementsassvg)
- [paths](FlatSVG.md#paths)
- [pathsAsSVG](FlatSVG.md#pathsassvg)
- [segments](FlatSVG.md#segments)
- [segmentsAsSVG](FlatSVG.md#segmentsassvg)

### Methods

- [filterElementsByStyle](FlatSVG.md#filterelementsbystyle)
- [filterPathsByStyle](FlatSVG.md#filterpathsbystyle)
- [filterSegmentsByStyle](FlatSVG.md#filtersegmentsbystyle)

## Properties

### defs

• `Readonly` **defs**: [`ElementNode`](../README.md#elementnode)[] = `[]`

Defs elements that are removed during flattening.

___

### errors

• `Readonly` **errors**: `string`[] = `[]`

A list of errors generated during parsing.

___

### warnings

• `Readonly` **warnings**: `string`[] = `[]`

A list of warnings generated during parsing.

## Constructors

### constructor

• **new FlatSVG**(`string`, `options?`)

Init a FlatSVG object.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `string` | `string` | SVG string to parse. |
| `options?` | `Object` | Optional settings. |
| `options.preserveArcs` | `boolean` | Preserve arcs, ellipses, and circles as arcs when calling FlatSVG.paths and FlatSVG.segments.  Defaults to false, which will approximate arcs as cubic beziers. |

## Accessors

### root

• `get` **root**(): [`ElementNode`](../README.md#elementnode)

Get the root node of the SVG.

#### Returns

[`ElementNode`](../README.md#elementnode)

___

### viewBox

• `get` **viewBox**(): `number`[]

Get the viewBox of the SVG as [min-x, min-y, width, height].

#### Returns

`number`[]

___

### units

• `get` **units**(): ``"px"`` \| ``"in"`` \| ``"cm"`` \| ``"mm"`` \| ``"pt"`` \| ``"em"`` \| ``"ex"`` \| ``"pc"``

Get the units of the SVG as a string.

#### Returns

``"px"`` \| ``"in"`` \| ``"cm"`` \| ``"mm"`` \| ``"pt"`` \| ``"em"`` \| ``"ex"`` \| ``"pc"``

___

### elements

• `get` **elements**(): [`FlatElement`](../README.md#flatelement)[]

Get a flat list of geometry elements in the SVG.
The return value is cached internally.

#### Returns

[`FlatElement`](../README.md#flatelement)[]

___

### elementsAsSVG

• `get` **elementsAsSVG**(): `string`

Get svg string from FlatSVG.elements array.

#### Returns

`string`

___

### paths

• `get` **paths**(): [`FlatPath`](../README.md#flatpath)[]

Get a flat list of SVG geometry represented as paths.
The return value is cached internally.

#### Returns

[`FlatPath`](../README.md#flatpath)[]

___

### pathsAsSVG

• `get` **pathsAsSVG**(): `string`

Get svg string from FlatSVG.paths array.

#### Returns

`string`

___

### segments

• `get` **segments**(): [`FlatSegment`](../README.md#flatsegment)[]

Get a flat list of SVG edge segments (as lines, quadratic/cubic beziers, or arcs).
The return value is cached internally.

#### Returns

[`FlatSegment`](../README.md#flatsegment)[]

___

### segmentsAsSVG

• `get` **segmentsAsSVG**(): `string`

Get svg string from FlatSVG.segments array.

#### Returns

`string`

## Methods

### filterElementsByStyle

▸ **filterElementsByStyle**(`filter`, `exclude?`): [`FlatElement`](../README.md#flatelement)[]

Filter FlatSVG elements by style properties.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `filter` | [`PropertiesFilter`](../README.md#propertiesfilter) \| [`PropertiesFilter`](../README.md#propertiesfilter)[] | Style properties to filter for. |
| `exclude?` | `boolean`[] | Optionally pass an array of booleans of the same length as elements with "true" indicating that element should be excluded from the filter. |

#### Returns

[`FlatElement`](../README.md#flatelement)[]

___

### filterPathsByStyle

▸ **filterPathsByStyle**(`filter`, `exclude?`): [`FlatPath`](../README.md#flatpath)[]

Filter FlatSVG paths by style properties.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `filter` | [`PropertiesFilter`](../README.md#propertiesfilter) \| [`PropertiesFilter`](../README.md#propertiesfilter)[] | Style properties to filter for. |
| `exclude?` | `boolean`[] | Optionally pass an array of booleans of the same length as paths with "true" indicating that path should be excluded from the filter. |

#### Returns

[`FlatPath`](../README.md#flatpath)[]

___

### filterSegmentsByStyle

▸ **filterSegmentsByStyle**(`filter`, `exclude?`): [`FlatSegment`](../README.md#flatsegment)[]

Filter FlatSVG segments by style properties.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `filter` | [`PropertiesFilter`](../README.md#propertiesfilter) \| [`PropertiesFilter`](../README.md#propertiesfilter)[] | Style properties to filter for. |
| `exclude?` | `boolean`[] | Optionally pass an array of booleans of the same length as segments with "true" indicating that segment should be excluded from the filter. |

#### Returns

[`FlatSegment`](../README.md#flatsegment)[]
