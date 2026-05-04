// Internal-only constants — not re-exported from index.ts. SVG_STYLE_* values
// are used as computed keys on the public FlatSVGStyle interface; the .d.ts
// emit inlines them to plain string keys, so consumers don't need to import.

import {
	SVG_LINE,
	SVG_RECT,
	SVG_POLYGON,
	SVG_POLYLINE,
	SVG_CIRCLE,
	SVG_ELLIPSE,
	SVG_PATH,
} from './constants-public';

// Container / non-geometry tag names used internally during parse tree traversal.
export const SVG = 'svg';
export const DEFS = 'defs';
export const STYLE = 'style';
export const G = 'g';
// TEXT is intentionally omitted from SUPPORTED_GEOMETRY_TAG_NAMES — <text>
// routes to unsupportedElements. Reserved for future text-handling logic.
export const TEXT = 'text';

// SVG "no paint" sentinel — compared against fill/stroke and clip-path/mask/
// filter attribute values to disable the effect on that element.
export const SVG_PAINT_NONE = 'none';

// SVG path command letters after svgpath's `.abs()` normalization — all
// uppercase, including the coord-less `Z`.
export const SVG_PATH_CMD_MOVETO = 'M';
export const SVG_PATH_CMD_LINETO = 'L';
export const SVG_PATH_CMD_HLINETO = 'H';
export const SVG_PATH_CMD_VLINETO = 'V';
export const SVG_PATH_CMD_CURVETO = 'C';
export const SVG_PATH_CMD_QUADRATIC = 'Q';
export const SVG_PATH_CMD_ARC = 'A';
export const SVG_PATH_CMD_CLOSE = 'Z';

// SVG style property keys. https://css-tricks.com/svg-properties-and-css/
export const SVG_STYLE_FILL = 'fill';
export const SVG_STYLE_FILL_OPACITY = 'fill-opacity';
export const SVG_STYLE_STROKE_WIDTH = 'stroke-width';
export const SVG_STYLE_STROKE_COLOR = 'stroke';
export const SVG_STYLE_STROKE_OPACITY = 'stroke-opacity';
export const SVG_STYLE_STROKE_LINECAP = 'stroke-linecap';
export const SVG_STYLE_STROKE_LINEJOIN = 'stroke-linejoin';
export const SVG_STYLE_STROKE_MITERLIMIT = 'stroke-miterlimit';
export const SVG_STYLE_COLOR = 'color';
export const SVG_STYLE_OPACITY = 'opacity';
export const SVG_STYLE_DISPLAY = 'display';
export const SVG_STYLE_VISIBILITY = 'visibility';
export const SVG_STYLE_MASK = 'mask';
export const SVG_STYLE_CLIP_PATH = 'clip-path';
export const SVG_STYLE_FILTER = 'filter';
export const SVG_STYLE_STROKE_DASH_ARRAY = 'stroke-dasharray';

// Tags flat-svg converts into paths/segments. Anything else (<use>, <text>,
// <image>, <foreignObject>, nested <svg>, unknown) routes to unsupportedElements.
export const SUPPORTED_GEOMETRY_TAG_NAMES = new Set<string>([
	SVG_LINE, SVG_RECT, SVG_POLYGON, SVG_POLYLINE, SVG_CIRCLE, SVG_ELLIPSE, SVG_PATH,
]);
