import { SVGCircleProperties, SVGEllipseProperties, SVGLineProperties, SVGPathProperties, SVGPolygonProperties, SVGPolylineProperties, SVGRectProperties, FlatSVGTransform } from './types-public';
import { PathParser, PointsConversionResult } from './types-private';
/**
 * Convert an SVG `<line>` to a path d-string. Missing x1/y1/x2/y2 default to 0;
 * non-numeric values push a warning and return undefined.
 * @param properties Source `<line>` attributes.
 * @param parsingWarnings Mutable array — populated when input is invalid.
 * @param transform Optional matrix baked into the emitted coordinates.
 * @returns Path d-string, or undefined on invalid input.
 */
export declare function convertLineToPath(properties: SVGLineProperties, parsingWarnings: string[], transform?: FlatSVGTransform): string | undefined;
/**
 * Convert an SVG `<rect>` to a path d-string with four explicit edges + Z.
 * Pushes a warning and returns undefined on invalid x/y/width/height.
 * @param properties Source `<rect>` attributes.
 * @param parsingWarnings Mutable array — populated when input is invalid.
 * @param transform Optional matrix baked into the emitted coordinates.
 * @returns Path d-string, or undefined on invalid input.
 */
export declare function convertRectToPath(properties: SVGRectProperties, parsingWarnings: string[], transform?: FlatSVGTransform): string | undefined;
/**
 * Convert an SVG `<circle>` to a svgpath PathParser. Encoded as two arcs
 * (or a degenerate there-and-back line when r=0); arcs are flattened to
 * cubic beziers unless `_preserveArcs` is true.
 * @param properties Source `<circle>` attributes.
 * @param parsingWarnings Mutable array — populated when input is invalid.
 * @param _preserveArcs Keep `A` commands; otherwise approximate with cubics.
 * @param transform Optional matrix baked into the emitted coordinates.
 * @returns svgpath PathParser, or undefined on invalid input.
 */
export declare function convertCircleToPath(properties: SVGCircleProperties, parsingWarnings: string[], _preserveArcs: boolean, transform?: FlatSVGTransform): PathParser | undefined;
/**
 * Convert an SVG `<ellipse>` to a svgpath PathParser. Same encoding as
 * convertCircleToPath but with separate rx / ry radii.
 * @param properties Source `<ellipse>` attributes.
 * @param parsingWarnings Mutable array — populated when input is invalid.
 * @param _preserveArcs Keep `A` commands; otherwise approximate with cubics.
 * @param transform Optional matrix baked into the emitted coordinates.
 * @returns svgpath PathParser, or undefined on invalid input.
 */
export declare function convertEllipseToPath(properties: SVGEllipseProperties, parsingWarnings: string[], _preserveArcs: boolean, transform?: FlatSVGTransform): PathParser | undefined;
/**
 * Convert an SVG `<polygon>` to a path d-string with explicit L-back-to-start
 * + Z. A single-point points list returns `{ strayPoint }` instead of a path.
 * @param properties Source `<polygon>` attributes.
 * @param parsingWarnings Mutable array — populated when input is invalid.
 * @param transform Optional matrix baked into the emitted coordinates.
 * @returns Path d-string, stray-point object, or undefined on invalid input.
 */
export declare function convertPolygonToPath(properties: SVGPolygonProperties, parsingWarnings: string[], transform?: FlatSVGTransform): PointsConversionResult;
/**
 * Convert an SVG `<polyline>` to a path d-string. Same as convertPolygonToPath
 * but without the closing edge + Z.
 * @param properties Source `<polyline>` attributes.
 * @param parsingWarnings Mutable array — populated when input is invalid.
 * @param transform Optional matrix baked into the emitted coordinates.
 * @returns Path d-string, stray-point object, or undefined on invalid input.
 */
export declare function convertPolylineToPath(properties: SVGPolylineProperties, parsingWarnings: string[], transform?: FlatSVGTransform): PointsConversionResult;
/**
 * Normalize an SVG `<path>` d-string: absolute coordinates (.abs()), short
 * forms expanded to full Q/C (.unshort()), and arcs flattened to cubics
 * (.unarc()) unless `_preserveArcs` is true.
 * @param properties Source `<path>` attributes.
 * @param parsingWarnings Mutable array — populated when input is invalid.
 * @param _preserveArcs Keep `A` commands; otherwise approximate with cubics.
 * @param transform Optional matrix baked into the emitted coordinates.
 * @returns svgpath PathParser, or undefined on invalid input.
 */
export declare function convertPathToPath(properties: SVGPathProperties, parsingWarnings: string[], _preserveArcs: boolean, transform?: FlatSVGTransform): PathParser | undefined;
