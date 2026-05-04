import { FlatSVGTransform } from './types-public';
import { MutablePoint, TransformParsed } from './types-private';
import { removeWhitespacePadding } from './utils';

/**
 * Build a fresh identity matrix `{a:1, b:0, c:0, d:1, e:0, f:0}`.
 * @returns A new FlatSVGTransform set to identity.
 */
export function initIdentityTransform() {
    const transform: FlatSVGTransform = {
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        e: 0,
        f: 0,
    };
    return transform;
}

/**
 * Parse an SVG `transform` attribute string into an ordered list of matrices.
 * Hand-rolled (rather than svgpath's parser) so per-transform warnings can be
 * surfaced. Spec: https://www.w3.org/TR/SVG11/coords.html#TransformAttribute
 * @param string Raw transform attribute value (e.g. `"translate(1,2) rotate(45)"`).
 * @param tagName Optional element tag name, included in warning messages.
 * @returns Array of parsed transforms in source order; malformed entries carry `warnings`.
 */
export function parseTransformString(string: string, tagName?: string) {
    const transformStrings = string.match(
        /(translate|matrix|rotate|skewX|skewY|scale)\s*\(\s*(.*?)\s*\)/gi
    );
    const unusedCharacters: string[] = [string.slice()]; // Place to store any characters in transform that were missed.
    const transforms: TransformParsed[] = [];
    if (transformStrings) {
        // Loop through all transforms (many may be chained together e.g. "translate(1, 45) rotate(56)").
        for (let i = 0; i < transformStrings.length; i++) {
            const transform = initIdentityTransform() as TransformParsed; // Init identity transform to start.
            const transformString = transformStrings[i]; // FlatSVGTransform as a string.

            // Keep track of what hasn't been matched.
            const lastString = unusedCharacters.pop()!;
            const matchIndex = lastString.indexOf(transformString);
            unusedCharacters.push(
                lastString.slice(0, matchIndex),
                lastString.slice(matchIndex + transformString.length)
            );

            // Split transform into components: transform name and parameters.
            const transformComponents = transformString.split(/[\(\)]+/);
            if (transformComponents.length > 2) transformComponents.pop(); // Remove empty string at the end of split.
            if (transformComponents.length !== 2) {
                transform.warnings = [`Malformed transform: "${transformString}".`];
                transforms.push(transform);
                continue;
            }
            const transformName = removeWhitespacePadding(transformComponents[0]).toLowerCase();
            // First try splitting by commas.
            let params = removeWhitespacePadding(transformComponents[1]).split(',');
            // Then split by spaces if commas not found.
            if (params.length === 1) params = params[0].split(/\s+/);
            // Convert parameters to float.
            const floatParams: number[] = [];
            for (let j = 0; j < params.length; j++) {
                const param = params[j];
                floatParams.push(parseFloat(param));
                // Remove infinity cases.
                if (floatParams[j] === Infinity || floatParams[j] === -Infinity) {
                    floatParams[j] = NaN;
                }
            }
            let expectedNumParameters: number[] = [];
            switch (transformName) {
                case 'translate':
                    // translate(<tx> [<ty>]) — ty defaults to 0.
                    expectedNumParameters = [1, 2];
                    transform.e = floatParams[0] || 0;
                    transform.f = floatParams[1] || 0;
                    break;
                case 'scale':
                    // scale(<sx> [<sy>]) — sy defaults to sx.
                    expectedNumParameters = [1, 2];
                    // Default 1; allow explicit 0 through.
                    transform.a = floatParams[0] === 0 ? 0 : floatParams[0] || 1;
                    transform.d = floatParams[1] === 0 ? 0 : floatParams[1] || transform.a;
                    break;
                case 'rotate': {
                    // rotate(<angle-deg> [<cx> <cy>]) — angle in degrees, optional pivot defaults to origin.
                    expectedNumParameters = [1, 3];
                    const a = ((floatParams[0] || 0) * Math.PI) / 180;
                    if (a !== 0) {
                        const x = floatParams[1] || 0;
                        const y = floatParams[2] || 0;
                        const cosA = Math.cos(a);
                        const sinA = Math.sin(a);
                        transform.a = cosA;
                        transform.b = sinA;
                        transform.c = -sinA;
                        transform.d = cosA;
                        transform.e = -x * cosA + y * sinA + x;
                        transform.f = -x * sinA - y * cosA + y;
                    }
                    break;
                }
                case 'skewx': {
                    // skewX(<angle-deg>)
                    expectedNumParameters = [1];
                    const a = ((floatParams[0] || 0) * Math.PI) / 180;
                    if (a !== 0) transform.c = Math.tan(a);
                    break;
                }
                case 'skewy': {
                    // skewY(<angle-deg>)
                    expectedNumParameters = [1];
                    const a = ((floatParams[0] || 0) * Math.PI) / 180;
                    if (a !== 0) transform.b = Math.tan(a);
                    break;
                }
                case 'matrix':
                    // matrix(<a> <b> <c> <d> <e> <f>)
                    expectedNumParameters = [6];
                    // Default 1 for a/d; allow explicit 0 through.
                    transform.a = floatParams[0] === 0 ? 0 : floatParams[0] || 1;
                    transform.b = floatParams[1] || 0;
                    transform.c = floatParams[2] || 0;
                    transform.d = floatParams[3] === 0 ? 0 : floatParams[3] || 1;
                    transform.e = floatParams[4] || 0;
                    transform.f = floatParams[5] || 0;
                    break;
                /* c8 ignore start -- defensive: unreachable per the regex at the top of this function, which only captures
                   (translate|matrix|rotate|skewX|skewY|scale). After .toLowerCase() every captured name maps to one of the
                   six switch cases above. Kept as a guard in case the regex ever expands to accept more transform names. */
                default:
                    transform.warnings = [`Unknown transform ${transformName}.`];
                    break;
                /* c8 ignore stop */
            }
            // Add warnings if necessary.
            const warnings: string[] = [];
            // Check that correct number of params supplied.
            let numParams = params.length;
            if (numParams === 1 && params[0] === '') {
                numParams = 0;
            }
            if (expectedNumParameters.indexOf(numParams) < 0) {
                warnings.push(
                    `Found ${
                        tagName ? `${tagName} ` : ''
                    }element with malformed transform: "${transformString}" containing ${numParams} parameters, expected ${expectedNumParameters.join(
                        ' or '
                    )} parameter${
                        expectedNumParameters[expectedNumParameters.length - 1] > 1 ? 's' : ''
                    }.`
                );
            } else {
                // Check if any params are invalid.
                for (let j = 0; j < floatParams.length; j++) {
                    if (isNaN(floatParams[j])) {
                        warnings.push(
                            `Found ${
                                tagName ? `${tagName} ` : ''
                            }element with invalid transform: "${transformString}", transform parameters must be finite numbers.`
                        );
                        break;
                    }
                }
            }
            // Attach warning to transform.
            if (warnings.length) transform.warnings = warnings;
            transforms.push(transform);
        }
    }
    // Check if anything was missed:
    for (let i = unusedCharacters.length - 1; i >= 0; i--) {
        unusedCharacters[i] = removeWhitespacePadding(unusedCharacters[i]);
        if (unusedCharacters[i] === '' || unusedCharacters[i] === ',')
            unusedCharacters.splice(i, 1);
    }
    if (unusedCharacters.length) {
        const transform = initIdentityTransform() as TransformParsed;
        transform.warnings = [
            `Malformed transform, unmatched characters: [ ${unusedCharacters
                .map((str) => `"${str}"`)
                .join(', ')} ].`,
        ];
        transforms.push(transform);
    }
    return transforms;
}

/**
 * Compose a list of transforms into a single matrix by left-to-right
 * multiplication. Does not modify the input array or its elements.
 * @param transforms Ordered list of FlatSVGTransform to compose.
 * @returns A new FlatSVGTransform equal to `t[0] · t[1] · ... · t[n-1]`.
 */
export function flattenTransformArray(transforms: FlatSVGTransform[]) {
    // Flatten transforms to a single matrix.
    const transform = copyTransform(transforms[0]);
    for (let i = 1; i < transforms.length; i++) {
        dotTransforms(transform, transforms[i]);
    }
    return transform;
}

/**
 * Matrix-multiply `t2` into `t1` in place. The return value and `t1` reference
 * the same object after the call.
 * @param t1 Left operand — mutated to hold the product.
 * @param t2 Right operand — read only.
 * @returns The mutated `t1`.
 */
export function dotTransforms(t1: FlatSVGTransform, t2: FlatSVGTransform) {
    const a = t1.a * t2.a + t1.c * t2.b;
    const b = t1.b * t2.a + t1.d * t2.b;
    const c = t1.a * t2.c + t1.c * t2.d;
    const d = t1.b * t2.c + t1.d * t2.d;
    const e = t1.a * t2.e + t1.c * t2.f + t1.e;
    const f = t1.b * t2.e + t1.d * t2.f + t1.f;
    // Modify t1 in place.
    t1.a = a;
    t1.b = b;
    t1.c = c;
    t1.d = d;
    t1.e = e;
    t1.f = f;
    return t1;
}

/**
 * Apply a transform to a 2D point in place.
 * @param p Mutable [x, y] tuple — coordinates are overwritten with the result.
 * @param t Transform to apply.
 * @returns The mutated `p`.
 */
export function applyTransform(p: MutablePoint, t: FlatSVGTransform) {
    const x = t.a * p[0] + t.c * p[1] + t.e;
    const y = t.b * p[0] + t.d * p[1] + t.f;
    // Apply transform in place.
    p[0] = x;
    p[1] = y;
    return p;
}

/**
 * Shallow-copy the 6 matrix fields of a transform. Discards any extra keys
 * (e.g. `warnings` on a TransformParsed) — copy those explicitly if needed.
 * @param t Source transform.
 * @returns A new FlatSVGTransform with matching a/b/c/d/e/f.
 */
export function copyTransform(t: FlatSVGTransform) {
    return {
        a: t.a,
        b: t.b,
        c: t.c,
        d: t.d,
        e: t.e,
        f: t.f,
    } as FlatSVGTransform;
}

/**
 * Serialize a transform to SVG `matrix(a b c d e f)` form.
 * @param t Transform to serialize.
 * @returns String of the form `matrix(a b c d e f)`.
 */
export function transformToString(t: FlatSVGTransform) {
    return `matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.e} ${t.f})`;
}
