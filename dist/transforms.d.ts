import { Transform, TransformParsed } from './types';
export declare function initIdentityTransform(): Transform;
export declare function parseTransformString(string: string, tagName?: string): TransformParsed[];
export declare function flattenTransformArray(transforms: Transform[]): Transform;
export declare function dotTransforms(t1: Transform, t2: Transform): Transform;
export declare function applyTransform(p: [number, number], t: Transform): [number, number];
export declare function copyTransform(t: Transform): Transform;
export declare function transformToString(t: Transform): string;
