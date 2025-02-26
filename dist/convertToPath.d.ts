import { CircleProperties, EllipseProperties, LineProperties, PathParser, PathProperties, PolygonProperties, PolylineProperties, RectProperties, Transform } from './types';
export declare function convertLineToPath(properties: LineProperties, parsingErrors: string[], transform?: Transform): string | undefined;
export declare function convertRectToPath(properties: RectProperties, parsingErrors: string[], transform?: Transform): string | undefined;
export declare function convertCircleToPath(properties: CircleProperties, parsingErrors: string[], _preserveArcs: boolean, transform?: Transform): PathParser | undefined;
export declare function convertEllipseToPath(properties: EllipseProperties, parsingErrors: string[], _preserveArcs: boolean, transform?: Transform): PathParser | undefined;
export declare function convertPolygonToPath(properties: PolygonProperties, parsingErrors: string[], transform?: Transform): string | undefined;
export declare function convertPolylineToPath(properties: PolylineProperties, parsingErrors: string[], transform?: Transform): string | undefined;
export declare function convertPathToPath(properties: PathProperties, parsingErrors: string[], _preserveArcs: boolean, transform?: Transform): PathParser | undefined;
