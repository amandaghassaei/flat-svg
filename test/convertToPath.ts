import { expect } from 'chai';
import {
    convertLineToPath,
    convertRectToPath,
    convertCircleToPath,
    convertEllipseToPath,
    convertPolygonToPath,
    convertPolylineToPath,
    convertPathToPath,
} from '../src/convertToPath';
import { parseTransformString } from '../src/transforms';

const errors: string[] = [];
const transform = parseTransformString('translate(20,-50)')[0];

describe('Path Conversions', () => {
    beforeEach(() => {
        errors.length = 0;
    });

    describe('convertLineToPath()', () => {
        it('should throw error if invalid parameters supplied', () => {
            // @ts-ignore
            expect(convertLineToPath({ x1: 'abc' }, errors)).to.equal(undefined);
            expect(errors.pop()).to.equal(
                'Invalid <line> properties: {"x1":"abc","y1":0,"x2":0,"y2":0}.'
            );
        });

        it('should convert valid line properties to path', () => {
            expect(convertLineToPath({ x1: 0, y1: 0.35, x2: -45.3, y2: 39 }, errors)).to.equal(
                'M0,0.35 L-45.3,39'
            );
            expect(errors.length).to.equal(0);
            expect(
                convertLineToPath({ x1: 0, y1: 0.35, x2: -45.3, y2: 39 }, errors, transform)
            ).to.equal('M20,-49.65 L-25.299999999999997,-11');
            expect(errors.length).to.equal(0);
        });
    });

    describe('convertRectToPath()', () => {
        it('should throw error if invalid parameters supplied', () => {
            // @ts-ignore
            expect(convertRectToPath({ x: 'abc' }, errors)).to.equal(undefined);
            expect(errors.pop()).to.equal('Invalid <rect> properties: {"x":"abc","y":0}.');

            expect(convertRectToPath({ x: 0, y: 0.35, width: -45.3, height: 39 }, errors)).to.equal(
                undefined
            );
            expect(errors.pop()).to.equal(
                'Invalid <rect> properties: {"x":0,"y":0.35,"width":-45.3,"height":39}.'
            );
        });

        it('should convert valid rect properties to path', () => {
            expect(convertRectToPath({ x: 0, y: 0.35, width: 45.3, height: 39 }, errors)).to.equal(
                'M0,0.35 L45.3,0.35 L45.3,39.35 L0,39.35 z'
            );
            expect(errors.length).to.equal(0);
            expect(
                convertRectToPath({ x: 0, y: 0.35, width: 45.3, height: 39 }, errors, transform)
            ).to.equal(
                'M20,-49.65 L65.3,-49.65 L65.3,-10.649999999999999 L20,-10.649999999999999 z'
            );
            expect(errors.length).to.equal(0);
        });
    });

    describe('convertCircleToPath()', () => {
        it('should throw error if invalid parameters supplied', () => {
            // @ts-ignore
            expect(convertCircleToPath({ cy: 'abc' }, errors)).to.equal(undefined);
            expect(errors.pop()).to.equal(
                'Invalid <circle> properties: {"cx":0,"cy":"abc","r":0}.'
            );

            expect(convertCircleToPath({ cx: 0, cy: 0, r: NaN }, errors, false)).to.equal(
                undefined
            );
            expect(errors.pop()).to.equal('Invalid <circle> properties: {"cx":0,"cy":0,"r":null}.');

            expect(convertCircleToPath({ cx: 0, cy: 0, r: -1 }, errors, false)).to.equal(undefined);
            expect(errors.pop()).to.equal('Invalid <circle> properties: {"cx":0,"cy":0,"r":-1}.');
        });

        it('should convert valid circle properties to path', () => {
            expect(
                convertCircleToPath({ cx: 0, cy: 0.35, r: 5.3 }, errors, true)!.segments
            ).to.deep.equal([
                ['M', -5.3, 0.35],
                ['A', 5.3, 5.3, 0, 1, 0, 5.3, 0.35],
                ['A', 5.3, 5.3, 0, 1, 0, -5.3, 0.35],
            ]);
            expect(errors.length).to.equal(0);

            expect(
                convertCircleToPath({ cx: 0, cy: 0.35, r: 5.3 }, errors, false)!.segments
            ).to.deep.equal([
                ['M', -5.3, 0.35],
                [
                    'C',
                    -5.299999999999999,
                    3.2771091741032055,
                    -2.927109174103204,
                    5.6499999999999995,
                    3.245314017740486e-16,
                    5.6499999999999995,
                ],
                ['C', 2.9271091741032054, 5.6499999999999995, 5.3, 3.2771091741032046, 5.3, 0.35],
                [
                    'C',
                    5.3,
                    -2.5771091741032044,
                    2.9271091741032054,
                    -4.95,
                    3.245314017740486e-16,
                    -4.95,
                ],
                [
                    'C',
                    -2.927109174103204,
                    -4.95,
                    -5.299999999999999,
                    -2.5771091741032053,
                    -5.3,
                    0.3499999999999993,
                ],
            ]);
            expect(errors.length).to.equal(0);

            const pathParser = convertCircleToPath(
                { cx: 0, cy: 0.35, r: 5.3 },
                errors,
                true,
                transform
            );
            expect(pathParser!.segments).to.deep.equal([
                ['M', -5.3, 0.35],
                ['A', 5.3, 5.3, 0, 1, 0, 5.3, 0.35],
                ['A', 5.3, 5.3, 0, 1, 0, -5.3, 0.35],
            ]);
            expect(pathParser!.__stack![0].queue).to.deep.equal([[1, 0, 0, 1, 20, -50]]);
            expect(errors.length).to.equal(0);
        });
    });

    describe('convertEllipseToPath()', () => {
        it('should throw error if invalid parameters supplied', () => {
            // @ts-ignore
            expect(convertEllipseToPath({ cx: 'abc' }, errors, true)).to.equal(undefined);
            expect(errors.pop()).to.equal('Invalid <ellipse> properties: {"cx":"abc","cy":0,"rx":0,"ry":0}.');

            expect(convertEllipseToPath({ cx: 0, cy: 0, rx: NaN, ry: 0 }, errors, false)).to.equal(
                undefined
            );
            expect(errors.pop()).to.equal(
                'Invalid <ellipse> properties: {"cx":0,"cy":0,"rx":null,"ry":0}.'
            );

            expect(convertEllipseToPath({ cx: 0, cy: 0, rx: 1, ry: -1 }, errors, false)).to.equal(
                undefined
            );
            expect(errors.pop()).to.equal(
                'Invalid <ellipse> properties: {"cx":0,"cy":0,"rx":1,"ry":-1}.'
            );
        });

        it('should convert valid ellipse properties to path', () => {
            expect(
                convertEllipseToPath({ cx: 0, cy: 0.35, rx: 5.3, ry: 2.4 }, errors, true)!.segments
            ).to.deep.equal([
                ['M', -5.3, 0.35],
                ['A', 5.3, 2.4, 0, 1, 0, 5.3, 0.35],
                ['A', 5.3, 2.4, 0, 1, 0, -5.3, 0.35],
            ]);
            expect(errors.length).to.equal(0);

            expect(
                convertEllipseToPath({ cx: 0, cy: 0.35, rx: 5.3, ry: 2.4 }, errors, false)!.segments
            ).to.deep.equal([
                ['M', -5.3, 0.35],
                [
                    'C',
                    -5.299999999999999,
                    1.675483399593904,
                    -2.927109174103204,
                    2.75,
                    3.245314017740486e-16,
                    2.75,
                ],
                ['C', 2.9271091741032054, 2.75, 5.3, 1.675483399593904, 5.3, 0.35],
                [
                    'C',
                    5.3,
                    -0.975483399593904,
                    2.9271091741032054,
                    -2.05,
                    3.245314017740486e-16,
                    -2.05,
                ],
                [
                    'C',
                    -2.927109174103204,
                    -2.05,
                    -5.299999999999999,
                    -0.9754833995939042,
                    -5.3,
                    0.3499999999999997,
                ],
            ]);
            expect(errors.length).to.equal(0);

            const pathParser = convertEllipseToPath(
                { cx: 0, cy: 0.35, rx: 5.3, ry: 2.4 },
                errors,
                true,
                transform
            );
            expect(pathParser!.segments).to.deep.equal([
                ['M', -5.3, 0.35],
                ['A', 5.3, 2.4, 0, 1, 0, 5.3, 0.35],
                ['A', 5.3, 2.4, 0, 1, 0, -5.3, 0.35],
            ]);
            expect(pathParser!.__stack![0].queue).to.deep.equal([[1, 0, 0, 1, 20, -50]]);
            expect(errors.length).to.equal(0);
        });
    });

    describe('convertPolygonToPath()', () => {
        it('should throw error if invalid parameters supplied', () => {
            // @ts-ignore
            expect(convertPolygonToPath({}, errors)).to.equal(undefined);
            expect(errors.pop()).to.equal('Invalid <polygon> properties: {}.');

            const path1 = convertPolygonToPath({ points: '0' }, errors);
            // @ts-ignore
            expect(path1).to.equal(undefined);
            expect(errors.pop()).to.equal('Unable to parse points string: "0" in <polygon>.');

            const path2 = convertPolygonToPath({ points: 'NaN,NaN' }, errors);
            // @ts-ignore
            expect(path2).to.equal(undefined);
            expect(errors.pop()).to.equal('Unable to parse points string: "NaN,NaN" in <polygon>.');

            const path3 = convertPolygonToPath({ points: 'bad_string' }, errors);
            // @ts-ignore
            expect(path3).to.equal(undefined);
            expect(errors.pop()).to.equal(
                'Unable to parse points string: "bad_string" in <polygon>.'
            );
        });

        it('should convert valid polygon properties to path', () => {
            expect(convertPolygonToPath({ points: '3.4,2 -3.5,4 0,0' }, errors)).to.equal(
                'M3.4,2 L-3.5,4 L0,0 z'
            );
            expect(errors.length).to.equal(0);

            expect(
                convertPolygonToPath({ points: '3.4,2 -3.5,4 0,0' }, errors, transform)
            ).to.equal('M23.4,-48 L16.5,-46 L20,-50 z');
            expect(errors.length).to.equal(0);
        });
    });

    describe('convertPolylineToPath()', () => {
        it('should throw error if invalid parameters supplied', () => {
            // @ts-ignore
            expect(convertPolylineToPath({}, errors)).to.equal(undefined);
            expect(errors.pop()).to.equal('Invalid <polyline> properties: {}.');

            const path1 = convertPolylineToPath({ points: '0' }, errors);
            // @ts-ignore
            expect(path1).to.equal(undefined);
            expect(errors.pop()).to.equal('Unable to parse points string: "0" in <polyline>.');

            const path2 = convertPolylineToPath({ points: 'NaN,NaN' }, errors);
            // @ts-ignore
            expect(path2).to.equal(undefined);
            expect(errors.pop()).to.equal(
                'Unable to parse points string: "NaN,NaN" in <polyline>.'
            );

            const path3 = convertPolylineToPath({ points: 'bad_string' }, errors);
            // @ts-ignore
            expect(path3).to.equal(undefined);
            expect(errors.pop()).to.equal(
                'Unable to parse points string: "bad_string" in <polyline>.'
            );
        });

        it('should convert valid polyline properties to path', () => {
            expect(convertPolylineToPath({ points: '3.4,2 -3.5,4 0,0' }, errors)).to.equal(
                'M3.4,2 L-3.5,4 L0,0'
            );
            expect(errors.length).to.equal(0);

            expect(
                convertPolylineToPath({ points: '3.4,2 -3.5,4 0,0' }, errors, transform)
            ).to.equal('M23.4,-48 L16.5,-46 L20,-50');
            expect(errors.length).to.equal(0);
        });
    });

    describe('convertPathToPath()', () => {
        it('should throw error if invalid parameters supplied', () => {
            // @ts-ignore
            expect(convertPathToPath({}, errors)).to.equal(undefined);
            expect(errors.pop()).to.equal('Invalid <path> properties: {}.');

            expect(convertPathToPath({ d: 'bad_string' }, errors, false)).to.equal(undefined);
            expect(errors.pop()).to.equal(
                'Problem parsing <path> {"d":"bad_string"} with SvgPath: bad command b (at pos 0).'
            );
        });

        it('should convert valid path properties to path', () => {
            expect(
                convertPathToPath(
                    {
                        d: 'M 10 315 L 110 215 A 30 50 0 0 1 162.55 162.45 L 172.55 152.45 A 30 50 -45 0 1 215.1 109.9 L 315 10',
                    },
                    errors,
                    false
                )!.segments
            ).to.deep.equal([
                ['M', 10, 315],
                ['L', 110, 215],
                ['A', 30, 50, 0, 0, 1, 162.55, 162.45],
                ['L', 172.55, 152.45],
                ['A', 30, 50, -45, 0, 1, 215.1, 109.9],
                ['L', 315, 10],
            ]);
            expect(errors.length).to.equal(0);

            expect(
                convertPathToPath(
                    {
                        d: 'M 10 315 L 110 215 A 30 50 0 0 1 162.55 162.45 L 172.55 152.45 A 30 50 -45 0 1 215.1 109.9 L 315 10',
                    },
                    errors,
                    true
                )!.segments
            ).to.deep.equal([
                ['M', 10, 315],
                ['L', 110, 215],
                [
                    'C',
                    101.29323091891754,
                    190.8145303303265,
                    105.9987181981959,
                    159.4446151351374,
                    120.51,
                    144.9333333333333,
                ],
                [
                    'C',
                    135.0212818018041,
                    130.42205153152923,
                    153.84323091891756,
                    138.2645303303265,
                    162.55,
                    162.45,
                ],
                ['L', 172.55, 152.45],
                [
                    'C',
                    152.9669038622318,
                    132.86690351205877,
                    146.61680947719668,
                    107.4665254217364,
                    158.36666731263443,
                    95.71666745513267,
                ],
                [
                    'C',
                    170.11652514807218,
                    83.96680948852892,
                    195.51690319586208,
                    90.31690370343438,
                    215.09999995134945,
                    109.8999999513495,
                ],
                ['L', 315, 10],
            ]);
            expect(errors.length).to.equal(0);

            const pathParser = convertPathToPath(
                {
                    d: 'M 10 315 L 110 215 A 30 50 0 0 1 162.55 162.45 L 172.55 152.45 A 30 50 -45 0 1 215.1 109.9 L 315 10',
                },
                errors,
                false,
                transform
            );
            expect(pathParser!.segments).to.deep.equal([
                ['M', 10, 315],
                ['L', 110, 215],
                ['A', 30, 50, 0, 0, 1, 162.55, 162.45],
                ['L', 172.55, 152.45],
                ['A', 30, 50, -45, 0, 1, 215.1, 109.9],
                ['L', 315, 10],
            ]);
            expect(pathParser!.__stack![0].queue).to.deep.equal([[1, 0, 0, 1, 20, -50]]);
            expect(errors.length).to.equal(0);
        });
    });
});
