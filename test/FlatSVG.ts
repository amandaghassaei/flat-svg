import { FlatSVG } from '../src/FlatSVG';
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
const ellipses = readFileSync('./test/svgs/ellipses.svg', {encoding: 'utf-8'});
const bad_tags = readFileSync('./test/svgs/bad_tags.svg', {encoding: 'utf-8'});
const nested_transforms = readFileSync('./test/svgs/nested_transforms.svg', {encoding: 'utf-8'});

describe('FlatSVG', () => {

	describe('constructor', () => {
		it('should throw an error if no svg string passed in', () => {
			// @ts-ignore
			expect(() => {new FlatSVG()}).to.throw(Error, 'Must pass in an SVG string to FlatSVG().');
			expect(() => {new FlatSVG('')}).to.throw(Error, 'SVG string is empty.');
			expect(() => {new FlatSVG('<rect class="b" x="39.74" y="133.19" width="129.87" height="67.53"/>')}).to.throw(Error, 'Malformed SVG: expected only 1 child <svg> element on root node.');
		});
		
		it('should handle a valid svg string', () => {
			expect(() => {new FlatSVG(emptySVG)}).not.to.throw();
			const flatSVG = new FlatSVG(emptySVG);
			const { segments, errors, warnings } = flatSVG;
			expect(errors.length).to.equal(0);
			expect(warnings.length).to.equal(0);
		});

		it('should handle an svg with many types of elements', () => {
			expect(() => {new FlatSVG(test1)}).not.to.throw();
			const flatSVG = new FlatSVG(test1);
			const { segments, errors, warnings } = flatSVG;
			expect(errors.length).to.equal(0);
			expect(warnings.length).to.equal(0);
		});

		it('should skip bad tags', () => {
			const flatSVG = new FlatSVG(bad_tags);
			const { segments, errors, warnings } = flatSVG;
			expect(errors).to.deep.equal([
				'Skipping child with no tagName: {"type":"element","tagName":"","properties":{},"children":[]}.',
				"Invalid <circle> properties: {\"cx\":65.38,\"cy\":\"NaN\",\"r\":64.88}.",
				"Invalid <ellipse> properties: {\"cx\":65.38,\"cy\":0,\"rx\":64.88,\"ry\":-1}.",
				"Problem parsing <path> {\"d\":\"V23.4 L3.4,5.6\"} with SvgPath: string should start with `M` or `m`.",
			]);
			expect(warnings).to.deep.equal([ 'Unsupported tagname: "lsfkjdlskfjlsdk".' ]);
		});
	});

	describe('root', () => {
		it('should return svg root element', () => {
			expect((new FlatSVG(test1)).root.tagName).to.equal('svg');
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
	});

	describe('units', () => {
		it('should return svg units as string', () => {
			expect((new FlatSVG(with_units)).units).to.equal('cm');
		});

		it('should return "px" if no units is defines', () => {
			expect((new FlatSVG(miura)).units).to.equal("px");
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
	});

	describe('elementsAsSVG', () => {
		it('should return flattened list of elements as svg string', () => {
			expect((new FlatSVG(inline_styles)).elementsAsSVG).to.equal(`<svg id="a" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 792">
<rect opacity="0.0625" fill="#696a6d" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" x="39.74" y="38.39" width="129.87" height="67.53" />
<rect opacity="0.125" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" x="39.74" y="133.19" width="129.87" height="67.53" />
<rect opacity="0.25" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" x="39.74" y="228" width="129.87" height="67.53" />
<rect opacity="0.5" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" x="39.74" y="322.81" width="129.87" height="67.53" />
</svg>`);
			expect((new FlatSVG(nested_transforms)).elementsAsSVG).to.equal(`<svg id="a" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 792">
<rect opacity="0.0625" x="39.74" y="38.39" width="129.87" height="67.53" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" fill="#696a6d" class="d d d c" transform="matrix(0.7461 -0.6658 0.6658 0.7461 322.2818 294.3933)" />
<rect opacity="0.125" x="39.74" y="133.19" width="129.87" height="67.53" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" class="d d d b" transform="matrix(0.7461 -0.6658 0.6658 0.7461 322.2818 294.3933)" />
<rect opacity="0.25" x="39.74" y="228" width="129.87" height="67.53" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" class="d d b" transform="matrix(1 0 0 1 356 200)" />
<rect opacity="0.5" x="39.74" y="322.81" width="129.87" height="67.53" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" class="d b" transform="matrix(1 0 0 1 356 200)" />
</svg>`);
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
	});

	describe('pathsAsSVG', () => {
		it('should return flattened list of paths as svg string', () => {
			expect((new FlatSVG(inline_styles)).pathsAsSVG).to.equal(`<svg id="a" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 792">
<path opacity="0.0625" fill="#696a6d" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" d="M39.74,38.39 L169.61,38.39 L169.61,105.92 L39.74,105.92 z" />
<path opacity="0.125" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" d="M39.74,133.19 L169.61,133.19 L169.61,200.72 L39.74,200.72 z" />
<path opacity="0.25" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" d="M39.74,228 L169.61,228 L169.61,295.53 L39.74,295.53 z" />
<path opacity="0.5" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" d="M39.74,322.81 L169.61,322.81 L169.61,390.34000000000003 L39.74,390.34000000000003 z" />
</svg>`);
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
			expect(flatSVG.errors.length).to.equal(0);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('should not mutate filter object', () => {
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
			expect(flatSVG.errors.length).to.equal(0);
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
			expect(flatSVG.errors.length).to.equal(0);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('should multiply opacity of groups down to children', () => {
			const flatSVG = new FlatSVG(opacity_groups);
			expect(flatSVG.elements[0].properties.opacity).to.equal(0.0625);
			expect(flatSVG.elements[1].properties.opacity).to.equal(0.125);
			expect(flatSVG.elements[2].properties.opacity).to.equal(0.25);
			expect(flatSVG.elements[3].properties.opacity).to.equal(0.5);
			expect(flatSVG.errors.length).to.equal(0);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('should catch bad filter values', () => {
			const flatSVG = new FlatSVG(opacity_groups);
			expect(() => {flatSVG.filterElementsByStyle([
				{
					key: 'afsdfasdf',
					value: 'fsdf',
					tolerance: 0,
				},
			])}).to.throw(Error, 'flat-svg cannot handle filters with key "afsdfasdf" and value "fsdf" of type string.  Please submit an issue to https://github.com/amandaghassaei/flat-svg if this feature should be added.');

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
			expect(flatSVG.errors.length).to.equal(0);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('should mix stroke alpha and opacity in filters', () => {
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
			expect(flatSVG.errors.length).to.equal(0);
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
			expect(flatSVG.errors.length).to.equal(0);
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
			expect(flatSVG.errors.length).to.equal(0);
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
			expect(flatSVG.errors.length).to.equal(0);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('should parse AI generated internal css', () => {
			const flatSVG = new FlatSVG(internal_css);
			expect(flatSVG.elements.length).to.equal(4);
			expect(flatSVG.paths.length).to.equal(4);
			expect(flatSVG.segments.length).to.equal(16);
			expect(flatSVG.defs.length).to.equal(1);
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
			expect(flatSVG.errors.length).to.equal(0);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('should remove clipping mask def tag', () => {
			const flatSVG = new FlatSVG(clipping_mask);
			expect(flatSVG.defs.length).to.equal(1);
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
			expect(flatSVG.errors.length).to.equal(0);
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
			], flatSVG.elements.map(el => true)).length).to.equal(0);
			expect(flatSVG.filterElementsByStyle([
				{
					key: 'opacity',
					value: 0.25,
					tolerance: 0,
				},
			], flatSVG.elements.map(el => true)).length).to.equal(0);
			expect(flatSVG.filterSegmentsByStyle([
				{
					key: 'opacity',
					value: 0.125,
					tolerance: 0,
				},
			], flatSVG.segments.map(el => true)).length).to.equal(0);
			expect(flatSVG.filterSegmentsByStyle([
				{
					key: 'opacity',
					value: 0.125,
					tolerance: 0,
				},
			], flatSVG.segments.map((el, i) => !!(i % 2))).length).to.equal(2);
			expect(flatSVG.filterPathsByStyle([
				{
					key: 'opacity',
					value: 0.0625,
				},
			], flatSVG.segments.map(el => true)).length).to.equal(0);
			expect(flatSVG.errors.length).to.equal(0);
			expect(flatSVG.warnings.length).to.equal(0);
		});

		it('should parse nested transforms', () => {
			const flatSVG = new FlatSVG(nested_transforms);
			expect(flatSVG.elements.length).to.equal(4);
			expect(flatSVG.paths.length).to.equal(4);
			expect(flatSVG.segments.length).to.equal(16);
			expect(flatSVG.errors.length).to.equal(0);
			expect(flatSVG.warnings.length).to.equal(0);
			expect(flatSVG.segmentsAsSVG).to.equal(`<svg id="a" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 792">
<line x1="377.491876" y1="296.57718700000004" x2="474.387883" y2="210.109741" opacity="0.0625" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" fill="#696a6d" class="d d d c" />
<line x1="474.387883" y1="210.109741" x2="519.349357" y2="260.493874" opacity="0.0625" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" fill="#696a6d" class="d d d c" />
<line x1="519.349357" y1="260.493874" x2="422.45335" y2="346.96132" opacity="0.0625" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" fill="#696a6d" class="d d d c" />
<line x1="422.45335" y1="346.96132" x2="377.491876" y2="296.57718700000004" opacity="0.0625" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" fill="#696a6d" class="d d d c" />
<line x1="440.60971599999993" y1="367.307467" x2="537.505723" y2="280.840021" opacity="0.125" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" class="d d d b" />
<line x1="537.505723" y1="280.840021" x2="582.4671969999999" y2="331.224154" opacity="0.125" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" class="d d d b" />
<line x1="582.4671969999999" y1="331.224154" x2="485.57119" y2="417.6916" opacity="0.125" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" class="d d d b" />
<line x1="485.57119" y1="417.6916" x2="440.60971599999993" y2="367.307467" opacity="0.125" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" class="d d d b" />
<line x1="395.74" y1="428" x2="525.61" y2="428" opacity="0.25" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" class="d d b" />
<line x1="525.61" y1="428" x2="525.61" y2="495.53" opacity="0.25" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" class="d d b" />
<line x1="525.61" y1="495.53" x2="395.74" y2="495.53" opacity="0.25" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" class="d d b" />
<line x1="395.74" y1="495.53" x2="395.74" y2="428" opacity="0.25" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" class="d d b" />
<line x1="395.74" y1="522.81" x2="525.61" y2="522.81" opacity="0.5" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" class="d b" />
<line x1="525.61" y1="522.81" x2="525.61" y2="590.34" opacity="0.5" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" class="d b" />
<line x1="525.61" y1="590.34" x2="395.74" y2="590.34" opacity="0.5" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" class="d b" />
<line x1="395.74" y1="590.34" x2="395.74" y2="522.81" opacity="0.5" fill="#696a6c" stroke="#231f20" stroke-miterlimit="10" stroke-width="5" class="d b" />
</svg>`);
		});
	});

	describe('', () => {

	});
});