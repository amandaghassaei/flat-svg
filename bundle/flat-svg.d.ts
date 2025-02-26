import { TextNode } from 'svg-parser';
import { Colord } from 'colord';

declare const LINE = "line";
declare const RECT = "rect";
declare const POLYGON = "polygon";
declare const POLYLINE = "polyline";
declare const PATH = "path";
declare const CIRCLE = "circle";
declare const ELLIPSE = "ellipse";
declare const SVG_STYLE_FILL = "fill";
declare const SVG_STYLE_STROKE_WIDTH = "stroke-width";
declare const SVG_STYLE_STROKE_COLOR = "stroke";
declare const SVG_STYLE_COLOR = "color";
declare const SVG_STYLE_OPACITY = "opacity";
declare const SVG_STYLE_STROKE_DASH_ARRAY = "stroke-dasharray";

interface Transform {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
}
/**
 * @private
 */
interface TransformParsed extends Transform {
    errors?: string[];
    warnings?: string[];
}
interface Style {
    [SVG_STYLE_STROKE_WIDTH]?: number;
    [SVG_STYLE_STROKE_COLOR]?: string;
    [SVG_STYLE_FILL]?: string;
    [SVG_STYLE_OPACITY]?: number;
    [SVG_STYLE_COLOR]?: string;
    [SVG_STYLE_STROKE_DASH_ARRAY]?: number | string;
}
/**
 * @private
 */
interface ComputedProperties {
    [SVG_STYLE_STROKE_COLOR]?: Colord;
    [SVG_STYLE_FILL]?: Colord;
    [SVG_STYLE_COLOR]?: Colord;
    [SVG_STYLE_STROKE_DASH_ARRAY]?: number[];
}
interface BaseProperties extends Style {
    id?: string;
    class?: string;
    ids?: string;
}
interface LineProperties extends BaseProperties {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}
interface RectProperties extends BaseProperties {
    x: number;
    y: number;
    width: number;
    height: number;
}
interface PolylineProperties extends BaseProperties {
    points: string;
}
interface PolygonProperties extends BaseProperties {
    points: string;
}
interface CircleProperties extends BaseProperties {
    r: number;
    cx: number;
    cy: number;
}
interface EllipseProperties extends BaseProperties {
    rx: number;
    ry: number;
    cx: number;
    cy: number;
}
interface PathProperties extends BaseProperties {
    d: string;
}
/**
 * @private
 */
declare type GeometryElementTagName = typeof LINE | typeof RECT | typeof POLYLINE | typeof POLYGON | typeof CIRCLE | typeof ELLIPSE | typeof PATH;
/**
 * @private
 */
declare type GeometryElementProperties = LineProperties | RectProperties | PolylineProperties | PolygonProperties | CircleProperties | EllipseProperties | PathProperties;
interface SegmentProperties extends BaseProperties {
}
interface Properties extends Style {
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
}
declare type ElementNode = {
    type: 'element';
    tagName?: string | undefined;
    properties?: Properties;
    children: Array<Node>;
    value?: string | undefined;
    metadata?: string | undefined;
};
declare type Node = TextNode | ElementNode;
interface FlatElementBase {
    transform?: Transform;
}
interface FlatLineElement extends FlatElementBase {
    tagName: typeof LINE;
    properties: LineProperties;
}
interface FlatRectElement extends FlatElementBase {
    tagName: typeof RECT;
    properties: RectProperties;
}
interface FlatPolylineElement extends FlatElementBase {
    tagName: typeof POLYLINE;
    properties: PolylineProperties;
}
interface FlatPolygonElement extends FlatElementBase {
    tagName: typeof POLYGON;
    properties: PolygonProperties;
}
interface FlatCircleElement extends FlatElementBase {
    tagName: typeof CIRCLE;
    properties: CircleProperties;
}
interface FlatEllipseElement extends FlatElementBase {
    tagName: typeof ELLIPSE;
    properties: EllipseProperties;
}
interface FlatPathElement extends FlatElementBase {
    tagName: typeof PATH;
    properties: PathProperties;
}
declare type FlatElement = FlatLineElement | FlatRectElement | FlatPolylineElement | FlatPolygonElement | FlatCircleElement | FlatEllipseElement | FlatPathElement;
declare type FlatPath = {
    properties: PathProperties;
};
declare type FlatLineSegment = {
    p1: [number, number];
    p2: [number, number];
    properties: SegmentProperties;
};
declare type FlatBezierSegment = {
    p1: [number, number];
    p2: [number, number];
    controlPoints: [number, number][];
    properties: SegmentProperties;
};
declare type FlatArcSegment = {
    p1: [number, number];
    p2: [number, number];
    rx: number;
    ry: number;
    xAxisRotation: number;
    largeArcFlag: boolean;
    sweepFlag: boolean;
    properties: SegmentProperties;
};
declare type FlatSegment = FlatLineSegment | FlatBezierSegment | FlatArcSegment;
declare type PropertiesFilter = {
    key: string;
    value: string | number | number[] | Colord;
    tolerance?: number;
};
declare type MoveToAbs = ["M", number, number];
declare type LineToAbs = ["L", number, number];
declare type HorizontalLineToAbs = ["H", number];
declare type VerticalLineToAbs = ["V", number];
declare type CurveToAbs = ["C", number, number, number, number, number, number];
declare type SmoothCurveToAbs = ["S", number, number, number, number];
declare type QuadraticBézierCurveToAbs = ["Q", number, number, number, number];
declare type SmoothQuadraticBézierCurveToAbs = ["T", number, number];
declare type EllipticalArcAbs = ["A", number, number, number, number, number, number, number];
declare type MoveToRel = ["m", number, number];
declare type LineToRel = ["l", number, number];
declare type HorizontalLineToRel = ["h", number];
declare type VerticalLineToRel = ["v", number];
declare type CurveToRel = ["c", number, number, number, number, number, number];
declare type SmoothCurveToRel = ["s", number, number, number, number];
declare type QuadraticBézierCurveToRel = ["q", number, number, number, number];
declare type SmoothQuadraticBézierCurveToRel = ["t", number, number];
declare type EllipticalArcRel = ["a", number, number, number, number, number, number, number];
declare type ClosePath = ["Z" | "z"];
declare type Segment = MoveToAbs | MoveToRel | LineToAbs | LineToRel | HorizontalLineToAbs | HorizontalLineToRel | VerticalLineToAbs | VerticalLineToRel | CurveToAbs | CurveToRel | SmoothCurveToAbs | SmoothCurveToRel | QuadraticBézierCurveToAbs | QuadraticBézierCurveToRel | SmoothQuadraticBézierCurveToAbs | SmoothQuadraticBézierCurveToRel | EllipticalArcAbs | EllipticalArcRel | ClosePath;
/**
 * @private
 */
declare type PathParser = {
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
    segments: Segment[];
    __stack?: any[];
    err?: string;
};

declare class FlatSVG {
    private readonly _rootNode;
    private _elements?;
    private _paths?;
    private _pathParsers?;
    private _segments?;
    private readonly _preserveArcs;
    /**
     * Defs elements that are removed during flattening.
     */
    readonly defs: ElementNode[];
    /**
     * Global style to be applied to children during flattening.
     */
    private readonly _globalStyles?;
    /**
     * A list of errors generated during parsing.
     */
    readonly errors: string[];
    /**
     * A list of warnings generated during parsing.
     */
    readonly warnings: string[];
    private _computedElementProperties?;
    private _computedPathProperties?;
    private _computedSegmentProperties?;
    /**
     * Init a FlatSVG object.
     * @param string - SVG string to parse.
     * @param options - Optional settings.
     * @param options.preserveArcs - Preserve arcs, ellipses, and circles as arcs when calling FlatSVG.paths and FlatSVG.segments.  Defaults to false, which will approximate arcs as cubic beziers.
     */
    constructor(string: string, options?: {
        preserveArcs: boolean;
    });
    private parseStyleToObject;
    /**
     * Get the root node of the SVG.
     */
    get root(): ElementNode;
    /**
     * Get the viewBox of the SVG as [min-x, min-y, width, height].
     */
    get viewBox(): number[];
    /**
     * Get the units of the SVG as a string.
     */
    get units(): "px" | "in" | "cm" | "mm" | "pt" | "em" | "ex" | "pc";
    private deepIterChildren;
    /**
     * Get a flat list of geometry elements in the SVG.
     * The return value is cached internally.
     */
    get elements(): FlatElement[];
    private static wrapWithSVGTag;
    /**
     * Get svg string from elements array.
     * @private
     */
    private static elementsAsSVG;
    /**
     * Get svg string from FlatSVG.elements array.
     */
    get elementsAsSVG(): string;
    /**
     * Get a flat list of SVG geometry represented as paths.
     * The return value is cached internally.
     */
    get paths(): FlatPath[];
    /**
     * Get svg string from paths array.
     * @private
     */
    private static pathsAsSVG;
    /**
     * Get svg string from FlatSVG.paths array.
     */
    get pathsAsSVG(): string;
    /**
     * Get a flat list of SVG edge segments (as lines, quadratic/cubic beziers, or arcs).
     * The return value is cached internally.
     */
    get segments(): FlatSegment[];
    /**
     * Get svg string from paths array.
     * @private
     */
    private static segmentsAsSVG;
    /**
     * Get svg string from FlatSVG.segments array.
     */
    get segmentsAsSVG(): string;
    private static filter;
    private static filterByStyle;
    /**
     * Filter FlatSVG elements by style properties.
     * @param filter - Style properties to filter for.
     * @param exclude - Optionally pass an array of booleans of the same length as elements with "true" indicating that element should be excluded from the filter.
     */
    filterElementsByStyle(filter: PropertiesFilter | PropertiesFilter[], exclude?: boolean[]): FlatElement[];
    /**
     * Filter FlatSVG paths by style properties.
     * @param filter - Style properties to filter for.
     * @param exclude - Optionally pass an array of booleans of the same length as paths with "true" indicating that path should be excluded from the filter.
     */
    filterPathsByStyle(filter: PropertiesFilter | PropertiesFilter[], exclude?: boolean[]): FlatPath[];
    /**
     * Filter FlatSVG segments by style properties.
     * @param filter - Style properties to filter for.
     * @param exclude - Optionally pass an array of booleans of the same length as segments with "true" indicating that segment should be excluded from the filter.
     */
    filterSegmentsByStyle(filter: PropertiesFilter | PropertiesFilter[], exclude?: boolean[]): FlatSegment[];
}

export { BaseProperties, CircleProperties, ComputedProperties, ElementNode, EllipseProperties, FlatArcSegment, FlatBezierSegment, FlatCircleElement, FlatElement, FlatElementBase, FlatEllipseElement, FlatLineElement, FlatLineSegment, FlatPath, FlatPathElement, FlatPolygonElement, FlatPolylineElement, FlatRectElement, FlatSVG, FlatSegment, GeometryElementProperties, GeometryElementTagName, LineProperties, Node, PathParser, PathProperties, PolygonProperties, PolylineProperties, Properties, PropertiesFilter, RectProperties, SegmentProperties, Style, Transform, TransformParsed };
