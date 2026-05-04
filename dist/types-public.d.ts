import { SVG_STYLE_DISPLAY, SVG_STYLE_FILL, SVG_STYLE_FILL_OPACITY, SVG_STYLE_OPACITY, SVG_STYLE_STROKE_COLOR, SVG_STYLE_STROKE_LINECAP, SVG_STYLE_STROKE_LINEJOIN, SVG_STYLE_STROKE_MITERLIMIT, SVG_STYLE_STROKE_OPACITY, SVG_STYLE_STROKE_WIDTH, SVG_STYLE_VISIBILITY, SVG_STYLE_COLOR, SVG_STYLE_STROKE_DASH_ARRAY } from './constants-private';
import { SVG_LINE, SVG_RECT, SVG_POLYLINE, SVG_POLYGON, SVG_CIRCLE, SVG_ELLIPSE, SVG_PATH, FLAT_SEGMENT_ARC, FLAT_SEGMENT_BEZIER, FLAT_SEGMENT_LINE, FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY, FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT, FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT } from './constants-public';
import { TextNode } from 'svg-parser';
import { Colord } from 'colord';
/**
 * SVG length units recognized by flat-svg.
 */
export type FlatSVGUnit = 'in' | 'cm' | 'mm' | 'px' | 'pt' | 'em' | 'ex' | 'pc';
/**
 * 2D [x, y] tuple. Treated as immutable — segments may share endpoints by
 * reference; copy via `[p[0], p[1]]` if you need to mutate.
 */
export type FlatSVGPoint = readonly [number, number];
/**
 * Histogram of fill or stroke colors. `none` counts elements with explicit
 * 'none' OR no attribute. `colors` keys are hex (`#RRGGBB`) for valid values,
 * raw string for unparseable. Alpha is not represented — colors with different
 * opacities collapse into the same hex bucket.
 */
export interface FlatSVGColorHistogram {
    readonly none: number;
    readonly colors: Readonly<{
        [color: string]: number;
    }>;
}
/**
 * 2D affine transform — SVG `matrix(a b c d e f)`, equivalent to the matrix
 * `[[a c e][b d f][0 0 1]]` applied to a column vector `[x y 1]`. Identity
 * is `{ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }`.
 */
export interface FlatSVGTransform {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
}
/**
 * Inheritable SVG/CSS style properties resolved during the cascade. Note that
 * `clip-path` / `mask` / `filter` are NOT here — they don't inherit; they're
 * surfaced as chains on `FlatElementBase`.
 */
export interface FlatSVGStyle {
    [SVG_STYLE_STROKE_WIDTH]?: number;
    [SVG_STYLE_STROKE_COLOR]?: string;
    [SVG_STYLE_STROKE_OPACITY]?: number;
    [SVG_STYLE_STROKE_LINECAP]?: string;
    [SVG_STYLE_STROKE_LINEJOIN]?: string;
    [SVG_STYLE_STROKE_MITERLIMIT]?: number;
    [SVG_STYLE_FILL]?: string;
    [SVG_STYLE_FILL_OPACITY]?: number;
    [SVG_STYLE_OPACITY]?: number;
    [SVG_STYLE_COLOR]?: string;
    [SVG_STYLE_STROKE_DASH_ARRAY]?: number | string;
    [SVG_STYLE_DISPLAY]?: string;
    [SVG_STYLE_VISIBILITY]?: string;
}
/** SVG attributes shared by every shape: style properties + `id` + `class`. */
export interface SVGBaseProperties extends FlatSVGStyle {
    id?: string;
    class?: string;
}
export interface SVGLineProperties extends SVGBaseProperties {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}
export interface SVGRectProperties extends SVGBaseProperties {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface SVGPolylineProperties extends SVGBaseProperties {
    points: string;
}
export interface SVGPolygonProperties extends SVGBaseProperties {
    points: string;
}
export interface SVGCircleProperties extends SVGBaseProperties {
    r: number;
    cx: number;
    cy: number;
}
export interface SVGEllipseProperties extends SVGBaseProperties {
    rx: number;
    ry: number;
    cx: number;
    cy: number;
}
export interface SVGPathProperties extends SVGBaseProperties {
    d: string;
}
/**
 * Catch-all attribute bag for any SVG element at parse time — superset of
 * `FlatSVGStyle` plus every geometry attribute. `clip-path`/`mask`/`filter`
 * appear here because they reach the parse tree, but they surface to consumers
 * as chains on `FlatElementBase` (not via this bag); `style` is expanded into
 * individual style properties during flattening.
 */
export interface SVGElementProperties extends FlatSVGStyle {
    viewBox?: string;
    id?: string;
    class?: string;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    x?: string;
    y?: string;
    width?: string;
    height?: string;
    points?: string;
    d?: string;
    cx?: number;
    cy?: number;
    rx?: number;
    ry?: number;
    r?: number;
    transform?: string;
    'clip-path'?: string;
    mask?: string;
    filter?: string;
    style?: string;
}
/** svg-parser's `ElementNode`, narrowed to exclude string children. */
export type SVGParserElementNode = {
    type: 'element';
    tagName?: string | undefined;
    properties?: SVGElementProperties;
    children: Array<SVGParserNode>;
    value?: string | undefined;
    metadata?: string | undefined;
};
/** A node in svg-parser's parse tree — text or element. */
export type SVGParserNode = TextNode | SVGParserElementNode;
/**
 * A flattened SVG element. IMPORTANT: `properties` coordinates (x/y/cx/cy/
 * points/...) are in source coordinates — ancestor transforms are NOT applied.
 * `transform` exposes the composed ancestor matrix for callers who want to
 * apply it themselves. For viewBox coordinates, use FlatSVG.paths (transform
 * baked into `properties.d`) or FlatSVG.segments (baked into p1/p2).
 */
export interface FlatElementBase {
    /**
     * Ancestor-composed transform matrix (ancestor-first × self). Per SVG spec
     * `transform` doesn't inherit as a property — each ancestor's matrix
     * multiplies through; flat-svg collapses the composition onto each leaf.
     * Immutable; siblings sharing an ancestor may share this matrix by reference.
     */
    readonly transform?: Readonly<FlatSVGTransform>;
    /**
     * `clip-path` attribute values from outermost ancestor to self (e.g.
     * `"url(#mask1)"`). Per SVG spec clip-path doesn't inherit — every link in
     * the chain clips the result below it, so all entries apply simultaneously.
     * Immutable; siblings may share this array by reference.
     */
    readonly clipPaths?: ReadonlyArray<string>;
    /** `mask` chain — same semantics as clipPaths. */
    readonly masks?: ReadonlyArray<string>;
    /** `filter` chain — same semantics as clipPaths. */
    readonly filters?: ReadonlyArray<string>;
    /**
     * Space-joined chain of ancestor `<g>` ids, outermost first. Excludes this
     * element's own id (on `properties.id`). flat-svg-internal lineage metadata
     * — not a real SVG attribute. Resolve from a path/segment via
     * sourceElementIndex.
     */
    readonly ancestorIds?: string;
    /**
     * Space-joined chain of ancestor `<g>` classes, outermost first. Excludes
     * this element's own class. Multiple classes per ancestor concatenate; per-
     * ancestor grouping is not preserved. Same rationale as ancestorIds.
     */
    readonly ancestorClasses?: string;
}
export interface FlatLineElement extends FlatElementBase {
    readonly tagName: typeof SVG_LINE;
    readonly properties: Readonly<SVGLineProperties>;
}
export interface FlatRectElement extends FlatElementBase {
    readonly tagName: typeof SVG_RECT;
    readonly properties: Readonly<SVGRectProperties>;
}
export interface FlatPolylineElement extends FlatElementBase {
    readonly tagName: typeof SVG_POLYLINE;
    readonly properties: Readonly<SVGPolylineProperties>;
}
export interface FlatPolygonElement extends FlatElementBase {
    readonly tagName: typeof SVG_POLYGON;
    readonly properties: Readonly<SVGPolygonProperties>;
}
export interface FlatCircleElement extends FlatElementBase {
    readonly tagName: typeof SVG_CIRCLE;
    readonly properties: Readonly<SVGCircleProperties>;
}
export interface FlatEllipseElement extends FlatElementBase {
    readonly tagName: typeof SVG_ELLIPSE;
    readonly properties: Readonly<SVGEllipseProperties>;
}
export interface FlatPathElement extends FlatElementBase {
    readonly tagName: typeof SVG_PATH;
    readonly properties: Readonly<SVGPathProperties>;
}
/** Flattened SVG geometry element. Discriminated union — narrow by `tagName`. */
export type FlatElement = FlatLineElement | FlatRectElement | FlatPolylineElement | FlatPolygonElement | FlatCircleElement | FlatEllipseElement | FlatPathElement;
/**
 * SVG element whose tagName flat-svg can't convert to paths/segments — e.g.
 * `<use>`, `<text>`, `<image>`, `<foreignObject>`, nested `<svg>`, unknown
 * tags. Same `FlatElementBase` shape as `FlatElement` (transform / clip-path
 * chains, ancestor lineage), but `tagName` is open-ended and `properties`
 * carries only the inherited cascade styles — the element's own SVG attributes
 * (e.g. `<text>` x/y, `<use>` href) are NOT collected here.
 */
export interface FlatUnsupportedElement extends FlatElementBase {
    readonly tagName: string;
    readonly properties: Readonly<FlatSVGStyle>;
}
/**
 * Flattened SVG element re-encoded as a `<path>` — output of path conversion.
 * Distinct from `FlatPathElement`, which is the source-element shape when the
 * input SVG had a `<path>`. `properties.d` is in viewBox coordinates.
 */
export type FlatPath = {
    readonly properties: Readonly<SVGPathProperties>;
    /** Index of the source element in FlatSVG.elements. */
    readonly sourceElementIndex: number;
};
/** Straight line from p1 to p2. */
export type FlatLineSegment = {
    readonly type: typeof FLAT_SEGMENT_LINE;
    readonly p1: FlatSVGPoint;
    readonly p2: FlatSVGPoint;
    readonly properties: Readonly<SVGBaseProperties>;
    /** Index of the source element in FlatSVG.elements. */
    readonly sourceElementIndex: number;
};
/**
 * Quadratic (`controlPoints.length === 1`) or cubic (`controlPoints.length === 2`)
 * Bézier from p1 to p2. For cubic, `controlPoints[0]` is the control near p1
 * and `controlPoints[1]` is the control near p2 (matching SVG `C` argument order).
 */
export type FlatBezierSegment = {
    readonly type: typeof FLAT_SEGMENT_BEZIER;
    readonly p1: FlatSVGPoint;
    readonly p2: FlatSVGPoint;
    readonly controlPoints: ReadonlyArray<FlatSVGPoint>;
    readonly properties: Readonly<SVGBaseProperties>;
    /** Index of the source element in FlatSVG.elements. */
    readonly sourceElementIndex: number;
};
/**
 * Elliptical arc from p1 to p2 — semantics match the SVG path `A` command,
 * `xAxisRotation` in degrees. Only emitted when `FlatSVG` was constructed
 * with `preserveArcs: true`; otherwise arcs are approximated as cubic beziers.
 */
export type FlatArcSegment = {
    readonly type: typeof FLAT_SEGMENT_ARC;
    readonly p1: FlatSVGPoint;
    readonly p2: FlatSVGPoint;
    readonly rx: number;
    readonly ry: number;
    readonly xAxisRotation: number;
    readonly largeArcFlag: boolean;
    readonly sweepFlag: boolean;
    readonly properties: Readonly<SVGBaseProperties>;
    /** Index of the source element in FlatSVG.elements. */
    readonly sourceElementIndex: number;
};
/** Flattened path segment. Discriminated union — narrow by `type`. */
export type FlatSegment = FlatLineSegment | FlatBezierSegment | FlatArcSegment;
/**
 * Spec passed to `FlatSVG.filter*ByStyle`. Matches against the element's
 * resolved value for `key`; `tolerance` is permissible distance — Delta
 * E2000 in [0, 1] for colors, raw numeric distance for numbers.
 *
 * `value` type must match `key`:
 * - color keys (`stroke`, `fill`, `color`): `string | Colord`
 * - numeric keys (`stroke-width`, `opacity`, `stroke-opacity`, ...): `number`
 * - `stroke-dasharray`: `number[] | string`
 *
 * Mismatched pairs throw at runtime.
 */
export type FlatSVGStyleFilter = {
    key: string;
    value: string | number | number[] | Colord;
    tolerance?: number;
};
/** Which kind of degenerate SVG element produced a stray vertex. */
export type FlatSVGStrayVertexCause = typeof FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY | typeof FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT | typeof FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT;
/**
 * Isolated point from a source element that collapsed (circle r=0, single-
 * point polyline, moveto-only path, ...). Position in viewBox coordinates.
 */
export interface FlatSVGStrayVertex {
    readonly position: FlatSVGPoint;
    readonly cause: FlatSVGStrayVertexCause;
    /** Index of the source element in FlatSVG.elements. */
    readonly sourceElementIndex: number;
}
/**
 * A <defs> child definition (clipPath, mask, gradient, symbol, marker, pattern,
 * ...). flat-svg records what's defined but does NOT resolve url(#id)
 * references — cross-reference by id yourself.
 */
export interface FlatSVGDef {
    /** Element tag, e.g. 'clipPath', 'mask', 'linearGradient', 'symbol'. */
    readonly tagName: string;
    /** id attribute, if present — what url(#id) references resolve against. */
    readonly id?: string;
}
/**
 * Aggregated diagnostic output from FlatSVG.analyze().
 * All fields are JSON-serializable — no class instances.
 */
export interface FlatSVGAnalysis {
    readonly viewBox: readonly [number, number, number, number];
    readonly units: FlatSVGUnit;
    readonly counts: Readonly<{
        elements: number;
        paths: number;
        segments: number;
        zeroLengthSegments: number;
        strayVertices: number;
        defs: number;
        unsupportedElements: number;
    }>;
    readonly strokeColors: FlatSVGColorHistogram;
    readonly fillColors: FlatSVGColorHistogram;
    readonly containsClipPaths: boolean;
    /** Indices into FlatSVG.segments of zero-length segments. */
    readonly zeroLengthSegmentIndices: ReadonlyArray<number>;
    readonly strayVertices: ReadonlyArray<FlatSVGStrayVertex>;
    /** Elements whose tagName flat-svg can't convert to paths/segments. */
    readonly unsupportedElements: ReadonlyArray<FlatUnsupportedElement>;
    readonly warnings: ReadonlyArray<string>;
}
