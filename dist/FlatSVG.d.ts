import { ElementNode, FlatElement, FlatPath, FlatSegment, PropertiesFilter } from './types';
export declare class FlatSVG {
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
    get units(): "em" | "px" | "in" | "cm" | "mm" | "pt" | "ex" | "pc";
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
