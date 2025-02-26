import { parse, RootNode } from 'svg-parser';
import {
    parseTransformString,
    flattenTransformArray,
    copyTransform,
    transformToString,
} from './transforms';
import { AnyColor, Colord, colord, extend } from 'colord';
import namesPlugin from 'colord/plugins/names';
import labPlugin from 'colord/plugins/lab';
import {
    CIRCLE,
    ELLIPSE,
    G,
    LINE,
    PATH,
    POLYGON,
    POLYLINE,
    RECT,
    SVG,
    SVG_STYLE_COLOR,
    SVG_STYLE_FILL,
    SVG_STYLE_OPACITY,
    SVG_STYLE_STROKE_COLOR,
    SVG_STYLE_STROKE_DASH_ARRAY,
} from './constants';
import {
    FlatArcSegment,
    FlatBezierSegment,
    ComputedProperties,
    ElementNode,
    FlatElement,
    FlatPath,
    FlatSegment,
    GeometryElementProperties,
    GeometryElementTagName,
    Node,
    PathParser,
    Properties,
    PropertiesFilter,
    Style,
    Transform,
} from './types';
import {
    convertCircleToPath,
    convertEllipseToPath,
    convertLineToPath,
    convertPathToPath,
    convertPolygonToPath,
    convertPolylineToPath,
    convertRectToPath,
} from './convertToPath';
import svgpath from 'svgpath';
// Had to roll back to @adobe/css-tools to version 4.3.0-rc.1 to get this to work.
// https://github.com/adobe/css-tools/issues/116
import { parse as cssParse, type CssDeclarationAST, type CssRuleAST } from '@adobe/css-tools';
import { isNumber } from '@amandaghassaei/type-checks';
import { convertToDashArray } from './utils';

extend([namesPlugin]);
extend([labPlugin]);
// Color input examples
// "#FFF"
// "#ffffff"
// "#ffffffff"
// "rgb(255, 255, 255)"
// "rgba(255, 255, 255, 0.5)"
// "rgba(100% 100% 100% / 50%)"
// "hsl(90, 100%, 100%)"
// "hsla(90, 100%, 100%, 0.5)"
// "hsla(90deg 100% 100% / 50%)"
// "tomato"

export class FlatSVG {
    private readonly _rootNode: RootNode;
    private _elements?: FlatElement[];
    private _paths?: FlatPath[];
    private _pathParsers?: (PathParser | undefined)[];
    private _segments?: FlatSegment[];
    private readonly _preserveArcs: boolean;

    /**
     * Defs elements that are removed during flattening.
     */
    readonly defs: ElementNode[] = [];
    /**
     * Global style to be applied to children during flattening.
     */
    private readonly _globalStyles?: { [key: string]: Style };

    /**
     * A list of errors generated during parsing.
     */
    readonly errors: string[] = [];
    /**
     * A list of warnings generated during parsing.
     */
    readonly warnings: string[] = [];

    // Hold onto some extra computed properties so we don't have to recompute during filter operations.
    private _computedElementProperties?: ComputedProperties[];
    private _computedPathProperties?: ComputedProperties[];
    private _computedSegmentProperties?: ComputedProperties[];

    /**
     * Init a FlatSVG object.
     * @param string - SVG string to parse.
     * @param options - Optional settings.
     * @param options.preserveArcs - Preserve arcs, ellipses, and circles as arcs when calling FlatSVG.paths and FlatSVG.segments.  Defaults to false, which will approximate arcs as cubic beziers.
     */
    constructor(string: string, options?: { preserveArcs: boolean }) {
        if (string === undefined) {
            throw new Error('Must pass in an SVG string to FlatSVG().');
        }
        if (string === '') {
            throw new Error('SVG string is empty.');
        }
        this._rootNode = parse(string);
        this._preserveArcs = !!options?.preserveArcs;

        // Validate svg.
        // Check that a root svg element exists.
        if (
            this._rootNode.children.length !== 1 ||
            this._rootNode.children[0].type !== 'element' ||
            this._rootNode.children[0].tagName !== SVG
        ) {
            // console.log(this._rootNode);
            this.errors.push(`Malformed SVG: expected only 1 child <svg> element on root node.`);
            throw new Error(`Malformed SVG: expected only 1 child <svg> element on root node.`);
        }

        // Pull out defs/style tags.
        const topChildren = this._rootNode.children[0].children;
        for (let i = topChildren.length - 1; i >= 0; i--) {
            const child = topChildren[i] as ElementNode;
            if (child.tagName === 'defs') {
                this.defs.push(child);
                topChildren.splice(i, 1);
                // Check if defs contains style.
                if (child.children) {
                    for (let j = child.children.length - 1; j >= 0; j--) {
                        const defsChild = child.children[j] as ElementNode;
                        if (defsChild.tagName === 'style') {
                            child.children.splice(j, 1);
                            if (
                                defsChild.children &&
                                defsChild.children[0] &&
                                defsChild.children[0].type === 'text'
                            ) {
                                this._globalStyles = {
                                    ...this._globalStyles,
                                    ...this.parseStyleToObject(
                                        defsChild.children[0].value as string
                                    ),
                                };
                            }
                        }
                    }
                }
            }
            if (child.tagName === 'style') {
                topChildren.splice(i, 1);
                if (child.children && child.children[0] && child.children[0].type === 'text') {
                    this._globalStyles = {
                        ...this._globalStyles,
                        ...this.parseStyleToObject(child.children[0].value as string),
                    };
                }
            }
        }

        this.deepIterChildren = this.deepIterChildren.bind(this);

        // // Check that no children are strings.
        // this.deepIterChildren((child) => {
        // 	if (typeof child === 'string') {
        // 		console.log(this.rootNode);
        // 		throw new Error(`Child is a string: ${child}.`);
        // 	}
        // });
    }

    private parseStyleToObject(styleString: string) {
        const { errors } = this;
        const result = {} as { [key: string]: Style };
        const css = cssParse(styleString, { silent: true });
        const { stylesheet } = css;
        /* c8 ignore next 3 */
        if (!stylesheet) {
            return result;
        }
        if (stylesheet.parsingErrors) {
            const parsingErrors = stylesheet.parsingErrors
                .map((error) => error.message)
                .filter((error) => error !== undefined);
            errors.push(...parsingErrors);
        }
        // Extract style info.
        /* c8 ignore next 3 */
        if (!stylesheet.rules) {
            return result;
        }
        const rules = stylesheet.rules;
        for (let i = 0, numRules = rules.length; i < numRules; i++) {
            const rule = rules[i];
            const selectorStyle: { [key: string]: number | string } = {};
            const { declarations, selectors } = rule as CssRuleAST;
            if (declarations) {
                for (let j = 0, numDeclarations = declarations.length; j < numDeclarations; j++) {
                    const declaration = declarations[j] as CssDeclarationAST;
                    const { property } = declaration;
                    let { value } = declaration;
                    if (property && value !== undefined) {
                        // Cast value as number if needed.
                        // Try stripping px off the end.
                        value = value.replace(/px\b/g, '');
                        if (/^\-?[0-9]?([0-9]+e-?[0-9]+)?(\.[0-9]+)?$/.test(value))
                            selectorStyle[property] = parseFloat(value);
                        else selectorStyle[property] = value;
                    }
                }
            }
            if (selectors) {
                for (let j = 0, numSelectors = selectors.length; j < numSelectors; j++) {
                    const selector = selectors[j];
                    result[selector] = { ...result[selector], ...selectorStyle };
                }
            }
        }
        return result;
    }

    /**
     * Get the root node of the SVG.
     */
    get root() {
        return this._rootNode.children[0] as Node as ElementNode;
    }

    /**
     * Get the viewBox of the SVG as [min-x, min-y, width, height].
     */
    get viewBox() {
        const viewBoxString = this.root.properties!.viewBox;
        if (viewBoxString) {
            return viewBoxString.split(' ').map((el) => parseFloat(el));
        }
        return [
            Number.parseFloat((this.root.properties!.x || '0') as string),
            Number.parseFloat((this.root.properties!.y || '0') as string),
            Number.parseFloat((this.root.properties!.width || '0') as string),
            Number.parseFloat((this.root.properties!.height || '0') as string),
        ];
    }

    /**
     * Get the units of the SVG as a string.
     */
    get units() {
        // If you do not specify any units inside the width and height attributes, the units are assumed to be pixels.
        const regex = new RegExp(/(em|ex|px|pt|pc|cm|mm|in)$/);
        const { x, y, width, height } = this.root.properties || /* c8 ignore next */ {};
        /* c8 ignore next 2 */
        const match =
            x?.match(regex) || y?.match(regex) || width?.match(regex) || height?.match(regex);
        return (match ? match[0] : 'px') as 'in' | 'cm' | 'mm' | 'px' | 'pt' | 'em' | 'ex' | 'pc';
    }

    private deepIterChildren(
        callback: (
            child: ElementNode,
            transform?: Transform,
            ids?: string,
            classes?: string,
            properties?: GeometryElementProperties
        ) => void,
        node = this.root,
        transform?: Transform,
        ids?: string,
        classes?: string,
        properties?: Style
    ) {
        const { _globalStyles } = this;
        for (let i = 0, numChildren = node.children.length; i < numChildren; i++) {
            const child = node.children[i] as ElementNode;

            let childTransform = transform;
            let childClasses: string | undefined;
            let childIds: string | undefined;
            let childProperties: Style | undefined;

            if (child.properties) {
                // Add transforms to list.
                if (child.properties.transform) {
                    const childTransforms = parseTransformString(
                        child.properties.transform,
                        child.tagName
                    );
                    // Get errors / warnings.
                    for (
                        let transformIndex = 0, numTransforms = childTransforms.length;
                        transformIndex < numTransforms;
                        transformIndex++
                    ) {
                        const { errors, warnings } = childTransforms[transformIndex];
                        /* c8 ignore next if */
                        if (errors) this.errors.push(...errors);
                        /* c8 ignore next if */
                        if (warnings) this.warnings.push(...warnings);
                    }
                    // Merge transforms.
                    if (childTransforms.length) {
                        if (childTransform) {
                            childTransforms.unshift(childTransform);
                        }
                        // Flatten transforms to a new matrix.
                        childTransform = flattenTransformArray(childTransforms);
                    }
                    delete child.properties.transform;
                }
                let childPropertiesToMerge = child.properties || /* c8 ignore next */ {};

                childIds = ids;
                if (child.properties.id) {
                    // Check for styling associated with id.
                    if (_globalStyles) {
                        const idsArray = child.properties.id.split(' ');
                        for (let j = 0, numIds = idsArray.length; j < numIds; j++) {
                            const idStyle = _globalStyles[`#${idsArray[j]}`];
                            if (idStyle) {
                                childPropertiesToMerge = { ...childPropertiesToMerge, ...idStyle };
                            }
                        }
                    }
                    // Add child ids to ids list.
                    childIds = `${childIds ? `${childIds} ` : ''}${child.properties.id}`;
                    delete child.properties.id;
                    delete childPropertiesToMerge.id;
                }

                childClasses = classes;
                if (child.properties.class) {
                    // Check for styling associated with class.
                    if (_globalStyles) {
                        const classArray = child.properties.class.split(' ');
                        for (let j = 0, numClasses = classArray.length; j < numClasses; j++) {
                            const classStyle = _globalStyles[`.${classArray[j]}`];
                            if (classStyle) {
                                childPropertiesToMerge = {
                                    ...childPropertiesToMerge,
                                    ...classStyle,
                                };
                            }
                        }
                    }
                    // Add child classes to classes list.
                    childClasses = `${childClasses ? `${childClasses} ` : ''}${
                        child.properties.class
                    }`;
                    delete child.properties.class;
                    delete childPropertiesToMerge.class;
                }

                // Add child properties to properties list.
                childProperties = properties;
                // Check if the child has inline styles.
                if ((childPropertiesToMerge as any).style) {
                    const style = this.parseStyleToObject(
                        `#this { ${(childPropertiesToMerge as any).style} }`
                    )['#this'];
                    childPropertiesToMerge = { ...style, ...childPropertiesToMerge };
                    delete (childPropertiesToMerge as any).style;
                }
                const propertyKeys = Object.keys(childPropertiesToMerge);
                for (let j = 0, numProperties = propertyKeys.length; j < numProperties; j++) {
                    const key = propertyKeys[j] as keyof Properties;
                    if (childPropertiesToMerge[key] !== undefined) {
                        // Make a copy.
                        if (!childProperties || childProperties === properties)
                            childProperties = { ...properties };
                        // In the case of opacity, multiply parent and child.
                        if (key === SVG_STYLE_OPACITY) {
                            /* c8 ignore next 6 */
                            if (!isNumber(childPropertiesToMerge[key]))
                                throw new Error(
                                    `Opacity is not number: "${JSON.stringify(
                                        childPropertiesToMerge[key]
                                    )}".`
                                );
                            childProperties[key] =
                                (childPropertiesToMerge[key] as number) *
                                (childProperties[key] !== undefined
                                    ? (childProperties[key] as number)
                                    : 1);
                        }
                        // Only use child style if parent style is not defined.
                        // @ts-ignore
                        if (childProperties[key] === undefined)
                            // @ts-ignore
                            childProperties[key] = childPropertiesToMerge[key];
                    }
                }
            }

            // Callback.
            if (child.tagName !== G) {
                // Make copies of all child properties.
                callback(
                    child,
                    childTransform ? copyTransform(childTransform) : undefined,
                    childIds?.slice(),
                    childClasses?.slice(),
                    /* c8 ignore next 3 */
                    childProperties
                        ? ({ ...childProperties } as GeometryElementProperties)
                        : undefined
                );
            }

            if (child.children) {
                this.deepIterChildren(
                    callback,
                    child,
                    childTransform,
                    childIds,
                    childClasses,
                    childProperties
                );
            }
        }
    }

    /**
     * Get a flat list of geometry elements in the SVG.
     * The return value is cached internally.
     */
    get elements() {
        if (this._elements) return this._elements;

        // Init output arrays.
        const elements: FlatElement[] = [];
        const parsingErrors: string[] = [];
        const parsingWarnings: string[] = [];

        // Flatten all children and return.
        this.deepIterChildren((child, transform, ids, classes, properties) => {
            /* c8 ignore next 4 */
            if (child.value) {
                parsingErrors.push(`Skipping child ${child.tagName} with value: ${child.value}`);
                return;
            }
            /* c8 ignore next 6 */
            if (child.metadata) {
                parsingErrors.push(
                    `Skipping child ${child.tagName} with metadata: ${child.metadata}`
                );
                return;
            }
            if (!child.tagName) {
                parsingErrors.push(`Skipping child with no tagName: ${JSON.stringify(child)}.`);
                return;
            }
            /* c8 ignore next 4 */
            if (!properties) {
                parsingErrors.push(`Skipping child with no properties: ${JSON.stringify(child)}.`);
                return;
            }

            if (ids) properties.ids = ids;
            if (classes) properties.class = classes;

            const flatChild = {
                tagName: child.tagName as GeometryElementTagName,
                properties,
            } as FlatElement;
            if (transform) flatChild.transform = transform;
            elements.push(flatChild);
        });

        this._elements = elements; // Save for later so we don't need to recompute.

        // Save any errors or warnings so we can query these later.
        this.errors.push(...parsingErrors);
        this.warnings.push(...parsingWarnings);

        return elements;
    }

    private static wrapWithSVGTag(root: ElementNode, svgElements: string) {
        const properties = root.properties || /* c8 ignore next */ {};
        return `<svg ${Object.keys(properties)
            .map((key) => `${key}="${properties[key as keyof Properties]}"`)
            .join(' ')}>\n${svgElements}\n</svg>`;
    }

    /**
     * Get svg string from elements array.
     * @private
     */
    private static elementsAsSVG(root: ElementNode, elements: FlatElement[]) {
        return FlatSVG.wrapWithSVGTag(
            root,
            elements
                .map((element) => {
                    const { tagName, properties, transform } = element;
                    const propertiesKeys = Object.keys(properties);
                    let propertiesString = '';
                    for (let i = 0, length = propertiesKeys.length; i < length; i++) {
                        const key = propertiesKeys[i] as keyof typeof properties;
                        propertiesString += `${key}="${properties[key]}" `;
                    }
                    if (transform)
                        propertiesString += `transform="${transformToString(transform)}" `;
                    return `<${tagName} ${propertiesString}/>`;
                })
                .join('\n')
        );
    }

    /**
     * Get svg string from FlatSVG.elements array.
     */
    get elementsAsSVG() {
        const { elements, root } = this;
        return FlatSVG.elementsAsSVG(root, elements);
    }

    /**
     * Get a flat list of SVG geometry represented as paths.
     * The return value is cached internally.
     */
    get paths() {
        if (this._paths) return this._paths;

        const { elements, _preserveArcs } = this; // First query elements.

        // Init output arrays.
        const paths: FlatPath[] = [];
        const pathParsers: (PathParser | undefined)[] = [];
        const parsingErrors: string[] = [];
        const parsingWarnings: string[] = [];

        for (let i = 0; i < elements.length; i++) {
            const child = elements[i];
            const { transform, tagName, properties } = child;

            const propertiesCopy: { [key: string]: any } = { ...properties };

            // Convert all object types to path with absolute coordinates and transform applied.
            let d: string | undefined;
            let pathParser: PathParser | undefined;
            switch (tagName) {
                case LINE:
                    d = convertLineToPath(properties, parsingErrors, transform);
                    delete propertiesCopy.x1;
                    delete propertiesCopy.y1;
                    delete propertiesCopy.x2;
                    delete propertiesCopy.y2;
                    break;
                case RECT:
                    d = convertRectToPath(properties, parsingErrors, transform);
                    delete propertiesCopy.x;
                    delete propertiesCopy.y;
                    delete propertiesCopy.width;
                    delete propertiesCopy.height;
                    break;
                case POLYGON:
                    d = convertPolygonToPath(properties, parsingErrors, transform);
                    delete propertiesCopy.points;
                    break;
                case POLYLINE:
                    d = convertPolylineToPath(properties, parsingErrors, transform);
                    delete propertiesCopy.points;
                    break;
                case CIRCLE:
                    pathParser = convertCircleToPath(
                        properties,
                        parsingErrors,
                        _preserveArcs,
                        transform
                    );
                    if (pathParser) d = pathParser.toString();
                    delete propertiesCopy.cx;
                    delete propertiesCopy.cy;
                    delete propertiesCopy.r;
                    break;
                case ELLIPSE:
                    pathParser = convertEllipseToPath(
                        properties,
                        parsingErrors,
                        _preserveArcs,
                        transform
                    );
                    if (pathParser) d = pathParser.toString();
                    delete propertiesCopy.cx;
                    delete propertiesCopy.cy;
                    delete propertiesCopy.rx;
                    delete propertiesCopy.ry;
                    break;
                case PATH:
                    pathParser = convertPathToPath(
                        properties,
                        parsingErrors,
                        _preserveArcs,
                        transform
                    );
                    if (pathParser) d = pathParser.toString();
                    delete propertiesCopy.d;
                    break;
                default:
                    parsingWarnings.push(`Unsupported tagname: "${tagName}".`);
                    break;
            }
            if (d === undefined || d === '') {
                continue;
            }

            const path = {
                properties: {
                    ...propertiesCopy,
                    d,
                },
            };
            paths.push(path);
            pathParsers.push(pathParser);
        }

        this._paths = paths; // Save for later so we don't need to recompute.
        this._pathParsers = pathParsers; // Save pathParsers in case segments are queried.

        // Save any errors or warnings so we can query these later.
        this.errors.push(...parsingErrors);
        this.warnings.push(...parsingWarnings);

        return paths;
    }

    /**
     * Get svg string from paths array.
     * @private
     */
    private static pathsAsSVG(root: ElementNode, paths: FlatPath[]) {
        return FlatSVG.wrapWithSVGTag(
            root,
            paths
                .map((path) => {
                    const { properties } = path;
                    const propertiesKeys = Object.keys(properties);
                    let propertiesString = '';
                    for (let i = 0, length = propertiesKeys.length; i < length; i++) {
                        const key = propertiesKeys[i] as keyof typeof properties;
                        propertiesString += `${key}="${properties[key]}" `;
                    }
                    return `<path ${propertiesString}/>`;
                })
                .join('\n')
        );
    }

    /**
     * Get svg string from FlatSVG.paths array.
     */
    get pathsAsSVG() {
        const { paths, root } = this;
        return FlatSVG.pathsAsSVG(root, paths);
    }

    /**
     * Get a flat list of SVG edge segments (as lines, quadratic/cubic beziers, or arcs).
     * The return value is cached internally.
     */
    get segments() {
        if (this._segments) return this._segments;

        const { paths } = this; // First query paths.
        const { _pathParsers } = this; // Once paths are computed, _pathParsers becomes available.
        /* c8 ignore next 3 */
        if (!_pathParsers) {
            console.warn('Initing new _pathParsers array, we should never hit this.');
        }
        const pathParsers =
            _pathParsers || /* c8 ignore next */ new Array(paths.length).fill(undefined);

        // Init output arrays.
        const segments: FlatSegment[] = [];
        const parsingErrors: string[] = [];
        const parsingWarnings: string[] = [];

        for (let i = 0, numPaths = paths.length; i < numPaths; i++) {
            const path = paths[i];
            const { properties } = path;
            let pathParser = pathParsers[i];
            if (pathParser === undefined) {
                // Define a pathParser for elements that were not originally paths.
                pathParser = svgpath(properties.d);
                pathParsers[i] = pathParser;
            }
            /* c8 ignore next 4 */
            if (pathParser.err) {
                // Should not hit this.
                parsingErrors.push(`Problem parsing path to segments with ${pathParser.err}.`);
            }
            // Split paths to segments.
            const startPoint = [0, 0];
            pathParser.iterate((command: any, index: number, x: number, y: number) => {
                const p1 = [x, y] as [number, number];

                // Copy parent properties to segment (minus the "d" property).
                const propertiesCopy: { [key: string]: any } = { ...properties };
                delete propertiesCopy.d;
                const segment = {
                    p1,
                    properties: propertiesCopy,
                } as FlatSegment;

                const segmentType = command[0];
                /* c8 ignore next 6 */
                if (index === 0 && segmentType !== 'M') {
                    // Should not hit this, it should be caught earlier by SvgPath.
                    parsingErrors.push(
                        `Malformed svg path: "${pathParser.toString()}", should start with M command.`
                    );
                }
                switch (segmentType) {
                    case 'M':
                        startPoint[0] = command[1];
                        startPoint[1] = command[2];
                        return;
                    case 'L':
                        segment.p2 = [command[1], command[2]];
                        break;
                    case 'H':
                        segment.p2 = [command[1], y];
                        break;
                    case 'V':
                        segment.p2 = [x, command[1]];
                        break;
                    case 'Q':
                        (segment as FlatBezierSegment).controlPoints = [[command[1], command[2]]];
                        segment.p2 = [command[3], command[4]];
                        break;
                    case 'C':
                        (segment as FlatBezierSegment).controlPoints = [
                            [command[1], command[2]],
                            [command[3], command[4]],
                        ];
                        segment.p2 = [command[5], command[6]];
                        break;
                    case 'A':
                        (segment as FlatArcSegment).rx = command[1];
                        (segment as FlatArcSegment).ry = command[2];
                        (segment as FlatArcSegment).xAxisRotation = command[3];
                        (segment as FlatArcSegment).largeArcFlag = !!command[4];
                        (segment as FlatArcSegment).sweepFlag = !!command[5];
                        segment.p2 = [command[6], command[7]];
                        break;
                    case 'z':
                    case 'Z':
                        // Get first point since last move command.
                        if (startPoint[0] === x && startPoint[1] === y) {
                            // Ignore zero length line.
                            return;
                        }
                        segment.p2 = [startPoint[0], startPoint[1]];
                        break;
                    /* c8 ignore next 4 */
                    default:
                        // Should not hit this.
                        parsingErrors.push(`Unknown <path> command: ${segmentType}.`);
                        return;
                }
                segments.push(segment);
            });
        }
        this._segments = segments; // Save for later so we don't need to recompute.

        // We no longer need to hold _pathParsers.
        delete this._pathParsers;

        // Save any errors or warnings so we can query these later.
        this.errors.push(...parsingErrors);
        this.warnings.push(...parsingWarnings);

        return segments;
    }

    /**
     * Get svg string from paths array.
     * @private
     */
    private static segmentsAsSVG(root: ElementNode, segments: FlatSegment[]) {
        return FlatSVG.wrapWithSVGTag(
            root,
            segments
                .map((segment) => {
                    const { p1, p2, properties } = segment;
                    const propertiesKeys = Object.keys(properties);
                    let propertiesString = '';
                    for (let i = 0, length = propertiesKeys.length; i < length; i++) {
                        const key = propertiesKeys[i] as keyof typeof properties;
                        propertiesString += `${key}="${properties[key]}" `;
                    }
                    if ((segment as FlatBezierSegment).controlPoints) {
                        const { controlPoints } = segment as FlatBezierSegment;
                        const curveType = controlPoints.length === 1 ? 'Q' : 'C';
                        let d = `M ${p1[0]} ${p1[1]} ${curveType} ${controlPoints[0][0]} ${controlPoints[0][1]} `;
                        if (curveType === 'C')
                            d += `${controlPoints[1][0]} ${controlPoints[1][1]} `;
                        d += `${p2[0]} ${p2[1]} `;
                        return `<path d="${d}" ${propertiesString}/>`;
                    }
                    if ((segment as FlatArcSegment).rx !== undefined) {
                        const { rx, ry, xAxisRotation, largeArcFlag, sweepFlag } =
                            segment as FlatArcSegment;
                        return `<path d="M ${p1[0]} ${p1[1]} A ${rx} ${ry} ${xAxisRotation} ${
                            /* c8 ignore next */ largeArcFlag ? 1 : 0
                        } ${sweepFlag ? 1 : 0} ${p2[0]} ${p2[1]}" ${propertiesString}/>`;
                    }
                    return `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" ${propertiesString}/>`;
                })
                .join('\n')
        );
    }

    /**
     * Get svg string from FlatSVG.segments array.
     */
    get segmentsAsSVG() {
        const { segments, root } = this;
        return FlatSVG.segmentsAsSVG(root, segments);
    }

    private static filter(
        objects: FlatElement[],
        filterFunction: (object: FlatElement, index: number) => boolean
    ): FlatElement[];
    private static filter(
        objects: FlatPath[],
        filterFunction: (object: FlatPath, index: number) => boolean
    ): FlatPath[];
    private static filter(
        objects: FlatSegment[],
        filterFunction: (object: FlatSegment, index: number) => boolean
    ): FlatSegment[];
    private static filter(
        objects: (FlatElement | FlatPath | FlatSegment)[],
        filterFunction: (object: any, index: number) => boolean
    ) {
        const matches: (FlatElement | FlatPath | FlatSegment)[] = [];
        // const remaining: (FlatElement | FlatPath | FlatSegment)[] = [];
        for (let i = 0; i < objects.length; i++) {
            const object = objects[i];
            if (filterFunction(object, i)) matches.push(object);
            // else remaining.push(object);
        }
        return matches;
    }

    private static filterByStyle(
        objects: FlatElement[],
        filter: PropertiesFilter | PropertiesFilter[],
        computedProperties?: ComputedProperties[],
        exclude?: boolean[]
    ): { matches: FlatElement[]; computedProperties: ComputedProperties[] };
    private static filterByStyle(
        objects: FlatPath[],
        filter: PropertiesFilter | PropertiesFilter[],
        computedProperties?: ComputedProperties[],
        exclude?: boolean[]
    ): { matches: FlatPath[]; computedProperties: ComputedProperties[] };
    private static filterByStyle(
        objects: FlatSegment[],
        filter: PropertiesFilter | PropertiesFilter[],
        computedProperties?: ComputedProperties[],
        exclude?: boolean[]
    ): { matches: FlatSegment[]; computedProperties: ComputedProperties[] };
    private static filterByStyle(
        objects: (FlatElement | FlatPath | FlatSegment)[],
        filter: PropertiesFilter | PropertiesFilter[],
        computedProperties?: ComputedProperties[],
        exclude?: boolean[]
    ) {
        const filterArray = Array.isArray(filter) ? filter : [filter];
        const filterArrayValues: (string | number | Colord | number[])[] = [];
        // Precompute colors.
        for (let i = 0; i < filterArray.length; i++) {
            const { key, value } = filterArray[i];
            filterArrayValues.push(value);
            switch (key) {
                case SVG_STYLE_STROKE_COLOR:
                case SVG_STYLE_FILL:
                case SVG_STYLE_COLOR:
                    filterArrayValues[i] = colord(value as AnyColor | Colord);
                    break;
                case SVG_STYLE_STROKE_DASH_ARRAY:
                    filterArrayValues[i] = convertToDashArray(value as string | number | number[]);
                    break;
            }
        }

        const matches = FlatSVG.filter(objects as any[], (object, i) => {
            if (exclude && exclude[i]) return false;
            const { properties } = object;
            // Check that this object meets ALL the the style requirements.
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
                        let color: Colord | undefined;
                        const computedKey =
                            key === SVG_STYLE_OPACITY ? SVG_STYLE_STROKE_COLOR : key;
                        if (computedProperties) {
                            color = computedProperties[i][computedKey];
                        }
                        if (color === undefined) {
                            color = colord(properties[computedKey] as AnyColor);
                            // Multiply color.a by properties.opacity.
                            const opacity = properties[SVG_STYLE_OPACITY];
                            if (opacity !== undefined) {
                                const alpha = opacity * color.rgba.a; // Use color.rgba.a instead of alpha() to avoid rounding.
                                color = color.alpha(alpha); // This makes a copy.
                            }

                            // Init computed properties array if needed.
                            if (!computedProperties) {
                                computedProperties = new Array(
                                    objects.length
                                ) as ComputedProperties[];
                                // Fill with empty objects.
                                // Don't use Array.fill({}) bc all elements will point to same empty object instance.
                                for (let k = 0; k < objects.length; k++) {
                                    computedProperties[k] = {};
                                }
                            }
                            computedProperties[i][computedKey] = color;
                        }
                        if (
                            key === SVG_STYLE_STROKE_COLOR ||
                            key === SVG_STYLE_FILL ||
                            key === SVG_STYLE_COLOR
                        ) {
                            passed = color.delta(value as AnyColor) <= (tolerance || 0);
                            break;
                        }
                        // Else check color opacity for opacity.
                        // Use color.rgba.a instead of alpha() to avoid rounding.
                        passed = Math.abs(color.rgba.a - (value as number)) <= (tolerance || 0);
                        break;
                    case SVG_STYLE_STROKE_DASH_ARRAY:
                        let dashArray: number[] | undefined;
                        if (computedProperties) {
                            dashArray = computedProperties[i][key];
                        }
                        if (!dashArray) {
                            dashArray = convertToDashArray(properties[key] as string | number);
                            // Init computed properties array if needed.
                            if (!computedProperties) {
                                computedProperties = new Array(
                                    objects.length
                                ) as ComputedProperties[];
                                // Fill with empty objects.
                                // Don't use Array.fill({}) bc all elements will point to same empty object instance.
                                for (let k = 0; k < objects.length; k++) {
                                    computedProperties[k] = {};
                                }
                            }
                            computedProperties[i][key] = dashArray;
                        }
                        if (dashArray.length !== (value as number[]).length) {
                            if (dashArray.length === (value as number[]).length * 2) {
                                value = [...(value as number[]), ...(value as number[])];
                            } else if (dashArray.length * 2 === (value as number[]).length) {
                                dashArray = [
                                    ...(dashArray as number[]),
                                    ...(dashArray as number[]),
                                ];
                            } else {
                                passed = false;
                            }
                        }
                        if (passed) {
                            for (let k = 0; k < (value as number[]).length; k++) {
                                if (
                                    Math.abs((value as number[])[k] - dashArray[k]) >
                                    (tolerance || 0)
                                )
                                    passed = false;
                            }
                        }
                        break;
                    default:
                        // Assume any remaining keys correspond to numbers.
                        if (!isNumber(value)) {
                            passed = false;
                            throw new Error(
                                `flat-svg cannot handle filters with key "${key}" and value ${JSON.stringify(
                                    value
                                )} of type ${typeof value}.  Please submit an issue to https://github.com/amandaghassaei/flat-svg if this feature should be added.`
                            );
                            /* c8 ignore next 2 */
                            break;
                        }
                        if (
                            properties[key as keyof typeof properties] === undefined ||
                            Math.abs(
                                (properties[key as keyof typeof properties] as number) -
                                    (value as number)
                            ) > (tolerance || 0)
                        ) {
                            passed = false;
                        }
                        break;
                }
                if (!passed) return false;
            }
            return true;
        });
        return { matches: matches as (FlatElement | FlatPath | FlatSegment)[], computedProperties };
    }

    /**
     * Filter FlatSVG elements by style properties.
     * @param filter - Style properties to filter for.
     * @param exclude - Optionally pass an array of booleans of the same length as elements with "true" indicating that element should be excluded from the filter.
     */
    filterElementsByStyle(filter: PropertiesFilter | PropertiesFilter[], exclude?: boolean[]) {
        const { elements } = this;
        const { matches, computedProperties } = FlatSVG.filterByStyle(
            elements,
            filter,
            this._computedElementProperties,
            exclude
        );
        this._computedElementProperties = computedProperties;
        return matches;
    }

    /**
     * Filter FlatSVG paths by style properties.
     * @param filter - Style properties to filter for.
     * @param exclude - Optionally pass an array of booleans of the same length as paths with "true" indicating that path should be excluded from the filter.
     */
    filterPathsByStyle(filter: PropertiesFilter | PropertiesFilter[], exclude?: boolean[]) {
        const { paths } = this;
        const { matches, computedProperties } = FlatSVG.filterByStyle(
            paths,
            filter,
            this._computedPathProperties,
            exclude
        );
        this._computedPathProperties = computedProperties;
        return matches;
    }

    /**
     * Filter FlatSVG segments by style properties.
     * @param filter - Style properties to filter for.
     * @param exclude - Optionally pass an array of booleans of the same length as segments with "true" indicating that segment should be excluded from the filter.
     */
    filterSegmentsByStyle(filter: PropertiesFilter | PropertiesFilter[], exclude?: boolean[]) {
        const { segments } = this;
        const { matches, computedProperties } = FlatSVG.filterByStyle(
            segments,
            filter,
            this._computedSegmentProperties,
            exclude
        );
        this._computedSegmentProperties = computedProperties;
        return matches;
    }
}
