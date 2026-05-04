import { FlatSVGTransform } from './types-public';
import { MutablePoint, TransformParsed } from './types-private';
/**
 * Build a fresh identity matrix `{a:1, b:0, c:0, d:1, e:0, f:0}`.
 * @returns A new FlatSVGTransform set to identity.
 */
export declare function initIdentityTransform(): FlatSVGTransform;
/**
 * Parse an SVG `transform` attribute string into an ordered list of matrices.
 * Hand-rolled (rather than svgpath's parser) so per-transform warnings can be
 * surfaced. Spec: https://www.w3.org/TR/SVG11/coords.html#TransformAttribute
 * @param string Raw transform attribute value (e.g. `"translate(1,2) rotate(45)"`).
 * @param tagName Optional element tag name, included in warning messages.
 * @returns Array of parsed transforms in source order; malformed entries carry `warnings`.
 */
export declare function parseTransformString(string: string, tagName?: string): TransformParsed[];
/**
 * Compose a list of transforms into a single matrix by left-to-right
 * multiplication. Does not modify the input array or its elements.
 * @param transforms Ordered list of FlatSVGTransform to compose.
 * @returns A new FlatSVGTransform equal to `t[0] · t[1] · ... · t[n-1]`.
 */
export declare function flattenTransformArray(transforms: FlatSVGTransform[]): FlatSVGTransform;
/**
 * Matrix-multiply `t2` into `t1` in place. The return value and `t1` reference
 * the same object after the call.
 * @param t1 Left operand — mutated to hold the product.
 * @param t2 Right operand — read only.
 * @returns The mutated `t1`.
 */
export declare function dotTransforms(t1: FlatSVGTransform, t2: FlatSVGTransform): FlatSVGTransform;
/**
 * Apply a transform to a 2D point in place.
 * @param p Mutable [x, y] tuple — coordinates are overwritten with the result.
 * @param t Transform to apply.
 * @returns The mutated `p`.
 */
export declare function applyTransform(p: MutablePoint, t: FlatSVGTransform): MutablePoint;
/**
 * Shallow-copy the 6 matrix fields of a transform. Discards any extra keys
 * (e.g. `warnings` on a TransformParsed) — copy those explicitly if needed.
 * @param t Source transform.
 * @returns A new FlatSVGTransform with matching a/b/c/d/e/f.
 */
export declare function copyTransform(t: FlatSVGTransform): FlatSVGTransform;
/**
 * Serialize a transform to SVG `matrix(a b c d e f)` form.
 * @param t Transform to serialize.
 * @returns String of the form `matrix(a b c d e f)`.
 */
export declare function transformToString(t: FlatSVGTransform): string;
