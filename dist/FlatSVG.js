import { parse } from 'svg-parser';
import { parseTransformString, flattenTransformArray, transformToString, applyTransform, } from './transforms';
import { colord, extend } from 'colord';
import namesPlugin from 'colord/plugins/names';
import labPlugin from 'colord/plugins/lab';
import { SVG_CIRCLE, SVG_ELLIPSE, FLAT_SEGMENT_ARC, FLAT_SEGMENT_BEZIER, FLAT_SEGMENT_LINE, FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY, FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT, FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT, SVG_LINE, SVG_PATH, SVG_POLYGON, SVG_POLYLINE, SVG_RECT, } from './constants-public';
import { DEFS, G, STYLE, SVG, SVG_PAINT_NONE, SVG_PATH_CMD_ARC, SVG_PATH_CMD_CLOSE, SVG_PATH_CMD_CURVETO, SVG_PATH_CMD_HLINETO, SVG_PATH_CMD_LINETO, SVG_PATH_CMD_MOVETO, SVG_PATH_CMD_QUADRATIC, SVG_PATH_CMD_VLINETO, SVG_STYLE_CLIP_PATH, SVG_STYLE_COLOR, SVG_STYLE_FILL, SVG_STYLE_FILTER, SVG_STYLE_MASK, SVG_STYLE_OPACITY, SVG_STYLE_STROKE_COLOR, SVG_STYLE_STROKE_DASH_ARRAY, SUPPORTED_GEOMETRY_TAG_NAMES, } from './constants-private';
import { convertCircleToPath, convertEllipseToPath, convertLineToPath, convertPathToPath, convertPolygonToPath, convertPolylineToPath, convertRectToPath, } from './convertToPath';
import svgpath from 'svgpath';
// Had to roll back to @adobe/css-tools to version 4.3.0-rc.1 to get this to work.
// https://github.com/adobe/css-tools/issues/116
import { parse as cssParse } from '@adobe/css-tools';
import { isNumber, isString } from '@amandaghassaei/type-checks';
import { convertToDashArray, propertiesToAttributesString, wrapWithSVGTag } from './utils';
// Plugins extend colord to accept named colors ("tomato") and Lab/LCH inputs
// (the latter powers Delta E2000 in `.delta()`, used by color-tolerance filters).
//
// Caveat: colord's extend() mutates a single global singleton — there is no per-
// instance or per-bundle extend API. Any other code in the same bundle that
// imports colord will see these plugins applied as a side effect of importing
// flat-svg. Both plugins are additive (they enable new parses / methods, not
// override existing behavior), so the practical impact is limited to "some color
// strings that previously failed to parse now succeed." Documented in README
// Limitations. Cannot be fixed without dropping colord.
extend([namesPlugin]);
extend([labPlugin]);
export class FlatSVG {
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
    constructor(string, options) {
        var _a;
        // Definition items collected from top-level `<defs>` (clipPath, mask, gradient, ...).
        this._defs = [];
        // Parse-time warnings accumulated during construction (transforms, CSS, viewBox, ...).
        this._warnings = [];
        this._rootNode = FlatSVG._parseSVGRoot(string, 'FlatSVG()');
        this._preserveArcs = !!(options === null || options === void 0 ? void 0 : options.preserveArcs);
        // Parse viewBox once at construction so any malformed-viewBox warning fires
        // exactly once (the getter would otherwise re-warn on every read). Passing
        // the warnings array opts into the tuple-fallback overload, so this always
        // resolves to a tuple — keeping the instance `viewBox` getter total.
        this._viewBox = FlatSVG._viewBoxFromRoot(this._rootNode, this._warnings);
        this._units = FlatSVG._unitsFromRoot(this._rootNode);
        // Collect top-level <defs> and <style> without mutating the parse tree.
        // <defs> children populate `_defs`; <style> contents merge into `_globalStyles`.
        // _deepIterChildren later skips both tags so they don't produce geometry.
        const topChildren = this._rootNode.children;
        for (let i = 0, numChildren = topChildren.length; i < numChildren; i++) {
            const child = topChildren[i];
            if (child.tagName === DEFS) {
                // <style> children → global CSS rules; others (clipPath, mask,
                // gradient, symbol, marker, ...) → FlatSVGDef entries.
                if (child.children) {
                    for (let j = 0, numDefsChildren = child.children.length; j < numDefsChildren; j++) {
                        const defsChild = child.children[j];
                        if (!defsChild.tagName)
                            continue;
                        if (defsChild.tagName === STYLE &&
                            defsChild.children &&
                            defsChild.children[0] &&
                            defsChild.children[0].type === 'text') {
                            this._globalStyles = Object.assign(Object.assign({}, this._globalStyles), this._parseStyleToObject(defsChild.children[0].value));
                        }
                        else if (defsChild.tagName !== STYLE) {
                            this._defs.push({
                                tagName: defsChild.tagName,
                                id: (_a = defsChild.properties) === null || _a === void 0 ? void 0 : _a.id,
                            });
                        }
                    }
                }
            }
            else if (child.tagName === STYLE &&
                child.children &&
                child.children[0] &&
                child.children[0].type === 'text') {
                this._globalStyles = Object.assign(Object.assign({}, this._globalStyles), this._parseStyleToObject(child.children[0].value));
            }
        }
        this._deepIterChildren = this._deepIterChildren.bind(this);
        // Eagerly run elements → paths → segments so warnings, unsupportedElements,
        // and strayVertices are populated by end-of-constructor. Each stage is
        // pure; orchestration lives here, not in the getters.
        const elemResult = this._buildElements();
        const pathResult = this._buildPaths(elemResult.elements);
        const segResult = this._buildSegments(pathResult.paths, pathResult.pathParsers);
        this._elements = elemResult.elements;
        this._unsupportedElements = elemResult.unsupportedElements;
        this._paths = pathResult.paths;
        this._strayVertices = pathResult.strayVertices;
        this._segments = segResult.segments;
        this._warnings.push(...elemResult.warnings, ...pathResult.warnings, ...segResult.warnings);
    }
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
    static _parseSVGRoot(string, callerName) {
        if (string === undefined || !isString(string)) {
            // String(value) coerces any non-string to a printable form: "undefined",
            // "123", "[object Object]", "[object Array]", "null", etc. Avoid
            // JSON.stringify here — a caller passing a large object would inflate
            // the error message with the entire serialized payload.
            throw new Error(`Must pass in an SVG string to ${callerName}, got ${String(string)}.`);
        }
        if (string === '') {
            throw new Error(`SVG string passed to ${callerName} is empty.`);
        }
        const rootNode = parse(string);
        if (rootNode.children.length !== 1 ||
            rootNode.children[0].type !== 'element' ||
            rootNode.children[0].tagName !== SVG) {
            const numChildren = rootNode.children.length;
            const firstChild = rootNode.children[0];
            /* c8 ignore start -- defensive: svg-parser's parse() throws on inputs that would
               produce a length-0 root.children or a non-element first child (text-only,
               comment-only, CDATA-only, XML-decl-only, trailing text after an element), AND
               collapses sibling top-level elements so root.children.length never exceeds 1.
               So only firstChild=<tagName> with numChildren=1 reaches here; the firstChildDesc
               fallbacks and the `ren` arm of the count-pluralization ternary are unreachable
               unless svg-parser's output shape changes. */
            const firstChildDesc = !firstChild
                ? 'no children'
                : firstChild.type === 'element'
                    ? `<${firstChild.tagName}>`
                    : `${firstChild.type} node`;
            throw new Error(`Malformed SVG passed to ${callerName}: expected a single root <svg> element, got ${numChildren} root child${numChildren === 1 ? `: ${firstChildDesc}` : `ren`}.`);
            /* c8 ignore stop */
        }
        return rootNode.children[0];
    }
    static _viewBoxFromRoot(root, warnings) {
        var _a;
        /* c8 ignore start -- defensive: svg-parser always emits a `properties` object
           (empty `{}` for elements with no attributes), so the `?? {}` fallback only
           fires if the library changes its contract. Verified for v3.x. */
        const properties = (_a = root.properties) !== null && _a !== void 0 ? _a : {};
        /* c8 ignore stop */
        const viewBoxRaw = properties.viewBox;
        if (viewBoxRaw !== undefined && viewBoxRaw !== '') {
            // String() coerces single-number viewBoxes (svg-parser hands us a number
            // for purely-numeric attributes); split on whitespace and/or commas per
            // spec; filter empties so leading/trailing/repeated separators don't
            // produce phantom NaN tokens.
            const parts = String(viewBoxRaw)
                .split(/[\s,]+/)
                .filter((s) => s !== '')
                .map(parseFloat);
            if (parts.length === 4 && parts.every(Number.isFinite)) {
                return [parts[0], parts[1], parts[2], parts[3]];
            }
            // Malformed: signal via undefined unless the caller opted into the
            // fallback path by passing a warnings sink.
            if (!warnings)
                return undefined;
            warnings.push(`Malformed viewBox "${viewBoxRaw}".`);
        }
        // Missing viewBox attribute, or malformed-with-warnings → derive viewport
        // from root x/y/width/height (matches browser behavior per SVG 2 §8.2).
        return [
            Number.parseFloat((properties.x || '0')),
            Number.parseFloat((properties.y || '0')),
            Number.parseFloat((properties.width || '0')),
            Number.parseFloat((properties.height || '0')),
        ];
    }
    /**
     * Detect length units from the root `<svg>` element's width/height/x/y
     * attribute suffixes. First attribute with a recognized suffix wins;
     * defaults to 'px' when none of them carry a unit.
     * @private
     */
    static _unitsFromRoot(root) {
        // Default to pixels when no unit suffix is present.
        const regex = /(em|ex|px|pt|pc|cm|mm|in)$/;
        /* c8 ignore start -- defensive: svg-parser always emits a `properties` object
           (empty `{}` for elements with no attributes), so the `|| {}` fallback only
           fires if the library changes its contract. Verified for v3.x. */
        const { x, y, width, height } = root.properties || {};
        /* c8 ignore stop */
        if (isNumber(x) || isNumber(y) || isNumber(width) || isNumber(height)) {
            return 'px';
        }
        // First attribute with a recognized unit suffix wins; default to 'px'.
        for (const attr of [x, y, width, height]) {
            const match = attr === null || attr === void 0 ? void 0 : attr.match(regex);
            if (match)
                return match[0];
        }
        return 'px';
    }
    /**
     * Read viewBox without doing a full FlatSVG construction — useful for
     * thumbnails / preview sizing. Returns [min-x, min-y, width, height] for a
     * valid viewBox or one derived from root x/y/width/height when no viewBox
     * attribute is present; returns undefined when the viewBox attribute is
     * present but malformed (per SVG 2 §8.2).
     * @param string - SVG string to parse.
     * @returns Parsed/derived viewBox tuple, or undefined on malformed input.
     */
    static viewBox(string) {
        const rootNode = FlatSVG._parseSVGRoot(string, 'FlatSVG.viewBox()');
        return FlatSVG._viewBoxFromRoot(rootNode);
    }
    /**
     * Read units without doing a full FlatSVG construction. Returns one of
     * the SVG-spec unit suffixes; defaults to 'px' if no suffix is present
     * on width/height.
     * @param string - SVG string to parse.
     */
    static units(string) {
        const rootNode = FlatSVG._parseSVGRoot(string, 'FlatSVG.units()');
        return FlatSVG._unitsFromRoot(rootNode);
    }
    /**
     * Read root-level SVG metadata in a single parse — saves a round trip when
     * multiple fields are needed. Each field follows the contract of its
     * dedicated static helper (e.g. `FlatSVG.viewBox`, `FlatSVG.units`).
     * @param string - SVG string to parse.
     * @returns Object with metadata fields derived from the SVG root.
     */
    static metadata(string) {
        const rootNode = FlatSVG._parseSVGRoot(string, 'FlatSVG.metadata()');
        return {
            viewBox: FlatSVG._viewBoxFromRoot(rootNode),
            units: FlatSVG._unitsFromRoot(rootNode),
        };
    }
    /************************************************
     * SETTERS / GETTERS
     ************************************************/
    /**
     * Raw svg-parser parse tree root. Untouched by flat-svg's flattening —
     * useful for inspecting attributes the library doesn't surface explicitly.
     */
    get root() {
        return this._rootNode;
    }
    set root(_value) {
        throw new Error(`No root setter on ${this.constructor.name}.`);
    }
    /**
     * Get the viewBox of the SVG as [min-x, min-y, width, height].
     */
    get viewBox() {
        return this._viewBox;
    }
    set viewBox(_value) {
        throw new Error(`No viewBox setter on ${this.constructor.name}.`);
    }
    /**
     * Length units detected from the SVG's width/height attribute suffixes
     * (e.g. 'in', 'mm', 'px'). Defaults to 'px' when no unit suffix is present.
     */
    get units() {
        return this._units;
    }
    set units(_value) {
        throw new Error(`No units setter on ${this.constructor.name}.`);
    }
    /**
     * Definition items (clipPath, mask, linearGradient, etc.) collected from
     * top-level <defs> blocks in the SVG. Excludes <style> children (those feed
     * the global CSS rules instead). Each entry has `tagName` and optional `id`.
     */
    get defs() {
        return this._defs;
    }
    set defs(_value) {
        throw new Error(`No defs setter on ${this.constructor.name}.`);
    }
    /**
     * Parse-time warnings: anything flat-svg couldn't fully interpret but kept
     * going from (malformed transforms, CSS parse failures, skipped children,
     * unconvertible paths, etc.). Fully populated by end-of-constructor.
     */
    get warnings() {
        return this._warnings;
    }
    set warnings(_value) {
        throw new Error(`No warnings setter on ${this.constructor.name}.`);
    }
    /**
     * Flattened geometry elements (line / rect / polyline / polygon / circle /
     * ellipse / path) with composed ancestor transforms. Coordinates remain in
     * source space — apply `element.transform` for viewBox-space geometry.
     */
    get elements() {
        return this._elements;
    }
    set elements(_value) {
        throw new Error(`No elements setter on ${this.constructor.name}.`);
    }
    /**
     * Geometry re-encoded as `<path>` records with absolute coordinates and
     * ancestor transforms baked into `properties.d`. One FlatPath per element.
     */
    get paths() {
        return this._paths;
    }
    set paths(_value) {
        throw new Error(`No paths setter on ${this.constructor.name}.`);
    }
    /**
     * Per-edge segments split out of FlatSVG.paths — lines, quadratic/cubic
     * beziers, and (when `preserveArcs`) arcs. Coordinates in viewBox space.
     */
    get segments() {
        return this._segments;
    }
    set segments(_value) {
        throw new Error(`No segments setter on ${this.constructor.name}.`);
    }
    /**
     * Reconstructed SVG document from FlatSVG.elements — same `<svg>` wrapper
     * as the input, with each element re-emitted as its original tag.
     */
    get elementsAsSVG() {
        const { elements, root } = this;
        return wrapWithSVGTag(root, elements
            .map((element) => {
            const { tagName, properties, transform } = element;
            let propertiesString = propertiesToAttributesString(properties);
            if (transform)
                propertiesString += `transform="${transformToString(transform)}" `;
            return `<${tagName} ${propertiesString}/>`;
        })
            .join('\n'));
    }
    set elementsAsSVG(_value) {
        throw new Error(`No elementsAsSVG setter on ${this.constructor.name}.`);
    }
    /**
     * Reconstructed SVG document from FlatSVG.paths — same `<svg>` wrapper
     * as the input, with every shape re-emitted as a `<path>`.
     */
    get pathsAsSVG() {
        const { paths, root } = this;
        return wrapWithSVGTag(root, paths
            .map((path) => {
            const { properties } = path;
            const propertiesString = propertiesToAttributesString(properties);
            return `<path ${propertiesString}/>`;
        })
            .join('\n'));
    }
    set pathsAsSVG(_value) {
        throw new Error(`No pathsAsSVG setter on ${this.constructor.name}.`);
    }
    /**
     * Reconstructed SVG document from FlatSVG.segments — every edge re-emitted
     * as its own `<line>` or `<path>` element under the original `<svg>` wrapper.
     */
    get segmentsAsSVG() {
        const { segments, root } = this;
        return wrapWithSVGTag(root, segments
            .map((segment) => {
            const { p1, p2, properties } = segment;
            const propertiesString = propertiesToAttributesString(properties);
            switch (segment.type) {
                case FLAT_SEGMENT_BEZIER: {
                    const { controlPoints } = segment;
                    const curveType = controlPoints.length === 1
                        ? SVG_PATH_CMD_QUADRATIC
                        : SVG_PATH_CMD_CURVETO;
                    let d = `${SVG_PATH_CMD_MOVETO} ${p1[0]} ${p1[1]} ${curveType} ${controlPoints[0][0]} ${controlPoints[0][1]} `;
                    if (curveType === SVG_PATH_CMD_CURVETO)
                        d += `${controlPoints[1][0]} ${controlPoints[1][1]} `;
                    d += `${p2[0]} ${p2[1]} `;
                    return `<path d="${d}" ${propertiesString}/>`;
                }
                case FLAT_SEGMENT_ARC: {
                    const { rx, ry, xAxisRotation, largeArcFlag, sweepFlag } = segment;
                    return `<path d="M ${p1[0]} ${p1[1]} A ${rx} ${ry} ${xAxisRotation} ${largeArcFlag ? 1 : 0} ${sweepFlag ? 1 : 0} ${p2[0]} ${p2[1]}" ${propertiesString}/>`;
                }
                case FLAT_SEGMENT_LINE:
                    return `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" ${propertiesString}/>`;
            }
        })
            .join('\n'));
    }
    set segmentsAsSVG(_value) {
        throw new Error(`No segmentsAsSVG setter on ${this.constructor.name}.`);
    }
    /**
     * Elements flat-svg can't convert to paths/segments (<use>, <text>, <image>,
     * <foreignObject>, nested <svg>, unknown tags). Routed here at flatten time
     * with transform/properties preserved; do NOT appear in elements/paths/
     * segments/*AsSVG outputs.
     */
    get unsupportedElements() {
        return this._unsupportedElements;
    }
    set unsupportedElements(_value) {
        throw new Error(`No unsupportedElements setter on ${this.constructor.name}.`);
    }
    /**
     * True iff any element has a non-empty clipPaths chain. flat-svg does NOT
     * perform geometric clipping — clipped elements appear unclipped in
     * elements/paths/segments. Use this to warn consumers about ignored masks.
     */
    get containsClipPaths() {
        const { elements } = this;
        for (let i = 0; i < elements.length; i++) {
            const clipPaths = elements[i].clipPaths;
            if (clipPaths && clipPaths.length > 0)
                return true;
        }
        return false;
    }
    set containsClipPaths(_value) {
        throw new Error(`No containsClipPaths setter on ${this.constructor.name}.`);
    }
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
    get zeroLengthSegmentIndices() {
        if (this._zeroLengthSegmentIndices)
            return this._zeroLengthSegmentIndices;
        const { segments } = this;
        const zeroLengthSegmentIndices = [];
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const { p1, p2 } = segment;
            if (p1[0] !== p2[0] || p1[1] !== p2[1])
                continue;
            if (segment.type === FLAT_SEGMENT_BEZIER) {
                const { controlPoints } = segment;
                let allMatch = true;
                for (let j = 0; j < controlPoints.length; j++) {
                    if (controlPoints[j][0] !== p1[0] || controlPoints[j][1] !== p1[1]) {
                        allMatch = false;
                        break;
                    }
                }
                if (!allMatch)
                    continue;
            }
            // Line or arc with p1 === p2 — falls through as zero-length.
            zeroLengthSegmentIndices.push(i);
        }
        this._zeroLengthSegmentIndices = zeroLengthSegmentIndices;
        return zeroLengthSegmentIndices;
    }
    set zeroLengthSegmentIndices(_value) {
        throw new Error(`No zeroLengthSegmentIndices setter on ${this.constructor.name}.`);
    }
    /**
     * Isolated points from degenerate elements that produce no edges (single-
     * point polylines, single-point polygons, moveto-only paths). Position is
     * in viewBox coordinates (transforms applied). Zero-radius circles/ellipses
     * and zero-size rects are NOT stray vertices — they produce zero-length
     * segments via `zeroLengthSegmentIndices` instead.
     */
    get strayVertices() {
        return this._strayVertices;
    }
    set strayVertices(_value) {
        throw new Error(`No strayVertices setter on ${this.constructor.name}.`);
    }
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
    _parseStyleToObject(styleString) {
        const { _warnings } = this;
        const result = {};
        const css = cssParse(styleString, { silent: true });
        const { stylesheet } = css;
        /* c8 ignore start -- defensive: @adobe/css-tools' parse() returns CssStylesheetAST
           with `stylesheet` typed as non-optional. Only fires if the library changes its contract. */
        if (!stylesheet) {
            return result;
        }
        /* c8 ignore stop */
        if (stylesheet.parsingErrors) {
            const cssWarnings = stylesheet.parsingErrors
                .map((error) => error.message)
                .filter((error) => error !== undefined);
            _warnings.push(...cssWarnings);
        }
        // Extract style info.
        /* c8 ignore start -- defensive: @adobe/css-tools always populates `rules` (empty array
           for empty CSS). Only fires if the library changes its contract. */
        if (!stylesheet.rules) {
            return result;
        }
        /* c8 ignore stop */
        const rules = stylesheet.rules;
        for (let i = 0, numRules = rules.length; i < numRules; i++) {
            const rule = rules[i];
            const selectorStyle = {};
            const { declarations, selectors } = rule;
            if (declarations) {
                for (let j = 0, numDeclarations = declarations.length; j < numDeclarations; j++) {
                    const declaration = declarations[j];
                    const { property } = declaration;
                    let { value } = declaration;
                    if (property && value !== undefined) {
                        // Cast value as number if needed.
                        // Try stripping px off the end.
                        value = value.replace(/px\b/g, '');
                        if (/^\-?[0-9]?([0-9]+e-?[0-9]+)?(\.[0-9]+)?$/.test(value))
                            selectorStyle[property] = parseFloat(value);
                        else
                            selectorStyle[property] = value;
                    }
                }
            }
            if (selectors) {
                for (let j = 0, numSelectors = selectors.length; j < numSelectors; j++) {
                    const selector = selectors[j];
                    result[selector] = Object.assign(Object.assign({}, result[selector]), selectorStyle);
                }
            }
        }
        return result;
    }
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
    _deepIterChildren(callback, node = this.root, inherited = {}) {
        const { _globalStyles } = this;
        const { transform, ancestorIds, ancestorClasses, properties, clipPaths, masks, filters } = inherited;
        const isTopLevel = node === this.root;
        for (let i = 0, numChildren = node.children.length; i < numChildren; i++) {
            const child = node.children[i];
            // Top-level <defs>/<style> are already handled in the constructor — skip.
            // Nested <defs>/<style> are unsupported (documented limitation): they
            // fall through to unsupportedElements; don't recurse into their children.
            const isMetaNode = child.tagName === DEFS || child.tagName === STYLE;
            if (isMetaNode && isTopLevel)
                continue;
            // <g> is the only container flat-svg recurses into. Containers
            // contribute their id/class to the ancestor chain; leaves keep
            // id/class as their own properties.
            const isContainer = child.tagName === G;
            let childTransform = transform;
            // Chains passed DOWN to descendants. For containers, augmented below
            // with the container's own id/class; for leaves they stay = inherited.
            let childAncestorIds = ancestorIds;
            let childAncestorClasses = ancestorClasses;
            let childProperties;
            // clip-path / mask / filter accumulate outermost→self. Per SVG spec
            // these don't inherit as styles — every link composes, so an element
            // can have multiple in effect at once.
            let childClipPaths = clipPaths;
            let childMasks = masks;
            let childFilters = filters;
            if (child.properties) {
                // Add transforms to list.
                if (child.properties.transform) {
                    const childTransforms = parseTransformString(child.properties.transform, child.tagName);
                    // Get any warnings the transform parser emitted.
                    for (let transformIndex = 0, numTransforms = childTransforms.length; transformIndex < numTransforms; transformIndex++) {
                        const { warnings } = childTransforms[transformIndex];
                        if (warnings)
                            this._warnings.push(...warnings);
                    }
                    // Merge transforms.
                    if (childTransforms.length) {
                        if (childTransform) {
                            childTransforms.unshift(childTransform);
                        }
                        // Flatten transforms to a new matrix.
                        childTransform = flattenTransformArray(childTransforms);
                    }
                }
                // Work on a fresh copy so we can delete keys freely without mutating
                // child.properties (which is the parsed tree, shared across the original SVG).
                let childPropertiesToMerge = Object.assign({}, child.properties);
                delete childPropertiesToMerge.transform;
                // Extract clip-path / mask / filter — these don't inherit as style
                // properties per SVG spec. Append to per-element chain accumulators.
                const ownClipPath = childPropertiesToMerge[SVG_STYLE_CLIP_PATH];
                if (ownClipPath !== undefined && ownClipPath !== SVG_PAINT_NONE) {
                    childClipPaths = childClipPaths
                        ? [...childClipPaths, ownClipPath]
                        : [ownClipPath];
                }
                delete childPropertiesToMerge[SVG_STYLE_CLIP_PATH];
                const ownMask = childPropertiesToMerge[SVG_STYLE_MASK];
                if (ownMask !== undefined && ownMask !== SVG_PAINT_NONE) {
                    childMasks = childMasks ? [...childMasks, ownMask] : [ownMask];
                }
                delete childPropertiesToMerge[SVG_STYLE_MASK];
                const ownFilter = childPropertiesToMerge[SVG_STYLE_FILTER];
                if (ownFilter !== undefined && ownFilter !== SVG_PAINT_NONE) {
                    childFilters = childFilters ? [...childFilters, ownFilter] : [ownFilter];
                }
                delete childPropertiesToMerge[SVG_STYLE_FILTER];
                // Apply global stylesheet rules in CSS specificity order: class < id <
                // inline `style="..."`. Each later layer's spread wins over earlier ones.
                // Presentation attributes already on childPropertiesToMerge sit at the
                // bottom and lose to all three (matches CSS spec).
                if (childPropertiesToMerge.class) {
                    // Apply any global `.class` selector styles.
                    if (_globalStyles) {
                        const classArray = childPropertiesToMerge.class.split(' ');
                        for (let j = 0, numClasses = classArray.length; j < numClasses; j++) {
                            const classStyle = _globalStyles[`.${classArray[j]}`];
                            if (classStyle) {
                                childPropertiesToMerge = Object.assign(Object.assign({}, childPropertiesToMerge), classStyle);
                            }
                        }
                    }
                    // Containers contribute their class to the descendant ancestor chain
                    // and strip it from merged properties (so it doesn't inherit to
                    // grandchildren). Leaves keep their own class on properties.class.
                    if (isContainer) {
                        childAncestorClasses = `${childAncestorClasses ? `${childAncestorClasses} ` : ''}${childPropertiesToMerge.class}`;
                        delete childPropertiesToMerge.class;
                    }
                }
                if (childPropertiesToMerge.id) {
                    // Apply any global `#id` selector styles. Per HTML/SVG, id is a
                    // single token (unlike class), so no split.
                    if (_globalStyles) {
                        const idStyle = _globalStyles[`#${childPropertiesToMerge.id}`];
                        if (idStyle) {
                            childPropertiesToMerge = Object.assign(Object.assign({}, childPropertiesToMerge), idStyle);
                        }
                    }
                    // Same container-vs-leaf split as class above.
                    if (isContainer) {
                        childAncestorIds = `${childAncestorIds ? `${childAncestorIds} ` : ''}${childPropertiesToMerge.id}`;
                        delete childPropertiesToMerge.id;
                    }
                }
                // Add child properties to properties list.
                childProperties = properties;
                // Inline `style="..."` wins over class/id selectors per CSS specificity —
                // spread it last so its values override.
                if (childPropertiesToMerge.style) {
                    const style = this._parseStyleToObject(`#this { ${childPropertiesToMerge.style} }`)['#this'];
                    childPropertiesToMerge = Object.assign(Object.assign({}, childPropertiesToMerge), style);
                    delete childPropertiesToMerge.style;
                }
                const propertyKeys = Object.keys(childPropertiesToMerge);
                for (let j = 0, numProperties = propertyKeys.length; j < numProperties; j++) {
                    const key = propertyKeys[j];
                    if (childPropertiesToMerge[key] !== undefined) {
                        // Make a copy.
                        if (!childProperties || childProperties === properties)
                            childProperties = Object.assign({}, properties);
                        // Opacity is multiplicative per SVG spec — child opacity multiplies
                        // by the ancestor-accumulated opacity.
                        if (key === SVG_STYLE_OPACITY) {
                            if (!isNumber(childPropertiesToMerge[key])) {
                                // Data problem (malformed SVG), not API misuse — warn and skip.
                                this._warnings.push(`Invalid <${child.tagName}> opacity value: "${String(childPropertiesToMerge[key])}".`);
                                continue;
                            }
                            childProperties[key] =
                                childPropertiesToMerge[key] *
                                    (childProperties[key] !== undefined
                                        ? childProperties[key]
                                        : 1);
                        }
                        else {
                            // All other style properties: child's explicit value overrides
                            // any inherited ancestor value (per CSS/SVG spec).
                            childProperties[key] =
                                childPropertiesToMerge[key];
                        }
                    }
                }
            }
            // Callback fires for leaves (anything we don't recurse into).
            if (!isContainer) {
                // No defensive copies — InheritedContext is readonly and FlatElement
                // exposes shared refs as Readonly/ReadonlyArray. ancestorIds/
                // ancestorClasses exclude this element's own id/class.
                callback(child, {
                    transform: childTransform,
                    ancestorIds,
                    ancestorClasses,
                    properties: childProperties,
                    clipPaths: childClipPaths,
                    masks: childMasks,
                    filters: childFilters,
                });
            }
            // Only descend into containers. Children of unsupported tags
            // (<use>, <text>, <foreignObject>, nested <svg>) stay buried with
            // the parent in unsupportedElements rather than leaking into
            // elements/paths/segments under a parent that wasn't processed.
            if (isContainer) {
                this._deepIterChildren(callback, child, {
                    transform: childTransform,
                    // childAncestor* includes this container's id/class.
                    ancestorIds: childAncestorIds,
                    ancestorClasses: childAncestorClasses,
                    properties: childProperties,
                    clipPaths: childClipPaths,
                    masks: childMasks,
                    filters: childFilters,
                });
            }
        }
    }
    /************************************************
     * ELEMENTS
     ************************************************/
    /**
     * Walk the parse tree and build the flat element list. Pure — caller stores
     * the returned arrays and merges warnings into _warnings.
     */
    _buildElements() {
        // Init output arrays.
        const elements = [];
        const unsupportedElements = [];
        const parsingWarnings = [];
        // Flatten all children and return.
        this._deepIterChildren((child, { transform, ancestorIds, ancestorClasses, properties, clipPaths, masks, filters }) => {
            /* c8 ignore start -- defensive: svg-parser sets `value` and `metadata` on TextNodes, not on
           ElementNodes that reach this callback. Per @types/svg-parser, SVGParserElementNode.value/metadata are
           typed as optional but never populated for normal SVG input. Kept as a guard for hand-crafted
           or future-version parser nodes that might set these. */
            if (child.value) {
                parsingWarnings.push(`Skipping child ${child.tagName} with value: ${child.value}`);
                return;
            }
            if (child.metadata) {
                parsingWarnings.push(`Skipping child ${child.tagName} with metadata: ${child.metadata}`);
                return;
            }
            /* c8 ignore stop */
            if (!child.tagName) {
                parsingWarnings.push(`Skipping child with no tagName: ${JSON.stringify(child)}.`);
                return;
            }
            // Unsupported tags (<use>, <text>, <image>, nested <style>/<defs>)
            // route to unsupportedElements *before* the property-validation gate
            // so meta-nodes without attributes still surface to consumers.
            if (!SUPPORTED_GEOMETRY_TAG_NAMES.has(child.tagName)) {
                const unsupportedChild = {
                    tagName: child.tagName,
                    properties: properties !== null && properties !== void 0 ? properties : {},
                };
                if (transform)
                    unsupportedChild.transform = transform;
                if (clipPaths)
                    unsupportedChild.clipPaths = clipPaths;
                if (masks)
                    unsupportedChild.masks = masks;
                if (filters)
                    unsupportedChild.filters = filters;
                if (ancestorIds)
                    unsupportedChild.ancestorIds = ancestorIds;
                if (ancestorClasses)
                    unsupportedChild.ancestorClasses = ancestorClasses;
                unsupportedElements.push(unsupportedChild);
                return;
            }
            if (!properties) {
                parsingWarnings.push(`Skipping child with no properties: ${JSON.stringify(child)}.`);
                return;
            }
            // Resolve currentColor (case-insensitive) in fill/stroke against
            // inherited `color`. Defaults to 'black' (canvas-text default) when
            // `color` is missing or itself currentColor — recursive resolution
            // is unsupported. Other indirections (var(), inherit, color-mix(),
            // stop-color/flood-color/lighting-color) also not resolved; see
            // README "Divergences from the SVG spec".
            // Do NOT mutate `properties` — siblings/descendants may share it by
            // reference. Spread into a fresh object only when something changes.
            const props = properties;
            const rawColor = typeof props.color === 'string' ? props.color : undefined;
            const effectiveColor = rawColor && !/^currentcolor$/i.test(rawColor) ? rawColor : 'black';
            const resolvedFill = typeof props.fill === 'string' && /^currentcolor$/i.test(props.fill)
                ? effectiveColor
                : props.fill;
            const resolvedStroke = typeof props.stroke === 'string' && /^currentcolor$/i.test(props.stroke)
                ? effectiveColor
                : props.stroke;
            const resolvedProperties = resolvedFill !== props.fill || resolvedStroke !== props.stroke
                ? Object.assign(Object.assign({}, props), { fill: resolvedFill, stroke: resolvedStroke }) : props;
            // ancestorIds/ancestorClasses live at the top level (alongside transform/
            // clipPaths/masks/filters) — they're flat-svg-internal lineage metadata,
            // not real SVG attributes.
            //
            // Type invariant the cast can't enforce: tagName must be paired with the
            // matching FlatElement variant (line ↔ SVGLineProperties, etc.). svg-parser
            // produces them from the same DOM element so they're consistent in
            // practice, but a future refactor that decouples them would silently
            // produce mistyped FlatElements.
            const flatChild = {
                tagName: child.tagName,
                properties: resolvedProperties,
            };
            if (transform)
                flatChild.transform = transform;
            if (clipPaths)
                flatChild.clipPaths = clipPaths;
            if (masks)
                flatChild.masks = masks;
            if (filters)
                flatChild.filters = filters;
            if (ancestorIds)
                flatChild.ancestorIds = ancestorIds;
            if (ancestorClasses)
                flatChild.ancestorClasses = ancestorClasses;
            elements.push(flatChild);
        });
        return { elements, unsupportedElements, warnings: parsingWarnings };
    }
    /************************************************
     * PATHS
     ************************************************/
    /**
     * Convert flat elements to <path>-like records. Pure. Returns pathParsers
     * as a side-channel for _buildSegments — circle/ellipse/path build a parser
     * here; line/rect/polygon/polyline get one built lazily downstream.
     */
    _buildPaths(elements) {
        const { _preserveArcs } = this;
        // Init output arrays.
        const paths = [];
        const pathParsers = [];
        const parsingWarnings = [];
        const strayVertices = [];
        const pushStrayVertex = (x, y, transform, cause, sourceElementIndex) => {
            const pos = [x, y];
            if (transform)
                applyTransform(pos, transform);
            strayVertices.push({
                position: pos,
                cause,
                sourceElementIndex,
            });
        };
        for (let i = 0; i < elements.length; i++) {
            const child = elements[i];
            const { transform, tagName, properties } = child;
            const propertiesCopy = Object.assign({}, properties);
            // Convert all object types to path with absolute coordinates and transform applied.
            let d;
            let pathParser;
            switch (tagName) {
                case SVG_LINE:
                    d = convertLineToPath(properties, parsingWarnings, transform);
                    delete propertiesCopy.x1;
                    delete propertiesCopy.y1;
                    delete propertiesCopy.x2;
                    delete propertiesCopy.y2;
                    break;
                case SVG_RECT:
                    d = convertRectToPath(properties, parsingWarnings, transform);
                    delete propertiesCopy.x;
                    delete propertiesCopy.y;
                    delete propertiesCopy.width;
                    delete propertiesCopy.height;
                    break;
                case SVG_POLYGON: {
                    const result = convertPolygonToPath(properties, parsingWarnings, transform);
                    if (typeof result === 'object') {
                        pushStrayVertex(result.strayPoint[0], result.strayPoint[1], transform, FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT, i);
                        continue;
                    }
                    // result is string | undefined; the d === undefined check below handles undefined.
                    d = result;
                    delete propertiesCopy.points;
                    break;
                }
                case SVG_POLYLINE: {
                    const result = convertPolylineToPath(properties, parsingWarnings, transform);
                    if (typeof result === 'object') {
                        pushStrayVertex(result.strayPoint[0], result.strayPoint[1], transform, FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT, i);
                        continue;
                    }
                    // result is string | undefined; the d === undefined check below handles undefined.
                    d = result;
                    delete propertiesCopy.points;
                    break;
                }
                case SVG_CIRCLE:
                    pathParser = convertCircleToPath(properties, parsingWarnings, _preserveArcs, transform);
                    if (pathParser)
                        d = pathParser.toString();
                    delete propertiesCopy.cx;
                    delete propertiesCopy.cy;
                    delete propertiesCopy.r;
                    break;
                case SVG_ELLIPSE:
                    pathParser = convertEllipseToPath(properties, parsingWarnings, _preserveArcs, transform);
                    if (pathParser)
                        d = pathParser.toString();
                    delete propertiesCopy.cx;
                    delete propertiesCopy.cy;
                    delete propertiesCopy.rx;
                    delete propertiesCopy.ry;
                    break;
                case SVG_PATH:
                    pathParser = convertPathToPath(properties, parsingWarnings, _preserveArcs, transform);
                    if (pathParser) {
                        // Detect dangling M commands (moveto with no subsequent draw).
                        // pathParser.segments is in source coordinates (.abs()
                        // only normalizes relative→absolute; .matrix() is queued on
                        // a lazy stack and doesn't touch segments[]). Pass the
                        // element's transform to pushStrayVertex so it lands in
                        // viewBox coordinates — same pattern as the polygon/polyline cases.
                        const segs = pathParser.segments;
                        for (let j = 0, numSegs = segs.length; j < numSegs; j++) {
                            const cmd = segs[j][0];
                            if (cmd !== SVG_PATH_CMD_MOVETO)
                                continue;
                            const next = segs[j + 1];
                            const nextCmd = next && next[0];
                            if (next === undefined ||
                                nextCmd === SVG_PATH_CMD_MOVETO ||
                                nextCmd === SVG_PATH_CMD_CLOSE) {
                                pushStrayVertex(segs[j][1], segs[j][2], transform, FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY, i);
                            }
                        }
                        d = pathParser.toString();
                    }
                    delete propertiesCopy.d;
                    break;
                /* c8 ignore start -- defensive: SUPPORTED_GEOMETRY_TAG_NAMES gates child.tagName
                   upstream of this loop, so only the case'd tags reach this switch. Only fires if
                   that gate or the supported set changes. */
                default:
                    break;
                /* c8 ignore stop */
            }
            if (d === undefined || d === '') {
                continue;
            }
            const path = {
                properties: Object.assign(Object.assign({}, propertiesCopy), { d }),
                sourceElementIndex: i,
            };
            paths.push(path);
            pathParsers.push(pathParser);
        }
        return { paths, pathParsers, strayVertices, warnings: parsingWarnings };
    }
    /************************************************
     * SEGMENTS
     ************************************************/
    /**
     * Convert paths into edge segments (lines, quadratic/cubic beziers, arcs).
     * Pure. Reads pathParsers[i] when present (circle/ellipse/path); otherwise
     * builds a transient parser from path.properties.d.
     */
    _buildSegments(paths, pathParsers) {
        // Init output arrays.
        const segments = [];
        const parsingWarnings = [];
        for (let i = 0, numPaths = paths.length; i < numPaths; i++) {
            const path = paths[i];
            const { properties, sourceElementIndex } = path;
            let pathParser = pathParsers[i];
            if (pathParser === undefined) {
                // line/rect/polygon/polyline don't build a parser in _buildPaths
                // (their d-strings are hand-built with the transform pre-baked).
                // Build one here just to enumerate commands. Not written back to
                // pathParsers[i] — the array is discarded after this function returns.
                pathParser = svgpath(properties.d);
            }
            /* c8 ignore start -- defensive: pathParser.err is checked and the path is dropped at the
               convertPathToPath stage in get paths, so any path that reaches get segments here has already
               been validated. Kept in case a parser change ever lets an err-tagged parser through. */
            if (pathParser.err) {
                parsingWarnings.push(`Problem parsing path to segments with ${pathParser.err}.`);
            }
            /* c8 ignore stop */
            // Split paths to segments.
            const startPoint = [0, 0];
            pathParser.iterate((command, index, x, y) => {
                const p1 = [x, y];
                // Copy parent properties to segment (minus the "d" property).
                const propertiesCopy = Object.assign({}, properties);
                delete propertiesCopy.d;
                // Mutable<FlatSegment> so we can populate fields incrementally,
                // then push as the readonly public type. The double-cast through
                // `unknown` is needed because the partial literal doesn't overlap
                // any single variant (each requires p2, added in the switch below).
                const segment = {
                    p1,
                    properties: propertiesCopy,
                    sourceElementIndex,
                };
                const segmentType = command[0];
                /* c8 ignore start -- defensive: svgpath's iterate() always emits an M as the first command
                   (synthesizes one if the source d-string doesn't start with M, otherwise reports an err
                   that's caught upstream in convertPathToPath). Kept as a guard against svgpath behavior
                   changes. */
                if (index === 0 && segmentType !== SVG_PATH_CMD_MOVETO) {
                    parsingWarnings.push(`Malformed svg path: "${pathParser.toString()}", should start with M command.`);
                }
                /* c8 ignore stop */
                switch (segmentType) {
                    case SVG_PATH_CMD_MOVETO:
                        startPoint[0] = command[1];
                        startPoint[1] = command[2];
                        return;
                    case SVG_PATH_CMD_LINETO:
                        segment.type = FLAT_SEGMENT_LINE;
                        segment.p2 = [command[1], command[2]];
                        break;
                    case SVG_PATH_CMD_HLINETO:
                        segment.type = FLAT_SEGMENT_LINE;
                        segment.p2 = [command[1], y];
                        break;
                    case SVG_PATH_CMD_VLINETO:
                        segment.type = FLAT_SEGMENT_LINE;
                        segment.p2 = [x, command[1]];
                        break;
                    case SVG_PATH_CMD_QUADRATIC: {
                        const bezier = segment;
                        bezier.type = FLAT_SEGMENT_BEZIER;
                        bezier.controlPoints = [[command[1], command[2]]];
                        bezier.p2 = [command[3], command[4]];
                        break;
                    }
                    case SVG_PATH_CMD_CURVETO: {
                        const bezier = segment;
                        bezier.type = FLAT_SEGMENT_BEZIER;
                        bezier.controlPoints = [
                            [command[1], command[2]],
                            [command[3], command[4]],
                        ];
                        bezier.p2 = [command[5], command[6]];
                        break;
                    }
                    case SVG_PATH_CMD_ARC: {
                        const arc = segment;
                        arc.type = FLAT_SEGMENT_ARC;
                        arc.rx = command[1];
                        arc.ry = command[2];
                        arc.xAxisRotation = command[3];
                        arc.largeArcFlag = !!command[4];
                        arc.sweepFlag = !!command[5];
                        arc.p2 = [command[6], command[7]];
                        break;
                    }
                    case SVG_PATH_CMD_CLOSE:
                        // Close subpath: emit a segment from current point back to startPoint.
                        // If they coincide (z closes to itself), drop it — every major editor
                        // (Illustrator, Inkscape, etc.) exports `... L startX,startY z` with a
                        // redundant explicit line before z; emitting that zero-length segment
                        // would inflate counts on nearly every real-world SVG and pollute
                        // zeroLengthSegments with non-diagnostic noise.
                        if (startPoint[0] === x && startPoint[1] === y) {
                            return;
                        }
                        segment.type = FLAT_SEGMENT_LINE;
                        segment.p2 = [startPoint[0], startPoint[1]];
                        break;
                    /* c8 ignore start -- defensive: svgpath only emits the standard SVG path commands
                       (M/L/H/V/C/S/Q/T/A/Z, all handled above after .abs() normalization). The default
                       branch is unreachable for any input that successfully parses through svgpath. */
                    default:
                        parsingWarnings.push(`Unknown <path> command: ${segmentType}.`);
                        return;
                    /* c8 ignore stop */
                }
                segments.push(segment);
            });
        }
        return { segments, warnings: parsingWarnings };
    }
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
    _filterByStyle(objects, filter, computedProperties, exclude) {
        const filterArray = Array.isArray(filter) ? filter : [filter];
        const filterArrayValues = [];
        // Lazy init: only allocate when a filter actually consults the cache
        // (color/opacity/dash filters do; numeric/string filters don't).
        const getOrInitComputedProperties = () => {
            if (!computedProperties) {
                computedProperties = new Array(objects.length);
                // Fresh objects — Array.fill({}) would alias one instance.
                for (let k = 0; k < objects.length; k++)
                    computedProperties[k] = {};
            }
            return computedProperties;
        };
        // Precompute colors.
        for (let i = 0; i < filterArray.length; i++) {
            const { key, value } = filterArray[i];
            filterArrayValues.push(value);
            switch (key) {
                case SVG_STYLE_STROKE_COLOR:
                case SVG_STYLE_FILL:
                case SVG_STYLE_COLOR:
                    filterArrayValues[i] = colord(value);
                    break;
                case SVG_STYLE_STROKE_DASH_ARRAY:
                    filterArrayValues[i] = convertToDashArray(value);
                    break;
            }
        }
        const indices = [];
        for (let i = 0, n = objects.length; i < n; i++) {
            if (exclude && exclude[i])
                continue;
            const { properties } = objects[i];
            // Check that this object meets ALL the the style requirements.
            let allPassed = true;
            for (let j = 0; j < filterArray.length; j++) {
                const { key, tolerance } = filterArray[j];
                let value = filterArrayValues[j];
                // Special handling of certain keys.
                let passed = true;
                switch (key) {
                    case SVG_STYLE_STROKE_COLOR:
                    case SVG_STYLE_FILL:
                    case SVG_STYLE_COLOR:
                    case SVG_STYLE_OPACITY:
                        let color;
                        const computedKey = key === SVG_STYLE_OPACITY ? SVG_STYLE_STROKE_COLOR : key;
                        const isColorFilter = key === SVG_STYLE_STROKE_COLOR ||
                            key === SVG_STYLE_FILL ||
                            key === SVG_STYLE_COLOR;
                        // value='none' matches elements whose resolved attribute is
                        // 'none' OR missing — the "author wrote no paint here" query.
                        // Pure source check (no alpha/opacity math); inheritance is
                        // already in the resolved properties.
                        if (isColorFilter && filterArray[j].value === SVG_PAINT_NONE) {
                            const raw = properties[computedKey];
                            passed = raw === undefined || raw === SVG_PAINT_NONE;
                            break;
                        }
                        if (computedProperties) {
                            color = computedProperties[i][computedKey];
                        }
                        if (color === undefined) {
                            const raw = properties[computedKey];
                            // Color filter is over source colors, not rendered output:
                            // missing attribute / 'none' never matches a non-'none' filter.
                            if (isColorFilter && (raw === undefined || raw === SVG_PAINT_NONE)) {
                                passed = false;
                                break;
                            }
                            color = colord(raw);
                            if (isColorFilter && !color.isValid()) {
                                passed = false;
                                break;
                            }
                            // Multiply color.a by properties.opacity.
                            const opacity = properties[SVG_STYLE_OPACITY];
                            if (opacity !== undefined) {
                                const alpha = opacity * color.rgba.a; // Use color.rgba.a instead of alpha() to avoid rounding.
                                color = color.alpha(alpha); // This makes a copy.
                            }
                            getOrInitComputedProperties()[i][computedKey] = color;
                        }
                        if (isColorFilter) {
                            passed = color.delta(value) <= (tolerance || 0);
                            break;
                        }
                        // Else check color opacity for opacity.
                        // Use color.rgba.a instead of alpha() to avoid rounding.
                        passed = Math.abs(color.rgba.a - value) <= (tolerance || 0);
                        break;
                    case SVG_STYLE_STROKE_DASH_ARRAY: {
                        let dashArray;
                        if (computedProperties) {
                            dashArray = computedProperties[i][key];
                        }
                        if (!dashArray) {
                            dashArray = convertToDashArray(properties[key]);
                            getOrInitComputedProperties()[i][key] = dashArray;
                        }
                        // Dash arrays are cyclic — both sides describe a pattern that
                        // repeats infinitely along the stroke. Two arrays match if one
                        // is the other repeated some integer number of times: e.g.
                        // [5,10] and [5,10,5,10,5,10] both render as "5 10 5 10 ..."
                        // Compare by walking `longer` and indexing into `shorter` modulo
                        // its length. If `shorter`'s length doesn't divide `longer`'s,
                        // they can't be n× repetitions of each other — fail fast.
                        // (Coprime-but-equivalent cases like [5,10,5,10] vs
                        // [5,10,5,10,5,10] don't match here, but no real-world SVG
                        // tool emits redundant-period dash arrays.)
                        const filterValue = value;
                        const [shorter, longer] = dashArray.length <= filterValue.length
                            ? [dashArray, filterValue]
                            : [filterValue, dashArray];
                        if (shorter.length === 0) {
                            // Both empty (no stroke-dasharray on element / filter): match.
                            // Shorter empty + longer non-empty: one side has dashes, the
                            // other doesn't — no match.
                            passed = longer.length === 0;
                        }
                        else if (longer.length % shorter.length !== 0) {
                            passed = false;
                        }
                        else {
                            for (let k = 0; k < longer.length; k++) {
                                if (Math.abs(longer[k] - shorter[k % shorter.length]) >
                                    (tolerance || 0)) {
                                    passed = false;
                                    break;
                                }
                            }
                        }
                        break;
                    }
                    default: {
                        // Numeric filter: use tolerance; string filter: exact equality.
                        const attr = properties[key];
                        if (isNumber(value)) {
                            if (attr === undefined ||
                                Math.abs(attr - value) > (tolerance || 0)) {
                                passed = false;
                            }
                        }
                        else if (typeof value === 'string') {
                            passed = attr === value;
                        }
                        else {
                            // Caller error: value type (Colord/array/object) doesn't
                            // make sense for this key. Throw rather than silently
                            // returning an empty match set.
                            throw new Error(`flat-svg cannot handle filters with key "${key}" and value ${JSON.stringify(value)} of type ${typeof value}.`);
                        }
                        break;
                    }
                }
                if (!passed) {
                    allPassed = false;
                    break;
                }
            }
            if (allPassed)
                indices.push(i);
        }
        return { indices, computedProperties: computedProperties };
    }
    /**
     * Filter FlatSVG.elements by style properties, returning matching indices.
     * Useful when threading an `excluded[]` tracker through multiple filter steps.
     * @param filter - FlatSVGStyle properties to filter for.
     * @param exclude - Booleans matching elements length; true entries skip that element.
     * @returns Indices into FlatSVG.elements of matching entries, ascending.
     */
    filterElementIndicesByStyle(filter, exclude) {
        const { elements } = this;
        const { indices, computedProperties } = this._filterByStyle(elements, filter, this._computedElementProperties, exclude);
        this._computedElementProperties = computedProperties;
        return indices;
    }
    /**
     * Like filterElementIndicesByStyle but returns the matching elements themselves.
     * @param filter - FlatSVGStyle properties to filter for.
     * @param exclude - Booleans matching elements length; true entries skip that element.
     * @returns Matching elements in source order.
     */
    filterElementsByStyle(filter, exclude) {
        const elements = this.elements;
        const indices = this.filterElementIndicesByStyle(filter, exclude);
        return indices.map((i) => elements[i]);
    }
    /**
     * Filter FlatSVG.paths by style properties, returning matching indices.
     * @param filter - FlatSVGStyle properties to filter for.
     * @param exclude - Booleans matching paths length; true entries skip that path.
     * @returns Indices into FlatSVG.paths of matching entries, ascending.
     */
    filterPathIndicesByStyle(filter, exclude) {
        const { paths } = this;
        const { indices, computedProperties } = this._filterByStyle(paths, filter, this._computedPathProperties, exclude);
        this._computedPathProperties = computedProperties;
        return indices;
    }
    /**
     * Like filterPathIndicesByStyle but returns the matching paths themselves.
     * @param filter - FlatSVGStyle properties to filter for.
     * @param exclude - Booleans matching paths length; true entries skip that path.
     * @returns Matching paths in source order.
     */
    filterPathsByStyle(filter, exclude) {
        const paths = this.paths;
        const indices = this.filterPathIndicesByStyle(filter, exclude);
        return indices.map((i) => paths[i]);
    }
    /**
     * Filter FlatSVG.segments by style properties, returning matching indices.
     * @param filter - FlatSVGStyle properties to filter for.
     * @param exclude - Booleans matching segments length; true entries skip that segment.
     * @returns Indices into FlatSVG.segments of matching entries, ascending.
     */
    filterSegmentIndicesByStyle(filter, exclude) {
        const { segments } = this;
        const { indices, computedProperties } = this._filterByStyle(segments, filter, this._computedSegmentProperties, exclude);
        this._computedSegmentProperties = computedProperties;
        return indices;
    }
    /**
     * Like filterSegmentIndicesByStyle but returns the matching segments themselves.
     * @param filter - FlatSVGStyle properties to filter for.
     * @param exclude - Booleans matching segments length; true entries skip that segment.
     * @returns Matching segments in source order.
     */
    filterSegmentsByStyle(filter, exclude) {
        const segments = this.segments;
        const indices = this.filterSegmentIndicesByStyle(filter, exclude);
        return indices.map((i) => segments[i]);
    }
    /************************************************
     * DIAGNOSTICS
     ************************************************/
    /**
     * Histogram of stroke/fill colors across elements. Colors normalize to hex
     * ('#F00', 'red', 'rgb(255,0,0)' all bucket together); invalid values
     * bucket by raw string. SVG spec defaults are NOT synthesized — `none`
     * counts both explicit 'none' and missing attributes ("no authored color").
     */
    _histogramByStyleKey(key) {
        var _a;
        const { elements } = this;
        let none = 0;
        const colors = {};
        for (let i = 0; i < elements.length; i++) {
            const value = elements[i].properties[key];
            if (value === undefined || value === SVG_PAINT_NONE) {
                none++;
                continue;
            }
            const c = colord(value);
            const bucket = c.isValid() ? c.toHex() : String(value);
            colors[bucket] = ((_a = colors[bucket]) !== null && _a !== void 0 ? _a : 0) + 1;
        }
        return { none, colors };
    }
    /**
     * Aggregate JSON-serializable overview — counts, color histograms, and
     * diagnostic arrays in one object.
     * @returns FlatSVGAnalysis snapshot of the parsed SVG.
     */
    analyze() {
        const { viewBox, units, elements, paths, segments, defs, warnings } = this;
        const zeroLengthSegmentIndices = this.zeroLengthSegmentIndices;
        const strayVertices = this.strayVertices;
        const unsupportedElements = this.unsupportedElements;
        return {
            viewBox,
            units,
            counts: {
                elements: elements.length,
                paths: paths.length,
                segments: segments.length,
                zeroLengthSegments: zeroLengthSegmentIndices.length,
                strayVertices: strayVertices.length,
                defs: defs.length,
                unsupportedElements: unsupportedElements.length,
            },
            strokeColors: this._histogramByStyleKey(SVG_STYLE_STROKE_COLOR),
            fillColors: this._histogramByStyleKey(SVG_STYLE_FILL),
            containsClipPaths: this.containsClipPaths,
            zeroLengthSegmentIndices,
            strayVertices,
            unsupportedElements,
            warnings: [...warnings],
        };
    }
}
//# sourceMappingURL=FlatSVG.js.map