@amandaghassaei/flat-svg

# @amandaghassaei/flat-svg

## Table of contents

### Classes

- [FlatSVG](classes/FlatSVG.md)

### Interfaces

- [Transform](interfaces/Transform.md)
- [Style](interfaces/Style.md)
- [BaseProperties](interfaces/BaseProperties.md)
- [LineProperties](interfaces/LineProperties.md)
- [RectProperties](interfaces/RectProperties.md)
- [PolylineProperties](interfaces/PolylineProperties.md)
- [PolygonProperties](interfaces/PolygonProperties.md)
- [CircleProperties](interfaces/CircleProperties.md)
- [EllipseProperties](interfaces/EllipseProperties.md)
- [PathProperties](interfaces/PathProperties.md)
- [SegmentProperties](interfaces/SegmentProperties.md)
- [Properties](interfaces/Properties.md)
- [FlatElementBase](interfaces/FlatElementBase.md)
- [FlatLineElement](interfaces/FlatLineElement.md)
- [FlatRectElement](interfaces/FlatRectElement.md)
- [FlatPolylineElement](interfaces/FlatPolylineElement.md)
- [FlatPolygonElement](interfaces/FlatPolygonElement.md)
- [FlatCircleElement](interfaces/FlatCircleElement.md)
- [FlatEllipseElement](interfaces/FlatEllipseElement.md)
- [FlatPathElement](interfaces/FlatPathElement.md)

### Type Aliases

- [ElementNode](README.md#elementnode)
- [Node](README.md#node)
- [FlatElement](README.md#flatelement)
- [FlatPath](README.md#flatpath)
- [FlatLineSegment](README.md#flatlinesegment)
- [FlatBezierSegment](README.md#flatbeziersegment)
- [FlatArcSegment](README.md#flatarcsegment)
- [FlatSegment](README.md#flatsegment)
- [PropertiesFilter](README.md#propertiesfilter)

## Type Aliases

### ElementNode

Ƭ **ElementNode**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `type` | ``"element"`` |
| `tagName?` | `string` |
| `properties?` | [`Properties`](interfaces/Properties.md) |
| `children` | [`Node`](README.md#node)[] |
| `value?` | `string` |
| `metadata?` | `string` |

___

### Node

Ƭ **Node**: `TextNode` \| [`ElementNode`](README.md#elementnode)

___

### FlatElement

Ƭ **FlatElement**: [`FlatLineElement`](interfaces/FlatLineElement.md) \| [`FlatRectElement`](interfaces/FlatRectElement.md) \| [`FlatPolylineElement`](interfaces/FlatPolylineElement.md) \| [`FlatPolygonElement`](interfaces/FlatPolygonElement.md) \| [`FlatCircleElement`](interfaces/FlatCircleElement.md) \| [`FlatEllipseElement`](interfaces/FlatEllipseElement.md) \| [`FlatPathElement`](interfaces/FlatPathElement.md)

___

### FlatPath

Ƭ **FlatPath**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `properties` | [`PathProperties`](interfaces/PathProperties.md) |

___

### FlatLineSegment

Ƭ **FlatLineSegment**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `p1` | [`number`, `number`] |
| `p2` | [`number`, `number`] |
| `properties` | [`SegmentProperties`](interfaces/SegmentProperties.md) |

___

### FlatBezierSegment

Ƭ **FlatBezierSegment**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `p1` | [`number`, `number`] |
| `p2` | [`number`, `number`] |
| `controlPoints` | [`number`, `number`][] |
| `properties` | [`SegmentProperties`](interfaces/SegmentProperties.md) |

___

### FlatArcSegment

Ƭ **FlatArcSegment**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `p1` | [`number`, `number`] |
| `p2` | [`number`, `number`] |
| `rx` | `number` |
| `ry` | `number` |
| `xAxisRotation` | `number` |
| `largeArcFlag` | `boolean` |
| `sweepFlag` | `boolean` |
| `properties` | [`SegmentProperties`](interfaces/SegmentProperties.md) |

___

### FlatSegment

Ƭ **FlatSegment**: [`FlatLineSegment`](README.md#flatlinesegment) \| [`FlatBezierSegment`](README.md#flatbeziersegment) \| [`FlatArcSegment`](README.md#flatarcsegment)

___

### PropertiesFilter

Ƭ **PropertiesFilter**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `string` \| `number` \| `number`[] \| `Colord` |
| `tolerance?` | `number` |
