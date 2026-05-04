import { isArray, isNumber, isPositiveNumber, isString } from '@amandaghassaei/type-checks';
/**
 * Strip leading and trailing whitespace from a string (equivalent to `.trim()`).
 * @param string Input string.
 * @returns The input with all leading/trailing whitespace removed.
 */
export function removeWhitespacePadding(string) {
    return string.replace(/^\s+|\s+$/g, '');
}
/**
 * Wrap a string of inner element markup with an `<svg ...>` open tag carrying
 * the given root's attributes and a matching close tag. Used by FlatSVG's
 * `*AsSVG` getters to round-trip flattened output as a complete document.
 * @param root svg-parser root node whose attributes populate the wrapper.
 * @param svgElements Inner element markup to splice between the tags.
 * @returns A complete `<svg ...>...</svg>` document string.
 */
export function wrapWithSVGTag(root, svgElements) {
    /* c8 ignore start -- defensive: svg-parser always emits a `properties` object
       (empty `{}` for elements with no attributes), so the `|| {}` fallback only
       fires if the library changes its contract. Verified for v3.x. */
    const properties = root.properties || {};
    /* c8 ignore stop */
    return `<svg ${Object.keys(properties)
        .map((key) => `${key}="${properties[key]}"`)
        .join(' ')}>\n${svgElements}\n</svg>`;
}
/**
 * Serialize a properties object to a space-separated `key="value"` attribute
 * string for embedding inside an SVG tag. Every own enumerable key is emitted.
 * @param properties Object of SVG attribute key/value pairs.
 * @returns Attribute string (trailing space included).
 */
export function propertiesToAttributesString(properties) {
    const keys = Object.keys(properties);
    let attrs = '';
    for (let i = 0, length = keys.length; i < length; i++) {
        const key = keys[i];
        attrs += `${key}="${properties[key]}" `;
    }
    return attrs;
}
/**
 * Normalize a `stroke-dasharray` value (string, number, array, or undefined)
 * into a positive-number array, doubling odd-length lists per the SVG spec.
 * @param value Raw dasharray value from an SVG attribute or caller input.
 * @returns Even-length array of positive numbers (empty for undefined/`''`).
 */
export function convertToDashArray(value) {
    let dashArray = [];
    if (value === '' || value === undefined)
        return dashArray;
    if (isNumber(value)) {
        if (!isPositiveNumber(value)) {
            throw new Error(`Expected positive number for stroke-dasharray value, got ${value}.`);
        }
        dashArray = [value];
    }
    else if (isString(value)) {
        dashArray = value.split(' ').map(_el => {
            const el = Number.parseFloat(_el);
            if (!isPositiveNumber(el)) {
                throw new Error(`Expected positive number for stroke-dasharray value, got ${el} from string "${_el}".`);
            }
            return el;
        });
    }
    else if (isArray(value)) {
        for (let i = 0, len = value.length; i < len; i++) {
            const el = value[i];
            if (!isPositiveNumber(el)) {
                throw new Error(`Expected positive number for stroke-dasharray value, got ${el} from array ${JSON.stringify(value)}.`);
            }
            dashArray.push(el);
        }
    }
    else {
        throw new Error(`Invalid type ${typeof value} for stroke-dasharray property ${value}.`);
    }
    if (dashArray.length % 2 === 1) {
        // Odd length dash arrays should be repeated. 
        dashArray = [...dashArray, ...dashArray];
    }
    return dashArray;
}
//# sourceMappingURL=utils.js.map