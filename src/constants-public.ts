// Geometry element tag names. Referenced by FlatLineElement / FlatRectElement /
// etc. via `typeof`, so consumers can discriminate FlatElement.tagName by import.
export const SVG_LINE = 'line';
export const SVG_RECT = 'rect';
export const SVG_POLYGON = 'polygon';
export const SVG_POLYLINE = 'polyline';
export const SVG_PATH = 'path';
export const SVG_CIRCLE = 'circle';
export const SVG_ELLIPSE = 'ellipse';

// FlatSVGStrayVertex.cause values. A stray vertex is an isolated point with no
// connecting segments. Asymmetric by design: zero-size rects and zero-radius
// circles/ellipses are NOT stray vertices — they produce zero-length segments
// (FlatSVG.zeroLengthSegments) and flow through the normal segment pipeline.
export const FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY = 'FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY';
export const FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT = 'FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT';
export const FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT = 'FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT';

// FlatSegment.type discriminator. String value matches constant name so JSON
// output is self-describing.
export const FLAT_SEGMENT_LINE = 'FLAT_SEGMENT_LINE';
export const FLAT_SEGMENT_BEZIER = 'FLAT_SEGMENT_BEZIER';
export const FLAT_SEGMENT_ARC = 'FLAT_SEGMENT_ARC';
