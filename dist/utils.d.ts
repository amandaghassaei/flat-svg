import { SVGParserElementNode } from './types-public';
/**
 * Strip leading and trailing whitespace from a string (equivalent to `.trim()`).
 * @param string Input string.
 * @returns The input with all leading/trailing whitespace removed.
 */
export declare function removeWhitespacePadding(string: string): string;
/**
 * Wrap a string of inner element markup with an `<svg ...>` open tag carrying
 * the given root's attributes and a matching close tag. Used by FlatSVG's
 * `*AsSVG` getters to round-trip flattened output as a complete document.
 * @param root svg-parser root node whose attributes populate the wrapper.
 * @param svgElements Inner element markup to splice between the tags.
 * @returns A complete `<svg ...>...</svg>` document string.
 */
export declare function wrapWithSVGTag(root: SVGParserElementNode, svgElements: string): string;
/**
 * Serialize a properties object to a space-separated `key="value"` attribute
 * string for embedding inside an SVG tag. Every own enumerable key is emitted.
 * @param properties Object of SVG attribute key/value pairs.
 * @returns Attribute string (trailing space included).
 */
export declare function propertiesToAttributesString(properties: object): string;
/**
 * Normalize a `stroke-dasharray` value (string, number, array, or undefined)
 * into a positive-number array, doubling odd-length lists per the SVG spec.
 * @param value Raw dasharray value from an SVG attribute or caller input.
 * @returns Even-length array of positive numbers (empty for undefined/`''`).
 */
export declare function convertToDashArray(value: string | number | number[] | undefined): number[];
