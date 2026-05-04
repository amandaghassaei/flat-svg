import { TextNode } from 'svg-parser';
import { Colord } from 'colord';

declare const SVG_STYLE_FILL = "fill";
declare const SVG_STYLE_FILL_OPACITY = "fill-opacity";
declare const SVG_STYLE_STROKE_WIDTH = "stroke-width";
declare const SVG_STYLE_STROKE_COLOR = "stroke";
declare const SVG_STYLE_STROKE_OPACITY = "stroke-opacity";
declare const SVG_STYLE_STROKE_LINECAP = "stroke-linecap";
declare const SVG_STYLE_STROKE_LINEJOIN = "stroke-linejoin";
declare const SVG_STYLE_STROKE_MITERLIMIT = "stroke-miterlimit";
declare const SVG_STYLE_COLOR = "color";
declare const SVG_STYLE_OPACITY = "opacity";
declare const SVG_STYLE_DISPLAY = "display";
declare const SVG_STYLE_VISIBILITY = "visibility";
declare const SVG_STYLE_STROKE_DASH_ARRAY = "stroke-dasharray";

declare const SVG_LINE = "line";
declare const SVG_RECT = "rect";
declare const SVG_POLYGON = "polygon";
declare const SVG_POLYLINE = "polyline";
declare const SVG_PATH = "path";
declare const SVG_CIRCLE = "circle";
declare const SVG_ELLIPSE = "ellipse";
declare const FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY = "FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY";
declare const FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT = "FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT";
declare const FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT = "FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT";
declare const FLAT_SEGMENT_LINE = "FLAT_SEGMENT_LINE";
declare const FLAT_SEGMENT_BEZIER = "FLAT_SEGMENT_BEZIER";
declare const FLAT_SEGMENT_ARC = "FLAT_SEGMENT_ARC";

/**
 * SVG length units recognized by flat-svg.
 */
type FlatSVGUnit = 'in' | 'cm' | 'mm' | 'px' | 'pt' | 'em' | 'ex' | 'pc';
/**
 * 2D [x, y] tuple. Treated as immutable — segments may share endpoints by
 * reference; copy via `[p[0], p[1]]` if you need to mutate.
 */
type FlatSVGPoint = readonly [number, number];
/**
 * Histogram of fill or stroke colors. `none` counts elements with explicit
 * 'none' OR no attribute. `colors` keys are hex (`#RRGGBB`) for valid values,
 * raw string for unparseable. Alpha is not represented — colors with different
 * opacities collapse into the same hex bucket.
 */
interface FlatSVGColorHistogram {
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
interface FlatSVGTransform {
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
interface FlatSVGStyle {
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
interface SVGBaseProperties extends FlatSVGStyle {
    id?: string;
    class?: string;
}
interface SVGLineProperties extends SVGBaseProperties {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}
interface SVGRectProperties extends SVGBaseProperties {
    x: number;
    y: number;
    width: number;
    height: number;
}
interface SVGPolylineProperties extends SVGBaseProperties {
    points: string;
}
interface SVGPolygonProperties extends SVGBaseProperties {
    points: string;
}
interface SVGCircleProperties extends SVGBaseProperties {
    r: number;
    cx: number;
    cy: number;
}
interface SVGEllipseProperties extends SVGBaseProperties {
    rx: number;
    ry: number;
    cx: number;
    cy: number;
}
interface SVGPathProperties extends SVGBaseProperties {
    d: string;
}
/**
 * Catch-all attribute bag for any SVG element at parse time — superset of
 * `FlatSVGStyle` plus every geometry attribute. `clip-path`/`mask`/`filter`
 * appear here because they reach the parse tree, but they surface to consumers
 * as chains on `FlatElementBase` (not via this bag); `style` is expanded into
 * individual style properties during flattening.
 */
interface SVGElementProperties extends FlatSVGStyle {
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
type SVGParserElementNode = {
    type: 'element';
    tagName?: string | undefined;
    properties?: SVGElementProperties;
    children: Array<SVGParserNode>;
    value?: string | undefined;
    metadata?: string | undefined;
};
/** A node in svg-parser's parse tree — text or element. */
type SVGParserNode = TextNode | SVGParserElementNode;
/**
 * A flattened SVG element. IMPORTANT: `properties` coordinates (x/y/cx/cy/
 * points/...) are in source coordinates — ancestor transforms are NOT applied.
 * `transform` exposes the composed ancestor matrix for callers who want to
 * apply it themselves. For viewBox coordinates, use FlatSVG.paths (transform
 * baked into `properties.d`) or FlatSVG.segments (baked into p1/p2).
 */
interface FlatElementBase {
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
interface FlatLineElement extends FlatElementBase {
    readonly tagName: typeof SVG_LINE;
    readonly properties: Readonly<SVGLineProperties>;
}
interface FlatRectElement extends FlatElementBase {
    readonly tagName: typeof SVG_RECT;
    readonly properties: Readonly<SVGRectProperties>;
}
interface FlatPolylineElement extends FlatElementBase {
    readonly tagName: typeof SVG_POLYLINE;
    readonly properties: Readonly<SVGPolylineProperties>;
}
interface FlatPolygonElement extends FlatElementBase {
    readonly tagName: typeof SVG_POLYGON;
    readonly properties: Readonly<SVGPolygonProperties>;
}
interface FlatCircleElement extends FlatElementBase {
    readonly tagName: typeof SVG_CIRCLE;
    readonly properties: Readonly<SVGCircleProperties>;
}
interface FlatEllipseElement extends FlatElementBase {
    readonly tagName: typeof SVG_ELLIPSE;
    readonly properties: Readonly<SVGEllipseProperties>;
}
interface FlatPathElement extends FlatElementBase {
    readonly tagName: typeof SVG_PATH;
    readonly properties: Readonly<SVGPathProperties>;
}
/** Flattened SVG geometry element. Discriminated union — narrow by `tagName`. */
type FlatElement = FlatLineElement | FlatRectElement | FlatPolylineElement | FlatPolygonElement | FlatCircleElement | FlatEllipseElement | FlatPathElement;
/**
 * SVG element whose tagName flat-svg can't convert to paths/segments — e.g.
 * `<use>`, `<text>`, `<image>`, `<foreignObject>`, nested `<svg>`, unknown
 * tags. Same `FlatElementBase` shape as `FlatElement` (transform / clip-path
 * chains, ancestor lineage), but `tagName` is open-ended and `properties`
 * carries only the inherited cascade styles — the element's own SVG attributes
 * (e.g. `<text>` x/y, `<use>` href) are NOT collected here.
 */
interface FlatUnsupportedElement extends FlatElementBase {
    readonly tagName: string;
    readonly properties: Readonly<FlatSVGStyle>;
}
/**
 * Flattened SVG element re-encoded as a `<path>` — output of path conversion.
 * Distinct from `FlatPathElement`, which is the source-element shape when the
 * input SVG had a `<path>`. `properties.d` is in viewBox coordinates.
 */
type FlatPath = {
    readonly properties: Readonly<SVGPathProperties>;
    /** Index of the source element in FlatSVG.elements. */
    readonly sourceElementIndex: number;
};
/** Straight line from p1 to p2. */
type FlatLineSegment = {
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
type FlatBezierSegment = {
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
type FlatArcSegment = {
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
type FlatSegment = FlatLineSegment | FlatBezierSegment | FlatArcSegment;
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
type FlatSVGStyleFilter = {
    key: string;
    value: string | number | number[] | Colord;
    tolerance?: number;
};
/** Which kind of degenerate SVG element produced a stray vertex. */
type FlatSVGStrayVertexCause = typeof FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY | typeof FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT | typeof FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT;
/**
 * Isolated point from a source element that collapsed (circle r=0, single-
 * point polyline, moveto-only path, ...). Position in viewBox coordinates.
 */
interface FlatSVGStrayVertex {
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
interface FlatSVGDef {
    /** Element tag, e.g. 'clipPath', 'mask', 'linearGradient', 'symbol'. */
    readonly tagName: string;
    /** id attribute, if present — what url(#id) references resolve against. */
    readonly id?: string;
}
/**
 * Aggregated diagnostic output from FlatSVG.analyze().
 * All fields are JSON-serializable — no class instances.
 */
interface FlatSVGAnalysis {
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

declare class FlatSVG {
    private readonly _rootNode;
    private readonly _viewBox;
    private readonly _units;
    private readonly _elements;
    private readonly _unsupportedElements;
    private readonly _paths;
    private readonly _segments;
    private readonly _preserveArcs;
    private readonly _defs;
    private readonly _warnings;
    private readonly _globalStyles?;
    private _computedElementProperties?;
    private _computedPathProperties?;
    private _computedSegmentProperties?;
    private readonly _strayVertices;
    private _zeroLengthSegmentIndices?;
    /************************************************
     * CONSTRUCTOR
     ************************************************/
    /**
     * Parse an SVG string and eagerly flatten elements/paths/segments.
     * @param string - SVG document to parse.
     * @param options - Optional settings.
     * @param options.preserveArcs - Keep arcs (and circle/ellipse encodings) as
     *     `A` commands in paths/segments. Defaults to false, which approximates
     *     arcs as cubic beziers via svgpath's .unarc().
     */
    constructor(string: string, options?: {
        preserveArcs: boolean;
    });
    /************************************************
     * SVG METADATA PARSING
     ************************************************/
    /**
     * Parse an SVG string and return the validated <svg> SVGParserElementNode. Used by
     * the constructor and by the static viewBox/units helpers so input
     * validation and "must contain a single <svg> root" stay in lockstep.
     * Unwraps svg-parser's document-level RootNode here because flat-svg
     * forbids any sibling top-level nodes — every caller wants the <svg>
     * element, never the wrapper.
     * @private
     */
    private static _parseSVGRoot;
    /**
     * Shared by `get viewBox` and the static `viewBox` helper. Per SVG 2 §8.2 a
     * viewBox that doesn't parse as exactly four finite numbers is invalid and
     * is ignored. The warnings array doubles as a "fallback opt-in": with it,
     * malformed pushes a warning and falls back to root x/y/width/height;
     * without it, malformed returns undefined so the caller sees the problem.
     * @private
     */
    private static _viewBoxFromRoot;
    /**
     * Detect length units from the root `<svg>` element's width/height/x/y
     * attribute suffixes. First attribute with a recognized suffix wins;
     * defaults to 'px' when none of them carry a unit.
     * @private
     */
    private static _unitsFromRoot;
    /**
     * Read viewBox without doing a full FlatSVG construction — useful for
     * thumbnails / preview sizing. Returns [min-x, min-y, width, height] for a
     * valid viewBox or one derived from root x/y/width/height when no viewBox
     * attribute is present; returns undefined when the viewBox attribute is
     * present but malformed (per SVG 2 §8.2).
     * @param string - SVG string to parse.
     * @returns Parsed/derived viewBox tuple, or undefined on malformed input.
     */
    static viewBox(string: string): [number, number, number, number] | undefined;
    /**
     * Read units without doing a full FlatSVG construction. Returns one of
     * the SVG-spec unit suffixes; defaults to 'px' if no suffix is present
     * on width/height.
     * @param string - SVG string to parse.
     */
    static units(string: string): FlatSVGUnit;
    /**
     * Read root-level SVG metadata in a single parse — saves a round trip when
     * multiple fields are needed. Each field follows the contract of its
     * dedicated static helper (e.g. `FlatSVG.viewBox`, `FlatSVG.units`).
     * @param string - SVG string to parse.
     * @returns Object with metadata fields derived from the SVG root.
     */
    static metadata(string: string): {
        viewBox: [number, number, number, number] | undefined;
        units: FlatSVGUnit;
    };
    /************************************************
     * SETTERS / GETTERS
     ************************************************/
    /**
     * Raw svg-parser parse tree root. Untouched by flat-svg's flattening —
     * useful for inspecting attributes the library doesn't surface explicitly.
     */
    get root(): SVGParserElementNode;
    set root(_value: SVGParserElementNode);
    /**
     * Get the viewBox of the SVG as [min-x, min-y, width, height].
     */
    get viewBox(): readonly [number, number, number, number];
    set viewBox(_value: readonly [number, number, number, number]);
    /**
     * Length units detected from the SVG's width/height attribute suffixes
     * (e.g. 'in', 'mm', 'px'). Defaults to 'px' when no unit suffix is present.
     */
    get units(): FlatSVGUnit;
    set units(_value: FlatSVGUnit);
    /**
     * Definition items (clipPath, mask, linearGradient, etc.) collected from
     * top-level <defs> blocks in the SVG. Excludes <style> children (those feed
     * the global CSS rules instead). Each entry has `tagName` and optional `id`.
     */
    get defs(): ReadonlyArray<FlatSVGDef>;
    set defs(_value: ReadonlyArray<FlatSVGDef>);
    /**
     * Parse-time warnings: anything flat-svg couldn't fully interpret but kept
     * going from (malformed transforms, CSS parse failures, skipped children,
     * unconvertible paths, etc.). Fully populated by end-of-constructor.
     */
    get warnings(): ReadonlyArray<string>;
    set warnings(_value: ReadonlyArray<string>);
    /**
     * Flattened geometry elements (line / rect / polyline / polygon / circle /
     * ellipse / path) with composed ancestor transforms. Coordinates remain in
     * source space — apply `element.transform` for viewBox-space geometry.
     */
    get elements(): ReadonlyArray<FlatElement>;
    set elements(_value: ReadonlyArray<FlatElement>);
    /**
     * Geometry re-encoded as `<path>` records with absolute coordinates and
     * ancestor transforms baked into `properties.d`. One FlatPath per element.
     */
    get paths(): ReadonlyArray<FlatPath>;
    set paths(_value: ReadonlyArray<FlatPath>);
    /**
     * Per-edge segments split out of FlatSVG.paths — lines, quadratic/cubic
     * beziers, and (when `preserveArcs`) arcs. Coordinates in viewBox space.
     */
    get segments(): ReadonlyArray<FlatSegment>;
    set segments(_value: ReadonlyArray<FlatSegment>);
    /**
     * Reconstructed SVG document from FlatSVG.elements — same `<svg>` wrapper
     * as the input, with each element re-emitted as its original tag.
     */
    get elementsAsSVG(): string;
    set elementsAsSVG(_value: string);
    /**
     * Reconstructed SVG document from FlatSVG.paths — same `<svg>` wrapper
     * as the input, with every shape re-emitted as a `<path>`.
     */
    get pathsAsSVG(): string;
    set pathsAsSVG(_value: string);
    /**
     * Reconstructed SVG document from FlatSVG.segments — every edge re-emitted
     * as its own `<line>` or `<path>` element under the original `<svg>` wrapper.
     */
    get segmentsAsSVG(): string;
    set segmentsAsSVG(_value: string);
    /**
     * Elements flat-svg can't convert to paths/segments (<use>, <text>, <image>,
     * <foreignObject>, nested <svg>, unknown tags). Routed here at flatten time
     * with transform/properties preserved; do NOT appear in elements/paths/
     * segments/*AsSVG outputs.
     */
    get unsupportedElements(): ReadonlyArray<FlatUnsupportedElement>;
    set unsupportedElements(_value: ReadonlyArray<FlatUnsupportedElement>);
    /**
     * True iff any element has a non-empty clipPaths chain. flat-svg does NOT
     * perform geometric clipping — clipped elements appear unclipped in
     * elements/paths/segments. Use this to warn consumers about ignored masks.
     */
    get containsClipPaths(): boolean;
    set containsClipPaths(_value: boolean);
    /**
     * Indices into FlatSVG.segments of zero-length segments. A segment is
     * zero-length iff endpoints coincide AND no geometry strays away and
     * returns:
     *   - Line: p1 === p2
     *   - Bezier: p1 === p2 AND every control point === p1 (otherwise the
     *     curve traces a loop with nonzero arc length)
     *   - Arc: p1 === p2 (per SVG spec, identical endpoints render nothing
     *     regardless of radii)
     * Returned as indices for use with the `excluded[]` filter pattern.
     */
    get zeroLengthSegmentIndices(): ReadonlyArray<number>;
    set zeroLengthSegmentIndices(_value: ReadonlyArray<number>);
    /**
     * Isolated points from degenerate elements that produce no edges (single-
     * point polylines, single-point polygons, moveto-only paths). Position is
     * in viewBox coordinates (transforms applied). Zero-radius circles/ellipses
     * and zero-size rects are NOT stray vertices — they produce zero-length
     * segments via `zeroLengthSegmentIndices` instead.
     */
    get strayVertices(): ReadonlyArray<FlatSVGStrayVertex>;
    set strayVertices(_value: ReadonlyArray<FlatSVGStrayVertex>);
    /************************************************
     * SVG PARSING AND FLATTENING
     ************************************************/
    /**
     * Parse a CSS string from a `<style>` block into a selector→FlatSVGStyle map.
     * Recognized selectors are bare `.class` and `#id`; unsupported selectors
     * still parse but never match during the cascade. Pushes any CSS parse
     * errors onto `_warnings`.
     * @param styleString - Raw text content of a top-level `<style>` element.
     * @returns Map of selector string (e.g. `.foo`, `#bar`) to FlatSVGStyle.
     */
    private _parseStyleToObject;
    /**
     * Recursively walk the SVG parse tree, composing inherited context
     * (transforms, ancestor id/class chains, clip-path/mask/filter chains, and
     * cascaded styles) and invoking `callback` on each leaf geometry element.
     * Recurses only into `<g>` containers; nested `<defs>`/`<style>` and
     * unknown tags are routed to unsupportedElements by the caller.
     * @param callback - Invoked once per leaf with the composed context.
     * @param node - Subtree root to walk; defaults to the SVG root.
     * @param inherited - Context accumulated from ancestors; recursive seed.
     */
    private _deepIterChildren;
    /************************************************
     * ELEMENTS
     ************************************************/
    /**
     * Walk the parse tree and build the flat element list. Pure — caller stores
     * the returned arrays and merges warnings into _warnings.
     */
    private _buildElements;
    /************************************************
     * PATHS
     ************************************************/
    /**
     * Convert flat elements to <path>-like records. Pure. Returns pathParsers
     * as a side-channel for _buildSegments — circle/ellipse/path build a parser
     * here; line/rect/polygon/polyline get one built lazily downstream.
     */
    private _buildPaths;
    /************************************************
     * SEGMENTS
     ************************************************/
    /**
     * Convert paths into edge segments (lines, quadratic/cubic beziers, arcs).
     * Pure. Reads pathParsers[i] when present (circle/ellipse/path); otherwise
     * builds a transient parser from path.properties.d.
     */
    private _buildSegments;
    /************************************************
     * FILTERING
     ************************************************/
    /**
     * Shared engine behind every public `filter*ByStyle` / `filter*IndicesByStyle`
     * method. Walks `objects`, tests each against the (possibly chained) filter
     * spec, and returns matching indices. Reuses (and writes back) a per-object-
     * type computed-properties cache so the cascade resolves once per filter session.
     * @param objects - The element/path/segment array being filtered.
     * @param filter - One filter or array of filters; all must match (AND).
     * @param computedProperties - Optional cached cascade results to reuse.
     * @param exclude - Optional skip mask matching `objects.length`.
     * @returns Indices of passing entries plus the (possibly populated) cache.
     */
    private _filterByStyle;
    /**
     * Filter FlatSVG.elements by style properties, returning matching indices.
     * Useful when threading an `excluded[]` tracker through multiple filter steps.
     * @param filter - FlatSVGStyle properties to filter for.
     * @param exclude - Booleans matching elements length; true entries skip that element.
     * @returns Indices into FlatSVG.elements of matching entries, ascending.
     */
    filterElementIndicesByStyle(filter: FlatSVGStyleFilter | FlatSVGStyleFilter[], exclude?: boolean[]): number[];
    /**
     * Like filterElementIndicesByStyle but returns the matching elements themselves.
     * @param filter - FlatSVGStyle properties to filter for.
     * @param exclude - Booleans matching elements length; true entries skip that element.
     * @returns Matching elements in source order.
     */
    filterElementsByStyle(filter: FlatSVGStyleFilter | FlatSVGStyleFilter[], exclude?: boolean[]): FlatElement[];
    /**
     * Filter FlatSVG.paths by style properties, returning matching indices.
     * @param filter - FlatSVGStyle properties to filter for.
     * @param exclude - Booleans matching paths length; true entries skip that path.
     * @returns Indices into FlatSVG.paths of matching entries, ascending.
     */
    filterPathIndicesByStyle(filter: FlatSVGStyleFilter | FlatSVGStyleFilter[], exclude?: boolean[]): number[];
    /**
     * Like filterPathIndicesByStyle but returns the matching paths themselves.
     * @param filter - FlatSVGStyle properties to filter for.
     * @param exclude - Booleans matching paths length; true entries skip that path.
     * @returns Matching paths in source order.
     */
    filterPathsByStyle(filter: FlatSVGStyleFilter | FlatSVGStyleFilter[], exclude?: boolean[]): FlatPath[];
    /**
     * Filter FlatSVG.segments by style properties, returning matching indices.
     * @param filter - FlatSVGStyle properties to filter for.
     * @param exclude - Booleans matching segments length; true entries skip that segment.
     * @returns Indices into FlatSVG.segments of matching entries, ascending.
     */
    filterSegmentIndicesByStyle(filter: FlatSVGStyleFilter | FlatSVGStyleFilter[], exclude?: boolean[]): number[];
    /**
     * Like filterSegmentIndicesByStyle but returns the matching segments themselves.
     * @param filter - FlatSVGStyle properties to filter for.
     * @param exclude - Booleans matching segments length; true entries skip that segment.
     * @returns Matching segments in source order.
     */
    filterSegmentsByStyle(filter: FlatSVGStyleFilter | FlatSVGStyleFilter[], exclude?: boolean[]): FlatSegment[];
    /************************************************
     * DIAGNOSTICS
     ************************************************/
    /**
     * Histogram of stroke/fill colors across elements. Colors normalize to hex
     * ('#F00', 'red', 'rgb(255,0,0)' all bucket together); invalid values
     * bucket by raw string. SVG spec defaults are NOT synthesized — `none`
     * counts both explicit 'none' and missing attributes ("no authored color").
     */
    private _histogramByStyleKey;
    /**
     * Aggregate JSON-serializable overview — counts, color histograms, and
     * diagnostic arrays in one object.
     * @returns FlatSVGAnalysis snapshot of the parsed SVG.
     */
    analyze(): FlatSVGAnalysis;
}

export { FLAT_SEGMENT_ARC, FLAT_SEGMENT_BEZIER, FLAT_SEGMENT_LINE, FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY, FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT, FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT, FlatSVG, SVG_CIRCLE, SVG_ELLIPSE, SVG_LINE, SVG_PATH, SVG_POLYGON, SVG_POLYLINE, SVG_RECT };
export type { FlatArcSegment, FlatBezierSegment, FlatCircleElement, FlatElement, FlatElementBase, FlatEllipseElement, FlatLineElement, FlatLineSegment, FlatPath, FlatPathElement, FlatPolygonElement, FlatPolylineElement, FlatRectElement, FlatSVGAnalysis, FlatSVGColorHistogram, FlatSVGDef, FlatSVGPoint, FlatSVGStrayVertex, FlatSVGStrayVertexCause, FlatSVGStyle, FlatSVGStyleFilter, FlatSVGTransform, FlatSVGUnit, FlatSegment, FlatUnsupportedElement, SVGBaseProperties, SVGCircleProperties, SVGElementProperties, SVGEllipseProperties, SVGLineProperties, SVGParserElementNode, SVGParserNode, SVGPathProperties, SVGPolygonProperties, SVGPolylineProperties, SVGRectProperties };
