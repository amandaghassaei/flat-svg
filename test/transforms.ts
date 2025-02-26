import { expect } from 'chai';
import type { TransformParsed } from '../src/types';
import {
	parseTransformString,
	dotTransforms,
	applyTransform,
	initIdentityTransform,
	flattenTransformArray,
	transformToString,
} from '../src/transforms';

const IDENTITY = {
  a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
};
const ZERO = {
  a: 0, b: 0, c: 0, d: 0, e: 0, f: 0,
};

function expectTransformsRoughlyDeepEqual(a: TransformParsed, b: TransformParsed) {
  // This should not be necessary when chai 5 comes out:
  // https://github.com/chaijs/chai/issues/644
  expect(Object.keys(a)).to.have.members(Object.keys(b));
  expect(Object.keys(a).length).to.equal(Object.keys(b).length);
  const numericKeys: (keyof TransformParsed)[] = ['a', 'b', 'c', 'd', 'e', 'f'];
  numericKeys.forEach(key => {
    expect(a[key]).to.not.equal(undefined);
    expect(b[key]).to.not.equal(undefined);
    expect(a[key]).to.be.closeTo(b[key] as number, 1e-6);
  });
  expect(a.warnings).to.deep.equal(b.warnings);
  expect(a.errors).to.deep.equal(b.errors);
}

function expectTransformArraysRoughlyDeepEqual(a: TransformParsed[], b: TransformParsed[]) {
  expect(a.length).to.equal(b.length);
  for (let i = 0; i < a.length; i++) {
    expectTransformsRoughlyDeepEqual(a[i], b[i]);
  }
}

describe('Transforms', () => {

  describe('parseTransformString()', () => {
    // https://www.w3.org/TR/SVG11/coords.html#TransformAttribute

    it('should return empty array when transform string is empty', () => {
      expect(parseTransformString('')).to.deep.equal([]);
    });

    it('should return empty array when transform string is whitespace', () => {
      expect(parseTransformString(' ')).to.deep.equal([]);
      expect(parseTransformString('\n')).to.deep.equal([]);
      expect(parseTransformString('\t')).to.deep.equal([]);
      expect(parseTransformString('  \n\n\t\t')).to.deep.equal([]);
    });

    // TRANSLATE

    it('should parse translation with one parameter as translations in x', () => {
      expect(parseTransformString('translate(20)')).to.deep.equal([{ ...IDENTITY, e: 20 }]);
      expect(parseTransformString('translate(0)')).to.deep.equal([IDENTITY]);
    });

    it('should parse translation with two parameters', () => {
      expect(parseTransformString('translate(20,-50)')).to.deep.equal([{ ...IDENTITY, e: 20, f: -50 }]);
      expect(parseTransformString('translate(-4.3,0.001)')).to.deep.equal([{ ...IDENTITY, e: -4.3, f: 0.001 }]);
      expect(parseTransformString('translate(-4.3 0.001)')).to.deep.equal([{ ...IDENTITY, e: -4.3, f: 0.001 }]);
      expect(parseTransformString('translate(0,0)')).to.deep.equal([IDENTITY]);
    });

    it('should ignore null translation', () => {
      expect(parseTransformString('translate()')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with malformed transform: "translate()" containing 0 parameters, expected 1 or 2 parameters.'
      ]}]);
      expect(parseTransformString('translate( )')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with malformed transform: "translate( )" containing 0 parameters, expected 1 or 2 parameters.'
      ]}]);
      expect(parseTransformString('translate(,)')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "translate(,)", transform parameters must be finite numbers.'
      ]}]);
      expect(parseTransformString('translate(,4)')).to.deep.equal([{ ...IDENTITY, f:4, warnings: [
        'Found element with invalid transform: "translate(,4)", transform parameters must be finite numbers.'
      ]}]);
      expect(parseTransformString('translate(null)')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "translate(null)", transform parameters must be finite numbers.'
      ]}]);
      expect(parseTransformString('translate(null,null)')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "translate(null,null)", transform parameters must be finite numbers.'
      ]}]);
      expect(parseTransformString('translate(NaN)')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "translate(NaN)", transform parameters must be finite numbers.'
      ]}]);
      expect(parseTransformString('translate(NaN,NaN)')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "translate(NaN,NaN)", transform parameters must be finite numbers.'
      ]}]);
	  // Prints tagname in error statement.
	  expect(parseTransformString('translate( )', 'rect')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found rect element with malformed transform: "translate( )" containing 0 parameters, expected 1 or 2 parameters.'
	  ]}]);
	  expect(parseTransformString('translate(NaN,NaN)', 'rect')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found rect element with invalid transform: "translate(NaN,NaN)", transform parameters must be finite numbers.'
      ]}]);
    });

    it('should ignore infinite translation', () => {
      expect(parseTransformString('translate(Infinity)')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "translate(Infinity)", transform parameters must be finite numbers.'
      ]}]);
      expect(parseTransformString('translate(Infinity,Infinity)')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "translate(Infinity,Infinity)", transform parameters must be finite numbers.'
      ]}]);
      expect(parseTransformString('translate(Infinity,-Infinity)')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "translate(Infinity,-Infinity)", transform parameters must be finite numbers.'
      ]}]);
    });

    it('should ignore extra parameters in translation', () => {
      expect(parseTransformString('translate(-4.3,0.001,5.6)')).to.deep.equal([{ ...IDENTITY, e: -4.3, f: 0.001,  warnings: [
        'Found element with malformed transform: "translate(-4.3,0.001,5.6)" containing 3 parameters, expected 1 or 2 parameters.'
      ]}]);
      expect(parseTransformString('translate(-4.3,0.001,5.6,47,23.5)')).to.deep.equal([{ ...IDENTITY, e: -4.3, f: 0.001,  warnings: [
        'Found element with malformed transform: "translate(-4.3,0.001,5.6,47,23.5)" containing 5 parameters, expected 1 or 2 parameters.'
      ]}]);
    });

    // SCALE

    it('should parse scale with one parameter as uniform scale in x and y', () => {
      expect(parseTransformString('scale(20)')).to.deep.equal([{ ...IDENTITY, a: 20, d: 20 }]);
      expect(parseTransformString('scale(0)')).to.deep.equal([{ ...IDENTITY, a: 0, d: 0 }]);
      expect(parseTransformString('scale(1)')).to.deep.equal([IDENTITY]);
    });

    it('should parse scale with two parameters', () => {
      expect(parseTransformString('scale(20,-50)')).to.deep.equal([{ ...IDENTITY, a: 20, d: -50 }]);
      expect(parseTransformString('scale(-4.3,0.001)')).to.deep.equal([{ ...IDENTITY, a: -4.3, d: 0.001 }]);
      expect(parseTransformString('scale(-4.3 0.001)')).to.deep.equal([{ ...IDENTITY, a: -4.3, d: 0.001 }]);
      expect(parseTransformString('scale(0,0)')).to.deep.equal([{ ...IDENTITY, a: 0, d: 0 }]);
      expect(parseTransformString('scale(1,1)')).to.deep.equal([IDENTITY]);
    });

    it('should ignore null scale', () => {
      expect(parseTransformString('scale()')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with malformed transform: "scale()" containing 0 parameters, expected 1 or 2 parameters.'
      ]}]);
      expect(parseTransformString('scale( )')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with malformed transform: "scale( )" containing 0 parameters, expected 1 or 2 parameters.'
      ]}]);
      expect(parseTransformString('scale(,)')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "scale(,)", transform parameters must be finite numbers.'
      ]}]);
      expect(parseTransformString('scale(,4)')).to.deep.equal([{ ...IDENTITY, d: 4, warnings: [
        'Found element with invalid transform: "scale(,4)", transform parameters must be finite numbers.'
      ]}]);
      expect(parseTransformString('scale(null)')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "scale(null)", transform parameters must be finite numbers.'
      ]}]);
      expect(parseTransformString('scale(null,null)')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "scale(null,null)", transform parameters must be finite numbers.'
      ]}]);
      expect(parseTransformString('scale(NaN)')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "scale(NaN)", transform parameters must be finite numbers.'
      ]}]);
      expect(parseTransformString('scale(NaN,NaN)')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "scale(NaN,NaN)", transform parameters must be finite numbers.'
      ]}]);
    });

    it('should ignore infinite scale', () => {
      expect(parseTransformString('scale(Infinity)')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "scale(Infinity)", transform parameters must be finite numbers.'
      ]}]);
      expect(parseTransformString('scale(Infinity,Infinity)')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "scale(Infinity,Infinity)", transform parameters must be finite numbers.'
      ]}]);
      expect(parseTransformString('scale(Infinity,-Infinity)')).to.deep.equal([{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "scale(Infinity,-Infinity)", transform parameters must be finite numbers.'
      ]}]);
    });

    it('should ignore extra parameters in scale', () => {
      expect(parseTransformString('scale(-4.3,0.001,5.6)')).to.deep.equal([{ ...IDENTITY, a: -4.3, d: 0.001,  warnings: [
        'Found element with malformed transform: "scale(-4.3,0.001,5.6)" containing 3 parameters, expected 1 or 2 parameters.'
      ]}]);
      expect(parseTransformString('scale(-4.3,0.001,5.6,47,23.5)')).to.deep.equal([{ ...IDENTITY, a: -4.3, d: 0.001,  warnings: [
        'Found element with malformed transform: "scale(-4.3,0.001,5.6,47,23.5)" containing 5 parameters, expected 1 or 2 parameters.'
      ]}]);
    });

    // ROTATE

    it('should parse rotate with one parameter as rotation around the origin', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate(90)'), [{ ...IDENTITY, a: 0, b: 1, c: -1, d: 0}]);
      expect(parseTransformString('rotate(254.87)')).to.deep.equal(parseTransformString('rotate(254.87,0,0)'));
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate(0)'), [IDENTITY]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate(-360)'), [IDENTITY]);
    });

    it('should parse rotate with three parameters', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate(20,-50,10.5)'), [{ ...IDENTITY,
        a: 0.9396926207859084,
        b: 0.3420201433256687,
        c: -0.3420201433256687,
        d: 0.9396926207859084,
        e: 0.5758425442149431,
        f: 17.734234648031396,
      }]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate(20 -50 10.5)'), [{ ...IDENTITY,
        a: 0.9396926207859084,
        b: 0.3420201433256687,
        c: -0.3420201433256687,
        d: 0.9396926207859084,
        e: 0.5758425442149431,
        f: 17.734234648031396,
      }]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate(0,0,0)'), [IDENTITY]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate(0,1,1)'), [IDENTITY]);
    });

    it('should ignore null rotate parameters', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate()'), [{ ...IDENTITY,  warnings: [
        'Found element with malformed transform: "rotate()" containing 0 parameters, expected 1 or 3 parameters.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate( )'), [{ ...IDENTITY,  warnings: [
        'Found element with malformed transform: "rotate( )" containing 0 parameters, expected 1 or 3 parameters.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate(,,)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "rotate(,,)", transform parameters must be finite numbers.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate(,4,)'), [{ ...IDENTITY, warnings: [
        'Found element with invalid transform: "rotate(,4,)", transform parameters must be finite numbers.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate(null)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "rotate(null)", transform parameters must be finite numbers.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate(null,null,null)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "rotate(null,null,null)", transform parameters must be finite numbers.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate(NaN)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "rotate(NaN)", transform parameters must be finite numbers.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate(NaN,NaN,NaN)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "rotate(NaN,NaN,NaN)", transform parameters must be finite numbers.'
      ]}]);
    });

    it('should ignore infinite rotate', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate(Infinity)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "rotate(Infinity)", transform parameters must be finite numbers.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate(Infinity,Infinity,Infinity)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "rotate(Infinity,Infinity,Infinity)", transform parameters must be finite numbers.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate(-Infinity,-Infinity,-Infinity)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "rotate(-Infinity,-Infinity,-Infinity)", transform parameters must be finite numbers.'
      ]}]);
    });

    it('should ignore extra parameters in rotate', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate(0,0,0,5.6)'), [{ ...IDENTITY, warnings: [
        'Found element with malformed transform: "rotate(0,0,0,5.6)" containing 4 parameters, expected 1 or 3 parameters.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate(0,0,0,5.6,-24.5,0.43)'), [{ ...IDENTITY, warnings: [
        'Found element with malformed transform: "rotate(0,0,0,5.6,-24.5,0.43)" containing 6 parameters, expected 1 or 3 parameters.'
      ]}]);
    });

    // SKEWX

    it('should parse skewX with one parameter', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewX(45)'), [{ ...IDENTITY, c: Math.tan(Math.PI / 4)}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewX(0)'), [IDENTITY]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewX(-360)'), [IDENTITY]);
    });

    it('should ignore null skewX parameters', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewX()'), [{ ...IDENTITY,  warnings: [
        'Found element with malformed transform: "skewX()" containing 0 parameters, expected 1 parameter.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewX( )'), [{ ...IDENTITY,  warnings: [
        'Found element with malformed transform: "skewX( )" containing 0 parameters, expected 1 parameter.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewX(null)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "skewX(null)", transform parameters must be finite numbers.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewX(NaN)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "skewX(NaN)", transform parameters must be finite numbers.'
      ]}]);
    });

    it('should ignore infinite skewX', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewX(Infinity)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "skewX(Infinity)", transform parameters must be finite numbers.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewX(-Infinity)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "skewX(-Infinity)", transform parameters must be finite numbers.'
      ]}]);
    });

    it('should ignore extra parameters in skewX', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewX(0,0,0,5.6)'), [{ ...IDENTITY, warnings: [
        'Found element with malformed transform: "skewX(0,0,0,5.6)" containing 4 parameters, expected 1 parameter.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewX(0,0,0,5.6,-24.5,0.43)'), [{ ...IDENTITY, warnings: [
        'Found element with malformed transform: "skewX(0,0,0,5.6,-24.5,0.43)" containing 6 parameters, expected 1 parameter.'
      ]}]);
    });

    // SKEWY

    it('should parse skewY with one parameter', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewY(45)'), [{ ...IDENTITY, b: Math.tan(Math.PI / 4)}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewY(0)'), [IDENTITY]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewY(-360)'), [IDENTITY]);
    });

    it('should ignore null skewY parameters', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewY()'), [{ ...IDENTITY,  warnings: [
        'Found element with malformed transform: "skewY()" containing 0 parameters, expected 1 parameter.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewY( )'), [{ ...IDENTITY,  warnings: [
        'Found element with malformed transform: "skewY( )" containing 0 parameters, expected 1 parameter.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewY(null)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "skewY(null)", transform parameters must be finite numbers.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewY(NaN)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "skewY(NaN)", transform parameters must be finite numbers.'
      ]}]);
    });

    it('should ignore infinite skewY', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewY(Infinity)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "skewY(Infinity)", transform parameters must be finite numbers.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewY(-Infinity)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "skewY(-Infinity)", transform parameters must be finite numbers.'
      ]}]);
    });

    it('should ignore extra parameters in skewY', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewY(0,0,0,5.6)'), [{ ...IDENTITY, warnings: [
        'Found element with malformed transform: "skewY(0,0,0,5.6)" containing 4 parameters, expected 1 parameter.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewY(0,0,0,5.6,-24.5,0.43)'), [{ ...IDENTITY, warnings: [
        'Found element with malformed transform: "skewY(0,0,0,5.6,-24.5,0.43)" containing 6 parameters, expected 1 parameter.'
      ]}]);
    });

    // MATRIX

    it('should parse matrix with six parameters', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('matrix(3.4,-6,2.4,0.005,-75,21)'),
        [{ a: 3.4, b: -6, c: 2.4, d: 0.005, e: -75, f: 21 }]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('matrix(0,0,0,0,0,0)'),
        [{ a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 }]);
    });

    it('should ignore null matrix parameters', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('matrix()'), [{ ...IDENTITY,  warnings: [
        'Found element with malformed transform: "matrix()" containing 0 parameters, expected 6 parameters.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('matrix( )'), [{ ...IDENTITY,  warnings: [
        'Found element with malformed transform: "matrix( )" containing 0 parameters, expected 6 parameters.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('matrix(,,,,,)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "matrix(,,,,,)", transform parameters must be finite numbers.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('matrix(,4,,,,)'), [{ ...IDENTITY, b: 4, warnings: [
        'Found element with invalid transform: "matrix(,4,,,,)", transform parameters must be finite numbers.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('matrix(null,null,null,null,null,null)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "matrix(null,null,null,null,null,null)", transform parameters must be finite numbers.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('matrix(NaN,NaN,NaN,NaN,NaN,NaN)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "matrix(NaN,NaN,NaN,NaN,NaN,NaN)", transform parameters must be finite numbers.'
      ]}]);
    });

    it('should ignore infinite matrix', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('matrix(Infinity,Infinity,Infinity,Infinity,Infinity,Infinity)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "matrix(Infinity,Infinity,Infinity,Infinity,Infinity,Infinity)", transform parameters must be finite numbers.'
      ]}]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('matrix(-Infinity,-Infinity,-Infinity,-Infinity,-Infinity,-Infinity)'), [{ ...IDENTITY,  warnings: [
        'Found element with invalid transform: "matrix(-Infinity,-Infinity,-Infinity,-Infinity,-Infinity,-Infinity)", transform parameters must be finite numbers.'
      ]}]);
    });

    it('should ignore extra parameters in matrix', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('matrix(0,0,0,0,0,0,5.6)'), [{ ...IDENTITY, a: 0, d: 0, warnings: [
        'Found element with malformed transform: "matrix(0,0,0,0,0,0,5.6)" containing 7 parameters, expected 6 parameters.'
      ]}]);
    });

    // OTHER EDGE CASES

    it('should handle missing/extra zeros in float values', () => {
      expect(parseTransformString('translate(-004.03000,.001)')).to.deep.equal([{ ...IDENTITY, e: -4.03, f: 0.001 }]);
    });

    it('should handle extraneous +/- signs in parameter values', () => {
      expect(parseTransformString('translate(+65.8,-0)')).to.deep.equal([{ ...IDENTITY, e: 65.8 }]);
    });

    it('should strip units in float values', () => {
      expect(parseTransformString('translate(-4.3px,0.001px)')).to.deep.equal([{ ...IDENTITY, e: -4.3, f: 0.001 }]);
      expect(parseTransformString('translate(-4.3in,0.001in)')).to.deep.equal([{ ...IDENTITY, e: -4.3, f: 0.001 }]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate(360rad)'), [IDENTITY]);
    });

    it('should handle whitespace between parameters', () => {
      expect(parseTransformString('translate(20.4, -50)')).to.deep.equal([{ ...IDENTITY, e: 20.4, f: -50 }]);
      expect(parseTransformString('translate(20.4  -50)')).to.deep.equal([{ ...IDENTITY, e: 20.4, f: -50 }]);
      expect(parseTransformString('  translate\t\t ( \n20.4 ,   -50 \t) \n')).to.deep.equal([{ ...IDENTITY, e: 20.4, f: -50 }]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('rotate ( 360 , \t,  0\n\n)'), [{ ...IDENTITY, warnings: [
        'Found element with invalid transform: "rotate ( 360 , \t,  0\n\n)", transform parameters must be finite numbers.'
      ]}]);
    });

    it('should handle capitalization issues', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('skewy(45)'), [{ ...IDENTITY, b: Math.tan(Math.PI / 4)}]);
      expect(parseTransformString('TRANSLATE(20.4, -50)')).to.deep.equal([{ ...IDENTITY, e: 20.4, f: -50 }]);
    });

    it('should notify of badly formed arguments', () => {
      expect(parseTransformString('translate(20.4, -50')).to.deep.equal([{ ...IDENTITY, errors: ['Malformed transform, unmatched characters: [ "translate(20.4, -50" ].'] }]);
      expect(parseTransformString('translate(20.4, -50 rotate(34)')).to.deep.equal([{ ...IDENTITY, errors: ['Malformed transform: "translate(20.4, -50 rotate(34)".'] }]);
      expect(parseTransformString('translate(20.4, -50) --- rotate(34)')).to.deep.equal([
        { a: 1, b: 0, c: 0, d: 1, e: 20.4, f: -50 },
        { a: 0.8290375725550416, b: 0.5591929034707469, c: -0.5591929034707469, d: 0.8290375725550416, e: 0, f: 0 },
        { ...IDENTITY, errors: ['Malformed transform, unmatched characters: [ "---" ].'] },
      ]);
    });

    // CHAINING TRANSFORMS

    it('should chain transforms', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('translate(-004.03000,.001),matrix(3.4,-6,2.4,0.005,-75,21),skewX(0)'),
        [{ ...IDENTITY, e: -4.03, f: 0.001 }, { a: 3.4, b: -6, c: 2.4, d: 0.005, e: -75, f: 21 }, IDENTITY]);
    });

    it('should handle whitespace between transforms', () => {
      expectTransformArraysRoughlyDeepEqual(parseTransformString('translate(-004.03000,.001), matrix(3.4,-6,2.4,0.005,-75,21), skewX(0) '),
        [{ ...IDENTITY, e: -4.03, f: 0.001 }, { a: 3.4, b: -6, c: 2.4, d: 0.005, e: -75, f: 21 }, IDENTITY]);
      expectTransformArraysRoughlyDeepEqual(parseTransformString('translate(-004.03000,.001)  matrix(3.4,-6,2.4,0.005,-75,21) \n\nskewX(0) '),
        [{ ...IDENTITY, e: -4.03, f: 0.001 }, { a: 3.4, b: -6, c: 2.4, d: 0.005, e: -75, f: 21 }, IDENTITY]);
    });
  });

  describe('dotTransforms()', () => {
    const t1 = { a: 3.4, b: -6, c: 2.4, d: 0.005, e: -75, f: 21 };
    const t2 = { a: 0.4, b: 23.21, c: -32.4, d: -56, e: 273.6, f: 0.002 };

    it('should dot two transforms and update the first argument', () => {
      expect(dotTransforms(JSON.parse(JSON.stringify(t1)), t2))
        .to.deep.equal({
          a: 57.064,
          b: -2.2839500000000004,
          c: -244.56,
          d: 194.11999999999998,
          e: 855.2448,
          f: -1620.5999900000002
        });

      // Dotting with identity results in no change.
      expect(dotTransforms(JSON.parse(JSON.stringify(t1)), IDENTITY))
        .to.deep.equal(t1);

      // Applying transform to zero does nothing.
      expect(dotTransforms(JSON.parse(JSON.stringify(ZERO)), t1))
        .to.deep.equal(ZERO);
    });

    it('should not modify the second argument', () => {
      const t2Copy = JSON.parse(JSON.stringify(t2));
      dotTransforms(JSON.parse(JSON.stringify(t1)), t2);
      expect(t2).to.deep.equal(t2Copy);
    });
  });

  describe('applyTransform()', () => {
    const t1 = { a: 3.4, b: -6, c: 2.4, d: 0.005, e: -75, f: 21 };
    const p1 = [3.66, -43];

    it('should transform a 2D point in place', () => {
      expect(applyTransform(p1.slice() as [number, number], t1)).to.deep.equal([ -165.756, -1.1750000000000007 ]);

      // Dotting with identity results in no change.
      expect(applyTransform(p1.slice() as [number, number], IDENTITY)).to.deep.equal(p1);

      // Applying transform to zero only applies translation.
      expect(applyTransform([0, 0], t1)).to.deep.equal([t1.e, t1.f]);
    });
    
    it('should not modify the second argument', () => {
      const t1Copy = JSON.parse(JSON.stringify(t1));
      applyTransform(p1 as [number, number], t1Copy);
      expect(t1).to.deep.equal(t1Copy);
    });
  });

  describe('initIdentityTransform()', () => {
    it('should init identity transform', () => {
      expect(initIdentityTransform()).to.deep.equal(IDENTITY);
    });
  });

  describe('flattenTransformArray()', () => {
    it('should flatten transform array to a single transform', () => {
      const rotationAroundAPoint = parseTransformString('rotate(35.6, 24, -0.54)');
      const rotationAndTranslation = parseTransformString('translate(24,-0.54),rotate(35.6),translate(-24,0.54),');
      expect(rotationAroundAPoint.length).to.equal(1);
      expect(rotationAndTranslation.length).to.equal(3);
      expectTransformsRoughlyDeepEqual(
        flattenTransformArray(rotationAndTranslation),
        rotationAroundAPoint[0],
      );
    });

    it('should not modify elements of transform array', () => {
      const array = parseTransformString('translate(24,-0.54),rotate(35.6),translate(-24,0.54),');
      const arrayCopy = JSON.parse(JSON.stringify(array));
      flattenTransformArray(array);
      expect(array).to.deep.equal(arrayCopy);
    });

	it('transformToString()', () => {
		const transform = parseTransformString('matrix( 3.4, -6, 2.4, 0.005, -75, 21 )');
		expect(transformToString(transform[0])).to.equal('matrix(3.4 -6 2.4 0.005 -75 21)');
	});
  });
});