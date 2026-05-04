import { SVGParserElementNode, FlatElement, FlatUnsupportedElement, FlatPath, FlatSegment, FlatSVGAnalysis, FlatSVGDef, FlatSVGStrayVertex, FlatSVGStyleFilter, FlatSVGUnit } from './types-public';
export declare class FlatSVG {
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
