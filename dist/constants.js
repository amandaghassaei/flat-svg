// Wrapper elements.
export const SVG = 'svg';
export const DEFS = 'defs';
export const G = 'g';
export const TEXT = 'text';
// Geometry elements.
export const LINE = 'line';
export const RECT = 'rect';
export const POLYGON = 'polygon';
export const POLYLINE = 'polyline';
export const PATH = 'path';
export const CIRCLE = 'circle';
export const ELLIPSE = 'ellipse';
// https://css-tricks.com/svg-properties-and-css/
export const SVG_STYLE_FILL = 'fill';
export const SVG_STYLE_FILL_OPACITY = 'fill-opacity';
export const SVG_STYLE_STROKE_WIDTH = 'stroke-width';
export const SVG_STYLE_STROKE_COLOR = 'stroke';
export const SVG_STYLE_STROKE_OPACITY = 'stroke-opacity';
export const SVG_STYLE_COLOR = 'color';
export const SVG_STYLE_OPACITY = 'opacity';
export const SVG_STYLE_MASK = 'mask';
export const SVG_STYLE_CLIP_PATH = 'clip-path';
export const SVG_STYLE_DISPLAY = 'display';
export const SVG_STYLE_VISIBILITY = 'visibility';
export const SVG_STYLE_STROKE_DASH_ARRAY = 'stroke-dasharray';
// Stray-vertex source constants. A "stray vertex" is an SVG element that
// describes an isolated point with no connecting segments — a polyline or
// polygon with a single point, or a path containing a dangling moveto.
// Zero-size rects / zero-radius circles and ellipses are NOT stray vertices;
// they flow through normally and produce zero-length segments that show up
// in FlatSVG.zeroLengthSegments.
// String value matches constant name so JSON output is self-describing.
export const FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY = 'FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY';
export const FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT = 'FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT';
export const FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT = 'FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT';
//# sourceMappingURL=constants.js.map