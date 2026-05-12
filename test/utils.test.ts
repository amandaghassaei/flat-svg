import { expect } from 'chai';
import {
	propertiesToAttributesString,
	removeWhitespacePadding,
	convertToDashArray,
	wrapWithSVGTag,
} from '../src/utils';
import type { SVGParserElementNode } from '../src/types-public';

const makeRoot = (properties: Record<string, string | number>): SVGParserElementNode =>
	({ type: 'element', tagName: 'svg', properties, children: [] }) as unknown as SVGParserElementNode;

describe('utils', () => {

	describe('removeWhitespacePadding', () => {
		it('strips leading whitespace', () => {
			expect(removeWhitespacePadding('   hello')).to.equal('hello');
		});

		it('strips trailing whitespace', () => {
			expect(removeWhitespacePadding('hello   ')).to.equal('hello');
		});

		it('strips both leading and trailing whitespace', () => {
			expect(removeWhitespacePadding('  hello  ')).to.equal('hello');
		});

		it('preserves internal whitespace', () => {
			expect(removeWhitespacePadding('  hello world  ')).to.equal('hello world');
		});

		it('strips tabs and newlines as whitespace', () => {
			expect(removeWhitespacePadding('\t\n hello \n\t')).to.equal('hello');
		});

		it('returns empty string for whitespace-only input', () => {
			expect(removeWhitespacePadding('   ')).to.equal('');
		});

		it('returns empty string unchanged', () => {
			expect(removeWhitespacePadding('')).to.equal('');
		});

		it('returns input unchanged when there is no padding', () => {
			expect(removeWhitespacePadding('hello')).to.equal('hello');
		});
	});

	describe('convertToDashArray', () => {
		it('returns empty array for undefined', () => {
			expect(convertToDashArray(undefined)).to.deep.equal([]);
		});

		it('returns empty array for empty string', () => {
			expect(convertToDashArray('')).to.deep.equal([]);
		});

		it('wraps a single positive number into a 1-element array, then duplicates (odd-length rule)', () => {
			expect(convertToDashArray(5)).to.deep.equal([5, 5]);
		});

		it('parses a single-value string and duplicates (odd-length rule)', () => {
			expect(convertToDashArray('5')).to.deep.equal([5, 5]);
		});

		it('parses a space-separated even-length string without duplicating', () => {
			expect(convertToDashArray('5 10')).to.deep.equal([5, 10]);
		});

		it('parses a space-separated odd-length string and duplicates the whole array', () => {
			expect(convertToDashArray('5 10 15')).to.deep.equal([5, 10, 15, 5, 10, 15]);
		});

		it('passes through an even-length numeric array unchanged', () => {
			expect(convertToDashArray([5, 10])).to.deep.equal([5, 10]);
		});

		it('duplicates an odd-length numeric array', () => {
			expect(convertToDashArray([5, 10, 15])).to.deep.equal([5, 10, 15, 5, 10, 15]);
		});

		it('parses floating-point values from strings', () => {
			expect(convertToDashArray('1.5 2.5')).to.deep.equal([1.5, 2.5]);
		});

		it('throws on a negative number value', () => {
			expect(() => convertToDashArray(-5)).to.throw(
				'Expected positive number for stroke-dasharray value, got -5.'
			);
		});

		it('throws on zero (isPositiveNumber rejects zero)', () => {
			expect(() => convertToDashArray(0)).to.throw(
				'Expected positive number for stroke-dasharray value, got 0.'
			);
		});

		it('throws on a string containing a non-positive token', () => {
			expect(() => convertToDashArray('5 -3 10')).to.throw(
				'Expected positive number for stroke-dasharray value, got -3 from string "-3".'
			);
		});

		it('throws on a string containing a non-numeric token (NaN)', () => {
			expect(() => convertToDashArray('5 abc 10')).to.throw(
				'Expected positive number for stroke-dasharray value, got NaN from string "abc".'
			);
		});

		it('throws on an array containing a non-positive value', () => {
			expect(() => convertToDashArray([5, -3, 10])).to.throw(
				'Expected positive number for stroke-dasharray value, got -3 from array [5,-3,10].'
			);
		});

		it('throws on an unsupported type', () => {
			expect(() => convertToDashArray(true as any)).to.throw(
				'Invalid type boolean for stroke-dasharray property true.'
			);
		});
	});

	describe('propertiesToAttributesString', () => {
		it('serializes each key as `key="value" ` separated by single spaces with a trailing space', () => {
			expect(propertiesToAttributesString({ stroke: 'red', fill: 'none' }))
				.to.equal('stroke="red" fill="none" ');
		});

		it('returns empty string for empty properties', () => {
			expect(propertiesToAttributesString({})).to.equal('');
		});

		it('preserves insertion order of keys', () => {
			expect(propertiesToAttributesString({ b: 2, a: 1, c: 3 }))
				.to.equal('b="2" a="1" c="3" ');
		});

		it('coerces non-string values via template-literal interpolation', () => {
			expect(propertiesToAttributesString({ width: 10, opacity: 0.5, flag: true }))
				.to.equal('width="10" opacity="0.5" flag="true" ');
		});
	});

	describe('wrapWithSVGTag', () => {
		it('wraps inner markup with an <svg> tag carrying the root attributes', () => {
			const root = makeRoot({ viewBox: '0 0 100 100', width: '50' });
			expect(wrapWithSVGTag(root, '<rect/>'))
				.to.equal('<svg viewBox="0 0 100 100" width="50">\n<rect/>\n</svg>');
		});

		it('emits a bare <svg> wrapper when root has no properties', () => {
			const root = makeRoot({});
			expect(wrapWithSVGTag(root, '<rect/>'))
				.to.equal('<svg >\n<rect/>\n</svg>');
		});

		it('preserves insertion order of attributes', () => {
			const root = makeRoot({ b: '2', a: '1', c: '3' });
			expect(wrapWithSVGTag(root, ''))
				.to.equal('<svg b="2" a="1" c="3">\n\n</svg>');
		});

		it('coerces non-string property values via template-literal interpolation', () => {
			const root = makeRoot({ width: 10, height: 20.5 });
			expect(wrapWithSVGTag(root, '<g/>'))
				.to.equal('<svg width="10" height="20.5">\n<g/>\n</svg>');
		});

		it('passes inner markup through verbatim (no escaping)', () => {
			const root = makeRoot({ viewBox: '0 0 10 10' });
			const inner = '<rect x="0" y="0"/>\n<line x1="0" y1="0" x2="10" y2="10"/>';
			expect(wrapWithSVGTag(root, inner))
				.to.equal(`<svg viewBox="0 0 10 10">\n${inner}\n</svg>`);
		});
	});

});
