import { Transform, TransformParsed } from './types';
import { removeWhitespacePadding } from './utils';

export function initIdentityTransform() {
    const transform: Transform = {
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        e: 0,
        f: 0,
    };
    return transform;
}

// Parse transforms ourselves so we can attach errors and warnings for more feedback in ui.
// https://gist.github.com/petersirka/dfac415e1e1e4993af826c0ff706eb4d/
// https://github.com/fontello/svgpath/blob/master/lib/transform_parse.js
// https://www.w3.org/TR/SVG11/coords.html#TransformAttribute
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
            const transformString = transformStrings[i]; // Transform as a string.

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
                transform.errors = [`Malformed transform: "${transformString}".`];
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
                    // translate(<tx> [<ty>]), which specifies a translation by tx and ty. If <ty> is not provided, it is assumed to be zero.
                    expectedNumParameters = [1, 2];
                    transform.e = floatParams[0] || 0;
                    transform.f = floatParams[1] || 0;
                    break;
                case 'scale':
                    // scale(<sx> [<sy>]), which specifies a scale operation by sx and sy. If <sy> is not provided, it is assumed to be equal to <sx>.
                    expectedNumParameters = [1, 2];
                    // Default value of 1, but allow zero scale to pass through.
                    transform.a = floatParams[0] === 0 ? 0 : floatParams[0] || 1;
                    transform.d = floatParams[1] === 0 ? 0 : floatParams[1] || transform.a;
                    break;
                case 'rotate': {
                    // rotate(<rotate-angle> [<cx> <cy>]), which specifies a rotation by <rotate-angle> degrees about a given point.
                    // If optional parameters <cx> and <cy> are not supplied, the rotate is about the origin of the current user coordinate system.
                    // If optional parameters <cx> and <cy> are supplied, the rotate is about the point (cx, cy).
                    expectedNumParameters = [1, 3];
                    // Rotation angle is in degrees.
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
                    // skewX(<skew-angle>), which specifies a skew transformation along the x-axis.
                    expectedNumParameters = [1];
                    // Rotation angle is in degrees.
                    const a = ((floatParams[0] || 0) * Math.PI) / 180;
                    if (a !== 0) transform.c = Math.tan(a);
                    break;
                }
                case 'skewy': {
                    // skewY(<skew-angle>), which specifies a skew transformation along the y-axis.
                    expectedNumParameters = [1];
                    // Rotation angle is in degrees.
                    const a = ((floatParams[0] || 0) * Math.PI) / 180;
                    if (a !== 0) transform.b = Math.tan(a);
                    break;
                }
                case 'matrix':
                    // matrix(<a> <b> <c> <d> <e> <f>), which specifies a transformation in the form of a transformation matrix of six values.
                    expectedNumParameters = [6];
                    // For elements with default value of 1, allow zero to pass through.
                    transform.a = floatParams[0] === 0 ? 0 : floatParams[0] || 1;
                    transform.b = floatParams[1] || 0;
                    transform.c = floatParams[2] || 0;
                    transform.d = floatParams[3] === 0 ? 0 : floatParams[3] || 1;
                    transform.e = floatParams[4] || 0;
                    transform.f = floatParams[5] || 0;
                    break;
                /* c8 ignore next 5 */
                default:
                    // It should not be possible to hit this.
                    // Should be caught by regex at top of function, any invalid transforms go to unusedCharacters.
                    transform.errors = [`Unknown transform ${transformName}.`];
                    break;
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
        transform.errors = [
            `Malformed transform, unmatched characters: [ ${unusedCharacters
                .map((str) => `"${str}"`)
                .join(', ')} ].`,
        ];
        transforms.push(transform);
    }
    return transforms;
}

export function flattenTransformArray(transforms: Transform[]) {
    // Flatten transforms to a single matrix.
    const transform = copyTransform(transforms[0]);
    for (let i = 1; i < transforms.length; i++) {
        dotTransforms(transform, transforms[i]);
    }
    return transform;
}

export function dotTransforms(t1: Transform, t2: Transform) {
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

export function applyTransform(p: [number, number], t: Transform) {
    const x = t.a * p[0] + t.c * p[1] + t.e;
    const y = t.b * p[0] + t.d * p[1] + t.f;
    // Apply transform in place.
    p[0] = x;
    p[1] = y;
    return p;
}

export function copyTransform(t: Transform) {
    return {
        a: t.a,
        b: t.b,
        c: t.c,
        d: t.d,
        e: t.e,
        f: t.f,
    } as Transform;
}

export function transformToString(t: Transform) {
    return `matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.e} ${t.f})`;
}
