// Internal-only types. Not re-exported from index.ts — kept isolated so renames
// here aren't breaking changes for consumers.

import {
	SVG_PATH_CMD_ARC,
	SVG_PATH_CMD_CLOSE,
	SVG_PATH_CMD_CURVETO,
	SVG_PATH_CMD_HLINETO,
	SVG_PATH_CMD_LINETO,
	SVG_PATH_CMD_MOVETO,
	SVG_PATH_CMD_QUADRATIC,
	SVG_PATH_CMD_VLINETO,
	SVG_STYLE_COLOR,
	SVG_STYLE_FILL,
	SVG_STYLE_STROKE_COLOR,
	SVG_STYLE_STROKE_DASH_ARRAY,
} from './constants-private';
import {
	SVG_LINE,
	SVG_RECT,
	SVG_POLYLINE,
	SVG_POLYGON,
	SVG_CIRCLE,
	SVG_ELLIPSE,
	SVG_PATH,
} from './constants-public';
import { Colord } from 'colord';
import {
	FlatSVGTransform,
	FlatSVGStyle,
	SVGLineProperties,
	SVGRectProperties,
	SVGPolylineProperties,
	SVGPolygonProperties,
	SVGCircleProperties,
	SVGEllipseProperties,
	SVGPathProperties,
	FlatSVGPoint,
} from './types-public';

/**
 * Mutable variant of `FlatSVGPoint`. For in-place arithmetic (applyTransform writes
 * back into its argument) and for builders before publishing as a readonly FlatSVGPoint.
 */
export type MutablePoint = [number, number];

/**
 * Result of converting a <polygon>/<polyline> with a points attribute. A path
 * d-string for the normal case; `{ strayPoint }` for single-point degenerates
 * (caller flags as a stray vertex instead of a path); `undefined` for invalid
 * input (with a warning pushed onto parsingWarnings).
 */
export type PointsConversionResult = string | { readonly strayPoint: FlatSVGPoint } | undefined;

/**
 * Strips top-level `readonly` so builders can populate incrementally, then
 * publish through the readonly public type at the boundary. Distributes across
 * discriminated unions.
 */
export type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * State accumulated down the element tree during _deepIterChildren. All fields
 * optional and readonly — callbacks must not mutate, since refs are shared
 * with sibling/descendant elements that haven't diverged yet.
 */
export interface InheritedContext {
	readonly transform?: Readonly<FlatSVGTransform>;
	// Chain of ancestor <g> ids/classes — excludes the current element's own.
	// Outermost ancestor first, space-joined.
	readonly ancestorIds?: string;
	readonly ancestorClasses?: string;
	readonly properties?: Readonly<FlatSVGStyle>;
	readonly clipPaths?: ReadonlyArray<string>;
	readonly masks?: ReadonlyArray<string>;
	readonly filters?: ReadonlyArray<string>;
}

/**
 * `FlatSVGTransform` plus a `warnings` side-channel — used by `parseTransformString`
 * to ride parse warnings back alongside the matrix.
 */
export interface TransformParsed extends FlatSVGTransform {
	warnings?: string[],
}

/** Per-item cache of parsed style values; populated lazily by `_filterByStyle`. */
export interface ComputedProperties {
	[SVG_STYLE_STROKE_COLOR]?: Colord,
	[SVG_STYLE_FILL]?: Colord,
	[SVG_STYLE_COLOR]?: Colord,
	[SVG_STYLE_STROKE_DASH_ARRAY]?: number[];
}

/**
 * Type-level mirror of `SUPPORTED_GEOMETRY_TAG_NAMES` — the SVG tag names
 * flat-svg knows how to convert to paths and segments.
 */
export type GeometryElementTagName =
	typeof SVG_LINE | typeof SVG_RECT | typeof SVG_POLYLINE | typeof SVG_POLYGON |
	typeof SVG_CIRCLE | typeof SVG_ELLIPSE | typeof SVG_PATH;

/** SVGElementProperties shape per geometry tag, parallel to `GeometryElementTagName`. */
export type GeometryElementProperties =
	SVGLineProperties | SVGRectProperties | SVGPolylineProperties | SVGPolygonProperties |
	SVGCircleProperties | SVGEllipseProperties | SVGPathProperties;

// svgpath segment tuples, narrowed to what flat-svg actually observes:
// every parser runs through `.abs()` (rewrites all commands to absolute,
// including lowercase z → Z) and — for <path> input — `.unshort()` (expands
// S→C, T→Q). Other call sites feed only M/L/Z hand-built strings. So the
// relative arms (m/l/h/v/c/s/q/t/a) and S/T never reach `_buildSegments`.
type MoveToAbs = [typeof SVG_PATH_CMD_MOVETO, number, number];
type LineToAbs = [typeof SVG_PATH_CMD_LINETO, number, number];
type HorizontalLineToAbs = [typeof SVG_PATH_CMD_HLINETO, number];
type VerticalLineToAbs = [typeof SVG_PATH_CMD_VLINETO, number];
type CurveToAbs = [typeof SVG_PATH_CMD_CURVETO, number, number, number, number, number, number];
type QuadraticBézierCurveToAbs = [typeof SVG_PATH_CMD_QUADRATIC, number, number, number, number];
type EllipticalArcAbs = [typeof SVG_PATH_CMD_ARC, number, number, number, number, number, number, number];
type ClosePath = [typeof SVG_PATH_CMD_CLOSE];

type Segment =
	MoveToAbs | LineToAbs | HorizontalLineToAbs | VerticalLineToAbs |
	CurveToAbs | QuadraticBézierCurveToAbs | EllipticalArcAbs | ClosePath;

/**
 * svgpath's parser, redeclared to expose three runtime fields its upstream
 * types omit:
 *   `.segments` — Segment[] read in `_buildPaths` for MOVETO_ONLY detection
 *   `.err`      — parse-error string, checked in `_buildPaths` / convertToPath
 *   `.__stack`  — internal lazy-transform stack (unused by flat-svg)
 * May drift silently if svgpath changes method shapes — revisit periodically.
 */
export type PathParser = {
	(path: string): PathParser;
	new (path: string): PathParser;
	from(path: string | PathParser): PathParser;
	abs(): PathParser;
	rel(): PathParser;
	scale(sx: number, sy?: number): PathParser;
	translate(x: number, y?: number): PathParser;
	rotate(angle: number, rx?: number, ry?: number): PathParser;
	skewX(degrees: number): PathParser;
	skewY(degrees: number): PathParser;
	matrix(m: number[]): PathParser;
	transform(str: string): PathParser;
	unshort(): PathParser;
	unarc(): PathParser;
	toString(): string;
	round(precision: number): PathParser;
	iterate(iterator: (segment: Segment, index: number, x: number, y: number) => void, keepLazyStack?: boolean): PathParser;
	segments: Segment[];
	__stack?: any[];
	err?: string;
};
