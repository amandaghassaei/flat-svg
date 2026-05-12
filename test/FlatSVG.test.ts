import { FlatSVG } from '../src/FlatSVG';
import {
	FLAT_SEGMENT_ARC,
	FLAT_SEGMENT_BEZIER,
	FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY,
	FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT,
	FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT,
} from '../src/constants-public';
import { expect } from 'chai';
import { readFileSync } from 'fs';

const emptySVG = '<svg></svg>';
const test1 = readFileSync('./test/svgs/test1.svg', {encoding: 'utf-8'});
const miura = readFileSync('./test/svgs/miura-ori.svg', {encoding: 'utf-8'});
const miura_dashed = readFileSync('./test/svgs/miura-ori-dashed.svg', {encoding: 'utf-8'});
const opacity_groups = readFileSync('./test/svgs/opacity_groups.svg', {encoding: 'utf-8'});
const mixed_alpha = readFileSync('./test/svgs/mixed_alpha.svg', {encoding: 'utf-8'});
const inline_styles = readFileSync('./test/svgs/inline_styles.svg', {encoding: 'utf-8'});
const style_elements = readFileSync('./test/svgs/style_elements.svg', {encoding: 'utf-8'});
const clipping_mask = readFileSync('./test/svgs/clipping_mask.svg', {encoding: 'utf-8'});
const internal_css = readFileSync('./test/svgs/internal_css.svg', {encoding: 'utf-8'});
const internal_css_w_ids = readFileSync('./test/svgs/internal_css_w_ids.svg', {encoding: 'utf-8'});
const with_units = readFileSync('./test/svgs/with_units.svg', {encoding: 'utf-8'});
const with_ambiguous_units = readFileSync('./test/svgs/with_ambiguous_units.svg', {encoding: 'utf-8'});
const ellipses = readFileSync('./test/svgs/ellipses.svg', {encoding: 'utf-8'});
const bad_tags = readFileSync('./test/svgs/bad_tags.svg', {encoding: 'utf-8'});
const nested_transforms = readFileSync('./test/svgs/nested_transforms.svg', {encoding: 'utf-8'});
const fill_only = readFileSync('./test/svgs/fill_only.svg', {encoding: 'utf-8'});
const strokeless_variants = readFileSync('./test/svgs/strokeless_variants.svg', {encoding: 'utf-8'});
const fillless_variants = readFileSync('./test/svgs/fillless_variants.svg', {encoding: 'utf-8'});
const zero_length_line = readFileSync('./test/svgs/zero_length_line.svg', {encoding: 'utf-8'});
const stray_vertices = readFileSync('./test/svgs/stray_vertices.svg', {encoding: 'utf-8'});

describe('FlatSVG', () => {

	describe('constructor', () => {
		it('should throw an error if no svg string passed in', () => {
			// @ts-ignore
			expect(() => {new FlatSVG()}).to.throw(Error, 'Must pass in an SVG string to FlatSVG(), got undefined.');
			// @ts-ignore
			expect(() => {new FlatSVG(123)}).to.throw(Error, 'Must pass in an SVG string to FlatSVG(), got 123.');
			// @ts-ignore
			expect(() => {new FlatSVG({})}).to.throw(Error, 'Must pass in an SVG string to FlatSVG(), got [object Object].');
			expect(() => {new FlatSVG('')}).to.throw(Error, 'SVG string passed to FlatSVG() is empty.');
			expect(() => {new FlatSVG('<rect class="b" x="39.74" y="133.19" width="129.87" height="67.53"/>')}).to.throw(Error, 'Malformed SVG passed to FlatSVG(): expected a single root <svg> element, got 1 root child: <rect>.');
		});
		
		it('should handle a valid svg string', () => {
			expect(() => {new FlatSVG(emptySVG)}).not.to.throw();
			const flatSVG = new FlatSVG(emptySVG);
			const { warnings } = flatSVG;
			expect(warnings.length).to.equal(0);
		});

		it('should handle an svg with many types of elements', () => {
			expect(() => {new FlatSVG(test1)}).not.to.throw();
			const flatSVG = new FlatSVG(test1);
			const { warnings } = flatSVG;
			expect(warnings.length).to.equal(0);
		});

		it('should skip bad tags', () => {
			const flatSVG = new FlatSVG(bad_tags);
			const { warnings, unsupportedElements } = flatSVG;
			expect(warnings).to.deep.equal([
				'Skipping child with no tagName: {"type":"element","tagName":"","properties":{},"children":[]}.',
				"Invalid <circle> properties: {\"cx\":65.38,\"cy\":\"NaN\",\"r\":64.88}.",
				"Invalid <ellipse> properties: {\"cx\":65.38,\"cy\":0,\"rx\":64.88,\"ry\":-1}.",
				"Problem parsing <path> {\"d\":\"V23.4 L3.4,5.6\"} with SvgPath: string should start with `M` or `m`.",
			]);
			expect(unsupportedElements.length).to.equal(1);
			expect(unsupportedElements[0].tagName).to.equal('lsfkjdlskfjlsdk');
		});
	});

	describe('warnings', () => {
		it('is fully populated immediately after construction (eager, not lazy)', () => {
			// Construct an SVG that produces a parse-time warning at the path-conversion
			// stage. Read warnings BEFORE touching any other getter — under the eager
			// contract the warning must already be present.
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><line x1="abc" y1="0" x2="10" y2="10"/></svg>`);
			expect(flatSVG.warnings).to.deep.equal([
				'Invalid <line> properties: {"x1":"abc","y1":0,"x2":10,"y2":10}.',
			]);
		});

		it('emits "Invalid <line>" when x1/y1/x2/y2 is non-numeric', () => {
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><line x1="abc" y1="0" x2="10" y2="10"/></svg>`);
			expect(flatSVG.warnings).to.deep.equal([
				'Invalid <line> properties: {"x1":"abc","y1":0,"x2":10,"y2":10}.',
			]);
		});

		it('emits "Invalid <rect>" when width is negative', () => {
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><rect x="0" y="0" width="-5" height="10"/></svg>`);
			expect(flatSVG.warnings).to.deep.equal([
				'Invalid <rect> properties: {"x":0,"y":0,"width":-5,"height":10}.',
			]);
		});

		it('emits "Invalid <circle>" when r is negative', () => {
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><circle cx="0" cy="0" r="-5"/></svg>`);
			expect(flatSVG.warnings).to.deep.equal([
				'Invalid <circle> properties: {"cx":0,"cy":0,"r":-5}.',
			]);
		});

		it('emits "Invalid <ellipse>" when rx is negative', () => {
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><ellipse cx="0" cy="0" rx="-5" ry="3"/></svg>`);
			expect(flatSVG.warnings).to.deep.equal([
				'Invalid <ellipse> properties: {"cx":0,"cy":0,"rx":-5,"ry":3}.',
			]);
		});

		it('emits "Invalid <polygon>" when points is not a string (numeric value coerced by parser)', () => {
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><polygon points="123"/></svg>`);
			expect(flatSVG.warnings).to.deep.equal([
				'Invalid <polygon> properties: {"points":123}.',
			]);
		});

		it('emits "Invalid <polyline>" when points is not a string', () => {
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><polyline points="123"/></svg>`);
			expect(flatSVG.warnings).to.deep.equal([
				'Invalid <polyline> properties: {"points":123}.',
			]);
		});

		it('emits "Invalid <path>" when d is not a string', () => {
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><path d="123"/></svg>`);
			expect(flatSVG.warnings).to.deep.equal([
				'Invalid <path> properties: {"d":123}.',
			]);
		});

		it('emits "Unable to parse points string" when points contain non-numeric tokens', () => {
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><polyline points="abc,def 1,2"/></svg>`);
			expect(flatSVG.warnings).to.deep.equal([
				'Unable to parse points string: "abc,def 1,2" in <polyline>.',
			]);
		});

		it('truncates a trailing odd token in points (browser-compatible) without warning', () => {
			// Per SVG spec, an odd-count token list is malformed — but every
			// browser renders the valid prefix and drops the trailing token.
			// flat-svg matches that real-world behavior rather than rejecting
			// the entire element.
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><polyline points="1 2 3 4 5"/></svg>`);
			expect(flatSVG.warnings).to.deep.equal([]);
			expect(flatSVG.segments.length).to.equal(1);
			expect(flatSVG.segments[0].p1).to.deep.equal([1, 2]);
			expect(flatSVG.segments[0].p2).to.deep.equal([3, 4]);
		});

		it('surfaces CSS parser errors from malformed <style> blocks', () => {
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><style>{not valid css}</style><rect x="0" y="0" width="10" height="10"/></svg>`);
			expect(flatSVG.warnings.length).to.equal(1);
			expect(flatSVG.warnings[0]).to.include('selector missing');
		});

		it('emits "Skipping child with no properties" when an element has text-node children but no attributes', () => {
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><rect>some text</rect></svg>`);
			expect(flatSVG.warnings.length).to.equal(1);
			expect(flatSVG.warnings[0]).to.include('Skipping child with no properties');
		});

		it('surfaces malformed-transform warnings via flatSVG.warnings', () => {
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><rect x="0" y="0" width="10" height="10" transform="translate(NaN,NaN)"/></svg>`);
			expect(flatSVG.warnings.length).to.equal(1);
			expect(flatSVG.warnings[0]).to.include('invalid transform');
		});

		it('emits "Skipping child with no tagName" when a child element has an empty tagName', () => {
			// svg-parser tolerates the `< />` form and emits a child with tagName "".
			// The bad_tags fixture covers this in an integration test; this is the
			// minimal-reproduction unit test.
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><g>< /></g></svg>`);
			expect(flatSVG.warnings.length).to.equal(1);
			expect(flatSVG.warnings[0]).to.include('Skipping child with no tagName');
		});

		it('emits "Problem parsing <path> ... with SvgPath" when d is a malformed string', () => {
			// Distinct from "Invalid <path>" (which fires for a non-string d) — this
			// fires when d is a string but svgpath rejects its contents.
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><path d="V23.4 L3.4,5.6"/></svg>`);
			expect(flatSVG.warnings.length).to.equal(1);
			expect(flatSVG.warnings[0]).to.include('with SvgPath: string should start with `M` or `m`');
		});

		it('surfaces "malformed transform" wrong-param-count warnings via flatSVG.warnings', () => {
			// transforms.ts:142 — translate accepts 1 or 2 params; 3 fires the warning.
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><rect x="0" y="0" width="10" height="10" transform="translate(1, 2, 3)"/></svg>`);
			expect(flatSVG.warnings.length).to.equal(1);
			expect(flatSVG.warnings[0]).to.include('containing 3 parameters, expected 1 or 2 parameters');
		});

		it('surfaces "Malformed transform" parens-parse warnings via flatSVG.warnings', () => {
			// transforms.ts:44 — nested parens make transformComponents.split() yield length !== 2.
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><rect x="0" y="0" width="10" height="10" transform="translate(1(2)"/></svg>`);
			expect(flatSVG.warnings.length).to.equal(1);
			expect(flatSVG.warnings[0]).to.include('Malformed transform: "translate(1(2)"');
		});

		it('surfaces "unmatched characters" transform warnings via flatSVG.warnings', () => {
			// transforms.ts:178 — characters that don't fit into any matched transform.
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><rect x="0" y="0" width="10" height="10" transform="garbage translate(1, 2)"/></svg>`);
			expect(flatSVG.warnings.length).to.equal(1);
			expect(flatSVG.warnings[0]).to.include('Malformed transform, unmatched characters: [ "garbage" ]');
		});

		it('mixed valid + malformed transform chain only warns for the broken one', () => {
			// Valid leading translate produces no warnings; the trailing one with the
			// wrong param count does. Exercises the per-transform `if (warnings)` skip
			// branch that the all-malformed cases above can't reach.
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><rect x="0" y="0" width="10" height="10" transform="translate(10, 20) translate(1, 2, 3)"/></svg>`);
			expect(flatSVG.warnings.length).to.equal(1);
			expect(flatSVG.warnings[0]).to.include('containing 3 parameters, expected 1 or 2 parameters');
		});

		it('emits warning for non-numeric opacity instead of throwing', () => {
			// Per the API-misuse-throws / data-problems-warn rule, malformed SVG values
			// (which the caller can't fix in their code) must not throw.
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 100 100"><rect x="0" y="0" width="10" height="10" opacity="abc"/></svg>`);
			expect(flatSVG.warnings.length).to.equal(1);
			expect(flatSVG.warnings[0]).to.include('Invalid <rect> opacity value: "abc"');
		});

		it('should be readonly', () => {
			const flatSVG = new FlatSVG(test1);
			expect(() => { flatSVG.warnings = []; })
				.to.throw(Error, 'No warnings setter on FlatSVG.');
		});
	});

	describe('root', () => {
		it('should return svg root element', () => {
			expect((new FlatSVG(test1)).root.tagName).to.equal('svg');
		});

		it('should be readonly', () => {
			const flatSVG = new FlatSVG(test1);
			expect(() => { flatSVG.root = { type: 'element', tagName: 'svg', children: [] }; })
				.to.throw(Error, 'No root setter on FlatSVG.');
		});
	});

	describe('viewBox', () => {
		it('should return svg viewbox as array', () => {
			expect((new FlatSVG(test1)).viewBox).to.deep.equal([ 0, 0, 612, 792 ]);
		});

		it('should return [0, 0, 0, 0] if no viewbox is available', () => {
			expect((new FlatSVG(emptySVG)).viewBox).to.deep.equal([ 0, 0, 0, 0 ]);
		});

		it('should return [0, 0, width, height] if no viewbox is available, but width/height is available', () => {
			expect((new FlatSVG(with_units)).viewBox).to.deep.equal([ 0, 0, 10, 11 ]);
		});

		it('falls back to root x/y/width/height attributes when no viewBox is present', () => {
			// Each of x/y/width/height has its own `|| '0'` default; provide all four so
			// every truthy branch fires.
			const svg = `<svg x="3" y="4" width="50" height="60"><rect x="0" y="0" width="5" height="5"/></svg>`;
			expect(new FlatSVG(svg).viewBox).to.deep.equal([3, 4, 50, 60]);
		});

		it('defaults missing root dimension attributes to 0 (partial set)', () => {
			const svg = `<svg width="50"><rect x="0" y="0" width="5" height="5"/></svg>`;
			expect(new FlatSVG(svg).viewBox).to.deep.equal([0, 0, 50, 0]);
		});

		it('accepts comma-separated viewBox values per SVG 2 §8.2', () => {
			const svg = `<svg viewBox="10,20,30,40"><rect x="0" y="0" width="5" height="5"/></svg>`;
			expect(new FlatSVG(svg).viewBox).to.deep.equal([10, 20, 30, 40]);
		});

		it('accepts mixed whitespace + comma separators', () => {
			const svg = `<svg viewBox=" 10, 20  30 ,40 "><rect x="0" y="0" width="5" height="5"/></svg>`;
			expect(new FlatSVG(svg).viewBox).to.deep.equal([10, 20, 30, 40]);
		});

		it('falls back to root x/y/width/height + warns on malformed viewBox', () => {
			// Per SVG 2 §8.2, a viewBox that doesn't parse as exactly 4 finite numbers
			// is invalid and ignored; flat-svg falls back to the root sizing attributes
			// and emits a parse warning. Covers: too few values, too many values, NaN
			// token, and a single numeric value (svg-parser hands these as `number`).
			const tooFew = `<svg viewBox="10 20" width="50" height="60"><rect width="5" height="5"/></svg>`;
			const tooMany = `<svg viewBox="0 0 10 10 99" width="50" height="60"><rect width="5" height="5"/></svg>`;
			const withNaN = `<svg viewBox="0 0 abc 40" width="50" height="60"><rect width="5" height="5"/></svg>`;
			const numericOnly = `<svg viewBox="50" width="70" height="80"><rect width="5" height="5"/></svg>`;
			for (const svg of [tooFew, tooMany, withNaN]) {
				const flat = new FlatSVG(svg);
				expect(flat.viewBox).to.deep.equal([0, 0, 50, 60]);
				expect(flat.warnings.some(w => w.startsWith('Malformed viewBox'))).to.equal(true);
			}
			const flatNumeric = new FlatSVG(numericOnly);
			expect(flatNumeric.viewBox).to.deep.equal([0, 0, 70, 80]);
			expect(flatNumeric.warnings.some(w => w.startsWith('Malformed viewBox'))).to.equal(true);
		});

		it('does not warn on a valid viewBox', () => {
			const flat = new FlatSVG(`<svg viewBox="0 0 100 100"><rect width="5" height="5"/></svg>`);
			expect(flat.warnings.some(w => w.startsWith('Malformed viewBox'))).to.equal(false);
		});

		it('should be readonly', () => {
			const flatSVG = new FlatSVG(test1);
			expect(() => { flatSVG.viewBox = [0, 0, 0, 0]; })
				.to.throw(Error, 'No viewBox setter on FlatSVG.');
		});

		it('static FlatSVG.viewBox() returns the same viewBox as the instance getter', () => {
			expect(FlatSVG.viewBox(test1)).to.deep.equal([ 0, 0, 612, 792 ]);
			expect(FlatSVG.viewBox(emptySVG)).to.deep.equal([ 0, 0, 0, 0 ]);
			expect(FlatSVG.viewBox(with_units)).to.deep.equal([ 0, 0, 10, 11 ]);
		});

		it('static FlatSVG.viewBox() throws on invalid input with the helper-specific call site name', () => {
			// @ts-ignore
			expect(() => FlatSVG.viewBox()).to.throw(Error, 'Must pass in an SVG string to FlatSVG.viewBox(), got undefined.');
			// @ts-ignore
			expect(() => FlatSVG.viewBox(123)).to.throw(Error, 'Must pass in an SVG string to FlatSVG.viewBox(), got 123.');
			expect(() => FlatSVG.viewBox('')).to.throw(Error, 'SVG string passed to FlatSVG.viewBox() is empty.');
			expect(() => FlatSVG.viewBox('<rect/>')).to.throw(Error, 'Malformed SVG passed to FlatSVG.viewBox(): expected a single root <svg> element, got 1 root child: <rect>.');
		});

		it('static FlatSVG.viewBox() falls back to root x/y/width/height when viewBox attribute is omitted', () => {
			// Missing viewBox is a normal valid SVG (not a parse error) — the helper
			// derives the viewport from root sizing attributes and returns a tuple.
			const noAttr = `<svg width="50" height="60"><rect width="5" height="5"/></svg>`;
			const fullAttrs = `<svg x="3" y="4" width="50" height="60"><rect width="5" height="5"/></svg>`;
			const noSizing = `<svg><rect width="5" height="5"/></svg>`;
			expect(FlatSVG.viewBox(noAttr)).to.deep.equal([0, 0, 50, 60]);
			expect(FlatSVG.viewBox(fullAttrs)).to.deep.equal([3, 4, 50, 60]);
			expect(FlatSVG.viewBox(noSizing)).to.deep.equal([0, 0, 0, 0]);
		});

		it('static FlatSVG.viewBox() returns undefined on malformed viewBox attribute', () => {
			// Per SVG 2 §8.2 a viewBox that doesn't parse as exactly 4 finite numbers
			// is invalid. Without a warnings sink, the static helper signals the
			// problem by returning undefined rather than silently substituting a
			// fallback the caller might mistake for real data.
			const tooFew = `<svg viewBox="10 20" width="50" height="60"><rect width="5" height="5"/></svg>`;
			const tooMany = `<svg viewBox="0 0 10 10 99" width="50" height="60"><rect width="5" height="5"/></svg>`;
			const withNaN = `<svg viewBox="0 0 abc 40" width="50" height="60"><rect width="5" height="5"/></svg>`;
			const numericOnly = `<svg viewBox="50" width="70" height="80"><rect width="5" height="5"/></svg>`;
			expect(FlatSVG.viewBox(tooFew)).to.equal(undefined);
			expect(FlatSVG.viewBox(tooMany)).to.equal(undefined);
			expect(FlatSVG.viewBox(withNaN)).to.equal(undefined);
			expect(FlatSVG.viewBox(numericOnly)).to.equal(undefined);
		});
	});

	describe('units', () => {
		it('should return svg units as string', () => {
			expect((new FlatSVG(with_units)).units).to.equal('cm');
		});

		it('should return "px" if no units is defined', () => {
			expect((new FlatSVG(miura)).units).to.equal("px");
            expect((new FlatSVG(with_ambiguous_units)).units).to.equal("px");
		});

		it('should be readonly', () => {
			const flatSVG = new FlatSVG(with_units);
			expect(() => { flatSVG.units = 'px'; })
				.to.throw(Error, 'No units setter on FlatSVG.');
		});

		it('static FlatSVG.units() returns the same units as the instance getter', () => {
			expect(FlatSVG.units(with_units)).to.equal('cm');
			expect(FlatSVG.units(miura)).to.equal('px');
			expect(FlatSVG.units(with_ambiguous_units)).to.equal('px');
		});

		it('static FlatSVG.units() throws on invalid input with the helper-specific call site name', () => {
			// @ts-ignore
			expect(() => FlatSVG.units()).to.throw(Error, 'Must pass in an SVG string to FlatSVG.units(), got undefined.');
			expect(() => FlatSVG.units('')).to.throw(Error, 'SVG string passed to FlatSVG.units() is empty.');
			expect(() => FlatSVG.units('<rect/>')).to.throw(Error, 'Malformed SVG passed to FlatSVG.units(): expected a single root <svg> element, got 1 root child: <rect>.');
		});
	});

	describe('metadata', () => {
		it('static FlatSVG.metadata() returns viewBox and units matching the dedicated helpers', () => {
			expect(FlatSVG.metadata(test1)).to.deep.equal({ viewBox: [0, 0, 612, 792], units: 'px' });
			expect(FlatSVG.metadata(with_units)).to.deep.equal({ viewBox: [0, 0, 10, 11], units: 'cm' });
			expect(FlatSVG.metadata(emptySVG)).to.deep.equal({ viewBox: [0, 0, 0, 0], units: 'px' });
		});

		it('static FlatSVG.metadata() returns viewBox=undefined on malformed viewBox; units still resolves', () => {
			const svg = `<svg viewBox="10 20" width="50cm" height="60cm"><rect width="5" height="5"/></svg>`;
			expect(FlatSVG.metadata(svg)).to.deep.equal({ viewBox: undefined, units: 'cm' });
		});

		it('static FlatSVG.metadata() throws on invalid input with the helper-specific call site name', () => {
			// @ts-ignore
			expect(() => FlatSVG.metadata()).to.throw(Error, 'Must pass in an SVG string to FlatSVG.metadata(), got undefined.');
			expect(() => FlatSVG.metadata('')).to.throw(Error, 'SVG string passed to FlatSVG.metadata() is empty.');
			expect(() => FlatSVG.metadata('<rect/>')).to.throw(Error, 'Malformed SVG passed to FlatSVG.metadata(): expected a single root <svg> element, got 1 root child: <rect>.');
		});
	});

	describe('elements', () => {
		it('should return flattened list of elements', () => {
			expect((new FlatSVG(test1)).elements.length).to.equal(26);
		});

		it('should memoize elements list', () => {
			const flatSVG = new FlatSVG(test1);
			expect(flatSVG.elements).to.equal(flatSVG.elements);
		});

		it("child's explicit attribute overrides an ancestor's (per SVG spec)", () => {
			const svg = `<svg viewBox="0 0 100 100"><g stroke="red"><rect x="0" y="0" width="10" height="10" stroke="blue" fill="none"/></g></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.elements.length).to.equal(1);
			expect(flatSVG.elements[0].properties.stroke).to.equal('blue');
		});

		it("child inherits from ancestor when no own value", () => {
			const svg = `<svg viewBox="0 0 100 100"><g stroke="red"><rect x="0" y="0" width="10" height="10" fill="none"/></g></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.elements[0].properties.stroke).to.equal('red');
		});

		it("opacity multiplies ancestor × child (not override)", () => {
			const svg = `<svg viewBox="0 0 100 100"><g opacity="0.5"><rect x="0" y="0" width="10" height="10" opacity="0.5" stroke="red"/></g></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.elements[0].properties.opacity).to.equal(0.25);
		});

		it('multiplies nested opacity through 4 levels of <g> nesting (opacity_groups.svg)', () => {
			const flatSVG = new FlatSVG(opacity_groups);
			expect(flatSVG.elements[0].properties.opacity).to.equal(0.0625);
			expect(flatSVG.elements[1].properties.opacity).to.equal(0.125);
			expect(flatSVG.elements[2].properties.opacity).to.equal(0.25);
			expect(flatSVG.elements[3].properties.opacity).to.equal(0.5);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it("accumulates clip-path / mask / filter chains on elements (outermost ancestor first, self last)", () => {
			const svg = `<svg viewBox="0 0 100 100"><g clip-path="url(#a)"><g clip-path="url(#b)" mask="url(#m1)"><rect x="0" y="0" width="10" height="10" clip-path="url(#c)" filter="url(#f)" stroke="red" fill="none"/></g></g></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.elements.length).to.equal(1);
			const el = flatSVG.elements[0];
			expect(el.clipPaths).to.deep.equal(['url(#a)', 'url(#b)', 'url(#c)']);
			expect(el.masks).to.deep.equal(['url(#m1)']);
			expect(el.filters).to.deep.equal(['url(#f)']);
			expect((el.properties as any)['clip-path']).to.equal(undefined);
			expect((el.properties as any)['mask']).to.equal(undefined);
			expect((el.properties as any)['filter']).to.equal(undefined);
		});

		it("siblings stay isolated when one diverges from a shared ancestor (no cross-contamination)", () => {
			// Parent <g id="P"> sets every inheritance channel (transform,
			// clip-path, mask, filter, fill, id, class). Child <g id="A">
			// diverges in all of them — its own attributes layer on top of
			// the parent's. Sibling <rect id="B"> doesn't diverge — it just
			// inherits.
			//
			// After flattening, leafA (the rect inside <g id="A">) should see
			// the COMPOSED state. leafB should see ONLY the parent's state —
			// none of A's overrides should bleed in. This exercises the
			// copy-on-write invariant that sibling FlatElements built from
			// the same shared inherited refs don't corrupt each other when
			// one diverges.
			const svg = `<svg viewBox="0 0 100 100">
				<g id="P" class="pcls" transform="translate(10 0)" clip-path="url(#cp)" mask="url(#m)" filter="url(#f)" fill="red">
					<g id="A" class="acls" transform="translate(20 0)" clip-path="url(#cpA)" mask="url(#mA)" filter="url(#fA)" fill="blue">
						<rect x="0" y="0" width="10" height="10"/>
					</g>
					<rect id="B" x="0" y="0" width="10" height="10"/>
				</g>
			</svg>`;
			const flat = new FlatSVG(svg);
			expect(flat.elements.length).to.equal(2);
			const [leafA, leafB] = flat.elements;

			// leafA: composed parent + A's overrides on every channel.
			expect(leafA.properties.fill).to.equal('blue');
			expect(leafA.clipPaths).to.deep.equal(['url(#cp)', 'url(#cpA)']);
			expect(leafA.masks).to.deep.equal(['url(#m)', 'url(#mA)']);
			expect(leafA.filters).to.deep.equal(['url(#f)', 'url(#fA)']);
			expect(leafA.transform).to.deep.equal({ a: 1, b: 0, c: 0, d: 1, e: 30, f: 0 });
			expect(leafA.ancestorIds).to.equal('P A');
			expect(leafA.ancestorClasses).to.equal('pcls acls');

			// leafB: only parent's state, no contamination from A's overrides.
			expect(leafB.properties.fill).to.equal('red');
			expect(leafB.clipPaths).to.deep.equal(['url(#cp)']);
			expect(leafB.masks).to.deep.equal(['url(#m)']);
			expect(leafB.filters).to.deep.equal(['url(#f)']);
			expect(leafB.transform).to.deep.equal({ a: 1, b: 0, c: 0, d: 1, e: 10, f: 0 });
			expect(leafB.ancestorIds).to.equal('P');
			expect(leafB.ancestorClasses).to.equal('pcls');
		});

		it("surfaces own id/class on properties.id/class and ancestor <g> chain on FlatElement.ancestorIds/ancestorClasses (excluding self)", () => {
			const svg = `<svg viewBox="0 0 100 100"><g id="outer" class="ga gb"><g id="inner" class="gi"><rect id="box" class="rc rd" x="0" y="0" width="10" height="10" stroke="red" fill="none"/></g></g></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.elements.length).to.equal(1);
			const el = flatSVG.elements[0];
			expect(el.properties.id).to.equal('box');
			expect(el.properties.class).to.equal('rc rd');
			expect(el.ancestorIds).to.equal('outer inner');
			expect(el.ancestorClasses).to.equal('ga gb gi');
			// And NOT inside properties — this is the architectural split.
			expect((el.properties as any).ancestorIds).to.equal(undefined);
			expect((el.properties as any).ancestorClasses).to.equal(undefined);
		});

		it("omits ancestorIds/ancestorClasses when there are no <g> ancestors with id/class", () => {
			const svg = `<svg viewBox="0 0 100 100"><rect id="lonely" class="solo" x="0" y="0" width="10" height="10"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			const el = flatSVG.elements[0];
			expect(el.properties.id).to.equal('lonely');
			expect(el.properties.class).to.equal('solo');
			expect(el.ancestorIds).to.equal(undefined);
			expect(el.ancestorClasses).to.equal(undefined);
		});

		it("does not propagate ancestor <g> id/class as inherited properties to descendants", () => {
			const svg = `<svg viewBox="0 0 100 100"><g id="outer" class="ga"><rect x="0" y="0" width="10" height="10"/></g></svg>`;
			const flatSVG = new FlatSVG(svg);
			const el = flatSVG.elements[0];
			expect(el.properties.id).to.equal(undefined);
			expect(el.properties.class).to.equal(undefined);
			expect(el.ancestorIds).to.equal('outer');
			expect(el.ancestorClasses).to.equal('ga');
		});

		it("handles empty <g/> containers without errors", () => {
			const svg = `<svg viewBox="0 0 100 100"><g id="empty"/><g id="alsoEmpty"></g><rect x="0" y="0" width="10" height="10"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.elements.length).to.equal(1);
			expect(flatSVG.elements[0].tagName).to.equal('rect');
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it("does NOT mutate the parse tree (transform/id/class/defs preserved on root)", () => {
			const svg = `<svg viewBox="0 0 100 100"><defs><clipPath id="m"><rect/></clipPath></defs><g id="outer" class="myclass" transform="translate(10 20)"><rect x="0" y="0" width="10" height="10" stroke="red"/></g></svg>`;
			const flatSVG = new FlatSVG(svg);
			const tagNames = flatSVG.root.children.map((c: any) => c.tagName);
			expect(tagNames).to.include('defs');
			expect(tagNames).to.include('g');
			const g = flatSVG.root.children.find((c: any) => c.tagName === 'g') as any;
			expect(g.properties.transform).to.equal('translate(10 20)');
			expect(g.properties.id).to.equal('outer');
			expect(g.properties.class).to.equal('myclass');
		});

		it('parses inline style="..." attribute and merges into properties', () => {
			// Inline style attribute: parsed as CSS and folded into the element's properties.
			const svg = `<svg viewBox="0 0 100 100"><rect style="stroke: red; fill: none; stroke-width: 3" x="0" y="0" width="10" height="10"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.elements[0].properties.stroke).to.equal('red');
			expect(flatSVG.elements[0].properties.fill).to.equal('none');
			expect(flatSVG.elements[0].properties['stroke-width']).to.equal(3);
			expect((flatSVG.elements[0].properties as any).style).to.equal(undefined);
		});

		it('inline style declaration overrides presentation attribute on same element', () => {
			// Per CSS specificity, inline `style="..."` wins over presentation
			// attributes (which have specificity 0). Even though `stroke="blue"`
			// looks more "explicit", `style="stroke: red"` takes precedence.
			const svg = `<svg viewBox="0 0 100 100"><rect style="stroke: red" stroke="blue" x="0" y="0" width="10" height="10"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.elements[0].properties.stroke).to.equal('red');
		});

		it('should be readonly', () => {
			const flatSVG = new FlatSVG(test1);
			expect(() => { flatSVG.elements = []; })
				.to.throw(Error, 'No elements setter on FlatSVG.');
		});
	});

	describe('elementsAsSVG', () => {
		it('should return flattened list of elements as svg string', () => {
			expect((new FlatSVG(inline_styles)).elementsAsSVG).to.equal(`<svg id="a" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 792">
<rect opacity="0.0625" x="39.74" y="38.39" width="129.87" height="67.53" fill="#696a6d" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<rect opacity="0.125" x="39.74" y="133.19" width="129.87" height="67.53" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<rect opacity="0.25" x="39.74" y="228" width="129.87" height="67.53" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<rect opacity="0.5" x="39.74" y="322.81" width="129.87" height="67.53" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
</svg>`);
			expect((new FlatSVG(nested_transforms)).elementsAsSVG).to.equal(`<svg id="a" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 792">
<rect opacity="0.0625" class="c" x="39.74" y="38.39" width="129.87" height="67.53" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" fill="#696a6d" transform="matrix(0.7461 -0.6658 0.6658 0.7461 322.2818 294.3933)" />
<rect opacity="0.125" class="b" x="39.74" y="133.19" width="129.87" height="67.53" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" transform="matrix(0.7461 -0.6658 0.6658 0.7461 322.2818 294.3933)" />
<rect opacity="0.25" class="b" x="39.74" y="228" width="129.87" height="67.53" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" transform="matrix(1 0 0 1 356 200)" />
<rect opacity="0.5" class="b" x="39.74" y="322.81" width="129.87" height="67.53" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" transform="matrix(1 0 0 1 356 200)" />
</svg>`);
		});

		it('should be readonly', () => {
			const flatSVG = new FlatSVG(inline_styles);
			expect(() => { flatSVG.elementsAsSVG = ''; })
				.to.throw(Error, 'No elementsAsSVG setter on FlatSVG.');
		});
	});

	describe('paths', () => {
		it('should return flattened list of paths', () => {
			expect((new FlatSVG(test1)).paths.length).to.equal(26);
		});

		it('should memoize paths list', () => {
			const flatSVG = new FlatSVG(test1);
			expect(flatSVG.paths).to.equal(flatSVG.paths);
		});

		it('preserveArcs: true keeps A commands in path d strings', () => {
			// At the FlatPath level, the d string should retain the A command
			// when preserveArcs:true (consistent with the segment-level guarantee).
			const svg = `<svg viewBox="0 0 100 100"><path d="M 10 50 A 40 40 0 1 0 90 50"/></svg>`;
			const flatSVG = new FlatSVG(svg, { preserveArcs: true });
			expect(flatSVG.paths).to.deep.equal([{
				properties: { d: 'M10 50A40 40 0 1 0 90 50' },
				sourceElementIndex: 0,
			}]);
		});

		it('preserveArcs: false unarcs A commands in path d strings', () => {
			// At the FlatPath level, the d string should have A commands replaced
			// by cubic bezier C commands when preserveArcs:false.
			const svg = `<svg viewBox="0 0 100 100"><path d="M 10 50 A 40 40 0 1 0 90 50"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.paths).to.deep.equal([{
				properties: { d: 'M10 50C10.000000000000007 72.09138999323173 27.90861000676827 90 50 90 72.09138999323173 90 90 72.09138999323173 90 50' },
				sourceElementIndex: 0,
			}]);
		});

		it('should be readonly', () => {
			const flatSVG = new FlatSVG(test1);
			expect(() => { flatSVG.paths = []; })
				.to.throw(Error, 'No paths setter on FlatSVG.');
		});

		it('drops <polygon points=""> and <polyline points=""> without producing paths or stray vertices', () => {
			const svg = `<svg viewBox="0 0 10 10"><polygon points=""/><polyline points="   "/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.paths).to.deep.equal([]);
			expect(flatSVG.strayVertices).to.deep.equal([]);
		});
	});

	describe('pathsAsSVG', () => {
		it('should return flattened list of paths as svg string', () => {
			expect((new FlatSVG(inline_styles)).pathsAsSVG).to.equal(`<svg id="a" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 792">
<path opacity="0.0625" fill="#696a6d" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" d="M39.74,38.39 L169.61,38.39 L169.61,105.92 L39.74,105.92 L39.74,38.39 Z" />
<path opacity="0.125" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" d="M39.74,133.19 L169.61,133.19 L169.61,200.72 L39.74,200.72 L39.74,133.19 Z" />
<path opacity="0.25" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" d="M39.74,228 L169.61,228 L169.61,295.53 L39.74,295.53 L39.74,228 Z" />
<path opacity="0.5" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" d="M39.74,322.81 L169.61,322.81 L169.61,390.34000000000003 L39.74,390.34000000000003 L39.74,322.81 Z" />
</svg>`);
		});

		it('should be readonly', () => {
			const flatSVG = new FlatSVG(inline_styles);
			expect(() => { flatSVG.pathsAsSVG = ''; })
				.to.throw(Error, 'No pathsAsSVG setter on FlatSVG.');
		});
	});

	describe('segments', () => {
		it('should return flattened list of segments', () => {
			expect((new FlatSVG(test1)).segments.length).to.equal(60);
		});

		it('should memoize segments list', () => {
			const flatSVG = new FlatSVG(test1);
			expect(flatSVG.segments).to.equal(flatSVG.segments);
		});

		it('emits a segment for a non-redundant z closure', () => {
			const svg = `<svg viewBox="0 0 100 100"><path d="M 0 0 L 10 0 L 0 10 z" stroke="red" fill="none"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.segments.length).to.equal(3);
			expect(flatSVG.segments[2].p1).to.deep.equal([0, 10]);
			expect(flatSVG.segments[2].p2).to.deep.equal([0, 0]);
		});

		it('resolves relative path commands (m/l/c/z) to absolute coordinates', () => {
			// Two paths that should produce identical segment geometry: one in absolute
			// commands, one in relative. Verifies svgpath's .abs() normalization is
			// running and that downstream segment extraction sees only absolute coords.
			const absSvg = `<svg viewBox="0 0 100 100"><path d="M 10 10 L 20 10 L 20 20 L 10 20 Z" stroke="red" fill="none"/></svg>`;
			const relSvg = `<svg viewBox="0 0 100 100"><path d="m 10 10 l 10 0 l 0 10 l -10 0 z" stroke="red" fill="none"/></svg>`;
			const absSegs = new FlatSVG(absSvg).segments;
			const relSegs = new FlatSVG(relSvg).segments;
			expect(relSegs).to.deep.equal(absSegs);
			expect(relSegs.map((s) => [s.p1, s.p2])).to.deep.equal([
				[[10, 10], [20, 10]],
				[[20, 10], [20, 20]],
				[[20, 20], [10, 20]],
				[[10, 20], [10, 10]],
			]);
		});

		it('resolves relative cubic bezier (c) to absolute control points', () => {
			// 'c' is relative cubic — both control points and endpoint are deltas from
			// the current point. After .abs() the segment should carry absolute coords.
			const svg = `<svg viewBox="0 0 100 100"><path d="M 10 10 c 5 0 10 5 10 10" stroke="red" fill="none"/></svg>`;
			const flatSVG = new FlatSVG(svg, { preserveArcs: true });
			expect(flatSVG.segments).to.deep.equal([{
				type: FLAT_SEGMENT_BEZIER,
				p1: [10, 10],
				p2: [20, 20],
				controlPoints: [[15, 10], [20, 15]],
				properties: { fill: 'none', stroke: 'red' },
				sourceElementIndex: 0,
			}]);
		});

		it('handles lowercase z in user-supplied path d-strings', () => {
			// Lowercase 'z' is equivalent to uppercase 'Z' per SVG spec (close-path takes
			// no params, so case has no meaning). Verify the parser treats them identically.
			const lowerSvg = `<svg viewBox="0 0 100 100"><path d="M 0 0 L 10 0 L 0 10 z" stroke="red" fill="none"/></svg>`;
			const upperSvg = `<svg viewBox="0 0 100 100"><path d="M 0 0 L 10 0 L 0 10 Z" stroke="red" fill="none"/></svg>`;
			const lowerFlat = new FlatSVG(lowerSvg);
			const upperFlat = new FlatSVG(upperSvg);
			expect(lowerFlat.warnings).to.deep.equal([]);
			expect(lowerFlat.segments).to.deep.equal(upperFlat.segments);
			expect(lowerFlat.segments.map((s) => [s.p1, s.p2])).to.deep.equal([
				[[0, 0], [10, 0]],
				[[10, 0], [0, 10]],
				[[0, 10], [0, 0]],
			]);
		});

		it('carries sourceElementIndex on each segment pointing back to FlatSVG.elements', () => {
			const svg = `<svg viewBox="0 0 100 100"><line x1="0" y1="0" x2="10" y2="0" stroke="red"/><path d="M 0 0 L 10 0 L 0 10 z" stroke="blue" fill="none"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.segments.length).to.equal(4);
			expect(flatSVG.segments[0].sourceElementIndex).to.equal(0);
			for (let i = 1; i < 4; i++) expect(flatSVG.segments[i].sourceElementIndex).to.equal(1);
			expect(flatSVG.elements[flatSVG.segments[0].sourceElementIndex].tagName).to.equal('line');
			expect(flatSVG.elements[flatSVG.segments[1].sourceElementIndex].tagName).to.equal('path');
		});

		it('carries sourceElementIndex on each path', () => {
			const flatSVG = new FlatSVG(test1);
			for (let i = 0; i < flatSVG.paths.length; i++) {
				expect(flatSVG.paths[i].sourceElementIndex).to.equal(i);
			}
		});

		it('preserveArcs: true preserves A commands inside <path> elements', () => {
			// preserveArcs:true → an A command stays as a single FlatArcSegment.
			const svg = `<svg viewBox="0 0 100 100"><path d="M 10 50 A 40 40 0 1 0 90 50"/></svg>`;
			const flatSVG = new FlatSVG(svg, { preserveArcs: true });
			expect(flatSVG.segments).to.deep.equal([{
				type: FLAT_SEGMENT_ARC,
				p1: [10, 50],
				p2: [90, 50],
				rx: 40,
				ry: 40,
				xAxisRotation: 0,
				largeArcFlag: true,
				sweepFlag: false,
				properties: {},
				sourceElementIndex: 0,
			}]);
		});

		it('preserveArcs: false (default) converts A commands inside <path> elements to beziers', () => {
			// preserveArcs:false → svgpath's .unarc() splits each A command into
			// one or more cubic bezier segments.
			const svg = `<svg viewBox="0 0 100 100"><path d="M 10 50 A 40 40 0 1 0 90 50"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.segments).to.deep.equal([
				{
					type: FLAT_SEGMENT_BEZIER,
					p1: [10, 50],
					p2: [50, 90],
					controlPoints: [[10.000000000000007, 72.09138999323173], [27.90861000676827, 90]],
					properties: {},
					sourceElementIndex: 0,
				},
				{
					type: FLAT_SEGMENT_BEZIER,
					p1: [50, 90],
					p2: [90, 50],
					controlPoints: [[72.09138999323173, 90], [90, 72.09138999323173]],
					properties: {},
					sourceElementIndex: 0,
				},
			]);
		});

		it('should be readonly', () => {
			const flatSVG = new FlatSVG(test1);
			expect(() => { flatSVG.segments = []; })
				.to.throw(Error, 'No segments setter on FlatSVG.');
		});
	});

	describe('segmentsAsSVG', () => {
		it('should return flattened list of segments as svg string', () => {
			expect((new FlatSVG(inline_styles)).segmentsAsSVG).to.equal(`<svg id="a" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 792">
<line x1="39.74" y1="38.39" x2="169.61" y2="38.39" opacity="0.0625" fill="#696a6d" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="169.61" y1="38.39" x2="169.61" y2="105.92" opacity="0.0625" fill="#696a6d" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="169.61" y1="105.92" x2="39.74" y2="105.92" opacity="0.0625" fill="#696a6d" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="39.74" y1="105.92" x2="39.74" y2="38.39" opacity="0.0625" fill="#696a6d" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="39.74" y1="133.19" x2="169.61" y2="133.19" opacity="0.125" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="169.61" y1="133.19" x2="169.61" y2="200.72" opacity="0.125" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="169.61" y1="200.72" x2="39.74" y2="200.72" opacity="0.125" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="39.74" y1="200.72" x2="39.74" y2="133.19" opacity="0.125" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="39.74" y1="228" x2="169.61" y2="228" opacity="0.25" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="169.61" y1="228" x2="169.61" y2="295.53" opacity="0.25" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="169.61" y1="295.53" x2="39.74" y2="295.53" opacity="0.25" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="39.74" y1="295.53" x2="39.74" y2="228" opacity="0.25" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="39.74" y1="322.81" x2="169.61" y2="322.81" opacity="0.5" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="169.61" y1="322.81" x2="169.61" y2="390.34000000000003" opacity="0.5" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="169.61" y1="390.34000000000003" x2="39.74" y2="390.34000000000003" opacity="0.5" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="39.74" y1="390.34000000000003" x2="39.74" y2="322.81" opacity="0.5" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
</svg>`);
			expect(new FlatSVG(ellipses, { preserveArcs: true }).segmentsAsSVG).to.equal(`<svg id="a" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 439.89 399.38">
<path d="M 0.5 65.38 A 64.88 64.88 0 1 0 130.26 65.38" fill="#fff" stroke="#231f20" stroke-miterlimit="10" />
<path d="M 130.26 65.38 A 64.88 64.88 0 1 0 0.5 65.38" fill="#fff" stroke="#231f20" stroke-miterlimit="10" />
<path d="M 213.19000000000003 78.28 A 113.1 56.35 0 1 0 439.39 78.28" fill="#fff" stroke="#231f20" stroke-miterlimit="10" />
<path d="M 439.39 78.28 A 113.1 56.35 0 1 0 213.19 78.28" fill="#fff" stroke="#231f20" stroke-miterlimit="10" />
<path d="M 171.11168970655993 346.09377457746245 A 139.67999999999998 77.77999999999999 42.360000000000014 1 0 275.92594630371275 231.14645962845552" fill="#fff" stroke="#231f20" stroke-miterlimit="10" />
<path d="M 275.92594630371275 231.14645962845552 A 139.67999999999998 77.77999999999999 42.360000000000014 1 0 171.11168970655993 346.09377457746245" fill="#fff" stroke="#231f20" stroke-miterlimit="10" />
</svg>`);

			expect(new FlatSVG(test1).segmentsAsSVG).to.equal(`<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 612 792" enable-background="new 0 0 612 792" xml:space="preserve">
<line x1="221.7" y1="212.6" x2="281.8" y2="229.6" fill="#ABCDEF" />
<line x1="281.8" y1="229.6" x2="305.2" y2="303.7" fill="#ABCDEF" />
<line x1="305.2" y1="303.7" x2="336.2" y2="234.5" fill="#ABCDEF" />
<line x1="336.2" y1="234.5" x2="397.6" y2="228.5" fill="#ABCDEF" />
<line x1="397.6" y1="228.5" x2="356.6" y2="168.7" fill="#ABCDEF" />
<line x1="356.6" y1="168.7" x2="371.2" y2="90.8" fill="#ABCDEF" />
<line x1="371.2" y1="90.8" x2="314.8" y2="123.1" fill="#ABCDEF" />
<line x1="314.8" y1="123.1" x2="262.5" y2="81" fill="#ABCDEF" />
<line x1="262.5" y1="81" x2="268.6" y2="160.7" fill="#ABCDEF" />
<line x1="268.6" y1="160.7" x2="221.7" y2="212.6" fill="#ABCDEF" />
<line x1="225.7" y1="208.1" x2="221.7" y2="212.6" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="221.7" y1="212.6" x2="227.5" y2="214.2" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="237.2" y1="217" x2="271.2" y2="226.6" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" stroke-dasharray="10.1002,10.1002" />
<line x1="276.1" y1="227.9" x2="281.8" y2="229.6" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="281.8" y1="229.6" x2="283.6" y2="235.3" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="287.6" y1="247.8" x2="301.4" y2="291.7" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" stroke-dasharray="13.1505,13.1505" />
<line x1="303.4" y1="298" x2="305.2" y2="303.7" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="305.2" y1="303.7" x2="307.6" y2="298.3" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="312.9" y1="286.6" x2="331.1" y2="245.8" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" stroke-dasharray="12.7734,12.7734" />
<line x1="333.7" y1="240" x2="336.2" y2="234.5" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="336.2" y1="234.5" x2="342.2" y2="233.9" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="352" y1="232.9" x2="386.6" y2="229.6" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" stroke-dasharray="9.9329,9.9329" />
<line x1="391.6" y1="229.1" x2="397.6" y2="228.5" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="397.6" y1="228.5" x2="394.2" y2="223.6" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="387.3" y1="213.6" x2="363.4" y2="178.6" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" stroke-dasharray="12.0987,12.0987" />
<line x1="360" y1="173.7" x2="356.6" y2="168.7" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="356.6" y1="168.7" x2="357.7" y2="162.8" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="360.1" y1="149.6" x2="368.8" y2="103.3" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" stroke-dasharray="13.4452,13.4452" />
<line x1="370" y1="96.7" x2="371.2" y2="90.8" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="371.2" y1="90.8" x2="365.9" y2="93.8" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="356.8" y1="99.1" x2="324.6" y2="117.5" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" stroke-dasharray="10.5857,10.5857" />
<line x1="320" y1="120.1" x2="314.8" y2="123.1" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="314.8" y1="123.1" x2="310.1" y2="119.4" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="301.5" y1="112.4" x2="271.4" y2="88.2" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" stroke-dasharray="11.0407,11.0407" />
<line x1="267.1" y1="84.8" x2="262.5" y2="81" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="262.5" y1="81" x2="262.9" y2="87" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="264" y1="100.5" x2="267.6" y2="148" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" stroke-dasharray="13.5979,13.5979" />
<line x1="268.2" y1="154.8" x2="268.6" y2="160.7" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="268.6" y1="160.7" x2="264.6" y2="165.2" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="256.8" y1="173.8" x2="229.6" y2="203.8" fill="none" stroke="#000000" stroke-width="4" stroke-miterlimit="10" stroke-dasharray="11.5865,11.5865" />
<line x1="113.7" y1="526.5" x2="363.9" y2="546.7" fill="#27AAE1" stroke="#EC008C" stroke-miterlimit="10" />
<path d="M 363.9 546.7 C 363.9 546.7 288 574 233.59999999999997 535.6 " fill="#27AAE1" stroke="#EC008C" stroke-miterlimit="10" />
<path d="M 233.59999999999997 535.6 C 179.19999999999993 497.20000000000005 291.9 472 211.39999999999998 413.6 " fill="#27AAE1" stroke="#EC008C" stroke-miterlimit="10" />
<path d="M 211.39999999999998 413.6 C 130.89999999999998 355.20000000000005 115.79999999999998 418.90000000000003 115.79999999999998 418.90000000000003 " fill="#27AAE1" stroke="#EC008C" stroke-miterlimit="10" />
<line x1="115.79999999999998" y1="418.90000000000003" x2="115.79999999999998" y2="431.3" fill="#27AAE1" stroke="#EC008C" stroke-miterlimit="10" />
<path d="M 115.79999999999998 431.3 Q 119.19999999999999 445.8 119.19999999999999 425.7 " fill="#27AAE1" stroke="#EC008C" stroke-miterlimit="10" />
<line x1="119.19999999999999" y1="425.7" x2="113.7" y2="526.5" fill="#27AAE1" stroke="#EC008C" stroke-miterlimit="10" />
<path d="M 76.75157000000002 118.31114 C 97.26985420320372 141.30406857316055 127.39844006531033 147.90073193206865 144.04565 133.04520000000002 " fill="#FF0000" stroke="#000000" stroke-width="4" stroke-miterlimit="10" stroke-dasharray="12" />
<path d="M 144.04565 133.04520000000002 C 160.69285993468972 118.18966806793138 157.5547342032037 87.50742857316052 137.03645 64.5145 " fill="#FF0000" stroke="#000000" stroke-width="4" stroke-miterlimit="10" stroke-dasharray="12" />
<path d="M 137.03645 64.5145 C 116.5181657967963 41.52157142683948 86.38957993468972 34.92490806793137 69.74237 49.78044 " fill="#FF0000" stroke="#000000" stroke-width="4" stroke-miterlimit="10" stroke-dasharray="12" />
<path d="M 69.74237 49.78044 C 53.09516006531032 64.63597193206861 56.2332857967963 95.31821142683947 76.75157000000002 118.31114 " fill="#FF0000" stroke="#000000" stroke-width="4" stroke-miterlimit="10" stroke-dasharray="12" />
<path d="M 94 267.9 C 94 290.875045592961 108.28211648039769 309.5 125.9 309.5 " fill="#FFFFFF" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<path d="M 125.9 309.5 C 143.51788351960232 309.5 157.8 290.875045592961 157.8 267.9 " fill="#FFFFFF" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<path d="M 157.8 267.9 C 157.8 244.92495440703897 143.51788351960232 226.29999999999998 125.9 226.29999999999998 " fill="#FFFFFF" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<path d="M 125.9 226.29999999999998 C 108.2821164803977 226.29999999999998 94.00000000000001 244.92495440703897 94 267.9 " fill="#FFFFFF" stroke="#000000" stroke-width="4" stroke-miterlimit="10" />
<line x1="457.4" y1="196.2" x2="517.3" y2="138.4" fill="goldenrod" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" />
<line x1="517.3" y1="138.4" x2="530" y2="58" fill="goldenrod" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" />
<line x1="530" y1="58" x2="470.2" y2="115.7" fill="goldenrod" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" />
<line x1="470.2" y1="115.7" x2="457.4" y2="196.2" fill="goldenrod" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" />
<line x1="502.1" y1="274.2" x2="402.5" y2="525.9" fill="none" stroke="#000000" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" />
</svg>`);
			expect((new FlatSVG('<svg/>')).segmentsAsSVG).to.equal('<svg >\n\n</svg>');
		});

		it('composes nested ancestor transforms and bakes them into segment coordinates', () => {
			const flatSVG = new FlatSVG(nested_transforms);
			expect(flatSVG.elements.length).to.equal(4);
			expect(flatSVG.paths.length).to.equal(4);
			expect(flatSVG.segments.length).to.equal(16);
			expect(flatSVG.warnings.length).to.equal(0);
			// Direct assertion on path d-strings: verifies that ancestral
			// transforms are baked into FlatPath.properties.d, not just into
			// segments downstream. The first two paths exercise the rotation+
			// translation matrix from the inner <g>; the last two exercise the
			// outer translate(356, 200).
			expect(flatSVG.pathsAsSVG).to.equal(`<svg id="a" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 792">
<path opacity="0.0625" class="c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" fill="#696a6d" d="M377.491876,296.57718700000004 L474.387883,210.109741 L519.349357,260.493874 L422.45335,346.96132 L377.491876,296.57718700000004 Z" />
<path opacity="0.125" class="b" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" d="M440.60971599999993,367.307467 L537.505723,280.840021 L582.4671969999999,331.224154 L485.57119,417.6916 L440.60971599999993,367.307467 Z" />
<path opacity="0.25" class="b" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" d="M395.74,428 L525.61,428 L525.61,495.53 L395.74,495.53 L395.74,428 Z" />
<path opacity="0.5" class="b" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" d="M395.74,522.81 L525.61,522.81 L525.61,590.34 L395.74,590.34 L395.74,522.81 Z" />
</svg>`);
			expect(flatSVG.segmentsAsSVG).to.equal(`<svg id="a" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 792">
<line x1="377.491876" y1="296.57718700000004" x2="474.387883" y2="210.109741" opacity="0.0625" class="c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" fill="#696a6d" />
<line x1="474.387883" y1="210.109741" x2="519.349357" y2="260.493874" opacity="0.0625" class="c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" fill="#696a6d" />
<line x1="519.349357" y1="260.493874" x2="422.45335" y2="346.96132" opacity="0.0625" class="c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" fill="#696a6d" />
<line x1="422.45335" y1="346.96132" x2="377.491876" y2="296.57718700000004" opacity="0.0625" class="c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" fill="#696a6d" />
<line x1="440.60971599999993" y1="367.307467" x2="537.505723" y2="280.840021" opacity="0.125" class="b" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="537.505723" y1="280.840021" x2="582.4671969999999" y2="331.224154" opacity="0.125" class="b" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="582.4671969999999" y1="331.224154" x2="485.57119" y2="417.6916" opacity="0.125" class="b" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="485.57119" y1="417.6916" x2="440.60971599999993" y2="367.307467" opacity="0.125" class="b" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="395.74" y1="428" x2="525.61" y2="428" opacity="0.25" class="b" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="525.61" y1="428" x2="525.61" y2="495.53" opacity="0.25" class="b" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="525.61" y1="495.53" x2="395.74" y2="495.53" opacity="0.25" class="b" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="395.74" y1="495.53" x2="395.74" y2="428" opacity="0.25" class="b" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="395.74" y1="522.81" x2="525.61" y2="522.81" opacity="0.5" class="b" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="525.61" y1="522.81" x2="525.61" y2="590.34" opacity="0.5" class="b" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="525.61" y1="590.34" x2="395.74" y2="590.34" opacity="0.5" class="b" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
<line x1="395.74" y1="590.34" x2="395.74" y2="522.81" opacity="0.5" class="b" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" />
</svg>`);
		});

		it('should be readonly', () => {
			const flatSVG = new FlatSVG(inline_styles);
			expect(() => { flatSVG.segmentsAsSVG = ''; })
				.to.throw(Error, 'No segmentsAsSVG setter on FlatSVG.');
		});

		it('emits arc flags as 0/1 for every (largeArc, sweep) combination', () => {
			// All four flag combos in one path so we exercise both sides of the
			// `largeArcFlag ? 1 : 0` and `sweepFlag ? 1 : 0` ternaries in segmentsAsSVG.
			const svg = `<svg viewBox="0 0 100 100"><path d="M 10 10 A 20 20 0 0 0 30 30 A 20 20 0 0 1 50 50 A 20 20 0 1 0 70 70 A 20 20 0 1 1 90 90"/></svg>`;
			const out = new FlatSVG(svg, { preserveArcs: true }).segmentsAsSVG;
			expect(out).to.contain('A 20 20 0 0 0 30 30');
			expect(out).to.contain('A 20 20 0 0 1 50 50');
			expect(out).to.contain('A 20 20 0 1 0 70 70');
			expect(out).to.contain('A 20 20 0 1 1 90 90');
		});
	});

	describe('filterElementsByStyle()', () => {
		it('filters by arbitrary string-valued attributes via exact equality', () => {
			// opacity_groups doesn't have our fake attribute, so construct an SVG that does.
			const svg = `<svg viewBox="0 0 10 10">
				<rect x="0" y="0" width="5" height="5" data-tag="foo"/>
				<rect x="5" y="5" width="5" height="5" data-tag="bar"/>
			</svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.filterElementsByStyle({key: 'data-tag', value: 'foo'}).length).to.equal(1);
			expect(flatSVG.filterElementsByStyle({key: 'data-tag', value: 'bar'}).length).to.equal(1);
			expect(flatSVG.filterElementsByStyle({key: 'data-tag', value: 'missing'}).length).to.equal(0);
		});

		it('does NOT throw for unknown keys with string values (was: throw; now: return empty)', () => {
			// Regression guard. Earlier behavior was to throw for any unknown filter key
			// with a non-number value. We changed it so string values take the string-equality
			// branch (returning empty when no element matches) rather than throwing.
			const flatSVG = new FlatSVG(opacity_groups);
			expect(() => {
				flatSVG.filterElementsByStyle([{key: 'afsdfasdf', value: 'fsdf', tolerance: 0}]);
			}).not.to.throw();
		});

		it('does NOT emit a warning for string filter values (unsupported types throw, not warn)', () => {
			// The string-equality branch in _filterByStyle handles string values without
			// warning. Truly unsupported value types (objects, null, etc.) throw at the
			// filter call site instead — see the separate `throws on filter values of
			// unsupported type` test below.
			const flatSVG = new FlatSVG(opacity_groups);
			flatSVG.filterElementsByStyle([{key: 'afsdfasdf', value: 'fsdf', tolerance: 0}]);
			expect(flatSVG.warnings).to.deep.equal([]);
		});

            it('throws on filter values of unsupported type', () => {
                const flatSVG = new FlatSVG(opacity_groups);
                expect(() => {
                    flatSVG.filterElementsByStyle([
                        // @ts-ignore — deliberately passing an unsupported value type.
                        { key: 'afsdfasdf', value: { notAValue: true }, tolerance: 0 },
                    ]);
                }).to.throw(Error, 'flat-svg cannot handle filters with key "afsdfasdf" and value {"notAValue":true} of type object.');
            });

		it('elements with unparseable color values do not match a real color filter', () => {
			// Invalid color strings (colord rejects them) shouldn't match any real color filter.
			const svg = `<svg viewBox="0 0 10 10">
				<rect x="0" y="0" width="5" height="5" stroke="notacolor" fill="none"/>
				<rect x="5" y="5" width="5" height="5" stroke="red" fill="none"/>
			</svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.filterElementsByStyle({ key: 'stroke', value: 'red' }).length).to.equal(1);
		});

		it('should filter by opacity', () => {
			const flatSVG = new FlatSVG(opacity_groups);
			expect(flatSVG.filterElementsByStyle([
				{
					key: 'opacity',
					value: 0.5,
					tolerance: 0,
				},
			]).length).to.equal(1);
			expect(flatSVG.filterElementsByStyle([
				{
					key: 'opacity',
					value: 0.25,
					tolerance: 0,
				},
			]).length).to.equal(1);
			expect(flatSVG.filterSegmentsByStyle([
				{
					key: 'opacity',
					value: 0.125,
					tolerance: 0,
				},
			]).length).to.equal(4);
			expect(flatSVG.filterPathsByStyle([
				{
					key: 'opacity',
					value: 0.0625,
				},
			]).length).to.equal(1);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('opacity filter matches the multiplied opacity composed during flattening', () => {
			const flatSVG = new FlatSVG(mixed_alpha);
			expect(flatSVG.elements.length).to.equal(4);
			expect(flatSVG.paths.length).to.equal(4);
			expect(flatSVG.segments.length).to.equal(16);
			expect(flatSVG.filterElementsByStyle([
				{
					key: 'opacity',
					value: 0.5,
					tolerance: 0,
				},
			]).length).to.equal(0);
			expect(flatSVG.filterElementsByStyle([
				{
					key: 'opacity',
					value: 0.25,
					tolerance: 0,
				},
			]).length).to.equal(1);
			expect(flatSVG.filterSegmentsByStyle([
				{
					key: 'opacity',
					value: 0.125,
					tolerance: 0,
				},
			]).length).to.equal(4);
			expect(flatSVG.filterPathsByStyle([
				{
					key: 'opacity',
					value: 0.0625,
				},
			]).length).to.equal(1);
			expect(flatSVG.filterPathsByStyle([
				{
					key: 'opacity',
					value: 0,
				},
			]).length).to.equal(1);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('should parse AI generated inline styles', () => {
			const flatSVG = new FlatSVG(inline_styles);
			expect(flatSVG.elements.length).to.equal(4);
			expect(flatSVG.paths.length).to.equal(4);
			expect(flatSVG.segments.length).to.equal(16);
			expect(flatSVG.filterElementsByStyle([
				{
					key: 'opacity',
					value: 0.5,
					tolerance: 0,
				},
			]).length).to.equal(1);
			expect(flatSVG.filterElementsByStyle([
				{
					key: 'opacity',
					value: 0.25,
					tolerance: 0,
				},
			]).length).to.equal(1);
			expect(flatSVG.filterSegmentsByStyle([
				{
					key: 'opacity',
					value: 0.125,
					tolerance: 0,
				},
			]).length).to.equal(4);
			expect(flatSVG.filterPathsByStyle([
				{
					key: 'opacity',
					value: 0.0625,
				},
			]).length).to.equal(1);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('should parse inline styles with ids', () => {
			const flatSVG = new FlatSVG(internal_css_w_ids);
			expect(flatSVG.elements.length).to.equal(4);
			expect(flatSVG.paths.length).to.equal(4);
			expect(flatSVG.segments.length).to.equal(16);
			expect(flatSVG.filterElementsByStyle([
				{
					key: 'opacity',
					value: 0.5,
					tolerance: 0,
				},
			]).length).to.equal(1);
			expect(flatSVG.filterElementsByStyle([
				{
					key: 'opacity',
					value: 0.25,
					tolerance: 0,
				},
			]).length).to.equal(1);
			expect(flatSVG.filterSegmentsByStyle([
				{
					key: 'opacity',
					value: 0.125,
					tolerance: 0,
				},
			]).length).to.equal(4);
			expect(flatSVG.filterPathsByStyle([
				{
					key: 'opacity',
					value: 0.0625,
				},
			]).length).to.equal(1);
			expect(flatSVG.filterPathsByStyle([
				{
					key: 'stroke-dasharray',
					value: 5,
				},
			]).length).to.equal(1);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('should parse AI generated style elements', () => {
			const flatSVG = new FlatSVG(style_elements);
			expect(flatSVG.filterElementsByStyle([
				{
					key: 'opacity',
					value: 0.5,
					tolerance: 0,
				},
			]).length).to.equal(1);
			expect(flatSVG.filterElementsByStyle([
				{
					key: 'opacity',
					value: 0.25,
					tolerance: 0,
				},
			]).length).to.equal(1);
			expect(flatSVG.filterSegmentsByStyle([
				{
					key: 'opacity',
					value: 0.125,
					tolerance: 0,
				},
			]).length).to.equal(4);
			expect(flatSVG.filterPathsByStyle([
				{
					key: 'opacity',
					value: 0.0625,
				},
			]).length).to.equal(1);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('should parse AI generated internal css', () => {
			const flatSVG = new FlatSVG(internal_css);
			expect(flatSVG.elements.length).to.equal(4);
			expect(flatSVG.paths.length).to.equal(4);
			expect(flatSVG.segments.length).to.equal(16);
			// internal_css.svg's <defs> contains only <style> — no actual definition items.
			expect(flatSVG.defs.length).to.equal(0);
			expect(flatSVG.filterElementsByStyle([
				{
					key: 'opacity',
					value: 0.5,
					tolerance: 0,
				},
			]).length).to.equal(1);
			expect(flatSVG.filterElementsByStyle([
				{
					key: 'opacity',
					value: 0.25,
					tolerance: 0,
				},
			]).length).to.equal(1);
			expect(flatSVG.filterSegmentsByStyle([
				{
					key: 'opacity',
					value: 0.125,
					tolerance: 0,
				},
			]).length).to.equal(4);
			expect(flatSVG.filterPathsByStyle([
				{
					key: 'opacity',
					value: 0.0625,
				},
			]).length).to.equal(1);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('collects <clipPath> into defs and excludes it from elements', () => {
			const flatSVG = new FlatSVG(clipping_mask);
			// clipping_mask.svg defines one <clipPath id="b"> in <defs> (plus a <style>).
			expect(flatSVG.defs.length).to.equal(1);
			expect(flatSVG.defs[0]).to.deep.equal({tagName: 'clipPath', id: 'b'});
			expect(flatSVG.elements.length).to.equal(4);
			expect(flatSVG.paths.length).to.equal(4);
			expect(flatSVG.segments.length).to.equal(16);
			expect(flatSVG.filterElementsByStyle([
				{
					key: 'opacity',
					value: 0.5,
					tolerance: 0,
				},
			]).length).to.equal(1);
			expect(flatSVG.filterElementsByStyle([
				{
					key: 'opacity',
					value: 0.25,
					tolerance: 0,
				},
			]).length).to.equal(1);
			expect(flatSVG.filterSegmentsByStyle([
				{
					key: 'opacity',
					value: 0.125,
					tolerance: 0,
				},
			]).length).to.equal(4);
			expect(flatSVG.filterPathsByStyle([
				{
					key: 'opacity',
					value: 0.0625,
				},
			]).length).to.equal(1);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('should exclude objects from filter', () => {
			const flatSVG = new FlatSVG(opacity_groups);
			expect(flatSVG.filterElementsByStyle([
				{
					key: 'opacity',
					value: 0.5,
					tolerance: 0,
				},
			], Array(flatSVG.elements.length).fill(true)).length).to.equal(0);
			expect(flatSVG.filterElementsByStyle([
				{
					key: 'opacity',
					value: 0.25,
					tolerance: 0,
				},
			], Array(flatSVG.elements.length).fill(true)).length).to.equal(0);
			expect(flatSVG.filterSegmentsByStyle([
				{
					key: 'opacity',
					value: 0.125,
					tolerance: 0,
				},
			], Array(flatSVG.segments.length).fill(true)).length).to.equal(0);
			expect(flatSVG.filterSegmentsByStyle([
				{
					key: 'opacity',
					value: 0.125,
					tolerance: 0,
				},
			], flatSVG.segments.map((_, i) => !!(i % 2))).length).to.equal(2);
			expect(flatSVG.filterPathsByStyle([
				{
					key: 'opacity',
					value: 0.0625,
				},
			], Array(flatSVG.segments.length).fill(true)).length).to.equal(0);
			expect(flatSVG.warnings.length).to.equal(0);
		});

	});

	describe('filterElementIndicesByStyle', () => {
		it('returns indices that map back to filterElementsByStyle output', () => {
			const flatSVG = new FlatSVG(test1);
			const filter = {key: 'stroke', value: '#000000', tolerance: 0.01};
			const indices = flatSVG.filterElementIndicesByStyle(filter);
			const objects = flatSVG.filterElementsByStyle(filter);
			expect(indices.length).to.equal(objects.length);
			expect(indices.map((i) => flatSVG.elements[i])).to.deep.equal(objects);
		});

		it('honors exclude[] array', () => {
			const flatSVG = new FlatSVG(test1);
			const filter = {key: 'stroke', value: '#000000', tolerance: 0.01};
			const excluded = new Array(flatSVG.elements.length).fill(false);
			const first = flatSVG.filterElementIndicesByStyle(filter, excluded);
			expect(first.length).to.be.greaterThan(0);
			for (const i of first) excluded[i] = true;
			const second = flatSVG.filterElementIndicesByStyle(filter, excluded);
			expect(second.length).to.equal(0);
		});
	});

	describe('filterPathsByStyle()', () => {
		it('should filter paths by stroke', () => {
			const flatSVG = new FlatSVG(miura);
			expect(flatSVG.paths.length).to.equal(337);
			expect(flatSVG.filterPathsByStyle({
				key: 'stroke',
				value: 'red',
			}).length).to.equal(137);
			expect(flatSVG.filterPathsByStyle({
				key: 'stroke',
				value: 'blue',
			}).length).to.equal(150);
			expect(flatSVG.filterPathsByStyle({
				key: 'stroke',
				value: 'black',
			}).length).to.equal(50);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('should filter paths by stroke-width', () => {
			const flatSVG = new FlatSVG(test1);
			expect(flatSVG.paths.length).to.equal(26);
			expect(flatSVG.filterPathsByStyle({
				key: 'stroke-width',
				value: 4,
			}).length).to.equal(22);
			expect(flatSVG.filterPathsByStyle({
				key: 'stroke-width',
				value: 5,
			}).length).to.equal(1);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('should filter paths by fill', () => {
			const flatSVG = new FlatSVG(test1);
			expect(flatSVG.filterPathsByStyle({
				key: 'fill',
				value: '#ABCDEF',
			}).length).to.equal(1);
			expect(flatSVG.filterPathsByStyle({
				key: 'fill',
				value: 'none',
			}).length).to.equal(21);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('should NOT mutate filter object', () => {
			const flatSVG = new FlatSVG(miura);
			const filter = {
				key: 'stroke',
				value: 'blue',
			};
			const filterCopy = JSON.parse(JSON.stringify(filter));
			flatSVG.filterPathsByStyle(filter);
			expect(filter).to.deep.equal(filterCopy);
		});

		it('should catch bad stroke-dasharray filter values', () => {
			const flatSVG = new FlatSVG(miura_dashed);
			expect(() => {flatSVG.filterPathsByStyle({
				key: 'stroke-dasharray',
				value: 0,
			})}).to.throw(Error, 'Expected positive number for stroke-dasharray value, got 0.');
			expect(() => {flatSVG.filterPathsByStyle({
				key: 'stroke-dasharray',
				value: NaN,
			})}).to.throw(Error, 'Invalid type number for stroke-dasharray property NaN.');
			expect(() => {flatSVG.filterPathsByStyle({
				key: 'stroke-dasharray',
				// @ts-ignore
				value: false,
			})}).to.throw(Error, 'Invalid type boolean for stroke-dasharray property false.');
			expect(() => {flatSVG.filterPathsByStyle({
				key: 'stroke-dasharray',
				value: -10.3,
			})}).to.throw(Error, 'Expected positive number for stroke-dasharray value, got -10.3.');
			expect(() => {flatSVG.filterPathsByStyle({
				key: 'stroke-dasharray',
				value: 'test',
			})}).to.throw(Error, 'Expected positive number for stroke-dasharray value, got NaN from string "test".');
			expect(() => {flatSVG.filterPathsByStyle({
				key: 'stroke-dasharray',
				value: '-4',
			})}).to.throw(Error, 'Expected positive number for stroke-dasharray value, got -4 from string "-4".');
			expect(() => {flatSVG.filterPathsByStyle({
				key: 'stroke-dasharray',
				// @ts-ignore
				value: ['test'],
			})}).to.throw(Error, 'Expected positive number for stroke-dasharray value, got test from array ["test"].');
			expect(() => {flatSVG.filterPathsByStyle({
				key: 'stroke-dasharray',
				value: [3, 5.3, -2.4],
			})}).to.throw(Error, 'Expected positive number for stroke-dasharray value, got -2.4 from array [3,5.3,-2.4].');
			expect(() => {flatSVG.filterPathsByStyle({
				key: 'stroke-dasharray',
				value: [3, 4, 0, 5],
			})}).to.throw(Error, 'Expected positive number for stroke-dasharray value, got 0 from array [3,4,0,5].');
		});

		it('should filter paths by stroke-dasharray', () => {
			const flatSVG = new FlatSVG(miura_dashed);
			expect(flatSVG.paths.length).to.equal(337);
			expect(flatSVG.filterPathsByStyle({
				key: 'stroke-dasharray',
				value: 6,
			}).length).to.equal(137);
			expect(flatSVG.filterPathsByStyle({
				key: 'stroke-dasharray',
				value: '6',
			}).length).to.equal(137);
			expect(flatSVG.filterPathsByStyle({
				key: 'stroke-dasharray',
				value: [6],
			}).length).to.equal(137);
			expect(flatSVG.filterPathsByStyle({
				key: 'stroke-dasharray',
				value: '6 6',
			}).length).to.equal(137);
			expect(flatSVG.filterPathsByStyle({
				key: 'stroke-dasharray',
				value: [6, 6],
			}).length).to.equal(137);
			expect(flatSVG.filterPathsByStyle({
				key: 'stroke-dasharray',
				value: '12 4 2 4',
			}).length).to.equal(150);
			expect(flatSVG.filterPathsByStyle({
				key: 'stroke-dasharray',
				value: [12, 4, 2, 4],
			}).length).to.equal(150);
			expect(flatSVG.filterPathsByStyle({
				key: 'stroke-dasharray',
				value: '',
			}).length).to.equal(50);
			expect(flatSVG.filterPathsByStyle({
				key: 'stroke-dasharray',
				value: [],
			}).length).to.equal(50);
			expect(flatSVG.filterPathsByStyle({
				key: 'stroke-dasharray',
				// @ts-ignore
				value: undefined,
			}).length).to.equal(50);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('matches a stroke-dasharray that is an n× repeat of the filter value', () => {
			// Cyclic dash patterns: [5,10] and [5,10,5,10,5,10] both render as
			// "5 10 5 10 5 10 ..." and should match each other. The previous
			// 2×-only special case rejected the 3× variant; the n× repetition
			// check accepts any integer multiple in either direction.
			const svg = `<svg viewBox="0 0 100 100">
				<line x1="0" y1="0"  x2="10" y2="0"  stroke="red" stroke-dasharray="5 10"/>
				<line x1="0" y1="20" x2="10" y2="20" stroke="red" stroke-dasharray="5 10 5 10 5 10"/>
				<line x1="0" y1="40" x2="10" y2="40" stroke="red" stroke-dasharray="5 10 5 11 5 10"/>
			</svg>`;
			const flatSVG = new FlatSVG(svg);

			// Filter [5,10] matches the 1× element and the 3× element, but not
			// the third (one entry differs).
			expect(flatSVG.filterElementsByStyle({
				key: 'stroke-dasharray',
				value: [5, 10],
			}).length).to.equal(2);

			// Symmetric: filter [5,10,5,10,5,10] should also match both.
			expect(flatSVG.filterElementsByStyle({
				key: 'stroke-dasharray',
				value: [5, 10, 5, 10, 5, 10],
			}).length).to.equal(2);

			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('rejects stroke-dasharray whose length is not an integer multiple of the filter length', () => {
			// Cyclic dash matching requires longer.length % shorter.length === 0
			// so one side is an n× repetition of the other. Length 6 vs length 4
			// can't repeat — even if every value matched modulo, the rendered
			// patterns would diverge — so this branch fails fast. Both arrays
			// are even-length so convertToDashArray doesn't auto-double them.
			const svg = `<svg viewBox="0 0 100 100">
				<line x1="0" y1="0"  x2="10" y2="0"  stroke="red" stroke-dasharray="5 10 5 10 5 10"/>
				<line x1="0" y1="20" x2="10" y2="20" stroke="red" stroke-dasharray="5 10 5 10"/>
			</svg>`;
			const flatSVG = new FlatSVG(svg);

			// Filter [5,10,5,10] (length 4) vs element [5,10,5,10,5,10] (length 6):
			// 6 % 4 = 2, no match. The second line (length 4, exact match) does match.
			expect(flatSVG.filterElementsByStyle({
				key: 'stroke-dasharray',
				value: [5, 10, 5, 10],
			}).length).to.equal(1);

			// Symmetric: filter length 6 vs element length 4 also fails the divisibility check.
			expect(flatSVG.filterElementsByStyle({
				key: 'stroke-dasharray',
				value: [5, 10, 5, 10, 5, 10],
			}).length).to.equal(1);

			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('matches empty filter against elements with no stroke-dasharray (and rejects mismatch with dashed elements)', () => {
			// Edge case for the n× repetition check: when both arrays are
			// empty, the modular index would be `0 % 0 = NaN`. Empty must
			// match empty (no dash on either side) but NOT match a dashed
			// element.
			const svg = `<svg viewBox="0 0 100 100">
				<line x1="0" y1="0"  x2="10" y2="0"  stroke="red"/>
				<line x1="0" y1="20" x2="10" y2="20" stroke="red"/>
				<line x1="0" y1="40" x2="10" y2="40" stroke="red" stroke-dasharray="5 10"/>
			</svg>`;
			const flatSVG = new FlatSVG(svg);

			// Empty filter ('' / [] / undefined all normalize to []): matches
			// the two no-stroke-dasharray elements; the dashed third doesn't qualify.
			for (const value of ['', [], undefined] as const) {
				expect(flatSVG.filterElementsByStyle({
					key: 'stroke-dasharray',
					// @ts-ignore — undefined is intentional
					value,
				}).length).to.equal(2);
			}

			// Inverse: a non-empty filter must NOT match elements with no dasharray.
			expect(flatSVG.filterElementsByStyle({
				key: 'stroke-dasharray',
				value: [5, 10],
			}).length).to.equal(1);

			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('should use tolerance parameter for color filtering', () => {
			const flatSVG = new FlatSVG(miura);
			expect(flatSVG.filterPathsByStyle({
				key: 'stroke',
				value: 'tomato',
			}).length).to.equal(0);
			expect(flatSVG.filterPathsByStyle({
				key: 'stroke',
				value: 'tomato',
				tolerance: 0.1,
			}).length).to.equal(137);
			expect(flatSVG.filterPathsByStyle([
				{
					key: 'stroke',
					value: 'tomato',
					tolerance: 0.1,
				},
				{
					key: 'stroke',
					value: 'red',
					tolerance: 0.1,
				}
			]).length).to.equal(137);
			expect(flatSVG.filterPathsByStyle({
				key: 'stroke',
				value: 'blue',
				tolerance: 0,
			}).length).to.equal(150);
			expect(flatSVG.filterPathsByStyle([
				{
					key: 'stroke',
					value: 'black',
					tolerance: 0,
				},
				{
					key: 'stroke-width',
					value: 4,
					tolerance: 0.1,
				},
			]).length).to.equal(50);
			expect(flatSVG.filterPathsByStyle([
				{
					key: 'stroke',
					value: 'black',
					tolerance: 0,
				},
				{
					key: 'stroke-width',
					value: 10,
					tolerance: 0,
				},
			]).length).to.equal(0);
			expect(flatSVG.warnings.length).to.equal(0);
		});
	});

	describe('filterPathIndicesByStyle', () => {
		it('returns indices that map back to filterPathsByStyle output', () => {
			const flatSVG = new FlatSVG(miura);
			const filter = {key: 'stroke', value: 'red', tolerance: 0.01};
			const indices = flatSVG.filterPathIndicesByStyle(filter);
			const objects = flatSVG.filterPathsByStyle(filter);
			expect(indices.length).to.equal(objects.length);
			expect(indices.map((i) => flatSVG.paths[i])).to.deep.equal(objects);
		});

		it('honors exclude[] array', () => {
			const flatSVG = new FlatSVG(miura);
			const filter = {key: 'stroke', value: 'red', tolerance: 0.01};
			const excluded = new Array(flatSVG.paths.length).fill(false);
			const first = flatSVG.filterPathIndicesByStyle(filter, excluded);
			expect(first.length).to.be.greaterThan(0);
			for (const i of first) excluded[i] = true;
			const second = flatSVG.filterPathIndicesByStyle(filter, excluded);
			expect(second.length).to.equal(0);
		});
	});

	describe('filterSegmentsByStyle()', () => {
		it('should filter segments by stroke', () => {
			const flatSVG = new FlatSVG(miura);
			expect(flatSVG.segments.length).to.equal(337);
			expect(flatSVG.filterSegmentsByStyle({
				key: 'stroke',
				value: 'red',
			}).length).to.equal(137);
			expect(flatSVG.filterSegmentsByStyle({
				key: 'stroke',
				value: 'blue',
			}).length).to.equal(150);
			expect(flatSVG.filterSegmentsByStyle({
				key: 'stroke',
				value: 'black',
			}).length).to.equal(50);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('should NOT mutate filter object', () => {
			const flatSVG = new FlatSVG(miura);
			const filter = {
				key: 'stroke',
				value: 'blue',
			};
			const filterCopy = JSON.parse(JSON.stringify(filter));
			flatSVG.filterSegmentsByStyle(filter);
			expect(filter).to.deep.equal(filterCopy);
		});

		it('should catch bad stroke-dasharray filter values', () => {
			const flatSVG = new FlatSVG(miura_dashed);
			expect(() => {flatSVG.filterSegmentsByStyle({
				key: 'stroke-dasharray',
				value: 0,
			})}).to.throw(Error, 'Expected positive number for stroke-dasharray value, got 0.');
			expect(() => {flatSVG.filterSegmentsByStyle({
				key: 'stroke-dasharray',
				value: NaN,
			})}).to.throw(Error, 'Invalid type number for stroke-dasharray property NaN.');
			expect(() => {flatSVG.filterSegmentsByStyle({
				key: 'stroke-dasharray',
				// @ts-ignore
				value: false,
			})}).to.throw(Error, 'Invalid type boolean for stroke-dasharray property false.');
			expect(() => {flatSVG.filterSegmentsByStyle({
				key: 'stroke-dasharray',
				value: -10.3,
			})}).to.throw(Error, 'Expected positive number for stroke-dasharray value, got -10.3.');
			expect(() => {flatSVG.filterSegmentsByStyle({
				key: 'stroke-dasharray',
				value: 'test',
			})}).to.throw(Error, 'Expected positive number for stroke-dasharray value, got NaN from string "test".');
			expect(() => {flatSVG.filterSegmentsByStyle({
				key: 'stroke-dasharray',
				value: '-4',
			})}).to.throw(Error, 'Expected positive number for stroke-dasharray value, got -4 from string "-4".');
			expect(() => {flatSVG.filterSegmentsByStyle({
				key: 'stroke-dasharray',
				// @ts-ignore
				value: ['test'],
			})}).to.throw(Error, 'Expected positive number for stroke-dasharray value, got test from array ["test"].');
			expect(() => {flatSVG.filterSegmentsByStyle({
				key: 'stroke-dasharray',
				value: [3, 5.3, -2.4],
			})}).to.throw(Error, 'Expected positive number for stroke-dasharray value, got -2.4 from array [3,5.3,-2.4].');
			expect(() => {flatSVG.filterSegmentsByStyle({
				key: 'stroke-dasharray',
				value: [3, 4, 0, 5],
			})}).to.throw(Error, 'Expected positive number for stroke-dasharray value, got 0 from array [3,4,0,5].');
		});

		it('should filter segments by stroke-dasharray', () => {
			const flatSVG = new FlatSVG(miura_dashed);
			expect(flatSVG.segments.length).to.equal(337);
			expect(flatSVG.filterSegmentsByStyle({
				key: 'stroke-dasharray',
				value: 6,
			}).length).to.equal(137);
			expect(flatSVG.filterSegmentsByStyle({
				key: 'stroke-dasharray',
				value: '6',
			}).length).to.equal(137);
			expect(flatSVG.filterSegmentsByStyle({
				key: 'stroke-dasharray',
				value: [6],
			}).length).to.equal(137);
			expect(flatSVG.filterSegmentsByStyle({
				key: 'stroke-dasharray',
				value: '6 6',
			}).length).to.equal(137);
			expect(flatSVG.filterSegmentsByStyle({
				key: 'stroke-dasharray',
				value: [6, 6],
			}).length).to.equal(137);
			expect(flatSVG.filterSegmentsByStyle({
				key: 'stroke-dasharray',
				value: '12 4 2 4',
			}).length).to.equal(150);
			expect(flatSVG.filterSegmentsByStyle({
				key: 'stroke-dasharray',
				value: [12, 4, 2, 4],
			}).length).to.equal(150);
			expect(flatSVG.filterSegmentsByStyle({
				key: 'stroke-dasharray',
				value: '',
			}).length).to.equal(50);
			expect(flatSVG.filterSegmentsByStyle({
				key: 'stroke-dasharray',
				value: [],
			}).length).to.equal(50);
			expect(flatSVG.filterSegmentsByStyle({
				key: 'stroke-dasharray',
				// @ts-ignore
				value: undefined,
			}).length).to.equal(50);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('should use tolerance parameter for color filtering', () => {
			const flatSVG = new FlatSVG(miura);
			expect(flatSVG.filterSegmentsByStyle({
				key: 'stroke',
				value: 'tomato',
			}).length).to.equal(0);
			expect(flatSVG.filterSegmentsByStyle({
				key: 'stroke',
				value: 'tomato',
				tolerance: 0.1,
			}).length).to.equal(137);
			expect(flatSVG.filterSegmentsByStyle([
				{
					key: 'stroke',
					value: 'tomato',
					tolerance: 0.1,
				},
				{
					key: 'stroke',
					value: 'red',
					tolerance: 0.1,
				}
			]).length).to.equal(137);
			expect(flatSVG.filterSegmentsByStyle({
				key: 'stroke',
				value: 'blue',
				tolerance: 0,
			}).length).to.equal(150);
			expect(flatSVG.filterSegmentsByStyle([
				{
					key: 'stroke',
					value: 'black',
					tolerance: 0,
				},
				{
					key: 'stroke-width',
					value: 4,
					tolerance: 0.1,
				},
			]).length).to.equal(50);
			expect(flatSVG.filterSegmentsByStyle([
				{
					key: 'stroke',
					value: 'black',
					tolerance: 0,
				},
				{
					key: 'stroke-width',
					value: 10,
					tolerance: 0,
				},
			]).length).to.equal(0);
			expect(flatSVG.warnings.length).to.equal(0);
		});
	});

	describe('filterSegmentIndicesByStyle', () => {
		it('returns indices that map back to filterSegmentsByStyle output', () => {
			const flatSVG = new FlatSVG(miura);
			const filter = {key: 'stroke', value: 'blue', tolerance: 0.01};
			const indices = flatSVG.filterSegmentIndicesByStyle(filter);
			const objects = flatSVG.filterSegmentsByStyle(filter);
			expect(indices.length).to.equal(objects.length);
			expect(indices.map((i) => flatSVG.segments[i])).to.deep.equal(objects);
		});

		it('honors exclude[] array', () => {
			const flatSVG = new FlatSVG(miura);
			const filter = {key: 'stroke', value: 'red', tolerance: 0.1};
			const excluded = new Array(flatSVG.segments.length).fill(false);
			const first = flatSVG.filterSegmentIndicesByStyle(filter, excluded);
			expect(first.length).to.be.greaterThan(0);
			for (const i of first) excluded[i] = true;
			const second = flatSVG.filterSegmentIndicesByStyle(filter, excluded);
			expect(second.length).to.equal(0);
		});
	});

	describe("filter stroke='none'", () => {
		it('matches elements with no stroke attribute', () => {
			const flatSVG = new FlatSVG(strokeless_variants);
			const matches = flatSVG.filterElementsByStyle({key: 'stroke', value: 'none'});
			expect(matches).to.include(flatSVG.elements[0]);
		});

		it('matches elements with stroke="none"', () => {
			const flatSVG = new FlatSVG(strokeless_variants);
			const matches = flatSVG.filterElementsByStyle({key: 'stroke', value: 'none'});
			expect(matches).to.include(flatSVG.elements[1]);
		});

		it('does NOT match stroke="transparent" (explicit color)', () => {
			const flatSVG = new FlatSVG(strokeless_variants);
			const matches = flatSVG.filterElementsByStyle({key: 'stroke', value: 'none'});
			expect(matches).to.not.include(flatSVG.elements[2]);
		});

		it('does NOT match stroke="rgba(0,0,0,0)" (explicit color)', () => {
			const flatSVG = new FlatSVG(strokeless_variants);
			const matches = flatSVG.filterElementsByStyle({key: 'stroke', value: 'none'});
			expect(matches).to.not.include(flatSVG.elements[3]);
		});

		it('does NOT match elements with stroke set and stroke-opacity=0', () => {
			const flatSVG = new FlatSVG(strokeless_variants);
			const matches = flatSVG.filterElementsByStyle({key: 'stroke', value: 'none'});
			expect(matches).to.not.include(flatSVG.elements[4]);
		});

		it('does NOT match elements with stroke set and opacity=0', () => {
			const flatSVG = new FlatSVG(strokeless_variants);
			const matches = flatSVG.filterElementsByStyle({key: 'stroke', value: 'none'});
			expect(matches).to.not.include(flatSVG.elements[5]);
		});

		it('does NOT match a painted stroke', () => {
			const flatSVG = new FlatSVG(strokeless_variants);
			const matches = flatSVG.filterElementsByStyle({key: 'stroke', value: 'none'});
			expect(matches).to.not.include(flatSVG.elements[6]);
		});

		it('matches inherited stroke="none" from an ancestor <g>', () => {
			const svg = `<svg viewBox="0 0 100 100"><g stroke="none"><rect x="10" y="10" width="10" height="10" fill="blue"/></g></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.filterElementsByStyle({key: 'stroke', value: 'none'}).length).to.equal(1);
		});

		it('counts explicit/missing stroke on test1.svg', () => {
			const flatSVG = new FlatSVG(test1);
			expect(flatSVG.filterElementsByStyle({key: 'stroke', value: 'none'}).length).to.equal(1);
		});
	});

	describe("filter fill='none'", () => {
		it('matches fill="none"', () => {
			const flatSVG = new FlatSVG(fillless_variants);
			expect(flatSVG.filterElementsByStyle({key: 'fill', value: 'none'})).to.include(flatSVG.elements[0]);
		});

		it('does NOT match fill with fill-opacity=0', () => {
			const flatSVG = new FlatSVG(fillless_variants);
			expect(flatSVG.filterElementsByStyle({key: 'fill', value: 'none'})).to.not.include(flatSVG.elements[1]);
		});

		it('does NOT match fill="rgba(0,0,255,0)"', () => {
			const flatSVG = new FlatSVG(fillless_variants);
			expect(flatSVG.filterElementsByStyle({key: 'fill', value: 'none'})).to.not.include(flatSVG.elements[2]);
		});

		it('does NOT match fill set with opacity=0', () => {
			const flatSVG = new FlatSVG(fillless_variants);
			expect(flatSVG.filterElementsByStyle({key: 'fill', value: 'none'})).to.not.include(flatSVG.elements[3]);
		});

		it('matches elements with no fill attribute', () => {
			const flatSVG = new FlatSVG(fillless_variants);
			expect(flatSVG.filterElementsByStyle({key: 'fill', value: 'none'})).to.include(flatSVG.elements[4]);
		});

		it('does NOT match painted fill', () => {
			const flatSVG = new FlatSVG(fillless_variants);
			expect(flatSVG.filterElementsByStyle({key: 'fill', value: 'none'})).to.not.include(flatSVG.elements[5]);
		});

		it('counts explicit/missing fill on test1.svg', () => {
			const flatSVG = new FlatSVG(test1);
			expect(flatSVG.filterElementsByStyle({key: 'fill', value: 'none'}).length).to.equal(21);
		});
	});

	describe("filter stroke='none' + fill='none' composed", () => {
		it("AND-composition returns the intersection of two filters, not union/empty/first-only", () => {
			// 4 rects, each exercising a distinct combination of stroke and fill presence.
			const svg = `<svg viewBox="0 0 100 100">
				<rect x="0"  y="0" width="10" height="10" stroke="none" fill="none"/>
				<rect x="10" y="0" width="10" height="10" stroke="none" fill="red"/>
				<rect x="20" y="0" width="10" height="10" stroke="red"  fill="none"/>
				<rect x="30" y="0" width="10" height="10" stroke="red"  fill="red"/>
			</svg>`;
			const flatSVG = new FlatSVG(svg);

			// Single-filter sanity: each filter alone matches 2 elements.
			expect(flatSVG.filterElementsByStyle({key: 'stroke', value: 'none'}).length).to.equal(2);
			expect(flatSVG.filterElementsByStyle({key: 'fill', value: 'none'}).length).to.equal(2);

			// AND composition: only the first rect satisfies BOTH filters.
			const matches = flatSVG.filterElementsByStyle([
				{key: 'stroke', value: 'none'},
				{key: 'fill', value: 'none'},
			]);
			expect(matches.length).to.equal(1);
			expect((matches[0].properties as any).x).to.equal(0);
		});

		it('finds fill-only elements via exclude[] composition', () => {
			// Mark fillless elements as excluded, then filter for strokeless from the rest.
			// Result: stroke=none AND fill!=none = fill-only.
			const flatSVG = new FlatSVG(fill_only);
			const excluded = new Array(flatSVG.elements.length).fill(false);
			for (const i of flatSVG.filterElementIndicesByStyle({key: 'fill', value: 'none'})) excluded[i] = true;
			const fillOnly = flatSVG.filterElementsByStyle({key: 'stroke', value: 'none'}, excluded);
			expect(fillOnly.length).to.equal(2);
			const fills = fillOnly.map((e) => e.properties.fill).sort();
			expect(fills).to.deep.equal(['blue', 'red']);
		});

		it('counts fill-only elements on test1.svg via exclude[] composition', () => {
			const flatSVG = new FlatSVG(test1);
			const excluded = new Array(flatSVG.elements.length).fill(false);
			for (const i of flatSVG.filterElementIndicesByStyle({key: 'fill', value: 'none'})) excluded[i] = true;
			const fillOnly = flatSVG.filterElementsByStyle({key: 'stroke', value: 'none'}, excluded);
			expect(fillOnly.length).to.equal(1);
		});
	});

	describe('containsClipPaths', () => {
		it('returns true when an element has a clip-path attribute', () => {
			expect(new FlatSVG(clipping_mask).containsClipPaths).to.equal(true);
		});

		it('returns true when an element inherits clip-path from an ancestor', () => {
			const svg = `<svg viewBox="0 0 100 100"><g clip-path="url(#m)"><rect x="0" y="0" width="10" height="10"/></g></svg>`;
			expect(new FlatSVG(svg).containsClipPaths).to.equal(true);
		});

		it('returns false when no element has clip-path', () => {
			expect(new FlatSVG(test1).containsClipPaths).to.equal(false);
		});

		it('treats clip-path="none" as not clipped', () => {
			const svg = `<svg viewBox="0 0 100 100"><rect x="0" y="0" width="10" height="10" clip-path="none"/></svg>`;
			expect(new FlatSVG(svg).containsClipPaths).to.equal(false);
		});

		it('should be readonly', () => {
			const flatSVG = new FlatSVG(test1);
			expect(() => { flatSVG.containsClipPaths = false; })
				.to.throw(Error, 'No containsClipPaths setter on FlatSVG.');
		});
	});

	describe('zeroLengthSegmentIndices', () => {
		it('flags zero-length <line> segment', () => {
			const flatSVG = new FlatSVG(zero_length_line);
			const zero = flatSVG.zeroLengthSegmentIndices;
			expect(zero.length).to.equal(3);
			expect(flatSVG.segments.length).to.equal(6);
			for (const i of zero) {
				const s = flatSVG.segments[i];
				expect(s.p1[0]).to.equal(s.p2[0]);
				expect(s.p1[1]).to.equal(s.p2[1]);
			}
		});

		it('caches the result — second access returns the same array reference', () => {
			const flatSVG = new FlatSVG(zero_length_line);
			const first = flatSVG.zeroLengthSegmentIndices;
			const second = flatSVG.zeroLengthSegmentIndices;
			expect(second).to.equal(first);
		});

		it('flags zero-length segments from a <circle r="0">', () => {
			const svg = `<svg viewBox="0 0 100 100"><circle cx="10" cy="10" r="0" stroke="red" fill="none"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.segments.length).to.be.greaterThan(0);
			expect(flatSVG.zeroLengthSegmentIndices.length).to.equal(flatSVG.segments.length);
		});

		it('flags zero-length segments from <rect width="0" height="0">', () => {
			const svg = `<svg viewBox="0 0 100 100"><rect x="70" y="70" width="0" height="0" stroke="red" fill="none"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.segments.length).to.equal(4);
			expect(flatSVG.zeroLengthSegmentIndices.length).to.equal(4);
		});

		it('flags 2 zero-length + 2 real segments for <rect width="0" height="5">', () => {
			const svg = `<svg viewBox="0 0 100 100"><rect x="70" y="70" width="0" height="5" stroke="red" fill="none"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.segments.length).to.equal(4);
			expect(flatSVG.zeroLengthSegmentIndices.length).to.equal(2);
		});

		it('flags 2 zero-length + 2 real segments for <rect width="5" height="0">', () => {
			const svg = `<svg viewBox="0 0 100 100"><rect x="70" y="70" width="5" height="0" stroke="red" fill="none"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.segments.length).to.equal(4);
			expect(flatSVG.zeroLengthSegmentIndices.length).to.equal(2);
		});

		it('flags zero-length segments in a <polyline> with repeated adjacent points', () => {
			const svg = `<svg viewBox="0 0 100 100"><polyline points="10,10 20,20 20,20 30,30" stroke="red" fill="none"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.segments.length).to.equal(3);
			expect(flatSVG.zeroLengthSegmentIndices.length).to.equal(1);
		});

		it('flags zero-length segments in a <polygon> with repeated adjacent points', () => {
			const svg = `<svg viewBox="0 0 100 100"><polygon points="10,10 20,20 20,20 30,30" stroke="red" fill="none"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.segments.length).to.equal(4);
			expect(flatSVG.zeroLengthSegmentIndices.length).to.equal(1);
		});

		it('flags zero-length cubic bezier (all coincident)', () => {
			const svg = `<svg viewBox="0 0 100 100"><path d="M 10 10 C 10 10 10 10 10 10" stroke="red" fill="none"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.segments.length).to.equal(1);
			expect(flatSVG.zeroLengthSegmentIndices.length).to.equal(1);
		});

		it('flags zero-length quadratic bezier (all coincident)', () => {
			const svg = `<svg viewBox="0 0 100 100"><path d="M 40 40 Q 40 40 40 40" stroke="red" fill="none"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.segments.length).to.equal(1);
			expect(flatSVG.zeroLengthSegmentIndices.length).to.equal(1);
		});

		it('does NOT flag a cubic bezier with p1 === p2 but distant control points', () => {
			const svg = `<svg viewBox="0 0 100 100"><path d="M 10 10 C 20 20 30 30 10 10" stroke="red" fill="none"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.segments.length).to.equal(1);
			expect(flatSVG.zeroLengthSegmentIndices.length).to.equal(0);
		});

		it('does NOT flag a quadratic bezier with p1 === p2 but a distant control point', () => {
			const svg = `<svg viewBox="0 0 100 100"><path d="M 40 40 Q 60 60 40 40" stroke="red" fill="none"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.segments.length).to.equal(1);
			expect(flatSVG.zeroLengthSegmentIndices.length).to.equal(0);
		});

		it('flags zero-length arc segments with preserveArcs (rx=0 ry=0)', () => {
			const svg = `<svg viewBox="0 0 100 100"><circle cx="10" cy="10" r="0" stroke="red" fill="none"/></svg>`;
			const flatSVG = new FlatSVG(svg, {preserveArcs: true});
			expect(flatSVG.segments.length).to.be.greaterThan(0);
			expect(flatSVG.zeroLengthSegmentIndices.length).to.equal(flatSVG.segments.length);
		});

		it('emits 2 zero-length segments for <ellipse rx="0" ry="0">', () => {
			const svg = `<svg viewBox="0 0 100 100"><ellipse cx="30" cy="30" rx="0" ry="0" stroke="red" fill="none"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.segments.length).to.equal(2);
			expect(flatSVG.zeroLengthSegmentIndices.length).to.equal(2);
		});

		it('emits 2 line segments for <ellipse rx="0" ry="5">', () => {
			const svg = `<svg viewBox="0 0 100 100"><ellipse cx="30" cy="30" rx="0" ry="5" stroke="red" fill="none"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.segments.length).to.equal(2);
			expect(flatSVG.zeroLengthSegmentIndices.length).to.equal(0);
			expect(flatSVG.segments[0].p1).to.deep.equal([30, 25]);
			expect(flatSVG.segments[0].p2).to.deep.equal([30, 35]);
			expect(flatSVG.segments[1].p1).to.deep.equal([30, 35]);
			expect(flatSVG.segments[1].p2).to.deep.equal([30, 25]);
		});

		it('emits 2 line segments for <ellipse rx="5" ry="0">', () => {
			const svg = `<svg viewBox="0 0 100 100"><ellipse cx="30" cy="30" rx="5" ry="0" stroke="red" fill="none"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.segments.length).to.equal(2);
			expect(flatSVG.zeroLengthSegmentIndices.length).to.equal(0);
			expect(flatSVG.segments[0].p1).to.deep.equal([25, 30]);
			expect(flatSVG.segments[0].p2).to.deep.equal([35, 30]);
		});

		it('preserveArcs has no effect on degenerate ellipses (regression guard)', () => {
			const wrap = (body: string) => `<svg viewBox="0 0 100 100">${body}</svg>`;
			for (const body of [
				'<ellipse cx="30" cy="30" rx="0" ry="5" stroke="red" fill="none"/>',
				'<ellipse cx="30" cy="30" rx="5" ry="0" stroke="red" fill="none"/>',
				'<ellipse cx="30" cy="30" rx="0" ry="0" stroke="red" fill="none"/>',
			]) {
				const a = new FlatSVG(wrap(body));
				const b = new FlatSVG(wrap(body), {preserveArcs: true});
				expect(a.segments.length).to.equal(b.segments.length);
				expect(a.zeroLengthSegmentIndices.length).to.equal(b.zeroLengthSegmentIndices.length);
			}
		});

		it('flags an arc with identical endpoints as zero-length (renders nothing per SVG spec)', () => {
			// `M 50 50 A 10 10 0 1 0 50 50` looks like a full circle but per SVG spec
			// implementation notes, an arc with identical endpoints is equivalent to
			// omitting the segment — browsers render nothing. To draw a full circle,
			// split it into two arcs with distinct endpoints.
			const svg = `<svg viewBox="0 0 100 100"><path d="M 50 50 A 10 10 0 1 0 50 50" stroke="red" fill="none"/></svg>`;
			const flatSVG = new FlatSVG(svg, { preserveArcs: true });
			expect(flatSVG.segments.length).to.equal(1);
			expect(flatSVG.segments[0].p1).to.deep.equal(flatSVG.segments[0].p2);
			expect(flatSVG.zeroLengthSegmentIndices).to.deep.equal([0]);
		});

		it('should be readonly', () => {
			const flatSVG = new FlatSVG(test1);
			expect(() => { flatSVG.zeroLengthSegmentIndices = []; })
				.to.throw(Error, 'No zeroLengthSegmentIndices setter on FlatSVG.');
		});
	});

	describe('strayVertices', () => {
		const flatSVG = new FlatSVG(stray_vertices);
		const stray = flatSVG.strayVertices;

		it('flags <polyline> with a single point', () => {
			const hits = stray.filter((s) => s.cause === FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT);
			expect(hits.length).to.equal(1);
			expect(hits[0].position).to.deep.equal([90, 90]);
		});

		it('applies ancestor transforms when emitting a single-point stray vertex', () => {
			// polygon's raw `points` is in element-local coords; the helper applies the
			// inherited transform so the recorded stray-vertex position is in viewBox coordinates.
			const svg = `<svg viewBox="0 0 100 100"><g transform="translate(10,20)"><polygon points="5,5"/></g></svg>`;
			const hits = new FlatSVG(svg).strayVertices;
			expect(hits.length).to.equal(1);
			expect(hits[0]).to.deep.equal({
				position: [15, 25],
				cause: FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT,
				sourceElementIndex: 0,
			});
		});

		it('flags <polygon> with a single point', () => {
			const hits = stray.filter((s) => s.cause === FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT);
			expect(hits.length).to.equal(1);
			expect(hits[0].position).to.deep.equal([110, 110]);
		});

		it('flags dangling M commands (one per dangling M) and M...Z as MOVETO_ONLY', () => {
			const hits = stray.filter((s) => s.cause === FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY);
			expect(hits.length).to.equal(2);
			const positions = hits.map((h) => [h.position[0], h.position[1]]).sort((a, b) => a[0] - b[0]);
			expect(positions).to.deep.equal([[5, 5], [20, 20]]);
		});

		it('flags MOVETO_ONLY for M-followed-by-Z (empty closed subpath)', () => {
			const svg = `<svg viewBox="0 0 100 100"><path d="M 5 5 Z" stroke="red" fill="none"/></svg>`;
			const hits = new FlatSVG(svg).strayVertices.filter((s) => s.cause === FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY);
			const positions = hits.map((h) => [h.position[0], h.position[1]]);
			expect(positions).to.deep.equal([[5, 5]]);
		});

		it('applies ancestor transforms to a path MOVETO_ONLY stray vertex', () => {
			// The path d-string's M coords are in element-local space, but the path
			// parser bakes the inherited transform into its segments via .matrix(...)
			// in convertPathToPath. The recorded stray-vertex position must end up in
			// viewBox coordinates — i.e. the translate(10,20) shifts (5,5) to (15,25).
			const svg = `<svg viewBox="0 0 100 100"><g transform="translate(10,20)"><path d="M 5 5 Z" stroke="red" fill="none"/></g></svg>`;
			const hits = new FlatSVG(svg).strayVertices;
			expect(hits.length).to.equal(1);
			expect(hits[0]).to.deep.equal({
				position: [15, 25],
				cause: FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY,
				sourceElementIndex: 0,
			});
		});

		it('flags MOVETO_ONLY for M-followed-by-M (consecutive movetos)', () => {
			const svg = `<svg viewBox="0 0 100 100"><path d="M 10 10 M 11 11 L 12 12" stroke="red" fill="none"/></svg>`;
			const hits = new FlatSVG(svg).strayVertices.filter((s) => s.cause === FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY);
			const positions = hits.map((h) => [h.position[0], h.position[1]]);
			expect(positions).to.deep.equal([[10, 10]]);
		});

		it('does NOT flag zero-size circles, ellipses, or rects (those flow through as zero-length segments)', () => {
			const svg = `<svg viewBox="0 0 100 100"><circle cx="10" cy="10" r="0" stroke="red" fill="none"/><ellipse cx="30" cy="30" rx="0" ry="0" stroke="red" fill="none"/><ellipse cx="50" cy="50" rx="0" ry="5" stroke="red" fill="none"/><ellipse cx="70" cy="70" rx="5" ry="0" stroke="red" fill="none"/><rect x="80" y="80" width="0" height="0" stroke="red" fill="none"/></svg>`;
			const f = new FlatSVG(svg);
			expect(f.strayVertices.length).to.equal(0);
			expect(f.zeroLengthSegmentIndices.length).to.be.greaterThan(0);
		});

		it('does NOT flag valid circles/ellipses from ellipses.svg', () => {
			expect(new FlatSVG(ellipses).strayVertices.length).to.equal(0);
		});

		it('sourceElementIndex points back to the producing element', () => {
			expect(stray.length).to.equal(4);
			for (const s of stray) {
				const el = flatSVG.elements[s.sourceElementIndex];
				expect(el).to.not.equal(undefined);
				if (s.cause === FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT) {
					expect(el.tagName).to.equal('polyline');
				} else if (s.cause === FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT) {
					expect(el.tagName).to.equal('polygon');
				} else if (s.cause === FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY) {
					expect(el.tagName).to.equal('path');
				}
			}
		});

		it('should be readonly', () => {
			const flatSVG = new FlatSVG(stray_vertices);
			expect(() => { flatSVG.strayVertices = []; })
				.to.throw(Error, 'No strayVertices setter on FlatSVG.');
		});
	});

	describe('unsupportedElements', () => {
		it('routes <use> into unsupportedElements (not elements/paths/segments) without warning', () => {
			const svg = `<svg viewBox="0 0 100 100"><rect x="0" y="0" width="10" height="10" stroke="red" fill="none"/><use href="#foo" x="20" y="0"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.elements.length).to.equal(1);
			expect(flatSVG.elements[0].tagName).to.equal('rect');
			expect(flatSVG.paths.length).to.equal(1);
			expect(flatSVG.segments.length).to.equal(4);
			expect(flatSVG.unsupportedElements.length).to.equal(1);
			expect(flatSVG.unsupportedElements[0].tagName).to.equal('use');
			expect(flatSVG.warnings).to.deep.equal([]);
		});

		it('routes <text>, <image>, <foreignObject> into unsupportedElements without warning', () => {
			const svg = `<svg viewBox="0 0 100 100"><text x="0" y="10">hi</text><image href="x.png" x="0" y="0" width="10" height="10"/><foreignObject x="0" y="0" width="10" height="10"></foreignObject></svg>`;
			const flatSVG = new FlatSVG(svg);
			const tagNames = flatSVG.unsupportedElements.map((e) => e.tagName).sort();
			expect(tagNames).to.deep.equal(['foreignObject', 'image', 'text']);
			expect(flatSVG.elements).to.deep.equal([]);
			expect(flatSVG.warnings).to.deep.equal([]);
		});

		it('preserves transform and properties on unsupported elements', () => {
			const svg = `<svg viewBox="0 0 100 100"><g transform="translate(5 7)"><use href="#x" x="0" y="0"/></g></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.unsupportedElements.length).to.equal(1);
			const u = flatSVG.unsupportedElements[0];
			expect(u.tagName).to.equal('use');
			expect(u.transform).to.not.equal(undefined);
			expect((u.properties as any).href).to.equal('#x');
		});

		it('copies inherited clipPaths/masks/filters/ancestorIds/ancestorClasses onto unsupported elements', () => {
			const svg = `<svg viewBox="0 0 10 10"><g id="outer" class="grp" clip-path="url(#c)" mask="url(#m)" filter="url(#f)"><use href="#x"/></g></svg>`;
			const u = new FlatSVG(svg).unsupportedElements[0];
			expect(u.clipPaths).to.deep.equal(['url(#c)']);
			expect(u.masks).to.deep.equal(['url(#m)']);
			expect(u.filters).to.deep.equal(['url(#f)']);
			expect(u.ancestorIds).to.equal('outer');
			expect(u.ancestorClasses).to.equal('grp');
		});

		it('memoizes the unsupportedElements list', () => {
			const flatSVG = new FlatSVG(`<svg viewBox="0 0 10 10"><use href="#a"/></svg>`);
			expect(flatSVG.unsupportedElements).to.equal(flatSVG.unsupportedElements);
		});

		it('routes nested <style> inside a <g> into unsupportedElements (top-level <style> still parsed)', () => {
			const svg = `<svg viewBox="0 0 100 100"><style>.a{stroke:red}</style><g><style>.b{stroke:blue}</style><rect class="a" x="0" y="0" width="10" height="10"/></g></svg>`;
			const flatSVG = new FlatSVG(svg);
			const tagNames = flatSVG.unsupportedElements.map((e) => e.tagName);
			expect(tagNames).to.deep.equal(['style']);
			expect(flatSVG.elements.length).to.equal(1);
			expect(flatSVG.elements[0].properties.stroke).to.equal('red');
		});

		it('routes nested <defs> inside a <g> into unsupportedElements (top-level <defs> still collected)', () => {
			const svg = `<svg viewBox="0 0 100 100"><defs><clipPath id="top"><rect/></clipPath></defs><g><defs><clipPath id="nested"><rect/></clipPath></defs><rect x="0" y="0" width="10" height="10"/></g></svg>`;
			const flatSVG = new FlatSVG(svg);
			const unsupportedTagNames = flatSVG.unsupportedElements.map((e) => e.tagName);
			expect(unsupportedTagNames).to.deep.equal(['defs']);
			expect(flatSVG.defs.map((d) => d.id)).to.deep.equal(['top']);
		});

		it('does NOT recurse into nested <defs>/<style> (their children stay buried)', () => {
			const svg = `<svg viewBox="0 0 100 100"><g><defs><rect class="should-not-appear" x="0" y="0" width="10" height="10"/></defs></g></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.elements.length).to.equal(0);
			expect(flatSVG.unsupportedElements.length).to.equal(1);
			expect(flatSVG.unsupportedElements[0].tagName).to.equal('defs');
		});

		it('does NOT expand <use> — referenced symbol geometry stays buried, direct children not parsed', () => {
			const svg = `<svg viewBox="0 0 100 100"><defs><symbol id="icon"><rect class="from-symbol" x="0" y="0" width="5" height="5"/></symbol></defs><use href="#icon"><rect class="from-use-child" x="20" y="0" width="5" height="5"/></use></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.elements.length).to.equal(0);
			expect(flatSVG.unsupportedElements.length).to.equal(1);
			expect(flatSVG.unsupportedElements[0].tagName).to.equal('use');
			expect(flatSVG.defs.map((d) => d.tagName)).to.deep.equal(['symbol']);
		});

		it('does NOT apply CSS rules from nested <style> (rules stay buried)', () => {
			const svg = `<svg viewBox="0 0 100 100"><g><style>.x{stroke:red;fill:blue}</style><rect class="x" x="0" y="0" width="10" height="10"/></g></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.elements.length).to.equal(1);
			expect(flatSVG.unsupportedElements.length).to.equal(1);
			expect(flatSVG.unsupportedElements[0].tagName).to.equal('style');
			expect(flatSVG.elements[0].properties.stroke).to.equal(undefined);
			expect(flatSVG.elements[0].properties.fill).to.equal(undefined);
		});

		it('should be readonly', () => {
			const flatSVG = new FlatSVG(test1);
			expect(() => { flatSVG.unsupportedElements = []; })
				.to.throw(Error, 'No unsupportedElements setter on FlatSVG.');
		});
	});

	describe('defs', () => {
		it('should be readonly', () => {
			const flatSVG = new FlatSVG(clipping_mask);
			expect(() => { flatSVG.defs = []; })
				.to.throw(Error, 'No defs setter on FlatSVG.');
		});

		it('skips no-tagName children inside <defs> without warning', () => {
			// `< />` is the malformed-tag construct that svg-parser emits as an
			// element with empty tagName. Same trick as test/svgs/bad_tags.svg.
			const svg = `<svg viewBox="0 0 10 10"><defs>< /><clipPath id="c1"/></defs></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.defs).to.deep.equal([{ tagName: 'clipPath', id: 'c1' }]);
			expect(flatSVG.warnings).to.deep.equal([]);
		});
	});

	describe('analyze', () => {
		it('returns counts, viewBox, units, clipping flag, and color histograms for test1.svg', () => {
			const flatSVG = new FlatSVG(test1);
			const a = flatSVG.analyze();
			expect(a.viewBox).to.deep.equal([0, 0, 612, 792]);
			expect(a.units).to.equal('px');
			expect(a.counts).to.deep.equal({
				elements: 26, paths: 26, segments: 60,
				zeroLengthSegments: 0, strayVertices: 0, defs: 0,
				unsupportedElements: 0,
			});
			expect(a.containsClipPaths).to.equal(false);
			expect(a.strokeColors).to.deep.equal({
				none: 1,
				colors: {'#000000': 24, '#ec008c': 1},
			});
			expect(a.fillColors).to.deep.equal({
				none: 21,
				colors: {'#abcdef': 1, '#27aae1': 1, '#ff0000': 1, '#ffffff': 1, '#daa520': 1},
			});
		});

		it('produces JSON-serializable output', () => {
			const a = new FlatSVG(stray_vertices).analyze();
			expect(() => JSON.stringify(a)).not.to.throw();
			expect(JSON.parse(JSON.stringify(a))).to.deep.equal(a);
		});

		it('buckets strokeColors as a normalized hex histogram for miura-ori.svg', () => {
			const a = new FlatSVG(miura).analyze();
			expect(a.strokeColors).to.deep.equal({
				none: 0,
				colors: {'#000000': 50, '#ff0000': 137, '#0000ff': 150},
			});
			expect(a.fillColors).to.deep.equal({
				none: 337, colors: {},
			});
		});

		it('buckets unparseable color values by their raw string', () => {
			const svg = `<svg viewBox="0 0 10 10"><line x1="0" y1="0" x2="5" y2="5" stroke="not-a-color"/><line x1="0" y1="0" x2="5" y2="5" stroke="not-a-color"/><line x1="0" y1="0" x2="5" y2="5" stroke="red"/></svg>`;
			const a = new FlatSVG(svg).analyze();
			expect(a.strokeColors).to.deep.equal({
				none: 0,
				colors: { 'not-a-color': 2, '#ff0000': 1 },
			});
		});
	});

	describe('clip-path edge cases', () => {
		it('treats any non-"none" clip-path value as clipping (does not validate url(#id) syntax)', () => {
			// flat-svg does not parse or resolve clip-path references — any non-'none' value
			// registers, including bare ids and otherwise-invalid syntax. Resolving the
			// reference is the consumer's responsibility (cross-check against flatSVG.defs).
			const svg = `<svg viewBox="0 0 10 10">
				<rect x="0" y="0" width="2" height="2" clip-path="url(#a)"/>
				<rect x="2" y="0" width="2" height="2" clip-path="#b"/>
				<rect x="4" y="0" width="2" height="2" clip-path="notaref"/>
				<rect x="6" y="0" width="2" height="2" clip-path="none"/>
			</svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.containsClipPaths).to.equal(true);
			// First three rects register; the fourth ("none") does not.
			const clippedCount = flatSVG.elements.filter((e) => e.clipPaths).length;
			expect(clippedCount).to.equal(3);
		});
	});

	describe('currentColor resolution', () => {
		it('resolves fill="currentColor" against own color on the element', () => {
			const svg = `<svg viewBox="0 0 100 100"><rect color="red" fill="currentColor" x="0" y="0" width="10" height="10"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.elements[0].properties.fill).to.equal('red');
		});

		it('resolves stroke="currentColor" against inherited color on ancestor <g>', () => {
			const svg = `<svg viewBox="0 0 100 100"><g color="blue"><rect stroke="currentColor" fill="none" x="0" y="0" width="10" height="10"/></g></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.elements[0].properties.stroke).to.equal('blue');
		});

		it('falls back to "black" when no color is set anywhere', () => {
			const svg = `<svg viewBox="0 0 100 100"><rect fill="currentColor" stroke="currentColor" x="0" y="0" width="10" height="10"/></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.elements[0].properties.fill).to.equal('black');
			expect(flatSVG.elements[0].properties.stroke).to.equal('black');
		});

		it("element's own color overrides ancestor color (per child-wins inheritance)", () => {
			const svg = `<svg viewBox="0 0 100 100"><g color="red"><rect color="blue" fill="currentColor" x="0" y="0" width="10" height="10"/></g></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.elements[0].properties.fill).to.equal('blue');
		});

		it('matches case-insensitively (currentcolor, CURRENTCOLOR, CurrentColor)', () => {
			const svg = `<svg viewBox="0 0 100 100"><g color="red"><rect fill="currentcolor" stroke="CURRENTCOLOR" x="0" y="0" width="10" height="10"/><rect fill="CurrentColor" stroke="red" x="20" y="0" width="10" height="10"/></g></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect((flatSVG.elements[0].properties).fill).to.equal('red');
			expect((flatSVG.elements[0].properties).stroke).to.equal('red');
			expect((flatSVG.elements[1].properties).fill).to.equal('red');
		});

		it('falls back to "black" when color itself is "currentColor" (recursive lookup not supported)', () => {
			const svg = `<svg viewBox="0 0 100 100"><g color="currentColor"><rect fill="currentColor" x="0" y="0" width="10" height="10"/></g></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect((flatSVG.elements[0].properties).fill).to.equal('black');
		});

		it('does NOT modify non-currentColor fill / stroke values', () => {
			const svg = `<svg viewBox="0 0 100 100"><g color="red"><rect fill="blue" stroke="green" x="0" y="0" width="10" height="10"/></g></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.elements[0].properties.fill).to.equal('blue');
			expect(flatSVG.elements[0].properties.stroke).to.equal('green');
		});

		it('emits no warnings when currentColor resolves successfully', () => {
			const svg = `<svg viewBox="0 0 100 100"><g color="red"><rect fill="currentColor" stroke="currentColor" x="0" y="0" width="10" height="10"/></g></svg>`;
			const flatSVG = new FlatSVG(svg);
			expect(flatSVG.warnings).to.deep.equal([]);
		});
	});
});