import { SVG_STYLE_FILL, SVG_STYLE_OPACITY, SVG_STYLE_STROKE_COLOR, SVG_STYLE_STROKE_WIDTH, LINE, RECT, POLYLINE, POLYGON, CIRCLE, ELLIPSE, PATH, SVG_STYLE_COLOR, SVG_STYLE_STROKE_DASH_ARRAY } from './constants';
import { TextNode } from 'svg-parser';
import { Colord } from 'colord';
export interface Transform {
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
export interface TransformParsed extends Transform {
    errors?: string[];
    warnings?: string[];
}
export interface Style {
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
export interface ComputedProperties {
    [SVG_STYLE_STROKE_COLOR]?: Colord;
    [SVG_STYLE_FILL]?: Colord;
    [SVG_STYLE_COLOR]?: Colord;
    [SVG_STYLE_STROKE_DASH_ARRAY]?: number[];
}
export interface BaseProperties extends Style {
    id?: string;
    class?: string;
    ids?: string;
}
export interface LineProperties extends BaseProperties {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}
export interface RectProperties extends BaseProperties {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface PolylineProperties extends BaseProperties {
    points: string;
}
export interface PolygonProperties extends BaseProperties {
    points: string;
}
export interface CircleProperties extends BaseProperties {
    r: number;
    cx: number;
    cy: number;
}
export interface EllipseProperties extends BaseProperties {
    rx: number;
    ry: number;
    cx: number;
    cy: number;
}
export interface PathProperties extends BaseProperties {
    d: string;
}
/**
 * @private
 */
export declare type GeometryElementTagName = typeof LINE | typeof RECT | typeof POLYLINE | typeof POLYGON | typeof CIRCLE | typeof ELLIPSE | typeof PATH;
/**
 * @private
 */
export declare type GeometryElementProperties = LineProperties | RectProperties | PolylineProperties | PolygonProperties | CircleProperties | EllipseProperties | PathProperties;
export interface SegmentProperties extends BaseProperties {
}
export interface Properties extends Style {
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
export declare type ElementNode = {
    type: 'element';
    tagName?: string | undefined;
    properties?: Properties;
    children: Array<Node>;
    value?: string | undefined;
    metadata?: string | undefined;
};
export declare type Node = TextNode | ElementNode;
export interface FlatElementBase {
    transform?: Transform;
}
export interface FlatLineElement extends FlatElementBase {
    tagName: typeof LINE;
    properties: LineProperties;
}
export interface FlatRectElement extends FlatElementBase {
    tagName: typeof RECT;
    properties: RectProperties;
}
export interface FlatPolylineElement extends FlatElementBase {
    tagName: typeof POLYLINE;
    properties: PolylineProperties;
}
export interface FlatPolygonElement extends FlatElementBase {
    tagName: typeof POLYGON;
    properties: PolygonProperties;
}
export interface FlatCircleElement extends FlatElementBase {
    tagName: typeof CIRCLE;
    properties: CircleProperties;
}
export interface FlatEllipseElement extends FlatElementBase {
    tagName: typeof ELLIPSE;
    properties: EllipseProperties;
}
export interface FlatPathElement extends FlatElementBase {
    tagName: typeof PATH;
    properties: PathProperties;
}
export declare type FlatElement = FlatLineElement | FlatRectElement | FlatPolylineElement | FlatPolygonElement | FlatCircleElement | FlatEllipseElement | FlatPathElement;
export declare type FlatPath = {
    properties: PathProperties;
};
export declare type FlatLineSegment = {
    p1: [number, number];
    p2: [number, number];
    properties: SegmentProperties;
};
export declare type FlatBezierSegment = {
    p1: [number, number];
    p2: [number, number];
    controlPoints: [number, number][];
    properties: SegmentProperties;
};
export declare type FlatArcSegment = {
    p1: [number, number];
    p2: [number, number];
    rx: number;
    ry: number;
    xAxisRotation: number;
    largeArcFlag: boolean;
    sweepFlag: boolean;
    properties: SegmentProperties;
};
export declare type FlatSegment = FlatLineSegment | FlatBezierSegment | FlatArcSegment;
export declare type PropertiesFilter = {
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
export declare type PathParser = {
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
export {};
