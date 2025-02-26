import {
	SVG_STYLE_FILL,
	SVG_STYLE_OPACITY,
	SVG_STYLE_STROKE_COLOR,
	SVG_STYLE_STROKE_WIDTH,
	LINE,
	RECT,
	POLYLINE,
	POLYGON,
	CIRCLE,
	ELLIPSE,
	PATH,
	SVG_STYLE_COLOR,
	SVG_STYLE_STROKE_DASH_ARRAY,
} from './constants';
import { TextNode } from 'svg-parser';
import { Colord } from 'colord';

export interface Transform {
	a: number,
	b: number,
	c: number,
	d: number,
	e: number,
	f: number,
}

/**
 * @private
 */
export interface TransformParsed extends Transform {
	errors?: string[],
	warnings?: string[],
}

export interface Style {
	[SVG_STYLE_STROKE_WIDTH]?: number,
	[SVG_STYLE_STROKE_COLOR]?: string,
	[SVG_STYLE_FILL]?: string,
	[SVG_STYLE_OPACITY]?: number,
	[SVG_STYLE_COLOR]?: string,
	[SVG_STYLE_STROKE_DASH_ARRAY]?: number | string;
}

/**
 * @private
 */
export interface ComputedProperties {
	[SVG_STYLE_STROKE_COLOR]?: Colord,
	[SVG_STYLE_FILL]?: Colord,
	[SVG_STYLE_COLOR]?: Colord,
	[SVG_STYLE_STROKE_DASH_ARRAY]?: number[];
}

export interface BaseProperties extends Style {
	id?: string,
	class?: string,
	ids?: string,
}

export interface LineProperties extends BaseProperties {
	x1: number,
	y1: number,
	x2: number,
	y2: number,
}

export interface RectProperties extends BaseProperties {
	x: number,
	y: number,
	width: number,
	height: number,
}

export interface PolylineProperties extends BaseProperties {
	points: string,
}

export interface PolygonProperties extends BaseProperties {
	points: string,
}

export interface CircleProperties extends BaseProperties {
	r: number,
	cx: number,
	cy: number,
}

export interface EllipseProperties extends BaseProperties {
	rx: number,
	ry: number,
	cx: number,
	cy: number,
}

export interface PathProperties extends BaseProperties {
	d: string,
}

/**
 * @private
 */
export type GeometryElementTagName =
	typeof LINE | typeof RECT | typeof POLYLINE | typeof POLYGON |
	typeof CIRCLE | typeof ELLIPSE | typeof PATH;

/**
 * @private
 */
export type GeometryElementProperties =
	LineProperties | RectProperties | PolylineProperties | PolygonProperties |
	CircleProperties | EllipseProperties | PathProperties;

export interface SegmentProperties extends BaseProperties {
}

export interface Properties extends Style {
	viewBox?: string,
	id?: string,
	class?: string,
	x1?: number,
	y1?: number,
	x2?: number,
	y2?: number,
	x?: string,
	y?: string,
	width?: string,
	height?: string,
	points?: string,
	d?: string,
	cx?: number,
	cy?: number,
	rx?: number,
	ry?: number,
	r?: number,
	transform?: string,
}

// Redefine ElementNode type, excluding children of type string.
export type ElementNode = {
    type: 'element';
    tagName?: string | undefined;
    properties?: Properties;
    children: Array<Node>;
    value?: string | undefined;
    metadata?: string | undefined;
}

export type Node = TextNode | ElementNode;

export interface FlatElementBase {
	transform?: Transform,
}

export interface FlatLineElement extends FlatElementBase {
	tagName: typeof LINE,
	properties: LineProperties,
}

export interface FlatRectElement extends FlatElementBase {
	tagName: typeof RECT,
	properties: RectProperties,
}

export interface FlatPolylineElement extends FlatElementBase {
	tagName: typeof POLYLINE,
	properties: PolylineProperties,
}

export interface FlatPolygonElement extends FlatElementBase {
	tagName: typeof POLYGON,
	properties: PolygonProperties,
}

export interface FlatCircleElement extends FlatElementBase {
	tagName: typeof CIRCLE,
	properties: CircleProperties,
}

export interface FlatEllipseElement extends FlatElementBase {
	tagName: typeof ELLIPSE,
	properties: EllipseProperties,
}

export interface FlatPathElement extends FlatElementBase {
	tagName: typeof PATH,
	properties: PathProperties,
}

export type FlatElement =
	FlatLineElement | FlatRectElement | FlatPolylineElement | FlatPolygonElement |
	FlatCircleElement | FlatEllipseElement | FlatPathElement;


export type FlatPath = {
    properties: PathProperties;
}

export type FlatLineSegment = {
	p1: [number, number],
	p2: [number, number],
    properties: SegmentProperties;
}
export type FlatBezierSegment = {
	p1: [number, number],
	p2: [number, number],
	controlPoints: [number, number][],
    properties: SegmentProperties;
}
export type FlatArcSegment = {
	p1: [number, number],
	p2: [number, number],
	rx: number,
	ry: number,
	xAxisRotation: number,
	largeArcFlag: boolean,
	sweepFlag: boolean,
    properties: SegmentProperties;
}

export type FlatSegment = FlatLineSegment | FlatBezierSegment | FlatArcSegment;

export type PropertiesFilter = {
	key: string;
	value: string | number | number[] | Colord;
	tolerance?: number;
};

type MoveToAbs = ["M", number, number];
type LineToAbs = ["L", number, number];
type HorizontalLineToAbs = ["H", number];
type VerticalLineToAbs = ["V", number];
type CurveToAbs = ["C", number, number, number, number, number, number];
type SmoothCurveToAbs = ["S", number, number, number, number];
type QuadraticBézierCurveToAbs = ["Q", number, number, number, number];
type SmoothQuadraticBézierCurveToAbs = ["T", number, number];
type EllipticalArcAbs = ["A", number, number, number, number, number, number, number];

type MoveToRel = ["m", number, number];
type LineToRel = ["l", number, number];
type HorizontalLineToRel = ["h", number];
type VerticalLineToRel = ["v", number];
type CurveToRel = ["c", number, number, number, number, number, number];
type SmoothCurveToRel = ["s", number, number, number, number];
type QuadraticBézierCurveToRel = ["q", number, number, number, number];
type SmoothQuadraticBézierCurveToRel = ["t", number, number];
type EllipticalArcRel = ["a", number, number, number, number, number, number, number];

type ClosePath = ["Z" | "z"];

type Segment = MoveToAbs | MoveToRel | LineToAbs | LineToRel | HorizontalLineToAbs | HorizontalLineToRel | VerticalLineToAbs | VerticalLineToRel | CurveToAbs | CurveToRel | SmoothCurveToAbs | SmoothCurveToRel | QuadraticBézierCurveToAbs | QuadraticBézierCurveToRel | SmoothQuadraticBézierCurveToAbs | SmoothQuadraticBézierCurveToRel | EllipticalArcAbs | EllipticalArcRel | ClosePath;

/**
 * @private
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
	segments: Segment[];
	__stack?: any[];
	err?: string;
}