import { FlatSVG } from '../src/FlatSVG';
import { expect } from 'chai';
import { readFileSync } from 'fs';

const self_intersecting2_01 = readFileSync('./test/svgs/self-intersecting2-01.svg', {
    encoding: 'utf-8',
});
const strip_edemaine = readFileSync('./test/svgs/strip-edemaine.svg', {
    encoding: 'utf-8',
});

describe('test files', () => {
    it('self-intersecting2-01.svg', () => {
        const svg = new FlatSVG(self_intersecting2_01);
        expect(svg.segments.length).to.equal(10);
        expect(svg.errors.length).to.equal(0);
        expect(svg.warnings.length).to.equal(0);
    });

    it('self-intersecting2-01.svg + preserveArcs', () => {
        const svg = new FlatSVG(self_intersecting2_01, { preserveArcs: true });
        expect(svg.segments.length).to.equal(10);
        expect(svg.errors.length).to.equal(0);
        expect(svg.warnings.length).to.equal(0);
        expect(svg.segmentsAsSVG).to
            .equal(`<svg id="a" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 792">
<line x1="240.35" y1="240.29" x2="168.2" y2="188.39" fill="none" stroke="red" stroke-miterlimit="10" />
<line x1="168.2" y1="188.39" x2="206.18" y2="240.29" fill="none" stroke="red" stroke-miterlimit="10" />
<line x1="206.18" y1="240.29" x2="340.35" y2="240.29" fill="none" stroke="red" stroke-miterlimit="10" />
<line x1="340.35" y1="240.29" x2="351.75" y2="166.87" fill="none" stroke="red" stroke-miterlimit="10" />
<line x1="351.75" y1="166.87" x2="306" y2="240.29" fill="none" stroke="red" stroke-miterlimit="10" />
<path d="M 175.72 409.04 C 175.72 409.04 192.25 330.17 161.87 359.28000000000003 " fill="none" stroke="red" stroke-miterlimit="10" />
<path d="M 161.87 359.28000000000003 C 131.49 388.39000000000004 149.25 411.18 199.84 411.18 " fill="none" stroke="red" stroke-miterlimit="10" />
<line x1="199.84" y1="411.18" x2="334.02" y2="411.18" fill="none" stroke="red" stroke-miterlimit="10" />
<path d="M 334.02 411.18 C 430.21999999999997 411.18 408.7 308.65 345.40999999999997 337.76 " fill="none" stroke="red" stroke-miterlimit="10" />
<path d="M 345.40999999999997 337.76 C 282.11999999999995 366.87 371.68999999999994 404.15999999999997 371.68999999999994 404.15999999999997 " fill="none" stroke="red" stroke-miterlimit="10" />
</svg>`);
    });

    it('self-intersecting2-01.svg', () => {
        const svg = new FlatSVG(strip_edemaine);
        expect(svg.filterElementsByStyle({ key: 'stroke', value: 'lime' }).length).to.equal(4);
        expect(svg.filterSegmentsByStyle({ key: 'stroke', value: 'red' }).length).to.equal(10); // There is an extra red line hiding under the boundary.
        expect(svg.filterSegmentsByStyle({ key: 'stroke', value: 'blue' }).length).to.equal(10); // There is an extra blue line hiding under the boundary.
        expect(svg.filterSegmentsByStyle({ key: 'stroke', value: 'black' }).length).to.equal(4);
        expect(svg.segments.length).to.equal(28);
        expect(svg.errors.length).to.equal(0);
        expect(svg.warnings.length).to.equal(0);
    });
});
