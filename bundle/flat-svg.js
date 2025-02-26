(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.FlatSVGLib = {}));
})(this, (function (exports) { 'use strict';

	function getLocator(source, options) {
	    if (options === void 0) { options = {}; }
	    var offsetLine = options.offsetLine || 0;
	    var offsetColumn = options.offsetColumn || 0;
	    var originalLines = source.split('\n');
	    var start = 0;
	    var lineRanges = originalLines.map(function (line, i) {
	        var end = start + line.length + 1;
	        var range = { start: start, end: end, line: i };
	        start = end;
	        return range;
	    });
	    var i = 0;
	    function rangeContains(range, index) {
	        return range.start <= index && index < range.end;
	    }
	    function getLocation(range, index) {
	        return { line: offsetLine + range.line, column: offsetColumn + index - range.start, character: index };
	    }
	    function locate(search, startIndex) {
	        if (typeof search === 'string') {
	            search = source.indexOf(search, startIndex || 0);
	        }
	        var range = lineRanges[i];
	        var d = search >= range.end ? 1 : -1;
	        while (range) {
	            if (rangeContains(range, search))
	                return getLocation(range, search);
	            i += d;
	            range = lineRanges[i];
	        }
	    }
	    return locate;
	}
	function locate(source, search, options) {
	    if (typeof options === 'number') {
	        throw new Error('locate takes a { startIndex, offsetLine, offsetColumn } object as the third argument');
	    }
	    return getLocator(source, options)(search, options && options.startIndex);
	}

	var validNameCharacters = /[a-zA-Z0-9:_-]/;
	var whitespace = /[\s\t\r\n]/;
	var quotemark = /['"]/;

	function repeat(str, i) {
		var result = '';
		while (i--) { result += str; }
		return result;
	}

	function parse(source) {
		var header = '';
		var stack = [];

		var state = metadata;
		var currentElement = null;
		var root = null;

		function error(message) {
			var ref = locate(source, i);
			var line = ref.line;
			var column = ref.column;
			var before = source.slice(0, i);
			var beforeLine = /(^|\n).*$/.exec(before)[0].replace(/\t/g, '  ');
			var after = source.slice(i);
			var afterLine = /.*(\n|$)/.exec(after)[0];

			var snippet = "" + beforeLine + afterLine + "\n" + (repeat(' ', beforeLine.length)) + "^";

			throw new Error(
				(message + " (" + line + ":" + column + "). If this is valid SVG, it's probably a bug in svg-parser. Please raise an issue at https://github.com/Rich-Harris/svg-parser/issues – thanks!\n\n" + snippet)
			);
		}

		function metadata() {
			while ((i < source.length && source[i] !== '<') || !validNameCharacters.test(source[i + 1])) {
				header += source[i++];
			}

			return neutral();
		}

		function neutral() {
			var text = '';
			while (i < source.length && source[i] !== '<') { text += source[i++]; }

			if (/\S/.test(text)) {
				currentElement.children.push({ type: 'text', value: text });
			}

			if (source[i] === '<') {
				return tag;
			}

			return neutral;
		}

		function tag() {
			var char = source[i];

			if (char === '?') { return neutral; } // <?xml...

			if (char === '!') {
				if (source.slice(i + 1, i + 3) === '--') { return comment; }
				if (source.slice(i + 1, i + 8) === '[CDATA[') { return cdata; }
				if (/doctype/i.test(source.slice(i + 1, i + 8))) { return neutral; }
			}

			if (char === '/') { return closingTag; }

			var tagName = getName();

			var element = {
				type: 'element',
				tagName: tagName,
				properties: {},
				children: []
			};

			if (currentElement) {
				currentElement.children.push(element);
			} else {
				root = element;
			}

			var attribute;
			while (i < source.length && (attribute = getAttribute())) {
				element.properties[attribute.name] = attribute.value;
			}

			var selfClosing = false;

			if (source[i] === '/') {
				i += 1;
				selfClosing = true;
			}

			if (source[i] !== '>') {
				error('Expected >');
			}

			if (!selfClosing) {
				currentElement = element;
				stack.push(element);
			}

			return neutral;
		}

		function comment() {
			var index = source.indexOf('-->', i);
			if (!~index) { error('expected -->'); }

			i = index + 2;
			return neutral;
		}

		function cdata() {
			var index = source.indexOf(']]>', i);
			if (!~index) { error('expected ]]>'); }

			currentElement.children.push(source.slice(i + 7, index));

			i = index + 2;
			return neutral;
		}

		function closingTag() {
			var tagName = getName();

			if (!tagName) { error('Expected tag name'); }

			if (tagName !== currentElement.tagName) {
				error(("Expected closing tag </" + tagName + "> to match opening tag <" + (currentElement.tagName) + ">"));
			}

			allowSpaces();

			if (source[i] !== '>') {
				error('Expected >');
			}

			stack.pop();
			currentElement = stack[stack.length - 1];

			return neutral;
		}

		function getName() {
			var name = '';
			while (i < source.length && validNameCharacters.test(source[i])) { name += source[i++]; }

			return name;
		}

		function getAttribute() {
			if (!whitespace.test(source[i])) { return null; }
			allowSpaces();

			var name = getName();
			if (!name) { return null; }

			var value = true;

			allowSpaces();
			if (source[i] === '=') {
				i += 1;
				allowSpaces();

				value = getAttributeValue();
				if (!isNaN(value) && value.trim() !== '') { value = +value; } // TODO whitelist numeric attributes?
			}

			return { name: name, value: value };
		}

		function getAttributeValue() {
			return quotemark.test(source[i]) ? getQuotedAttributeValue() : getUnquotedAttributeValue();
		}

		function getUnquotedAttributeValue() {
			var value = '';
			do {
				var char = source[i];
				if (char === ' ' || char === '>' || char === '/') {
					return value;
				}

				value += char;
				i += 1;
			} while (i < source.length);

			return value;
		}

		function getQuotedAttributeValue() {
			var quotemark = source[i++];

			var value = '';
			var escaped = false;

			while (i < source.length) {
				var char = source[i++];
				if (char === quotemark && !escaped) {
					return value;
				}

				if (char === '\\' && !escaped) {
					escaped = true;
				}

				value += escaped ? ("\\" + char) : char;
				escaped = false;
			}
		}

		function allowSpaces() {
			while (i < source.length && whitespace.test(source[i])) { i += 1; }
		}

		var i = metadata.length;
		while (i < source.length) {
			if (!state) { error('Unexpected character'); }
			state = state();
			i += 1;
		}

		if (state !== neutral) {
			error('Unexpected end of input');
		}

		if (root.tagName === 'svg') { root.metadata = header; }
		return {
			type: 'root',
			children: [root]
		};
	}

	/**
	 * Checks if value is a number (including Infinity).
	 */
	function isNumber(value) {
	    return !Number.isNaN(value) && typeof value === 'number';
	}
	/**
	 * Checks if value is positive number (> 0).
	 */
	function isPositiveNumber(value) {
	    return isNumber(value) && value > 0;
	}
	/**
	 * Checks if value is non-negative number (>= 0).
	 */
	function isNonNegativeNumber(value) {
	    return isNumber(value) && value >= 0;
	}
	/**
	 * Checks if value is string.
	 */
	function isString(value) {
	    return typeof value === 'string';
	}
	/**
	 * Checks if value is TypedArray.
	 */
	function isTypedArray(value) {
	    return ArrayBuffer.isView(value) && !(value instanceof DataView);
	}
	/**
	 * Checks if value is Array or TypedArray.
	 */
	function isArray(value) {
	    return Array.isArray(value) || isTypedArray(value);
	}

	function removeWhitespacePadding(string) {
	    return string.replace(/^\s+|\s+$/g, '');
	}
	function convertToDashArray(value) {
	    let dashArray = [];
	    if (value === '' || value === undefined)
	        return dashArray;
	    if (isNumber(value)) {
	        if (!isPositiveNumber(value)) {
	            throw new Error(`Expected positive number for stroke-dasharray value, got ${value}.`);
	        }
	        dashArray = [value];
	    }
	    else if (isString(value)) {
	        dashArray = value.split(' ').map(_el => {
	            const el = Number.parseFloat(_el);
	            if (!isPositiveNumber(el)) {
	                throw new Error(`Expected positive number for stroke-dasharray value, got ${el} from string "${_el}".`);
	            }
	            return el;
	        });
	    }
	    else if (isArray(value)) {
	        for (let i = 0, len = value.length; i < len; i++) {
	            const el = value[i];
	            if (!isPositiveNumber(el)) {
	                throw new Error(`Expected positive number for stroke-dasharray value, got ${el} from array ${JSON.stringify(value)}.`);
	            }
	            dashArray.push(el);
	        }
	    }
	    else {
	        throw new Error(`Invalid type ${typeof value} for stroke-dasharray property ${value}.`);
	    }
	    if (dashArray.length % 2 === 1) {
	        // Odd length dash arrays should be repeated. 
	        dashArray = [...dashArray, ...dashArray];
	    }
	    return dashArray;
	}

	function initIdentityTransform() {
	    const transform = {
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
	function parseTransformString(string, tagName) {
	    const transformStrings = string.match(/(translate|matrix|rotate|skewX|skewY|scale)\s*\(\s*(.*?)\s*\)/gi);
	    const unusedCharacters = [string.slice()]; // Place to store any characters in transform that were missed.
	    const transforms = [];
	    if (transformStrings) {
	        // Loop through all transforms (many may be chained together e.g. "translate(1, 45) rotate(56)").
	        for (let i = 0; i < transformStrings.length; i++) {
	            const transform = initIdentityTransform(); // Init identity transform to start.
	            const transformString = transformStrings[i]; // Transform as a string.
	            // Keep track of what hasn't been matched.
	            const lastString = unusedCharacters.pop();
	            const matchIndex = lastString.indexOf(transformString);
	            unusedCharacters.push(lastString.slice(0, matchIndex), lastString.slice(matchIndex + transformString.length));
	            // Split transform into components: transform name and parameters.
	            const transformComponents = transformString.split(/[\(\)]+/);
	            if (transformComponents.length > 2)
	                transformComponents.pop(); // Remove empty string at the end of split.
	            if (transformComponents.length !== 2) {
	                transform.errors = [`Malformed transform: "${transformString}".`];
	                transforms.push(transform);
	                continue;
	            }
	            const transformName = removeWhitespacePadding(transformComponents[0]).toLowerCase();
	            // First try splitting by commas.
	            let params = removeWhitespacePadding(transformComponents[1]).split(',');
	            // Then split by spaces if commas not found.
	            if (params.length === 1)
	                params = params[0].split(/\s+/);
	            // Convert parameters to float.
	            const floatParams = [];
	            for (let j = 0; j < params.length; j++) {
	                const param = params[j];
	                floatParams.push(parseFloat(param));
	                // Remove infinity cases.
	                if (floatParams[j] === Infinity || floatParams[j] === -Infinity) {
	                    floatParams[j] = NaN;
	                }
	            }
	            let expectedNumParameters = [];
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
	                    if (a !== 0)
	                        transform.c = Math.tan(a);
	                    break;
	                }
	                case 'skewy': {
	                    // skewY(<skew-angle>), which specifies a skew transformation along the y-axis.
	                    expectedNumParameters = [1];
	                    // Rotation angle is in degrees.
	                    const a = ((floatParams[0] || 0) * Math.PI) / 180;
	                    if (a !== 0)
	                        transform.b = Math.tan(a);
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
	            const warnings = [];
	            // Check that correct number of params supplied.
	            let numParams = params.length;
	            if (numParams === 1 && params[0] === '') {
	                numParams = 0;
	            }
	            if (expectedNumParameters.indexOf(numParams) < 0) {
	                warnings.push(`Found ${tagName ? `${tagName} ` : ''}element with malformed transform: "${transformString}" containing ${numParams} parameters, expected ${expectedNumParameters.join(' or ')} parameter${expectedNumParameters[expectedNumParameters.length - 1] > 1 ? 's' : ''}.`);
	            }
	            else {
	                // Check if any params are invalid.
	                for (let j = 0; j < floatParams.length; j++) {
	                    if (isNaN(floatParams[j])) {
	                        warnings.push(`Found ${tagName ? `${tagName} ` : ''}element with invalid transform: "${transformString}", transform parameters must be finite numbers.`);
	                        break;
	                    }
	                }
	            }
	            // Attach warning to transform.
	            if (warnings.length)
	                transform.warnings = warnings;
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
	        const transform = initIdentityTransform();
	        transform.errors = [
	            `Malformed transform, unmatched characters: [ ${unusedCharacters
                .map((str) => `"${str}"`)
                .join(', ')} ].`,
	        ];
	        transforms.push(transform);
	    }
	    return transforms;
	}
	function flattenTransformArray(transforms) {
	    // Flatten transforms to a single matrix.
	    const transform = copyTransform(transforms[0]);
	    for (let i = 1; i < transforms.length; i++) {
	        dotTransforms(transform, transforms[i]);
	    }
	    return transform;
	}
	function dotTransforms(t1, t2) {
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
	function applyTransform(p, t) {
	    const x = t.a * p[0] + t.c * p[1] + t.e;
	    const y = t.b * p[0] + t.d * p[1] + t.f;
	    // Apply transform in place.
	    p[0] = x;
	    p[1] = y;
	    return p;
	}
	function copyTransform(t) {
	    return {
	        a: t.a,
	        b: t.b,
	        c: t.c,
	        d: t.d,
	        e: t.e,
	        f: t.f,
	    };
	}
	function transformToString(t) {
	    return `matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.e} ${t.f})`;
	}

	var r$1={grad:.9,turn:360,rad:360/(2*Math.PI)},t$1=function(r){return "string"==typeof r?r.length>0:"number"==typeof r},n$1=function(r,t,n){return void 0===t&&(t=0),void 0===n&&(n=Math.pow(10,t)),Math.round(n*r)/n+0},e$1=function(r,t,n){return void 0===t&&(t=0),void 0===n&&(n=1),r>n?n:r>t?r:t},u$1=function(r){return (r=isFinite(r)?r%360:0)>0?r:r+360},a$1=function(r){return {r:e$1(r.r,0,255),g:e$1(r.g,0,255),b:e$1(r.b,0,255),a:e$1(r.a)}},o$1=function(r){return {r:n$1(r.r),g:n$1(r.g),b:n$1(r.b),a:n$1(r.a,3)}},i$1=/^#([0-9a-f]{3,8})$/i,s=function(r){var t=r.toString(16);return t.length<2?"0"+t:t},h$1=function(r){var t=r.r,n=r.g,e=r.b,u=r.a,a=Math.max(t,n,e),o=a-Math.min(t,n,e),i=o?a===t?(n-e)/o:a===n?2+(e-t)/o:4+(t-n)/o:0;return {h:60*(i<0?i+6:i),s:a?o/a*100:0,v:a/255*100,a:u}},b$1=function(r){var t=r.h,n=r.s,e=r.v,u=r.a;t=t/360*6,n/=100,e/=100;var a=Math.floor(t),o=e*(1-n),i=e*(1-(t-a)*n),s=e*(1-(1-t+a)*n),h=a%6;return {r:255*[e,i,o,o,s,e][h],g:255*[s,e,e,i,o,o][h],b:255*[o,o,s,e,e,i][h],a:u}},g=function(r){return {h:u$1(r.h),s:e$1(r.s,0,100),l:e$1(r.l,0,100),a:e$1(r.a)}},d=function(r){return {h:n$1(r.h),s:n$1(r.s),l:n$1(r.l),a:n$1(r.a,3)}},f=function(r){return b$1((n=(t=r).s,{h:t.h,s:(n*=((e=t.l)<50?e:100-e)/100)>0?2*n/(e+n)*100:0,v:e+n,a:t.a}));var t,n,e;},c=function(r){return {h:(t=h$1(r)).h,s:(u=(200-(n=t.s))*(e=t.v)/100)>0&&u<200?n*e/100/(u<=100?u:200-u)*100:0,l:u/2,a:t.a};var t,n,e,u;},l$1=/^hsla?\(\s*([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s*,\s*([+-]?\d*\.?\d+)%\s*,\s*([+-]?\d*\.?\d+)%\s*(?:,\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,p$1=/^hsla?\(\s*([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s+([+-]?\d*\.?\d+)%\s+([+-]?\d*\.?\d+)%\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,v=/^rgba?\(\s*([+-]?\d*\.?\d+)(%)?\s*,\s*([+-]?\d*\.?\d+)(%)?\s*,\s*([+-]?\d*\.?\d+)(%)?\s*(?:,\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,m=/^rgba?\(\s*([+-]?\d*\.?\d+)(%)?\s+([+-]?\d*\.?\d+)(%)?\s+([+-]?\d*\.?\d+)(%)?\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,y={string:[[function(r){var t=i$1.exec(r);return t?(r=t[1]).length<=4?{r:parseInt(r[0]+r[0],16),g:parseInt(r[1]+r[1],16),b:parseInt(r[2]+r[2],16),a:4===r.length?n$1(parseInt(r[3]+r[3],16)/255,2):1}:6===r.length||8===r.length?{r:parseInt(r.substr(0,2),16),g:parseInt(r.substr(2,2),16),b:parseInt(r.substr(4,2),16),a:8===r.length?n$1(parseInt(r.substr(6,2),16)/255,2):1}:null:null},"hex"],[function(r){var t=v.exec(r)||m.exec(r);return t?t[2]!==t[4]||t[4]!==t[6]?null:a$1({r:Number(t[1])/(t[2]?100/255:1),g:Number(t[3])/(t[4]?100/255:1),b:Number(t[5])/(t[6]?100/255:1),a:void 0===t[7]?1:Number(t[7])/(t[8]?100:1)}):null},"rgb"],[function(t){var n=l$1.exec(t)||p$1.exec(t);if(!n)return null;var e,u,a=g({h:(e=n[1],u=n[2],void 0===u&&(u="deg"),Number(e)*(r$1[u]||1)),s:Number(n[3]),l:Number(n[4]),a:void 0===n[5]?1:Number(n[5])/(n[6]?100:1)});return f(a)},"hsl"]],object:[[function(r){var n=r.r,e=r.g,u=r.b,o=r.a,i=void 0===o?1:o;return t$1(n)&&t$1(e)&&t$1(u)?a$1({r:Number(n),g:Number(e),b:Number(u),a:Number(i)}):null},"rgb"],[function(r){var n=r.h,e=r.s,u=r.l,a=r.a,o=void 0===a?1:a;if(!t$1(n)||!t$1(e)||!t$1(u))return null;var i=g({h:Number(n),s:Number(e),l:Number(u),a:Number(o)});return f(i)},"hsl"],[function(r){var n=r.h,a=r.s,o=r.v,i=r.a,s=void 0===i?1:i;if(!t$1(n)||!t$1(a)||!t$1(o))return null;var h=function(r){return {h:u$1(r.h),s:e$1(r.s,0,100),v:e$1(r.v,0,100),a:e$1(r.a)}}({h:Number(n),s:Number(a),v:Number(o),a:Number(s)});return b$1(h)},"hsv"]]},N=function(r,t){for(var n=0;n<t.length;n++){var e=t[n][0](r);if(e)return [e,t[n][1]]}return [null,void 0]},x=function(r){return "string"==typeof r?N(r.trim(),y.string):"object"==typeof r&&null!==r?N(r,y.object):[null,void 0]},M$1=function(r,t){var n=c(r);return {h:n.h,s:e$1(n.s+100*t,0,100),l:n.l,a:n.a}},H=function(r){return (299*r.r+587*r.g+114*r.b)/1e3/255},$=function(r,t){var n=c(r);return {h:n.h,s:n.s,l:e$1(n.l+100*t,0,100),a:n.a}},j=function(){function r(r){this.parsed=x(r)[0],this.rgba=this.parsed||{r:0,g:0,b:0,a:1};}return r.prototype.isValid=function(){return null!==this.parsed},r.prototype.brightness=function(){return n$1(H(this.rgba),2)},r.prototype.isDark=function(){return H(this.rgba)<.5},r.prototype.isLight=function(){return H(this.rgba)>=.5},r.prototype.toHex=function(){return r=o$1(this.rgba),t=r.r,e=r.g,u=r.b,i=(a=r.a)<1?s(n$1(255*a)):"","#"+s(t)+s(e)+s(u)+i;var r,t,e,u,a,i;},r.prototype.toRgb=function(){return o$1(this.rgba)},r.prototype.toRgbString=function(){return r=o$1(this.rgba),t=r.r,n=r.g,e=r.b,(u=r.a)<1?"rgba("+t+", "+n+", "+e+", "+u+")":"rgb("+t+", "+n+", "+e+")";var r,t,n,e,u;},r.prototype.toHsl=function(){return d(c(this.rgba))},r.prototype.toHslString=function(){return r=d(c(this.rgba)),t=r.h,n=r.s,e=r.l,(u=r.a)<1?"hsla("+t+", "+n+"%, "+e+"%, "+u+")":"hsl("+t+", "+n+"%, "+e+"%)";var r,t,n,e,u;},r.prototype.toHsv=function(){return r=h$1(this.rgba),{h:n$1(r.h),s:n$1(r.s),v:n$1(r.v),a:n$1(r.a,3)};var r;},r.prototype.invert=function(){return w$1({r:255-(r=this.rgba).r,g:255-r.g,b:255-r.b,a:r.a});var r;},r.prototype.saturate=function(r){return void 0===r&&(r=.1),w$1(M$1(this.rgba,r))},r.prototype.desaturate=function(r){return void 0===r&&(r=.1),w$1(M$1(this.rgba,-r))},r.prototype.grayscale=function(){return w$1(M$1(this.rgba,-1))},r.prototype.lighten=function(r){return void 0===r&&(r=.1),w$1($(this.rgba,r))},r.prototype.darken=function(r){return void 0===r&&(r=.1),w$1($(this.rgba,-r))},r.prototype.rotate=function(r){return void 0===r&&(r=15),this.hue(this.hue()+r)},r.prototype.alpha=function(r){return "number"==typeof r?w$1({r:(t=this.rgba).r,g:t.g,b:t.b,a:r}):n$1(this.rgba.a,3);var t;},r.prototype.hue=function(r){var t=c(this.rgba);return "number"==typeof r?w$1({h:r,s:t.s,l:t.l,a:t.a}):n$1(t.h)},r.prototype.isEqual=function(r){return this.toHex()===w$1(r).toHex()},r}(),w$1=function(r){return r instanceof j?r:new j(r)},S=[],k=function(r){r.forEach(function(r){S.indexOf(r)<0&&(r(j,y),S.push(r));});};

	function namesPlugin(e,f){var a={white:"#ffffff",bisque:"#ffe4c4",blue:"#0000ff",cadetblue:"#5f9ea0",chartreuse:"#7fff00",chocolate:"#d2691e",coral:"#ff7f50",antiquewhite:"#faebd7",aqua:"#00ffff",azure:"#f0ffff",whitesmoke:"#f5f5f5",papayawhip:"#ffefd5",plum:"#dda0dd",blanchedalmond:"#ffebcd",black:"#000000",gold:"#ffd700",goldenrod:"#daa520",gainsboro:"#dcdcdc",cornsilk:"#fff8dc",cornflowerblue:"#6495ed",burlywood:"#deb887",aquamarine:"#7fffd4",beige:"#f5f5dc",crimson:"#dc143c",cyan:"#00ffff",darkblue:"#00008b",darkcyan:"#008b8b",darkgoldenrod:"#b8860b",darkkhaki:"#bdb76b",darkgray:"#a9a9a9",darkgreen:"#006400",darkgrey:"#a9a9a9",peachpuff:"#ffdab9",darkmagenta:"#8b008b",darkred:"#8b0000",darkorchid:"#9932cc",darkorange:"#ff8c00",darkslateblue:"#483d8b",gray:"#808080",darkslategray:"#2f4f4f",darkslategrey:"#2f4f4f",deeppink:"#ff1493",deepskyblue:"#00bfff",wheat:"#f5deb3",firebrick:"#b22222",floralwhite:"#fffaf0",ghostwhite:"#f8f8ff",darkviolet:"#9400d3",magenta:"#ff00ff",green:"#008000",dodgerblue:"#1e90ff",grey:"#808080",honeydew:"#f0fff0",hotpink:"#ff69b4",blueviolet:"#8a2be2",forestgreen:"#228b22",lawngreen:"#7cfc00",indianred:"#cd5c5c",indigo:"#4b0082",fuchsia:"#ff00ff",brown:"#a52a2a",maroon:"#800000",mediumblue:"#0000cd",lightcoral:"#f08080",darkturquoise:"#00ced1",lightcyan:"#e0ffff",ivory:"#fffff0",lightyellow:"#ffffe0",lightsalmon:"#ffa07a",lightseagreen:"#20b2aa",linen:"#faf0e6",mediumaquamarine:"#66cdaa",lemonchiffon:"#fffacd",lime:"#00ff00",khaki:"#f0e68c",mediumseagreen:"#3cb371",limegreen:"#32cd32",mediumspringgreen:"#00fa9a",lightskyblue:"#87cefa",lightblue:"#add8e6",midnightblue:"#191970",lightpink:"#ffb6c1",mistyrose:"#ffe4e1",moccasin:"#ffe4b5",mintcream:"#f5fffa",lightslategray:"#778899",lightslategrey:"#778899",navajowhite:"#ffdead",navy:"#000080",mediumvioletred:"#c71585",powderblue:"#b0e0e6",palegoldenrod:"#eee8aa",oldlace:"#fdf5e6",paleturquoise:"#afeeee",mediumturquoise:"#48d1cc",mediumorchid:"#ba55d3",rebeccapurple:"#663399",lightsteelblue:"#b0c4de",mediumslateblue:"#7b68ee",thistle:"#d8bfd8",tan:"#d2b48c",orchid:"#da70d6",mediumpurple:"#9370db",purple:"#800080",pink:"#ffc0cb",skyblue:"#87ceeb",springgreen:"#00ff7f",palegreen:"#98fb98",red:"#ff0000",yellow:"#ffff00",slateblue:"#6a5acd",lavenderblush:"#fff0f5",peru:"#cd853f",palevioletred:"#db7093",violet:"#ee82ee",teal:"#008080",slategray:"#708090",slategrey:"#708090",aliceblue:"#f0f8ff",darkseagreen:"#8fbc8f",darkolivegreen:"#556b2f",greenyellow:"#adff2f",seagreen:"#2e8b57",seashell:"#fff5ee",tomato:"#ff6347",silver:"#c0c0c0",sienna:"#a0522d",lavender:"#e6e6fa",lightgreen:"#90ee90",orange:"#ffa500",orangered:"#ff4500",steelblue:"#4682b4",royalblue:"#4169e1",turquoise:"#40e0d0",yellowgreen:"#9acd32",salmon:"#fa8072",saddlebrown:"#8b4513",sandybrown:"#f4a460",rosybrown:"#bc8f8f",darksalmon:"#e9967a",lightgoldenrodyellow:"#fafad2",snow:"#fffafa",lightgrey:"#d3d3d3",lightgray:"#d3d3d3",dimgray:"#696969",dimgrey:"#696969",olivedrab:"#6b8e23",olive:"#808000"},r={};for(var d in a)r[a[d]]=d;var l={};e.prototype.toName=function(f){if(!(this.rgba.a||this.rgba.r||this.rgba.g||this.rgba.b))return "transparent";var d,i,n=r[this.toHex()];if(n)return n;if(null==f?void 0:f.closest){var o=this.toRgb(),t=1/0,b="black";if(!l.length)for(var c in a)l[c]=new e(a[c]).toRgb();for(var g in a){var u=(d=o,i=l[g],Math.pow(d.r-i.r,2)+Math.pow(d.g-i.g,2)+Math.pow(d.b-i.b,2));u<t&&(t=u,b=g);}return b}};f.string.push([function(f){var r=f.toLowerCase(),d="transparent"===r?"#0000":a[r];return d?new e(d).toRgb():null},"name"]);}

	var a=function(a){return "string"==typeof a?a.length>0:"number"==typeof a},t=function(a,t,o){return void 0===t&&(t=0),void 0===o&&(o=Math.pow(10,t)),Math.round(o*a)/o+0},o=function(a,t,o){return void 0===t&&(t=0),void 0===o&&(o=1),a>o?o:a>t?a:t},r=function(a){var t=a/255;return t<.04045?t/12.92:Math.pow((t+.055)/1.055,2.4)},h=function(a){return 255*(a>.0031308?1.055*Math.pow(a,1/2.4)-.055:12.92*a)},n=96.422,p=100,M=82.521,u=function(a){var t,r,n={x:.9555766*(t=a).x+-.0230393*t.y+.0631636*t.z,y:-.0282895*t.x+1.0099416*t.y+.0210077*t.z,z:.0122982*t.x+-.020483*t.y+1.3299098*t.z};return r={r:h(.032404542*n.x-.015371385*n.y-.004985314*n.z),g:h(-.00969266*n.x+.018760108*n.y+41556e-8*n.z),b:h(556434e-9*n.x-.002040259*n.y+.010572252*n.z),a:a.a},{r:o(r.r,0,255),g:o(r.g,0,255),b:o(r.b,0,255),a:o(r.a)}},e=function(a){var t=r(a.r),h=r(a.g),u=r(a.b);return function(a){return {x:o(a.x,0,n),y:o(a.y,0,p),z:o(a.z,0,M),a:o(a.a)}}(function(a){return {x:1.0478112*a.x+.0228866*a.y+-.050127*a.z,y:.0295424*a.x+.9904844*a.y+-.0170491*a.z,z:-.0092345*a.x+.0150436*a.y+.7521316*a.z,a:a.a}}({x:100*(.4124564*t+.3575761*h+.1804375*u),y:100*(.2126729*t+.7151522*h+.072175*u),z:100*(.0193339*t+.119192*h+.9503041*u),a:a.a}))},w=216/24389,b=24389/27,i=function(t){var r=t.l,h=t.a,n=t.b,p=t.alpha,M=void 0===p?1:p;if(!a(r)||!a(h)||!a(n))return null;var u=function(a){return {l:o(a.l,0,400),a:a.a,b:a.b,alpha:o(a.alpha)}}({l:Number(r),a:Number(h),b:Number(n),alpha:Number(M)});return l(u)},l=function(a){var t=(a.l+16)/116,o=a.a/500+t,r=t-a.b/200;return u({x:(Math.pow(o,3)>w?Math.pow(o,3):(116*o-16)/b)*n,y:(a.l>8?Math.pow((a.l+16)/116,3):a.l/b)*p,z:(Math.pow(r,3)>w?Math.pow(r,3):(116*r-16)/b)*M,a:a.alpha})};function labPlugin(a,r){a.prototype.toLab=function(){return o=e(this.rgba),h=o.y/p,u=o.z/M,r=(r=o.x/n)>w?Math.cbrt(r):(b*r+16)/116,a={l:116*(h=h>w?Math.cbrt(h):(b*h+16)/116)-16,a:500*(r-h),b:200*(h-(u=u>w?Math.cbrt(u):(b*u+16)/116)),alpha:o.a},{l:t(a.l,2),a:t(a.a,2),b:t(a.b,2),alpha:t(a.alpha,3)};var a,o,r,h,u;},a.prototype.delta=function(r){void 0===r&&(r="#FFF");var h=r instanceof a?r:new a(r),n=function(a,t){var o=a.l,r=a.a,h=a.b,n=t.l,p=t.a,M=t.b,u=180/Math.PI,e=Math.PI/180,w=Math.pow(Math.pow(r,2)+Math.pow(h,2),.5),b=Math.pow(Math.pow(p,2)+Math.pow(M,2),.5),i=(o+n)/2,l=Math.pow((w+b)/2,7),c=.5*(1-Math.pow(l/(l+Math.pow(25,7)),.5)),f=r*(1+c),y=p*(1+c),v=Math.pow(Math.pow(f,2)+Math.pow(h,2),.5),x=Math.pow(Math.pow(y,2)+Math.pow(M,2),.5),z=(v+x)/2,s=0===f&&0===h?0:Math.atan2(h,f)*u,d=0===y&&0===M?0:Math.atan2(M,y)*u;s<0&&(s+=360),d<0&&(d+=360);var g=d-s,m=Math.abs(d-s);m>180&&d<=s?g+=360:m>180&&d>s&&(g-=360);var N=s+d;m<=180?N/=2:N=(s+d<360?N+360:N-360)/2;var F=1-.17*Math.cos(e*(N-30))+.24*Math.cos(2*e*N)+.32*Math.cos(e*(3*N+6))-.2*Math.cos(e*(4*N-63)),L=n-o,I=x-v,P=2*Math.sin(e*g/2)*Math.pow(v*x,.5),j=1+.015*Math.pow(i-50,2)/Math.pow(20+Math.pow(i-50,2),.5),k=1+.045*z,q=1+.015*z*F,A=30*Math.exp(-1*Math.pow((N-275)/25,2)),B=-2*Math.pow(l/(l+Math.pow(25,7)),.5)*Math.sin(2*e*A);return Math.pow(Math.pow(L/1/j,2)+Math.pow(I/1/k,2)+Math.pow(P/1/q,2)+B*I*P/(1*k*1*q),.5)}(this.toLab(),h.toLab())/100;return o(t(n,3))},r.object.push([i,"lab"]);}

	// Wrapper elements.
	const SVG = 'svg';
	const G = 'g';
	// Geometry elements.
	const LINE = 'line';
	const RECT = 'rect';
	const POLYGON = 'polygon';
	const POLYLINE = 'polyline';
	const PATH = 'path';
	const CIRCLE = 'circle';
	const ELLIPSE = 'ellipse';
	// https://css-tricks.com/svg-properties-and-css/
	const SVG_STYLE_FILL = 'fill';
	const SVG_STYLE_STROKE_COLOR = 'stroke';
	const SVG_STYLE_COLOR = 'color';
	const SVG_STYLE_OPACITY = 'opacity';
	const SVG_STYLE_STROKE_DASH_ARRAY = 'stroke-dasharray';

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	var svgpath$2 = {exports: {}};

	var paramCounts = { a: 7, c: 6, h: 1, l: 2, m: 2, r: 4, q: 4, s: 4, t: 2, v: 1, z: 0 };

	var SPECIAL_SPACES = [
	  0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006,
	  0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF
	];

	function isSpace(ch) {
	  return (ch === 0x0A) || (ch === 0x0D) || (ch === 0x2028) || (ch === 0x2029) || // Line terminators
	    // White spaces
	    (ch === 0x20) || (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) ||
	    (ch >= 0x1680 && SPECIAL_SPACES.indexOf(ch) >= 0);
	}

	function isCommand(code) {
	  /*eslint-disable no-bitwise*/
	  switch (code | 0x20) {
	    case 0x6D/* m */:
	    case 0x7A/* z */:
	    case 0x6C/* l */:
	    case 0x68/* h */:
	    case 0x76/* v */:
	    case 0x63/* c */:
	    case 0x73/* s */:
	    case 0x71/* q */:
	    case 0x74/* t */:
	    case 0x61/* a */:
	    case 0x72/* r */:
	      return true;
	  }
	  return false;
	}

	function isArc(code) {
	  return (code | 0x20) === 0x61;
	}

	function isDigit(code) {
	  return (code >= 48 && code <= 57);   // 0..9
	}

	function isDigitStart(code) {
	  return (code >= 48 && code <= 57) || /* 0..9 */
	          code === 0x2B || /* + */
	          code === 0x2D || /* - */
	          code === 0x2E;   /* . */
	}


	function State(path) {
	  this.index  = 0;
	  this.path   = path;
	  this.max    = path.length;
	  this.result = [];
	  this.param  = 0.0;
	  this.err    = '';
	  this.segmentStart = 0;
	  this.data   = [];
	}

	function skipSpaces(state) {
	  while (state.index < state.max && isSpace(state.path.charCodeAt(state.index))) {
	    state.index++;
	  }
	}


	function scanFlag(state) {
	  var ch = state.path.charCodeAt(state.index);

	  if (ch === 0x30/* 0 */) {
	    state.param = 0;
	    state.index++;
	    return;
	  }

	  if (ch === 0x31/* 1 */) {
	    state.param = 1;
	    state.index++;
	    return;
	  }

	  state.err = 'SvgPath: arc flag can be 0 or 1 only (at pos ' + state.index + ')';
	}


	function scanParam(state) {
	  var start = state.index,
	      index = start,
	      max = state.max,
	      zeroFirst = false,
	      hasCeiling = false,
	      hasDecimal = false,
	      hasDot = false,
	      ch;

	  if (index >= max) {
	    state.err = 'SvgPath: missed param (at pos ' + index + ')';
	    return;
	  }
	  ch = state.path.charCodeAt(index);

	  if (ch === 0x2B/* + */ || ch === 0x2D/* - */) {
	    index++;
	    ch = (index < max) ? state.path.charCodeAt(index) : 0;
	  }

	  // This logic is shamelessly borrowed from Esprima
	  // https://github.com/ariya/esprimas
	  //
	  if (!isDigit(ch) && ch !== 0x2E/* . */) {
	    state.err = 'SvgPath: param should start with 0..9 or `.` (at pos ' + index + ')';
	    return;
	  }

	  if (ch !== 0x2E/* . */) {
	    zeroFirst = (ch === 0x30/* 0 */);
	    index++;

	    ch = (index < max) ? state.path.charCodeAt(index) : 0;

	    if (zeroFirst && index < max) {
	      // decimal number starts with '0' such as '09' is illegal.
	      if (ch && isDigit(ch)) {
	        state.err = 'SvgPath: numbers started with `0` such as `09` are illegal (at pos ' + start + ')';
	        return;
	      }
	    }

	    while (index < max && isDigit(state.path.charCodeAt(index))) {
	      index++;
	      hasCeiling = true;
	    }
	    ch = (index < max) ? state.path.charCodeAt(index) : 0;
	  }

	  if (ch === 0x2E/* . */) {
	    hasDot = true;
	    index++;
	    while (isDigit(state.path.charCodeAt(index))) {
	      index++;
	      hasDecimal = true;
	    }
	    ch = (index < max) ? state.path.charCodeAt(index) : 0;
	  }

	  if (ch === 0x65/* e */ || ch === 0x45/* E */) {
	    if (hasDot && !hasCeiling && !hasDecimal) {
	      state.err = 'SvgPath: invalid float exponent (at pos ' + index + ')';
	      return;
	    }

	    index++;

	    ch = (index < max) ? state.path.charCodeAt(index) : 0;
	    if (ch === 0x2B/* + */ || ch === 0x2D/* - */) {
	      index++;
	    }
	    if (index < max && isDigit(state.path.charCodeAt(index))) {
	      while (index < max && isDigit(state.path.charCodeAt(index))) {
	        index++;
	      }
	    } else {
	      state.err = 'SvgPath: invalid float exponent (at pos ' + index + ')';
	      return;
	    }
	  }

	  state.index = index;
	  state.param = parseFloat(state.path.slice(start, index)) + 0.0;
	}


	function finalizeSegment(state) {
	  var cmd, cmdLC;

	  // Process duplicated commands (without comand name)

	  // This logic is shamelessly borrowed from Raphael
	  // https://github.com/DmitryBaranovskiy/raphael/
	  //
	  cmd   = state.path[state.segmentStart];
	  cmdLC = cmd.toLowerCase();

	  var params = state.data;

	  if (cmdLC === 'm' && params.length > 2) {
	    state.result.push([ cmd, params[0], params[1] ]);
	    params = params.slice(2);
	    cmdLC = 'l';
	    cmd = (cmd === 'm') ? 'l' : 'L';
	  }

	  if (cmdLC === 'r') {
	    state.result.push([ cmd ].concat(params));
	  } else {

	    while (params.length >= paramCounts[cmdLC]) {
	      state.result.push([ cmd ].concat(params.splice(0, paramCounts[cmdLC])));
	      if (!paramCounts[cmdLC]) {
	        break;
	      }
	    }
	  }
	}


	function scanSegment(state) {
	  var max = state.max,
	      cmdCode, is_arc, comma_found, need_params, i;

	  state.segmentStart = state.index;
	  cmdCode = state.path.charCodeAt(state.index);
	  is_arc = isArc(cmdCode);

	  if (!isCommand(cmdCode)) {
	    state.err = 'SvgPath: bad command ' + state.path[state.index] + ' (at pos ' + state.index + ')';
	    return;
	  }

	  need_params = paramCounts[state.path[state.index].toLowerCase()];

	  state.index++;
	  skipSpaces(state);

	  state.data = [];

	  if (!need_params) {
	    // Z
	    finalizeSegment(state);
	    return;
	  }

	  comma_found = false;

	  for (;;) {
	    for (i = need_params; i > 0; i--) {
	      if (is_arc && (i === 3 || i === 4)) scanFlag(state);
	      else scanParam(state);

	      if (state.err.length) {
	        finalizeSegment(state);
	        return;
	      }
	      state.data.push(state.param);

	      skipSpaces(state);
	      comma_found = false;

	      if (state.index < max && state.path.charCodeAt(state.index) === 0x2C/* , */) {
	        state.index++;
	        skipSpaces(state);
	        comma_found = true;
	      }
	    }

	    // after ',' param is mandatory
	    if (comma_found) {
	      continue;
	    }

	    if (state.index >= state.max) {
	      break;
	    }

	    // Stop on next segment
	    if (!isDigitStart(state.path.charCodeAt(state.index))) {
	      break;
	    }
	  }

	  finalizeSegment(state);
	}


	/* Returns array of segments:
	 *
	 * [
	 *   [ command, coord1, coord2, ... ]
	 * ]
	 */
	var path_parse = function pathParse(svgPath) {
	  var state = new State(svgPath);
	  var max = state.max;

	  skipSpaces(state);

	  while (state.index < max && !state.err.length) {
	    scanSegment(state);
	  }

	  if (state.result.length) {
	    if ('mM'.indexOf(state.result[0][0]) < 0) {
	      state.err = 'SvgPath: string should start with `M` or `m`';
	      state.result = [];
	    } else {
	      state.result[0][0] = 'M';
	    }
	  }

	  return {
	    err: state.err,
	    segments: state.result
	  };
	};

	// combine 2 matrixes
	// m1, m2 - [a, b, c, d, e, g]
	//
	function combine(m1, m2) {
	  return [
	    m1[0] * m2[0] + m1[2] * m2[1],
	    m1[1] * m2[0] + m1[3] * m2[1],
	    m1[0] * m2[2] + m1[2] * m2[3],
	    m1[1] * m2[2] + m1[3] * m2[3],
	    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
	    m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
	  ];
	}


	function Matrix$1() {
	  if (!(this instanceof Matrix$1)) { return new Matrix$1(); }
	  this.queue = [];   // list of matrixes to apply
	  this.cache = null; // combined matrix cache
	}


	Matrix$1.prototype.matrix = function (m) {
	  if (m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0) {
	    return this;
	  }
	  this.cache = null;
	  this.queue.push(m);
	  return this;
	};


	Matrix$1.prototype.translate = function (tx, ty) {
	  if (tx !== 0 || ty !== 0) {
	    this.cache = null;
	    this.queue.push([ 1, 0, 0, 1, tx, ty ]);
	  }
	  return this;
	};


	Matrix$1.prototype.scale = function (sx, sy) {
	  if (sx !== 1 || sy !== 1) {
	    this.cache = null;
	    this.queue.push([ sx, 0, 0, sy, 0, 0 ]);
	  }
	  return this;
	};


	Matrix$1.prototype.rotate = function (angle, rx, ry) {
	  var rad, cos, sin;

	  if (angle !== 0) {
	    this.translate(rx, ry);

	    rad = angle * Math.PI / 180;
	    cos = Math.cos(rad);
	    sin = Math.sin(rad);

	    this.queue.push([ cos, sin, -sin, cos, 0, 0 ]);
	    this.cache = null;

	    this.translate(-rx, -ry);
	  }
	  return this;
	};


	Matrix$1.prototype.skewX = function (angle) {
	  if (angle !== 0) {
	    this.cache = null;
	    this.queue.push([ 1, 0, Math.tan(angle * Math.PI / 180), 1, 0, 0 ]);
	  }
	  return this;
	};


	Matrix$1.prototype.skewY = function (angle) {
	  if (angle !== 0) {
	    this.cache = null;
	    this.queue.push([ 1, Math.tan(angle * Math.PI / 180), 0, 1, 0, 0 ]);
	  }
	  return this;
	};


	// Flatten queue
	//
	Matrix$1.prototype.toArray = function () {
	  if (this.cache) {
	    return this.cache;
	  }

	  if (!this.queue.length) {
	    this.cache = [ 1, 0, 0, 1, 0, 0 ];
	    return this.cache;
	  }

	  this.cache = this.queue[0];

	  if (this.queue.length === 1) {
	    return this.cache;
	  }

	  for (var i = 1; i < this.queue.length; i++) {
	    this.cache = combine(this.cache, this.queue[i]);
	  }

	  return this.cache;
	};


	// Apply list of matrixes to (x,y) point.
	// If `isRelative` set, `translate` component of matrix will be skipped
	//
	Matrix$1.prototype.calc = function (x, y, isRelative) {
	  var m;

	  // Don't change point on empty transforms queue
	  if (!this.queue.length) { return [ x, y ]; }

	  // Calculate final matrix, if not exists
	  //
	  // NB. if you deside to apply transforms to point one-by-one,
	  // they should be taken in reverse order

	  if (!this.cache) {
	    this.cache = this.toArray();
	  }

	  m = this.cache;

	  // Apply matrix to point
	  return [
	    x * m[0] + y * m[2] + (isRelative ? 0 : m[4]),
	    x * m[1] + y * m[3] + (isRelative ? 0 : m[5])
	  ];
	};


	var matrix$1 = Matrix$1;

	var Matrix = matrix$1;

	var operations = {
	  matrix: true,
	  scale: true,
	  rotate: true,
	  translate: true,
	  skewX: true,
	  skewY: true
	};

	var CMD_SPLIT_RE    = /\s*(matrix|translate|scale|rotate|skewX|skewY)\s*\(\s*(.+?)\s*\)[\s,]*/;
	var PARAMS_SPLIT_RE = /[\s,]+/;


	var transform_parse = function transformParse(transformString) {
	  var matrix = new Matrix();
	  var cmd, params;

	  // Split value into ['', 'translate', '10 50', '', 'scale', '2', '', 'rotate',  '-45', '']
	  transformString.split(CMD_SPLIT_RE).forEach(function (item) {

	    // Skip empty elements
	    if (!item.length) { return; }

	    // remember operation
	    if (typeof operations[item] !== 'undefined') {
	      cmd = item;
	      return;
	    }

	    // extract params & att operation to matrix
	    params = item.split(PARAMS_SPLIT_RE).map(function (i) {
	      return +i || 0;
	    });

	    // If params count is not correct - ignore command
	    switch (cmd) {
	      case 'matrix':
	        if (params.length === 6) {
	          matrix.matrix(params);
	        }
	        return;

	      case 'scale':
	        if (params.length === 1) {
	          matrix.scale(params[0], params[0]);
	        } else if (params.length === 2) {
	          matrix.scale(params[0], params[1]);
	        }
	        return;

	      case 'rotate':
	        if (params.length === 1) {
	          matrix.rotate(params[0], 0, 0);
	        } else if (params.length === 3) {
	          matrix.rotate(params[0], params[1], params[2]);
	        }
	        return;

	      case 'translate':
	        if (params.length === 1) {
	          matrix.translate(params[0], 0);
	        } else if (params.length === 2) {
	          matrix.translate(params[0], params[1]);
	        }
	        return;

	      case 'skewX':
	        if (params.length === 1) {
	          matrix.skewX(params[0]);
	        }
	        return;

	      case 'skewY':
	        if (params.length === 1) {
	          matrix.skewY(params[0]);
	        }
	        return;
	    }
	  });

	  return matrix;
	};

	var TAU = Math.PI * 2;


	/* eslint-disable space-infix-ops */

	// Calculate an angle between two unit vectors
	//
	// Since we measure angle between radii of circular arcs,
	// we can use simplified math (without length normalization)
	//
	function unit_vector_angle(ux, uy, vx, vy) {
	  var sign = (ux * vy - uy * vx < 0) ? -1 : 1;
	  var dot  = ux * vx + uy * vy;

	  // Add this to work with arbitrary vectors:
	  // dot /= Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);

	  // rounding errors, e.g. -1.0000000000000002 can screw up this
	  if (dot >  1.0) { dot =  1.0; }
	  if (dot < -1.0) { dot = -1.0; }

	  return sign * Math.acos(dot);
	}


	// Convert from endpoint to center parameterization,
	// see http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
	//
	// Return [cx, cy, theta1, delta_theta]
	//
	function get_arc_center(x1, y1, x2, y2, fa, fs, rx, ry, sin_phi, cos_phi) {
	  // Step 1.
	  //
	  // Moving an ellipse so origin will be the middlepoint between our two
	  // points. After that, rotate it to line up ellipse axes with coordinate
	  // axes.
	  //
	  var x1p =  cos_phi*(x1-x2)/2 + sin_phi*(y1-y2)/2;
	  var y1p = -sin_phi*(x1-x2)/2 + cos_phi*(y1-y2)/2;

	  var rx_sq  =  rx * rx;
	  var ry_sq  =  ry * ry;
	  var x1p_sq = x1p * x1p;
	  var y1p_sq = y1p * y1p;

	  // Step 2.
	  //
	  // Compute coordinates of the centre of this ellipse (cx', cy')
	  // in the new coordinate system.
	  //
	  var radicant = (rx_sq * ry_sq) - (rx_sq * y1p_sq) - (ry_sq * x1p_sq);

	  if (radicant < 0) {
	    // due to rounding errors it might be e.g. -1.3877787807814457e-17
	    radicant = 0;
	  }

	  radicant /=   (rx_sq * y1p_sq) + (ry_sq * x1p_sq);
	  radicant = Math.sqrt(radicant) * (fa === fs ? -1 : 1);

	  var cxp = radicant *  rx/ry * y1p;
	  var cyp = radicant * -ry/rx * x1p;

	  // Step 3.
	  //
	  // Transform back to get centre coordinates (cx, cy) in the original
	  // coordinate system.
	  //
	  var cx = cos_phi*cxp - sin_phi*cyp + (x1+x2)/2;
	  var cy = sin_phi*cxp + cos_phi*cyp + (y1+y2)/2;

	  // Step 4.
	  //
	  // Compute angles (theta1, delta_theta).
	  //
	  var v1x =  (x1p - cxp) / rx;
	  var v1y =  (y1p - cyp) / ry;
	  var v2x = (-x1p - cxp) / rx;
	  var v2y = (-y1p - cyp) / ry;

	  var theta1 = unit_vector_angle(1, 0, v1x, v1y);
	  var delta_theta = unit_vector_angle(v1x, v1y, v2x, v2y);

	  if (fs === 0 && delta_theta > 0) {
	    delta_theta -= TAU;
	  }
	  if (fs === 1 && delta_theta < 0) {
	    delta_theta += TAU;
	  }

	  return [ cx, cy, theta1, delta_theta ];
	}

	//
	// Approximate one unit arc segment with bézier curves,
	// see http://math.stackexchange.com/questions/873224
	//
	function approximate_unit_arc(theta1, delta_theta) {
	  var alpha = 4/3 * Math.tan(delta_theta/4);

	  var x1 = Math.cos(theta1);
	  var y1 = Math.sin(theta1);
	  var x2 = Math.cos(theta1 + delta_theta);
	  var y2 = Math.sin(theta1 + delta_theta);

	  return [ x1, y1, x1 - y1*alpha, y1 + x1*alpha, x2 + y2*alpha, y2 - x2*alpha, x2, y2 ];
	}

	var a2c$1 = function a2c(x1, y1, x2, y2, fa, fs, rx, ry, phi) {
	  var sin_phi = Math.sin(phi * TAU / 360);
	  var cos_phi = Math.cos(phi * TAU / 360);

	  // Make sure radii are valid
	  //
	  var x1p =  cos_phi*(x1-x2)/2 + sin_phi*(y1-y2)/2;
	  var y1p = -sin_phi*(x1-x2)/2 + cos_phi*(y1-y2)/2;

	  if (x1p === 0 && y1p === 0) {
	    // we're asked to draw line to itself
	    return [];
	  }

	  if (rx === 0 || ry === 0) {
	    // one of the radii is zero
	    return [];
	  }


	  // Compensate out-of-range radii
	  //
	  rx = Math.abs(rx);
	  ry = Math.abs(ry);

	  var lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
	  if (lambda > 1) {
	    rx *= Math.sqrt(lambda);
	    ry *= Math.sqrt(lambda);
	  }


	  // Get center parameters (cx, cy, theta1, delta_theta)
	  //
	  var cc = get_arc_center(x1, y1, x2, y2, fa, fs, rx, ry, sin_phi, cos_phi);

	  var result = [];
	  var theta1 = cc[2];
	  var delta_theta = cc[3];

	  // Split an arc to multiple segments, so each segment
	  // will be less than τ/4 (= 90°)
	  //
	  var segments = Math.max(Math.ceil(Math.abs(delta_theta) / (TAU / 4)), 1);
	  delta_theta /= segments;

	  for (var i = 0; i < segments; i++) {
	    result.push(approximate_unit_arc(theta1, delta_theta));
	    theta1 += delta_theta;
	  }

	  // We have a bezier approximation of a unit circle,
	  // now need to transform back to the original ellipse
	  //
	  return result.map(function (curve) {
	    for (var i = 0; i < curve.length; i += 2) {
	      var x = curve[i + 0];
	      var y = curve[i + 1];

	      // scale
	      x *= rx;
	      y *= ry;

	      // rotate
	      var xp = cos_phi*x - sin_phi*y;
	      var yp = sin_phi*x + cos_phi*y;

	      // translate
	      curve[i + 0] = xp + cc[0];
	      curve[i + 1] = yp + cc[1];
	    }

	    return curve;
	  });
	};

	/* eslint-disable space-infix-ops */

	// The precision used to consider an ellipse as a circle
	//
	var epsilon = 0.0000000001;

	// To convert degree in radians
	//
	var torad = Math.PI / 180;

	// Class constructor :
	//  an ellipse centred at 0 with radii rx,ry and x - axis - angle ax.
	//
	function Ellipse(rx, ry, ax) {
	  if (!(this instanceof Ellipse)) { return new Ellipse(rx, ry, ax); }
	  this.rx = rx;
	  this.ry = ry;
	  this.ax = ax;
	}

	// Apply a linear transform m to the ellipse
	// m is an array representing a matrix :
	//    -         -
	//   | m[0] m[2] |
	//   | m[1] m[3] |
	//    -         -
	//
	Ellipse.prototype.transform = function (m) {
	  // We consider the current ellipse as image of the unit circle
	  // by first scale(rx,ry) and then rotate(ax) ...
	  // So we apply ma =  m x rotate(ax) x scale(rx,ry) to the unit circle.
	  var c = Math.cos(this.ax * torad), s = Math.sin(this.ax * torad);
	  var ma = [
	    this.rx * (m[0]*c + m[2]*s),
	    this.rx * (m[1]*c + m[3]*s),
	    this.ry * (-m[0]*s + m[2]*c),
	    this.ry * (-m[1]*s + m[3]*c)
	  ];

	  // ma * transpose(ma) = [ J L ]
	  //                      [ L K ]
	  // L is calculated later (if the image is not a circle)
	  var J = ma[0]*ma[0] + ma[2]*ma[2],
	      K = ma[1]*ma[1] + ma[3]*ma[3];

	  // the discriminant of the characteristic polynomial of ma * transpose(ma)
	  var D = ((ma[0]-ma[3])*(ma[0]-ma[3]) + (ma[2]+ma[1])*(ma[2]+ma[1])) *
	          ((ma[0]+ma[3])*(ma[0]+ma[3]) + (ma[2]-ma[1])*(ma[2]-ma[1]));

	  // the "mean eigenvalue"
	  var JK = (J + K) / 2;

	  // check if the image is (almost) a circle
	  if (D < epsilon * JK) {
	    // if it is
	    this.rx = this.ry = Math.sqrt(JK);
	    this.ax = 0;
	    return this;
	  }

	  // if it is not a circle
	  var L = ma[0]*ma[1] + ma[2]*ma[3];

	  D = Math.sqrt(D);

	  // {l1,l2} = the two eigen values of ma * transpose(ma)
	  var l1 = JK + D/2,
	      l2 = JK - D/2;
	  // the x - axis - rotation angle is the argument of the l1 - eigenvector
	  /*eslint-disable indent*/
	  this.ax = (Math.abs(L) < epsilon && Math.abs(l1 - K) < epsilon) ?
	    90
	  :
	    Math.atan(Math.abs(L) > Math.abs(l1 - K) ?
	      (l1 - J) / L
	    :
	      L / (l1 - K)
	    ) * 180 / Math.PI;
	  /*eslint-enable indent*/

	  // if ax > 0 => rx = sqrt(l1), ry = sqrt(l2), else exchange axes and ax += 90
	  if (this.ax >= 0) {
	    // if ax in [0,90]
	    this.rx = Math.sqrt(l1);
	    this.ry = Math.sqrt(l2);
	  } else {
	    // if ax in ]-90,0[ => exchange axes
	    this.ax += 90;
	    this.rx = Math.sqrt(l2);
	    this.ry = Math.sqrt(l1);
	  }

	  return this;
	};

	// Check if the ellipse is (almost) degenerate, i.e. rx = 0 or ry = 0
	//
	Ellipse.prototype.isDegenerate = function () {
	  return (this.rx < epsilon * this.ry || this.ry < epsilon * this.rx);
	};

	var ellipse$1 = Ellipse;

	var pathParse      = path_parse;
	var transformParse = transform_parse;
	var matrix         = matrix$1;
	var a2c            = a2c$1;
	var ellipse        = ellipse$1;


	// Class constructor
	//
	function SvgPath(path) {
	  if (!(this instanceof SvgPath)) { return new SvgPath(path); }

	  var pstate = pathParse(path);

	  // Array of path segments.
	  // Each segment is array [command, param1, param2, ...]
	  this.segments = pstate.segments;

	  // Error message on parse error.
	  this.err      = pstate.err;

	  // Transforms stack for lazy evaluation
	  this.__stack    = [];
	}

	SvgPath.from = function (src) {
	  if (typeof src === 'string') return new SvgPath(src);

	  if (src instanceof SvgPath) {
	    // Create empty object
	    var s = new SvgPath('');

	    // Clone properies
	    s.err = src.err;
	    s.segments = src.segments.map(function (sgm) { return sgm.slice(); });
	    s.__stack = src.__stack.map(function (m) {
	      return matrix().matrix(m.toArray());
	    });

	    return s;
	  }

	  throw new Error('SvgPath.from: invalid param type ' + src);
	};


	SvgPath.prototype.__matrix = function (m) {
	  var self = this, i;

	  // Quick leave for empty matrix
	  if (!m.queue.length) { return; }

	  this.iterate(function (s, index, x, y) {
	    var p, result, name, isRelative;

	    switch (s[0]) {

	      // Process 'assymetric' commands separately
	      case 'v':
	        p      = m.calc(0, s[1], true);
	        result = (p[0] === 0) ? [ 'v', p[1] ] : [ 'l', p[0], p[1] ];
	        break;

	      case 'V':
	        p      = m.calc(x, s[1], false);
	        result = (p[0] === m.calc(x, y, false)[0]) ? [ 'V', p[1] ] : [ 'L', p[0], p[1] ];
	        break;

	      case 'h':
	        p      = m.calc(s[1], 0, true);
	        result = (p[1] === 0) ? [ 'h', p[0] ] : [ 'l', p[0], p[1] ];
	        break;

	      case 'H':
	        p      = m.calc(s[1], y, false);
	        result = (p[1] === m.calc(x, y, false)[1]) ? [ 'H', p[0] ] : [ 'L', p[0], p[1] ];
	        break;

	      case 'a':
	      case 'A':
	        // ARC is: ['A', rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]

	        // Drop segment if arc is empty (end point === start point)
	        /*if ((s[0] === 'A' && s[6] === x && s[7] === y) ||
	            (s[0] === 'a' && s[6] === 0 && s[7] === 0)) {
	          return [];
	        }*/

	        // Transform rx, ry and the x-axis-rotation
	        var ma = m.toArray();
	        var e = ellipse(s[1], s[2], s[3]).transform(ma);

	        // flip sweep-flag if matrix is not orientation-preserving
	        if (ma[0] * ma[3] - ma[1] * ma[2] < 0) {
	          s[5] = s[5] ? '0' : '1';
	        }

	        // Transform end point as usual (without translation for relative notation)
	        p = m.calc(s[6], s[7], s[0] === 'a');

	        // Empty arcs can be ignored by renderer, but should not be dropped
	        // to avoid collisions with `S A S` and so on. Replace with empty line.
	        if ((s[0] === 'A' && s[6] === x && s[7] === y) ||
	            (s[0] === 'a' && s[6] === 0 && s[7] === 0)) {
	          result = [ s[0] === 'a' ? 'l' : 'L', p[0], p[1] ];
	          break;
	        }

	        // if the resulting ellipse is (almost) a segment ...
	        if (e.isDegenerate()) {
	          // replace the arc by a line
	          result = [ s[0] === 'a' ? 'l' : 'L', p[0], p[1] ];
	        } else {
	          // if it is a real ellipse
	          // s[0], s[4] and s[5] are not modified
	          result = [ s[0], e.rx, e.ry, e.ax, s[4], s[5], p[0], p[1] ];
	        }

	        break;

	      case 'm':
	        // Edge case. The very first `m` should be processed as absolute, if happens.
	        // Make sense for coord shift transforms.
	        isRelative = index > 0;

	        p = m.calc(s[1], s[2], isRelative);
	        result = [ 'm', p[0], p[1] ];
	        break;

	      default:
	        name       = s[0];
	        result     = [ name ];
	        isRelative = (name.toLowerCase() === name);

	        // Apply transformations to the segment
	        for (i = 1; i < s.length; i += 2) {
	          p = m.calc(s[i], s[i + 1], isRelative);
	          result.push(p[0], p[1]);
	        }
	    }

	    self.segments[index] = result;
	  }, true);
	};


	// Apply stacked commands
	//
	SvgPath.prototype.__evaluateStack = function () {
	  var m, i;

	  if (!this.__stack.length) { return; }

	  if (this.__stack.length === 1) {
	    this.__matrix(this.__stack[0]);
	    this.__stack = [];
	    return;
	  }

	  m = matrix();
	  i = this.__stack.length;

	  while (--i >= 0) {
	    m.matrix(this.__stack[i].toArray());
	  }

	  this.__matrix(m);
	  this.__stack = [];
	};


	// Convert processed SVG Path back to string
	//
	SvgPath.prototype.toString = function () {
	  var result = '', prevCmd = '', cmdSkipped = false;

	  this.__evaluateStack();

	  for (var i = 0, len = this.segments.length; i < len; i++) {
	    var segment = this.segments[i];
	    var cmd = segment[0];

	    // Command not repeating => store
	    if (cmd !== prevCmd || cmd === 'm' || cmd === 'M') {
	      // workaround for FontForge SVG importing bug, keep space between "z m".
	      if (cmd === 'm' && prevCmd === 'z') result += ' ';
	      result += cmd;

	      cmdSkipped = false;
	    } else {
	      cmdSkipped = true;
	    }

	    // Store segment params
	    for (var pos = 1; pos < segment.length; pos++) {
	      var val = segment[pos];
	      // Space can be skipped
	      // 1. After command (always)
	      // 2. For negative value (with '-' at start)
	      if (pos === 1) {
	        if (cmdSkipped && val >= 0) result += ' ';
	      } else if (val >= 0) result += ' ';

	      result += val;
	    }

	    prevCmd = cmd;
	  }

	  return result;
	};


	// Translate path to (x [, y])
	//
	SvgPath.prototype.translate = function (x, y) {
	  this.__stack.push(matrix().translate(x, y || 0));
	  return this;
	};


	// Scale path to (sx [, sy])
	// sy = sx if not defined
	//
	SvgPath.prototype.scale = function (sx, sy) {
	  this.__stack.push(matrix().scale(sx, (!sy && (sy !== 0)) ? sx : sy));
	  return this;
	};


	// Rotate path around point (sx [, sy])
	// sy = sx if not defined
	//
	SvgPath.prototype.rotate = function (angle, rx, ry) {
	  this.__stack.push(matrix().rotate(angle, rx || 0, ry || 0));
	  return this;
	};


	// Skew path along the X axis by `degrees` angle
	//
	SvgPath.prototype.skewX = function (degrees) {
	  this.__stack.push(matrix().skewX(degrees));
	  return this;
	};


	// Skew path along the Y axis by `degrees` angle
	//
	SvgPath.prototype.skewY = function (degrees) {
	  this.__stack.push(matrix().skewY(degrees));
	  return this;
	};


	// Apply matrix transform (array of 6 elements)
	//
	SvgPath.prototype.matrix = function (m) {
	  this.__stack.push(matrix().matrix(m));
	  return this;
	};


	// Transform path according to "transform" attr of SVG spec
	//
	SvgPath.prototype.transform = function (transformString) {
	  if (!transformString.trim()) {
	    return this;
	  }
	  this.__stack.push(transformParse(transformString));
	  return this;
	};


	// Round coords with given decimal precition.
	// 0 by default (to integers)
	//
	SvgPath.prototype.round = function (d) {
	  var contourStartDeltaX = 0, contourStartDeltaY = 0, deltaX = 0, deltaY = 0, l;

	  d = d || 0;

	  this.__evaluateStack();

	  this.segments.forEach(function (s) {
	    var isRelative = (s[0].toLowerCase() === s[0]);

	    switch (s[0]) {
	      case 'H':
	      case 'h':
	        if (isRelative) { s[1] += deltaX; }
	        deltaX = s[1] - s[1].toFixed(d);
	        s[1] = +s[1].toFixed(d);
	        return;

	      case 'V':
	      case 'v':
	        if (isRelative) { s[1] += deltaY; }
	        deltaY = s[1] - s[1].toFixed(d);
	        s[1] = +s[1].toFixed(d);
	        return;

	      case 'Z':
	      case 'z':
	        deltaX = contourStartDeltaX;
	        deltaY = contourStartDeltaY;
	        return;

	      case 'M':
	      case 'm':
	        if (isRelative) {
	          s[1] += deltaX;
	          s[2] += deltaY;
	        }

	        deltaX = s[1] - s[1].toFixed(d);
	        deltaY = s[2] - s[2].toFixed(d);

	        contourStartDeltaX = deltaX;
	        contourStartDeltaY = deltaY;

	        s[1] = +s[1].toFixed(d);
	        s[2] = +s[2].toFixed(d);
	        return;

	      case 'A':
	      case 'a':
	        // [cmd, rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
	        if (isRelative) {
	          s[6] += deltaX;
	          s[7] += deltaY;
	        }

	        deltaX = s[6] - s[6].toFixed(d);
	        deltaY = s[7] - s[7].toFixed(d);

	        s[1] = +s[1].toFixed(d);
	        s[2] = +s[2].toFixed(d);
	        s[3] = +s[3].toFixed(d + 2); // better precision for rotation
	        s[6] = +s[6].toFixed(d);
	        s[7] = +s[7].toFixed(d);
	        return;

	      default:
	        // a c l q s t
	        l = s.length;

	        if (isRelative) {
	          s[l - 2] += deltaX;
	          s[l - 1] += deltaY;
	        }

	        deltaX = s[l - 2] - s[l - 2].toFixed(d);
	        deltaY = s[l - 1] - s[l - 1].toFixed(d);

	        s.forEach(function (val, i) {
	          if (!i) { return; }
	          s[i] = +s[i].toFixed(d);
	        });
	        return;
	    }
	  });

	  return this;
	};


	// Apply iterator function to all segments. If function returns result,
	// current segment will be replaced to array of returned segments.
	// If empty array is returned, current regment will be deleted.
	//
	SvgPath.prototype.iterate = function (iterator, keepLazyStack) {
	  var segments = this.segments,
	      replacements = {},
	      needReplace = false,
	      lastX = 0,
	      lastY = 0,
	      countourStartX = 0,
	      countourStartY = 0;
	  var i, j, newSegments;

	  if (!keepLazyStack) {
	    this.__evaluateStack();
	  }

	  segments.forEach(function (s, index) {

	    var res = iterator(s, index, lastX, lastY);

	    if (Array.isArray(res)) {
	      replacements[index] = res;
	      needReplace = true;
	    }

	    var isRelative = (s[0] === s[0].toLowerCase());

	    // calculate absolute X and Y
	    switch (s[0]) {
	      case 'm':
	      case 'M':
	        lastX = s[1] + (isRelative ? lastX : 0);
	        lastY = s[2] + (isRelative ? lastY : 0);
	        countourStartX = lastX;
	        countourStartY = lastY;
	        return;

	      case 'h':
	      case 'H':
	        lastX = s[1] + (isRelative ? lastX : 0);
	        return;

	      case 'v':
	      case 'V':
	        lastY = s[1] + (isRelative ? lastY : 0);
	        return;

	      case 'z':
	      case 'Z':
	        // That make sence for multiple contours
	        lastX = countourStartX;
	        lastY = countourStartY;
	        return;

	      default:
	        lastX = s[s.length - 2] + (isRelative ? lastX : 0);
	        lastY = s[s.length - 1] + (isRelative ? lastY : 0);
	    }
	  });

	  // Replace segments if iterator return results

	  if (!needReplace) { return this; }

	  newSegments = [];

	  for (i = 0; i < segments.length; i++) {
	    if (typeof replacements[i] !== 'undefined') {
	      for (j = 0; j < replacements[i].length; j++) {
	        newSegments.push(replacements[i][j]);
	      }
	    } else {
	      newSegments.push(segments[i]);
	    }
	  }

	  this.segments = newSegments;

	  return this;
	};


	// Converts segments from relative to absolute
	//
	SvgPath.prototype.abs = function () {

	  this.iterate(function (s, index, x, y) {
	    var name = s[0],
	        nameUC = name.toUpperCase(),
	        i;

	    // Skip absolute commands
	    if (name === nameUC) { return; }

	    s[0] = nameUC;

	    switch (name) {
	      case 'v':
	        // v has shifted coords parity
	        s[1] += y;
	        return;

	      case 'a':
	        // ARC is: ['A', rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
	        // touch x, y only
	        s[6] += x;
	        s[7] += y;
	        return;

	      default:
	        for (i = 1; i < s.length; i++) {
	          s[i] += i % 2 ? x : y; // odd values are X, even - Y
	        }
	    }
	  }, true);

	  return this;
	};


	// Converts segments from absolute to relative
	//
	SvgPath.prototype.rel = function () {

	  this.iterate(function (s, index, x, y) {
	    var name = s[0],
	        nameLC = name.toLowerCase(),
	        i;

	    // Skip relative commands
	    if (name === nameLC) { return; }

	    // Don't touch the first M to avoid potential confusions.
	    if (index === 0 && name === 'M') { return; }

	    s[0] = nameLC;

	    switch (name) {
	      case 'V':
	        // V has shifted coords parity
	        s[1] -= y;
	        return;

	      case 'A':
	        // ARC is: ['A', rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
	        // touch x, y only
	        s[6] -= x;
	        s[7] -= y;
	        return;

	      default:
	        for (i = 1; i < s.length; i++) {
	          s[i] -= i % 2 ? x : y; // odd values are X, even - Y
	        }
	    }
	  }, true);

	  return this;
	};


	// Converts arcs to cubic bézier curves
	//
	SvgPath.prototype.unarc = function () {
	  this.iterate(function (s, index, x, y) {
	    var new_segments, nextX, nextY, result = [], name = s[0];

	    // Skip anything except arcs
	    if (name !== 'A' && name !== 'a') { return null; }

	    if (name === 'a') {
	      // convert relative arc coordinates to absolute
	      nextX = x + s[6];
	      nextY = y + s[7];
	    } else {
	      nextX = s[6];
	      nextY = s[7];
	    }

	    new_segments = a2c(x, y, nextX, nextY, s[4], s[5], s[1], s[2], s[3]);

	    // Degenerated arcs can be ignored by renderer, but should not be dropped
	    // to avoid collisions with `S A S` and so on. Replace with empty line.
	    if (new_segments.length === 0) {
	      return [ [ s[0] === 'a' ? 'l' : 'L', s[6], s[7] ] ];
	    }

	    new_segments.forEach(function (s) {
	      result.push([ 'C', s[2], s[3], s[4], s[5], s[6], s[7] ]);
	    });

	    return result;
	  });

	  return this;
	};


	// Converts smooth curves (with missed control point) to generic curves
	//
	SvgPath.prototype.unshort = function () {
	  var segments = this.segments;
	  var prevControlX, prevControlY, prevSegment;
	  var curControlX, curControlY;

	  // TODO: add lazy evaluation flag when relative commands supported

	  this.iterate(function (s, idx, x, y) {
	    var name = s[0], nameUC = name.toUpperCase(), isRelative;

	    // First command MUST be M|m, it's safe to skip.
	    // Protect from access to [-1] for sure.
	    if (!idx) { return; }

	    if (nameUC === 'T') { // quadratic curve
	      isRelative = (name === 't');

	      prevSegment = segments[idx - 1];

	      if (prevSegment[0] === 'Q') {
	        prevControlX = prevSegment[1] - x;
	        prevControlY = prevSegment[2] - y;
	      } else if (prevSegment[0] === 'q') {
	        prevControlX = prevSegment[1] - prevSegment[3];
	        prevControlY = prevSegment[2] - prevSegment[4];
	      } else {
	        prevControlX = 0;
	        prevControlY = 0;
	      }

	      curControlX = -prevControlX;
	      curControlY = -prevControlY;

	      if (!isRelative) {
	        curControlX += x;
	        curControlY += y;
	      }

	      segments[idx] = [
	        isRelative ? 'q' : 'Q',
	        curControlX, curControlY,
	        s[1], s[2]
	      ];

	    } else if (nameUC === 'S') { // cubic curve
	      isRelative = (name === 's');

	      prevSegment = segments[idx - 1];

	      if (prevSegment[0] === 'C') {
	        prevControlX = prevSegment[3] - x;
	        prevControlY = prevSegment[4] - y;
	      } else if (prevSegment[0] === 'c') {
	        prevControlX = prevSegment[3] - prevSegment[5];
	        prevControlY = prevSegment[4] - prevSegment[6];
	      } else {
	        prevControlX = 0;
	        prevControlY = 0;
	      }

	      curControlX = -prevControlX;
	      curControlY = -prevControlY;

	      if (!isRelative) {
	        curControlX += x;
	        curControlY += y;
	      }

	      segments[idx] = [
	        isRelative ? 'c' : 'C',
	        curControlX, curControlY,
	        s[1], s[2], s[3], s[4]
	      ];
	    }
	  });

	  return this;
	};


	var svgpath$1 = SvgPath;

	(function (module) {

		module.exports = svgpath$1;
	} (svgpath$2));

	var svgpath = /*@__PURE__*/getDefaultExportFromCjs(svgpath$2.exports);

	/*
	Export any geometry object as path in Abs coordinates with only L, H, V, B, and C types.
	*/
	const temp = [0, 0];
	function convertLineToPath(properties, parsingErrors, transform) {
	    let { x1, x2, y1, y2 } = properties;
	    // x1, x2, y1, y2 default to 0.
	    /* c8 ignore next if */
	    if (x1 === undefined)
	        x1 = 0;
	    if (x2 === undefined)
	        x2 = 0;
	    if (y1 === undefined)
	        y1 = 0;
	    if (y2 === undefined)
	        y2 = 0;
	    if (!isNumber(x1) || !isNumber(x2) || !isNumber(y1) || !isNumber(y2)) {
	        parsingErrors.push(`Invalid <line> properties: ${JSON.stringify({ x1, y1, x2, y2 })}.`);
	        return;
	    }
	    if (transform) {
	        temp[0] = x1;
	        temp[1] = y1;
	        [x1, y1] = applyTransform(temp, transform);
	        temp[0] = x2;
	        temp[1] = y2;
	        [x2, y2] = applyTransform(temp, transform);
	    }
	    return `M${x1},${y1} L${x2},${y2}`;
	}
	function convertRectToPath(properties, parsingErrors, transform) {
	    let { x, y } = properties;
	    // x and y default to 0.
	    if (x === undefined)
	        x = 0;
	    if (y === undefined)
	        y = 0;
	    const { width, height } = properties;
	    if (!isNumber(x) ||
	        !isNumber(y) ||
	        !isNonNegativeNumber(width) ||
	        !isNonNegativeNumber(height)) {
	        parsingErrors.push(`Invalid <rect> properties: ${JSON.stringify({ x, y, width, height })}.`);
	        return;
	    }
	    let x1 = x;
	    let y1 = y;
	    let x2 = x + width;
	    let y2 = y;
	    let x3 = x + width;
	    let y3 = y + height;
	    let x4 = x;
	    let y4 = y + height;
	    if (transform) {
	        temp[0] = x1;
	        temp[1] = y1;
	        [x1, y1] = applyTransform(temp, transform);
	        temp[0] = x2;
	        temp[1] = y2;
	        [x2, y2] = applyTransform(temp, transform);
	        temp[0] = x3;
	        temp[1] = y3;
	        [x3, y3] = applyTransform(temp, transform);
	        temp[0] = x4;
	        temp[1] = y4;
	        [x4, y4] = applyTransform(temp, transform);
	    }
	    return `M${x1},${y1} L${x2},${y2} L${x3},${y3} L${x4},${y4} z`;
	}
	function convertCircleToPath(properties, parsingErrors, _preserveArcs, transform) {
	    let { cx, cy, r } = properties;
	    // cx, cy, r default to 0.
	    if (cx === undefined)
	        cx = 0;
	    /* c8 ignore next if */
	    if (cy === undefined)
	        cy = 0;
	    if (r === undefined)
	        r = 0;
	    if (!isNumber(cx) || !isNumber(cy) || !isNonNegativeNumber(r)) {
	        parsingErrors.push(`Invalid <circle> properties: ${JSON.stringify({ cx, cy, r })}.`);
	        return;
	    }
	    const pathParser = _convertEllipseToPath(cx, cy, r, r, _preserveArcs, transform);
	    /* c8 ignore next 7 */
	    if (pathParser.err) {
	        // Should not hit this.
	        parsingErrors.push(`Problem parsing <circle> ${JSON.stringify({ cx, cy, r })} with ${pathParser.err}.`);
	        return;
	    }
	    return pathParser;
	}
	function convertEllipseToPath(properties, parsingErrors, _preserveArcs, transform) {
	    let { cx, cy, rx, ry } = properties;
	    // cx, cy, rx, ry default to 0.
	    /* c8 ignore next if */
	    if (cx === undefined)
	        cx = 0;
	    if (cy === undefined)
	        cy = 0;
	    if (rx === undefined)
	        rx = 0;
	    if (ry === undefined)
	        ry = 0;
	    if (!isNumber(cx) || !isNumber(cy) || !isNonNegativeNumber(rx) || !isNonNegativeNumber(ry)) {
	        parsingErrors.push(`Invalid <ellipse> properties: ${JSON.stringify({ cx, cy, rx, ry })}.`);
	        return;
	    }
	    const pathParser = _convertEllipseToPath(cx, cy, rx, ry, _preserveArcs, transform);
	    /* c8 ignore next 9 */
	    if (pathParser.err) {
	        // Should not hit this.
	        parsingErrors.push(`Problem parsing <ellipse> ${JSON.stringify({ cx, cy, rx, ry })} with ${pathParser.err}.`);
	        return;
	    }
	    return pathParser;
	}
	// https://stackoverflow.com/questions/59011294/ellipse-to-path-convertion-using-javascript
	// const ellipsePoints = new Array(24).fill(0);
	function _convertEllipseToPath(cx, cy, rx, ry, _preserveArcs, transform) {
	    // Convert ellipse to 2 arcs.
	    const d = `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${rx * 2},0 a ${rx},${ry} 0 1,0 -${rx * 2},0`;
	    let pathParser = svgpath(d).abs();
	    // Convert arcs to bezier is _preserveArcs == false.
	    if (!_preserveArcs)
	        pathParser = pathParser.unarc();
	    // Apply transform.
	    if (transform)
	        pathParser = pathParser.matrix([
	            transform.a,
	            transform.b,
	            transform.c,
	            transform.d,
	            transform.e,
	            transform.f,
	        ]);
	    return pathParser;
	    // 	const kappa = 0.5522847498;
	    // 	const ox = rx * kappa; // x offset for the control point
	    // 	const oy = ry * kappa; // y offset for the control point
	    // 	ellipsePoints[0] = cx - rx;
	    // 	ellipsePoints[1] = cy;
	    // 	ellipsePoints[2] = cx - rx;
	    // 	ellipsePoints[3] = cy - oy;
	    // 	ellipsePoints[4] = cx - ox;
	    // 	ellipsePoints[5] = cy - ry;
	    // 	ellipsePoints[6] = cx;
	    // 	ellipsePoints[7] = cy - ry;
	    // 	ellipsePoints[8] = cx + ox;
	    // 	ellipsePoints[9] = cy - ry;
	    // 	ellipsePoints[10] = cx + rx;
	    // 	ellipsePoints[11] = cy - oy;
	    // 	ellipsePoints[12] = cx + rx;
	    // 	ellipsePoints[13] = cy;
	    // 	ellipsePoints[14] = cx + rx;
	    // 	ellipsePoints[15] = cy + oy;
	    // 	ellipsePoints[16] = cx + ox;
	    // 	ellipsePoints[17] = cy + ry;
	    // 	ellipsePoints[18] = cx;
	    // 	ellipsePoints[19] = cy + ry;
	    // 	ellipsePoints[20] = cx - ox;
	    // 	ellipsePoints[21] = cy + ry;
	    // 	ellipsePoints[22] = cx - rx;
	    // 	ellipsePoints[23] = cy + oy;
	    // 	if (transform) {
	    // 		for (let i = 0, length = ellipsePoints.length / 2; i < length; i++) {
	    // 			temp[0] = ellipsePoints[2 * i];
	    // 			temp[1] = ellipsePoints[2 * i + 1];
	    // 			applyTransform(temp, transform);
	    // 			ellipsePoints[2 * i] = temp[0];
	    // 			ellipsePoints[2 * i + 1] = temp[1];
	    // 		}
	    // 	}
	    // 	return `M${ellipsePoints[0]},${ellipsePoints[1]} \
	    // C${ellipsePoints[2]},${ellipsePoints[3]} ${ellipsePoints[4]},${ellipsePoints[5]} ${ellipsePoints[6]},${ellipsePoints[7]} \
	    // C${ellipsePoints[8]},${ellipsePoints[9]} ${ellipsePoints[10]},${ellipsePoints[11]} ${ellipsePoints[12]},${ellipsePoints[13]} \
	    // C${ellipsePoints[14]},${ellipsePoints[15]} ${ellipsePoints[16]},${ellipsePoints[17]} ${ellipsePoints[18]},${ellipsePoints[19]} \
	    // C${ellipsePoints[20]},${ellipsePoints[21]} ${ellipsePoints[22]},${ellipsePoints[23]} ${ellipsePoints[0]},${ellipsePoints[1]} \
	    // z`;
	}
	function convertPolygonToPath(properties, parsingErrors, transform) {
	    const { points } = properties;
	    if (!isString(points)) {
	        parsingErrors.push(`Invalid <polygon> properties: ${JSON.stringify({ points })}.`);
	        return;
	    }
	    const path = _convertPointsToPath(points, parsingErrors, POLYGON, transform);
	    if (!path)
	        return path;
	    return path + ' z';
	}
	function convertPolylineToPath(properties, parsingErrors, transform) {
	    const { points } = properties;
	    if (!isString(points)) {
	        parsingErrors.push(`Invalid <polyline> properties: ${JSON.stringify({ points })}.`);
	        return;
	    }
	    return _convertPointsToPath(points, parsingErrors, POLYLINE, transform);
	}
	function _convertPointsToPath(pointsString, parsingErrors, elementType, transform) {
	    const points = removeWhitespacePadding(pointsString).split(' ');
	    let d = '';
	    while (points.length) {
	        const point = points.shift().split(',');
	        if (point.length === 1) {
	            // Sometimes polyline is not separated by commas, only by whitespace.
	            if (points.length && points.length % 2 === 1) {
	                point.push(points.shift()); // Get next element in points array.
	            }
	        }
	        if (point.length !== 2) {
	            parsingErrors.push(`Unable to parse points string: "${pointsString}" in <${elementType}>.`);
	            return;
	        }
	        let x = parseFloat(point[0]);
	        let y = parseFloat(point[1]);
	        if (isNaN(x) || isNaN(y)) {
	            parsingErrors.push(`Unable to parse points string: "${pointsString}" in <${elementType}>.`);
	            return;
	        }
	        if (transform) {
	            temp[0] = x;
	            temp[1] = y;
	            [x, y] = applyTransform(temp, transform);
	        }
	        if (d === '') {
	            d += `M${x},${y}`;
	        }
	        else {
	            d += ` L${x},${y}`;
	        }
	    }
	    return d;
	}
	function convertPathToPath(properties, parsingErrors, _preserveArcs, transform) {
	    const { d } = properties;
	    if (!isString(d)) {
	        parsingErrors.push(`Invalid <path> properties: ${JSON.stringify({ d })}.`);
	        return;
	    }
	    // Convert to absolute coordinates,
	    // Convert smooth curves (T/S) to regular Bezier (Q/C).
	    let pathParser = svgpath(d).abs().unshort();
	    if (_preserveArcs) {
	        // Convert arcs to bezier.
	        pathParser = pathParser.unarc();
	    }
	    // Apply transform.
	    if (transform) {
	        pathParser = pathParser.matrix([
	            transform.a,
	            transform.b,
	            transform.c,
	            transform.d,
	            transform.e,
	            transform.f,
	        ]);
	    }
	    if (pathParser.err) {
	        parsingErrors.push(`Problem parsing <path> ${JSON.stringify({ d })} with ${pathParser.err}.`);
	        return;
	    }
	    return pathParser;
	}

	function $parcel$defineInteropFlag(a) {
	  Object.defineProperty(a, '__esModule', {value: true, configurable: true});
	}
	function $parcel$export(e, n, v, s) {
	  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
	}
	var $009ddb00d3ec72b8$exports = {};

	$parcel$defineInteropFlag($009ddb00d3ec72b8$exports);

	$parcel$export($009ddb00d3ec72b8$exports, "default", () => $009ddb00d3ec72b8$export$2e2bcd8739ae039);
	class $009ddb00d3ec72b8$export$2e2bcd8739ae039 extends Error {
	    constructor(filename, msg, lineno, column, css){
	        super(filename + ":" + lineno + ":" + column + ": " + msg);
	        this.reason = msg;
	        this.filename = filename;
	        this.line = lineno;
	        this.column = column;
	        this.source = css;
	    }
	}


	var $0865a9fb4cc365fe$exports = {};

	$parcel$defineInteropFlag($0865a9fb4cc365fe$exports);

	$parcel$export($0865a9fb4cc365fe$exports, "default", () => $0865a9fb4cc365fe$export$2e2bcd8739ae039);
	/**
	 * Store position information for a node
	 */ class $0865a9fb4cc365fe$export$2e2bcd8739ae039 {
	    constructor(start, end, source){
	        this.start = start;
	        this.end = end;
	        this.source = source;
	    }
	}


	var $b2e137848b48cf4f$exports = {};

	$parcel$export($b2e137848b48cf4f$exports, "CssTypes", () => $b2e137848b48cf4f$export$9be5dd6e61d5d73a);
	var $b2e137848b48cf4f$export$9be5dd6e61d5d73a;
	(function(CssTypes) {
	    CssTypes["stylesheet"] = "stylesheet";
	    CssTypes["rule"] = "rule";
	    CssTypes["declaration"] = "declaration";
	    CssTypes["comment"] = "comment";
	    CssTypes["container"] = "container";
	    CssTypes["charset"] = "charset";
	    CssTypes["document"] = "document";
	    CssTypes["customMedia"] = "custom-media";
	    CssTypes["fontFace"] = "font-face";
	    CssTypes["host"] = "host";
	    CssTypes["import"] = "import";
	    CssTypes["keyframes"] = "keyframes";
	    CssTypes["keyframe"] = "keyframe";
	    CssTypes["layer"] = "layer";
	    CssTypes["media"] = "media";
	    CssTypes["namespace"] = "namespace";
	    CssTypes["page"] = "page";
	    CssTypes["supports"] = "supports";
	})($b2e137848b48cf4f$export$9be5dd6e61d5d73a || ($b2e137848b48cf4f$export$9be5dd6e61d5d73a = {}));


	// http://www.w3.org/TR/CSS21/grammar.html
	// https://github.com/visionmedia/css-parse/pull/49#issuecomment-30088027
	const $d708735ed1303b43$var$commentre = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;
	const $d708735ed1303b43$export$98e6a39c04603d36 = (css, options)=>{
	    options = options || {};
	    /**
	   * Positional.
	   */ let lineno = 1;
	    let column = 1;
	    /**
	   * Update lineno and column based on `str`.
	   */ function updatePosition(str) {
	        const lines = str.match(/\n/g);
	        if (lines) lineno += lines.length;
	        const i = str.lastIndexOf("\n");
	        column = ~i ? str.length - i : column + str.length;
	    }
	    /**
	   * Mark position and patch `node.position`.
	   */ function position() {
	        const start = {
	            line: lineno,
	            column: column
	        };
	        return function(node) {
	            node.position = new ($0865a9fb4cc365fe$export$2e2bcd8739ae039)(start, {
	                line: lineno,
	                column: column
	            }, options?.source || "");
	            whitespace();
	            return node;
	        };
	    }
	    /**
	   * Error `msg`.
	   */ const errorsList = [];
	    function error(msg) {
	        const err = new ($009ddb00d3ec72b8$export$2e2bcd8739ae039)(options?.source || "", msg, lineno, column, css);
	        if (options?.silent) errorsList.push(err);
	        else throw err;
	    }
	    /**
	   * Parse stylesheet.
	   */ function stylesheet() {
	        const rulesList = rules();
	        const result = {
	            type: ($b2e137848b48cf4f$export$9be5dd6e61d5d73a).stylesheet,
	            stylesheet: {
	                source: options?.source,
	                rules: rulesList,
	                parsingErrors: errorsList
	            }
	        };
	        return result;
	    }
	    /**
	   * Opening brace.
	   */ function open() {
	        return match(/^{\s*/);
	    }
	    /**
	   * Closing brace.
	   */ function close() {
	        return match(/^}/);
	    }
	    /**
	   * Parse ruleset.
	   */ function rules() {
	        let node;
	        const rules = [];
	        whitespace();
	        comments(rules);
	        while(css.length && css.charAt(0) !== "}" && (node = atrule() || rule()))if (node) {
	            rules.push(node);
	            comments(rules);
	        }
	        return rules;
	    }
	    /**
	   * Match `re` and return captures.
	   */ function match(re) {
	        const m = re.exec(css);
	        if (!m) return;
	        const str = m[0];
	        updatePosition(str);
	        css = css.slice(str.length);
	        return m;
	    }
	    /**
	   * Parse whitespace.
	   */ function whitespace() {
	        match(/^\s*/);
	    }
	    /**
	   * Parse comments;
	   */ function comments(rules) {
	        let c;
	        rules = rules || [];
	        while(c = comment())if (c) rules.push(c);
	        return rules;
	    }
	    /**
	   * Parse comment.
	   */ function comment() {
	        const pos = position();
	        if ("/" !== css.charAt(0) || "*" !== css.charAt(1)) return;
	        const m = match(/^\/\*[^]*?\*\//);
	        if (!m) return error("End of comment missing");
	        return pos({
	            type: ($b2e137848b48cf4f$export$9be5dd6e61d5d73a).comment,
	            comment: m[0].slice(2, -2)
	        });
	    }
	    /**
	   * Parse selector.
	   */ function selector() {
	        const m = match(/^([^{]+)/);
	        if (!m) return;
	        // remove comment in selector; [^] is equivalent to [.\n\r]
	        const res = $d708735ed1303b43$var$trim(m[0]).replace(/\/\*[^]*?\*\//gm, "");
	        // Optimisation: If there is no ',' no need to split or post-process (this is less costly)
	        if (res.indexOf(",") === -1) return [
	            res
	        ];
	        return res/**
	         * replace ',' by \u200C for data selector (div[data-lang="fr,de,us"])
	         * replace ',' by \u200C for nthChild and other selector (div:nth-child(2,3,4))
	         *
	         * Examples:
	         * div[data-lang="fr,\"de,us"]
	         * div[data-lang='fr,\'de,us']
	         * div:matches(.toto, .titi:matches(.toto, .titi))
	         *
	         * Regex logic:
	         *  ("|')(?:\\\1|.)*?\1 => Handle the " and '
	         *  \(.*?\)  => Handle the ()
	         *
	         * Optimization 1:
	         * No greedy capture (see docs about the difference between .* and .*?)
	         *
	         * Optimization 2:
	         * ("|')(?:\\\1|.)*?\1 this use reference to capture group, it work faster.
	         */ .replace(/("|')(?:\\\1|.)*?\1|\(.*?\)/g, (m)=>m.replace(/,/g, "‌"))// Split the selector by ','
	        .split(",")// Replace back \u200C by ','
	        .map((s)=>{
	            return $d708735ed1303b43$var$trim(s.replace(/\u200C/g, ","));
	        });
	    }
	    /**
	   * Parse declaration.
	   */ function declaration() {
	        const pos = position();
	        // prop
	        const propMatch = match(/^(\*?[-#/*\\\w]+(\[[0-9a-z_-]+\])?)\s*/);
	        if (!propMatch) return;
	        const propValue = $d708735ed1303b43$var$trim(propMatch[0]);
	        // :
	        if (!match(/^:\s*/)) return error("property missing ':'");
	        // val
	        const val = match(/^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^)]*?\)|[^};])+)/);
	        const ret = pos({
	            type: ($b2e137848b48cf4f$export$9be5dd6e61d5d73a).declaration,
	            property: propValue.replace($d708735ed1303b43$var$commentre, ""),
	            value: val ? $d708735ed1303b43$var$trim(val[0]).replace($d708735ed1303b43$var$commentre, "") : ""
	        });
	        // ;
	        match(/^[;\s]*/);
	        return ret;
	    }
	    /**
	   * Parse declarations.
	   */ function declarations() {
	        const decls = [];
	        if (!open()) return error("missing '{'");
	        comments(decls);
	        // declarations
	        let decl;
	        while(decl = declaration())if (decl) {
	            decls.push(decl);
	            comments(decls);
	        }
	        if (!close()) return error("missing '}'");
	        return decls;
	    }
	    /**
	   * Parse keyframe.
	   */ function keyframe() {
	        let m;
	        const vals = [];
	        const pos = position();
	        while(m = match(/^((\d+\.\d+|\.\d+|\d+)%?|[a-z]+)\s*/)){
	            vals.push(m[1]);
	            match(/^,\s*/);
	        }
	        if (!vals.length) return;
	        return pos({
	            type: ($b2e137848b48cf4f$export$9be5dd6e61d5d73a).keyframe,
	            values: vals,
	            declarations: declarations() || []
	        });
	    }
	    /**
	   * Parse keyframes.
	   */ function atkeyframes() {
	        const pos = position();
	        const m1 = match(/^@([-\w]+)?keyframes\s*/);
	        if (!m1) return;
	        const vendor = m1[1];
	        // identifier
	        const m2 = match(/^([-\w]+)\s*/);
	        if (!m2) return error("@keyframes missing name");
	        const name = m2[1];
	        if (!open()) return error("@keyframes missing '{'");
	        let frame;
	        let frames = comments();
	        while(frame = keyframe()){
	            frames.push(frame);
	            frames = frames.concat(comments());
	        }
	        if (!close()) return error("@keyframes missing '}'");
	        return pos({
	            type: ($b2e137848b48cf4f$export$9be5dd6e61d5d73a).keyframes,
	            name: name,
	            vendor: vendor,
	            keyframes: frames
	        });
	    }
	    /**
	   * Parse supports.
	   */ function atsupports() {
	        const pos = position();
	        const m = match(/^@supports *([^{]+)/);
	        if (!m) return;
	        const supports = $d708735ed1303b43$var$trim(m[1]);
	        if (!open()) return error("@supports missing '{'");
	        const style = comments().concat(rules());
	        if (!close()) return error("@supports missing '}'");
	        return pos({
	            type: ($b2e137848b48cf4f$export$9be5dd6e61d5d73a).supports,
	            supports: supports,
	            rules: style
	        });
	    }
	    /**
	   * Parse host.
	   */ function athost() {
	        const pos = position();
	        const m = match(/^@host\s*/);
	        if (!m) return;
	        if (!open()) return error("@host missing '{'");
	        const style = comments().concat(rules());
	        if (!close()) return error("@host missing '}'");
	        return pos({
	            type: ($b2e137848b48cf4f$export$9be5dd6e61d5d73a).host,
	            rules: style
	        });
	    }
	    /**
	   * Parse container.
	   */ function atcontainer() {
	        const pos = position();
	        const m = match(/^@container *([^{]+)/);
	        if (!m) return;
	        const container = $d708735ed1303b43$var$trim(m[1]);
	        if (!open()) return error("@container missing '{'");
	        const style = comments().concat(rules());
	        if (!close()) return error("@container missing '}'");
	        return pos({
	            type: ($b2e137848b48cf4f$export$9be5dd6e61d5d73a).container,
	            container: container,
	            rules: style
	        });
	    }
	    /**
	   * Parse container.
	   */ function atlayer() {
	        const pos = position();
	        const m = match(/^@layer *([^{;@]+)/);
	        if (!m) return;
	        const layer = $d708735ed1303b43$var$trim(m[1]);
	        if (!open()) {
	            match(/^[;\s]*/);
	            return pos({
	                type: ($b2e137848b48cf4f$export$9be5dd6e61d5d73a).layer,
	                layer: layer
	            });
	        }
	        const style = comments().concat(rules());
	        if (!close()) return error("@layer missing '}'");
	        return pos({
	            type: ($b2e137848b48cf4f$export$9be5dd6e61d5d73a).layer,
	            layer: layer,
	            rules: style
	        });
	    }
	    /**
	   * Parse media.
	   */ function atmedia() {
	        const pos = position();
	        const m = match(/^@media *([^{]+)/);
	        if (!m) return;
	        const media = $d708735ed1303b43$var$trim(m[1]);
	        if (!open()) return error("@media missing '{'");
	        const style = comments().concat(rules());
	        if (!close()) return error("@media missing '}'");
	        return pos({
	            type: ($b2e137848b48cf4f$export$9be5dd6e61d5d73a).media,
	            media: media,
	            rules: style
	        });
	    }
	    /**
	   * Parse custom-media.
	   */ function atcustommedia() {
	        const pos = position();
	        const m = match(/^@custom-media\s+(--[^\s]+)\s*([^{;]+);/);
	        if (!m) return;
	        return pos({
	            type: ($b2e137848b48cf4f$export$9be5dd6e61d5d73a).customMedia,
	            name: $d708735ed1303b43$var$trim(m[1]),
	            media: $d708735ed1303b43$var$trim(m[2])
	        });
	    }
	    /**
	   * Parse paged media.
	   */ function atpage() {
	        const pos = position();
	        const m = match(/^@page */);
	        if (!m) return;
	        const sel = selector() || [];
	        if (!open()) return error("@page missing '{'");
	        let decls = comments();
	        // declarations
	        let decl;
	        while(decl = declaration()){
	            decls.push(decl);
	            decls = decls.concat(comments());
	        }
	        if (!close()) return error("@page missing '}'");
	        return pos({
	            type: ($b2e137848b48cf4f$export$9be5dd6e61d5d73a).page,
	            selectors: sel,
	            declarations: decls
	        });
	    }
	    /**
	   * Parse document.
	   */ function atdocument() {
	        const pos = position();
	        const m = match(/^@([-\w]+)?document *([^{]+)/);
	        if (!m) return;
	        const vendor = $d708735ed1303b43$var$trim(m[1]);
	        const doc = $d708735ed1303b43$var$trim(m[2]);
	        if (!open()) return error("@document missing '{'");
	        const style = comments().concat(rules());
	        if (!close()) return error("@document missing '}'");
	        return pos({
	            type: ($b2e137848b48cf4f$export$9be5dd6e61d5d73a).document,
	            document: doc,
	            vendor: vendor,
	            rules: style
	        });
	    }
	    /**
	   * Parse font-face.
	   */ function atfontface() {
	        const pos = position();
	        const m = match(/^@font-face\s*/);
	        if (!m) return;
	        if (!open()) return error("@font-face missing '{'");
	        let decls = comments();
	        // declarations
	        let decl;
	        while(decl = declaration()){
	            decls.push(decl);
	            decls = decls.concat(comments());
	        }
	        if (!close()) return error("@font-face missing '}'");
	        return pos({
	            type: ($b2e137848b48cf4f$export$9be5dd6e61d5d73a).fontFace,
	            declarations: decls
	        });
	    }
	    /**
	   * Parse import
	   */ const atimport = _compileAtrule("import");
	    /**
	   * Parse charset
	   */ const atcharset = _compileAtrule("charset");
	    /**
	   * Parse namespace
	   */ const atnamespace = _compileAtrule("namespace");
	    /**
	   * Parse non-block at-rules
	   */ function _compileAtrule(name) {
	        const re = new RegExp("^@" + name + "\\s*((:?[^;'\"]|\"(?:\\\\\"|[^\"])*?\"|'(?:\\\\'|[^'])*?')+);");
	        // ^@import\s*([^;"']|("|')(?:\\\2|.)*?\2)+;
	        return function() {
	            const pos = position();
	            const m = match(re);
	            if (!m) return;
	            const ret = {
	                type: name
	            };
	            ret[name] = m[1].trim();
	            return pos(ret);
	        };
	    }
	    /**
	   * Parse at rule.
	   */ function atrule() {
	        if (css[0] !== "@") return;
	        return atkeyframes() || atmedia() || atcustommedia() || atsupports() || atimport() || atcharset() || atnamespace() || atdocument() || atpage() || athost() || atfontface() || atcontainer() || atlayer();
	    }
	    /**
	   * Parse rule.
	   */ function rule() {
	        const pos = position();
	        const sel = selector();
	        if (!sel) return error("selector missing");
	        comments();
	        return pos({
	            type: ($b2e137848b48cf4f$export$9be5dd6e61d5d73a).rule,
	            selectors: sel,
	            declarations: declarations() || []
	        });
	    }
	    return $d708735ed1303b43$var$addParent(stylesheet());
	};
	/**
	 * Trim `str`.
	 */ function $d708735ed1303b43$var$trim(str) {
	    return str ? str.trim() : "";
	}
	/**
	 * Adds non-enumerable parent node reference to each node.
	 */ function $d708735ed1303b43$var$addParent(obj, parent) {
	    const isNode = obj && typeof obj.type === "string";
	    const childParent = isNode ? obj : parent;
	    for(const k in obj){
	        const value = obj[k];
	        if (Array.isArray(value)) value.forEach((v)=>{
	            $d708735ed1303b43$var$addParent(v, childParent);
	        });
	        else if (value && typeof value === "object") $d708735ed1303b43$var$addParent(value, childParent);
	    }
	    if (isNode) Object.defineProperty(obj, "parent", {
	        configurable: true,
	        writable: true,
	        enumerable: false,
	        value: parent || null
	    });
	    return obj;
	}
	var $d708735ed1303b43$export$2e2bcd8739ae039 = $d708735ed1303b43$export$98e6a39c04603d36;





	const $149c1bd638913645$export$98e6a39c04603d36 = ($d708735ed1303b43$export$2e2bcd8739ae039);

	k([namesPlugin]);
	k([labPlugin]);
	// Color input examples
	// "#FFF"
	// "#ffffff"
	// "#ffffffff"
	// "rgb(255, 255, 255)"
	// "rgba(255, 255, 255, 0.5)"
	// "rgba(100% 100% 100% / 50%)"
	// "hsl(90, 100%, 100%)"
	// "hsla(90, 100%, 100%, 0.5)"
	// "hsla(90deg 100% 100% / 50%)"
	// "tomato"
	class FlatSVG {
	    /**
	     * Init a FlatSVG object.
	     * @param string - SVG string to parse.
	     * @param options - Optional settings.
	     * @param options.preserveArcs - Preserve arcs, ellipses, and circles as arcs when calling FlatSVG.paths and FlatSVG.segments.  Defaults to false, which will approximate arcs as cubic beziers.
	     */
	    constructor(string, options) {
	        /**
	         * Defs elements that are removed during flattening.
	         */
	        this.defs = [];
	        /**
	         * A list of errors generated during parsing.
	         */
	        this.errors = [];
	        /**
	         * A list of warnings generated during parsing.
	         */
	        this.warnings = [];
	        if (string === undefined) {
	            throw new Error('Must pass in an SVG string to FlatSVG().');
	        }
	        if (string === '') {
	            throw new Error('SVG string is empty.');
	        }
	        this._rootNode = parse(string);
	        this._preserveArcs = !!(options === null || options === void 0 ? void 0 : options.preserveArcs);
	        // Validate svg.
	        // Check that a root svg element exists.
	        if (this._rootNode.children.length !== 1 ||
	            this._rootNode.children[0].type !== 'element' ||
	            this._rootNode.children[0].tagName !== SVG) {
	            // console.log(this._rootNode);
	            this.errors.push(`Malformed SVG: expected only 1 child <svg> element on root node.`);
	            throw new Error(`Malformed SVG: expected only 1 child <svg> element on root node.`);
	        }
	        // Pull out defs/style tags.
	        const topChildren = this._rootNode.children[0].children;
	        for (let i = topChildren.length - 1; i >= 0; i--) {
	            const child = topChildren[i];
	            if (child.tagName === 'defs') {
	                this.defs.push(child);
	                topChildren.splice(i, 1);
	                // Check if defs contains style.
	                if (child.children) {
	                    for (let j = child.children.length - 1; j >= 0; j--) {
	                        const defsChild = child.children[j];
	                        if (defsChild.tagName === 'style') {
	                            child.children.splice(j, 1);
	                            if (defsChild.children &&
	                                defsChild.children[0] &&
	                                defsChild.children[0].type === 'text') {
	                                this._globalStyles = Object.assign(Object.assign({}, this._globalStyles), this.parseStyleToObject(defsChild.children[0].value));
	                            }
	                        }
	                    }
	                }
	            }
	            if (child.tagName === 'style') {
	                topChildren.splice(i, 1);
	                if (child.children && child.children[0] && child.children[0].type === 'text') {
	                    this._globalStyles = Object.assign(Object.assign({}, this._globalStyles), this.parseStyleToObject(child.children[0].value));
	                }
	            }
	        }
	        this.deepIterChildren = this.deepIterChildren.bind(this);
	        // // Check that no children are strings.
	        // this.deepIterChildren((child) => {
	        // 	if (typeof child === 'string') {
	        // 		console.log(this.rootNode);
	        // 		throw new Error(`Child is a string: ${child}.`);
	        // 	}
	        // });
	    }
	    parseStyleToObject(styleString) {
	        const { errors } = this;
	        const result = {};
	        const css = $149c1bd638913645$export$98e6a39c04603d36(styleString, { silent: true });
	        const { stylesheet } = css;
	        /* c8 ignore next 3 */
	        if (!stylesheet) {
	            return result;
	        }
	        if (stylesheet.parsingErrors) {
	            const parsingErrors = stylesheet.parsingErrors
	                .map((error) => error.message)
	                .filter((error) => error !== undefined);
	            errors.push(...parsingErrors);
	        }
	        // Extract style info.
	        /* c8 ignore next 3 */
	        if (!stylesheet.rules) {
	            return result;
	        }
	        const rules = stylesheet.rules;
	        for (let i = 0, numRules = rules.length; i < numRules; i++) {
	            const rule = rules[i];
	            const selectorStyle = {};
	            const { declarations, selectors } = rule;
	            if (declarations) {
	                for (let j = 0, numDeclarations = declarations.length; j < numDeclarations; j++) {
	                    const declaration = declarations[j];
	                    const { property } = declaration;
	                    let { value } = declaration;
	                    if (property && value !== undefined) {
	                        // Cast value as number if needed.
	                        // Try stripping px off the end.
	                        value = value.replace(/px\b/g, '');
	                        if (/^\-?[0-9]?([0-9]+e-?[0-9]+)?(\.[0-9]+)?$/.test(value))
	                            selectorStyle[property] = parseFloat(value);
	                        else
	                            selectorStyle[property] = value;
	                    }
	                }
	            }
	            if (selectors) {
	                for (let j = 0, numSelectors = selectors.length; j < numSelectors; j++) {
	                    const selector = selectors[j];
	                    result[selector] = Object.assign(Object.assign({}, result[selector]), selectorStyle);
	                }
	            }
	        }
	        return result;
	    }
	    /**
	     * Get the root node of the SVG.
	     */
	    get root() {
	        return this._rootNode.children[0];
	    }
	    /**
	     * Get the viewBox of the SVG as [min-x, min-y, width, height].
	     */
	    get viewBox() {
	        const viewBoxString = this.root.properties.viewBox;
	        if (viewBoxString) {
	            return viewBoxString.split(' ').map((el) => parseFloat(el));
	        }
	        return [
	            Number.parseFloat((this.root.properties.x || '0')),
	            Number.parseFloat((this.root.properties.y || '0')),
	            Number.parseFloat((this.root.properties.width || '0')),
	            Number.parseFloat((this.root.properties.height || '0')),
	        ];
	    }
	    /**
	     * Get the units of the SVG as a string.
	     */
	    get units() {
	        // If you do not specify any units inside the width and height attributes, the units are assumed to be pixels.
	        const regex = new RegExp(/(em|ex|px|pt|pc|cm|mm|in)$/);
	        const { x, y, width, height } = this.root.properties || /* c8 ignore next */ {};
	        /* c8 ignore next 2 */
	        const match = (x === null || x === void 0 ? void 0 : x.match(regex)) || (y === null || y === void 0 ? void 0 : y.match(regex)) || (width === null || width === void 0 ? void 0 : width.match(regex)) || (height === null || height === void 0 ? void 0 : height.match(regex));
	        return (match ? match[0] : 'px');
	    }
	    deepIterChildren(callback, node = this.root, transform, ids, classes, properties) {
	        const { _globalStyles } = this;
	        for (let i = 0, numChildren = node.children.length; i < numChildren; i++) {
	            const child = node.children[i];
	            let childTransform = transform;
	            let childClasses;
	            let childIds;
	            let childProperties;
	            if (child.properties) {
	                // Add transforms to list.
	                if (child.properties.transform) {
	                    const childTransforms = parseTransformString(child.properties.transform, child.tagName);
	                    // Get errors / warnings.
	                    for (let transformIndex = 0, numTransforms = childTransforms.length; transformIndex < numTransforms; transformIndex++) {
	                        const { errors, warnings } = childTransforms[transformIndex];
	                        /* c8 ignore next if */
	                        if (errors)
	                            this.errors.push(...errors);
	                        /* c8 ignore next if */
	                        if (warnings)
	                            this.warnings.push(...warnings);
	                    }
	                    // Merge transforms.
	                    if (childTransforms.length) {
	                        if (childTransform) {
	                            childTransforms.unshift(childTransform);
	                        }
	                        // Flatten transforms to a new matrix.
	                        childTransform = flattenTransformArray(childTransforms);
	                    }
	                    delete child.properties.transform;
	                }
	                let childPropertiesToMerge = child.properties || /* c8 ignore next */ {};
	                childIds = ids;
	                if (child.properties.id) {
	                    // Check for styling associated with id.
	                    if (_globalStyles) {
	                        const idsArray = child.properties.id.split(' ');
	                        for (let j = 0, numIds = idsArray.length; j < numIds; j++) {
	                            const idStyle = _globalStyles[`#${idsArray[j]}`];
	                            if (idStyle) {
	                                childPropertiesToMerge = Object.assign(Object.assign({}, childPropertiesToMerge), idStyle);
	                            }
	                        }
	                    }
	                    // Add child ids to ids list.
	                    childIds = `${childIds ? `${childIds} ` : ''}${child.properties.id}`;
	                    delete child.properties.id;
	                    delete childPropertiesToMerge.id;
	                }
	                childClasses = classes;
	                if (child.properties.class) {
	                    // Check for styling associated with class.
	                    if (_globalStyles) {
	                        const classArray = child.properties.class.split(' ');
	                        for (let j = 0, numClasses = classArray.length; j < numClasses; j++) {
	                            const classStyle = _globalStyles[`.${classArray[j]}`];
	                            if (classStyle) {
	                                childPropertiesToMerge = Object.assign(Object.assign({}, childPropertiesToMerge), classStyle);
	                            }
	                        }
	                    }
	                    // Add child classes to classes list.
	                    childClasses = `${childClasses ? `${childClasses} ` : ''}${child.properties.class}`;
	                    delete child.properties.class;
	                    delete childPropertiesToMerge.class;
	                }
	                // Add child properties to properties list.
	                childProperties = properties;
	                // Check if the child has inline styles.
	                if (childPropertiesToMerge.style) {
	                    const style = this.parseStyleToObject(`#this { ${childPropertiesToMerge.style} }`)['#this'];
	                    childPropertiesToMerge = Object.assign(Object.assign({}, style), childPropertiesToMerge);
	                    delete childPropertiesToMerge.style;
	                }
	                const propertyKeys = Object.keys(childPropertiesToMerge);
	                for (let j = 0, numProperties = propertyKeys.length; j < numProperties; j++) {
	                    const key = propertyKeys[j];
	                    if (childPropertiesToMerge[key] !== undefined) {
	                        // Make a copy.
	                        if (!childProperties || childProperties === properties)
	                            childProperties = Object.assign({}, properties);
	                        // In the case of opacity, multiply parent and child.
	                        if (key === SVG_STYLE_OPACITY) {
	                            /* c8 ignore next 6 */
	                            if (!isNumber(childPropertiesToMerge[key]))
	                                throw new Error(`Opacity is not number: "${JSON.stringify(childPropertiesToMerge[key])}".`);
	                            childProperties[key] =
	                                childPropertiesToMerge[key] *
	                                    (childProperties[key] !== undefined
	                                        ? childProperties[key]
	                                        : 1);
	                        }
	                        // Only use child style if parent style is not defined.
	                        // @ts-ignore
	                        if (childProperties[key] === undefined)
	                            // @ts-ignore
	                            childProperties[key] = childPropertiesToMerge[key];
	                    }
	                }
	            }
	            // Callback.
	            if (child.tagName !== G) {
	                // Make copies of all child properties.
	                callback(child, childTransform ? copyTransform(childTransform) : undefined, childIds === null || childIds === void 0 ? void 0 : childIds.slice(), childClasses === null || childClasses === void 0 ? void 0 : childClasses.slice(), 
	                /* c8 ignore next 3 */
	                childProperties
	                    ? Object.assign({}, childProperties)
	                    : undefined);
	            }
	            if (child.children) {
	                this.deepIterChildren(callback, child, childTransform, childIds, childClasses, childProperties);
	            }
	        }
	    }
	    /**
	     * Get a flat list of geometry elements in the SVG.
	     * The return value is cached internally.
	     */
	    get elements() {
	        if (this._elements)
	            return this._elements;
	        // Init output arrays.
	        const elements = [];
	        const parsingErrors = [];
	        const parsingWarnings = [];
	        // Flatten all children and return.
	        this.deepIterChildren((child, transform, ids, classes, properties) => {
	            /* c8 ignore next 4 */
	            if (child.value) {
	                parsingErrors.push(`Skipping child ${child.tagName} with value: ${child.value}`);
	                return;
	            }
	            /* c8 ignore next 6 */
	            if (child.metadata) {
	                parsingErrors.push(`Skipping child ${child.tagName} with metadata: ${child.metadata}`);
	                return;
	            }
	            if (!child.tagName) {
	                parsingErrors.push(`Skipping child with no tagName: ${JSON.stringify(child)}.`);
	                return;
	            }
	            /* c8 ignore next 4 */
	            if (!properties) {
	                parsingErrors.push(`Skipping child with no properties: ${JSON.stringify(child)}.`);
	                return;
	            }
	            if (ids)
	                properties.ids = ids;
	            if (classes)
	                properties.class = classes;
	            const flatChild = {
	                tagName: child.tagName,
	                properties,
	            };
	            if (transform)
	                flatChild.transform = transform;
	            elements.push(flatChild);
	        });
	        this._elements = elements; // Save for later so we don't need to recompute.
	        // Save any errors or warnings so we can query these later.
	        this.errors.push(...parsingErrors);
	        this.warnings.push(...parsingWarnings);
	        return elements;
	    }
	    static wrapWithSVGTag(root, svgElements) {
	        const properties = root.properties || /* c8 ignore next */ {};
	        return `<svg ${Object.keys(properties)
            .map((key) => `${key}="${properties[key]}"`)
            .join(' ')}>\n${svgElements}\n</svg>`;
	    }
	    /**
	     * Get svg string from elements array.
	     * @private
	     */
	    static elementsAsSVG(root, elements) {
	        return FlatSVG.wrapWithSVGTag(root, elements
	            .map((element) => {
	            const { tagName, properties, transform } = element;
	            const propertiesKeys = Object.keys(properties);
	            let propertiesString = '';
	            for (let i = 0, length = propertiesKeys.length; i < length; i++) {
	                const key = propertiesKeys[i];
	                propertiesString += `${key}="${properties[key]}" `;
	            }
	            if (transform)
	                propertiesString += `transform="${transformToString(transform)}" `;
	            return `<${tagName} ${propertiesString}/>`;
	        })
	            .join('\n'));
	    }
	    /**
	     * Get svg string from FlatSVG.elements array.
	     */
	    get elementsAsSVG() {
	        const { elements, root } = this;
	        return FlatSVG.elementsAsSVG(root, elements);
	    }
	    /**
	     * Get a flat list of SVG geometry represented as paths.
	     * The return value is cached internally.
	     */
	    get paths() {
	        if (this._paths)
	            return this._paths;
	        const { elements, _preserveArcs } = this; // First query elements.
	        // Init output arrays.
	        const paths = [];
	        const pathParsers = [];
	        const parsingErrors = [];
	        const parsingWarnings = [];
	        for (let i = 0; i < elements.length; i++) {
	            const child = elements[i];
	            const { transform, tagName, properties } = child;
	            const propertiesCopy = Object.assign({}, properties);
	            // Convert all object types to path with absolute coordinates and transform applied.
	            let d;
	            let pathParser;
	            switch (tagName) {
	                case LINE:
	                    d = convertLineToPath(properties, parsingErrors, transform);
	                    delete propertiesCopy.x1;
	                    delete propertiesCopy.y1;
	                    delete propertiesCopy.x2;
	                    delete propertiesCopy.y2;
	                    break;
	                case RECT:
	                    d = convertRectToPath(properties, parsingErrors, transform);
	                    delete propertiesCopy.x;
	                    delete propertiesCopy.y;
	                    delete propertiesCopy.width;
	                    delete propertiesCopy.height;
	                    break;
	                case POLYGON:
	                    d = convertPolygonToPath(properties, parsingErrors, transform);
	                    delete propertiesCopy.points;
	                    break;
	                case POLYLINE:
	                    d = convertPolylineToPath(properties, parsingErrors, transform);
	                    delete propertiesCopy.points;
	                    break;
	                case CIRCLE:
	                    pathParser = convertCircleToPath(properties, parsingErrors, _preserveArcs, transform);
	                    if (pathParser)
	                        d = pathParser.toString();
	                    delete propertiesCopy.cx;
	                    delete propertiesCopy.cy;
	                    delete propertiesCopy.r;
	                    break;
	                case ELLIPSE:
	                    pathParser = convertEllipseToPath(properties, parsingErrors, _preserveArcs, transform);
	                    if (pathParser)
	                        d = pathParser.toString();
	                    delete propertiesCopy.cx;
	                    delete propertiesCopy.cy;
	                    delete propertiesCopy.rx;
	                    delete propertiesCopy.ry;
	                    break;
	                case PATH:
	                    pathParser = convertPathToPath(properties, parsingErrors, _preserveArcs, transform);
	                    if (pathParser)
	                        d = pathParser.toString();
	                    delete propertiesCopy.d;
	                    break;
	                default:
	                    parsingWarnings.push(`Unsupported tagname: "${tagName}".`);
	                    break;
	            }
	            if (d === undefined || d === '') {
	                continue;
	            }
	            const path = {
	                properties: Object.assign(Object.assign({}, propertiesCopy), { d }),
	            };
	            paths.push(path);
	            pathParsers.push(pathParser);
	        }
	        this._paths = paths; // Save for later so we don't need to recompute.
	        this._pathParsers = pathParsers; // Save pathParsers in case segments are queried.
	        // Save any errors or warnings so we can query these later.
	        this.errors.push(...parsingErrors);
	        this.warnings.push(...parsingWarnings);
	        return paths;
	    }
	    /**
	     * Get svg string from paths array.
	     * @private
	     */
	    static pathsAsSVG(root, paths) {
	        return FlatSVG.wrapWithSVGTag(root, paths
	            .map((path) => {
	            const { properties } = path;
	            const propertiesKeys = Object.keys(properties);
	            let propertiesString = '';
	            for (let i = 0, length = propertiesKeys.length; i < length; i++) {
	                const key = propertiesKeys[i];
	                propertiesString += `${key}="${properties[key]}" `;
	            }
	            return `<path ${propertiesString}/>`;
	        })
	            .join('\n'));
	    }
	    /**
	     * Get svg string from FlatSVG.paths array.
	     */
	    get pathsAsSVG() {
	        const { paths, root } = this;
	        return FlatSVG.pathsAsSVG(root, paths);
	    }
	    /**
	     * Get a flat list of SVG edge segments (as lines, quadratic/cubic beziers, or arcs).
	     * The return value is cached internally.
	     */
	    get segments() {
	        if (this._segments)
	            return this._segments;
	        const { paths } = this; // First query paths.
	        const { _pathParsers } = this; // Once paths are computed, _pathParsers becomes available.
	        /* c8 ignore next 3 */
	        if (!_pathParsers) {
	            console.warn('Initing new _pathParsers array, we should never hit this.');
	        }
	        const pathParsers = _pathParsers || /* c8 ignore next */ new Array(paths.length).fill(undefined);
	        // Init output arrays.
	        const segments = [];
	        const parsingErrors = [];
	        const parsingWarnings = [];
	        for (let i = 0, numPaths = paths.length; i < numPaths; i++) {
	            const path = paths[i];
	            const { properties } = path;
	            let pathParser = pathParsers[i];
	            if (pathParser === undefined) {
	                // Define a pathParser for elements that were not originally paths.
	                pathParser = svgpath(properties.d);
	                pathParsers[i] = pathParser;
	            }
	            /* c8 ignore next 4 */
	            if (pathParser.err) {
	                // Should not hit this.
	                parsingErrors.push(`Problem parsing path to segments with ${pathParser.err}.`);
	            }
	            // Split paths to segments.
	            const startPoint = [0, 0];
	            pathParser.iterate((command, index, x, y) => {
	                const p1 = [x, y];
	                // Copy parent properties to segment (minus the "d" property).
	                const propertiesCopy = Object.assign({}, properties);
	                delete propertiesCopy.d;
	                const segment = {
	                    p1,
	                    properties: propertiesCopy,
	                };
	                const segmentType = command[0];
	                /* c8 ignore next 6 */
	                if (index === 0 && segmentType !== 'M') {
	                    // Should not hit this, it should be caught earlier by SvgPath.
	                    parsingErrors.push(`Malformed svg path: "${pathParser.toString()}", should start with M command.`);
	                }
	                switch (segmentType) {
	                    case 'M':
	                        startPoint[0] = command[1];
	                        startPoint[1] = command[2];
	                        return;
	                    case 'L':
	                        segment.p2 = [command[1], command[2]];
	                        break;
	                    case 'H':
	                        segment.p2 = [command[1], y];
	                        break;
	                    case 'V':
	                        segment.p2 = [x, command[1]];
	                        break;
	                    case 'Q':
	                        segment.controlPoints = [[command[1], command[2]]];
	                        segment.p2 = [command[3], command[4]];
	                        break;
	                    case 'C':
	                        segment.controlPoints = [
	                            [command[1], command[2]],
	                            [command[3], command[4]],
	                        ];
	                        segment.p2 = [command[5], command[6]];
	                        break;
	                    case 'A':
	                        segment.rx = command[1];
	                        segment.ry = command[2];
	                        segment.xAxisRotation = command[3];
	                        segment.largeArcFlag = !!command[4];
	                        segment.sweepFlag = !!command[5];
	                        segment.p2 = [command[6], command[7]];
	                        break;
	                    case 'z':
	                    case 'Z':
	                        // Get first point since last move command.
	                        if (startPoint[0] === x && startPoint[1] === y) {
	                            // Ignore zero length line.
	                            return;
	                        }
	                        segment.p2 = [startPoint[0], startPoint[1]];
	                        break;
	                    /* c8 ignore next 4 */
	                    default:
	                        // Should not hit this.
	                        parsingErrors.push(`Unknown <path> command: ${segmentType}.`);
	                        return;
	                }
	                segments.push(segment);
	            });
	        }
	        this._segments = segments; // Save for later so we don't need to recompute.
	        // We no longer need to hold _pathParsers.
	        delete this._pathParsers;
	        // Save any errors or warnings so we can query these later.
	        this.errors.push(...parsingErrors);
	        this.warnings.push(...parsingWarnings);
	        return segments;
	    }
	    /**
	     * Get svg string from paths array.
	     * @private
	     */
	    static segmentsAsSVG(root, segments) {
	        return FlatSVG.wrapWithSVGTag(root, segments
	            .map((segment) => {
	            const { p1, p2, properties } = segment;
	            const propertiesKeys = Object.keys(properties);
	            let propertiesString = '';
	            for (let i = 0, length = propertiesKeys.length; i < length; i++) {
	                const key = propertiesKeys[i];
	                propertiesString += `${key}="${properties[key]}" `;
	            }
	            if (segment.controlPoints) {
	                const { controlPoints } = segment;
	                const curveType = controlPoints.length === 1 ? 'Q' : 'C';
	                let d = `M ${p1[0]} ${p1[1]} ${curveType} ${controlPoints[0][0]} ${controlPoints[0][1]} `;
	                if (curveType === 'C')
	                    d += `${controlPoints[1][0]} ${controlPoints[1][1]} `;
	                d += `${p2[0]} ${p2[1]} `;
	                return `<path d="${d}" ${propertiesString}/>`;
	            }
	            if (segment.rx !== undefined) {
	                const { rx, ry, xAxisRotation, largeArcFlag, sweepFlag } = segment;
	                return `<path d="M ${p1[0]} ${p1[1]} A ${rx} ${ry} ${xAxisRotation} ${
                /* c8 ignore next */ largeArcFlag ? 1 : 0} ${sweepFlag ? 1 : 0} ${p2[0]} ${p2[1]}" ${propertiesString}/>`;
	            }
	            return `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" ${propertiesString}/>`;
	        })
	            .join('\n'));
	    }
	    /**
	     * Get svg string from FlatSVG.segments array.
	     */
	    get segmentsAsSVG() {
	        const { segments, root } = this;
	        return FlatSVG.segmentsAsSVG(root, segments);
	    }
	    static filter(objects, filterFunction) {
	        const matches = [];
	        // const remaining: (FlatElement | FlatPath | FlatSegment)[] = [];
	        for (let i = 0; i < objects.length; i++) {
	            const object = objects[i];
	            if (filterFunction(object, i))
	                matches.push(object);
	            // else remaining.push(object);
	        }
	        return matches;
	    }
	    static filterByStyle(objects, filter, computedProperties, exclude) {
	        const filterArray = Array.isArray(filter) ? filter : [filter];
	        const filterArrayValues = [];
	        // Precompute colors.
	        for (let i = 0; i < filterArray.length; i++) {
	            const { key, value } = filterArray[i];
	            filterArrayValues.push(value);
	            switch (key) {
	                case SVG_STYLE_STROKE_COLOR:
	                case SVG_STYLE_FILL:
	                case SVG_STYLE_COLOR:
	                    filterArrayValues[i] = w$1(value);
	                    break;
	                case SVG_STYLE_STROKE_DASH_ARRAY:
	                    filterArrayValues[i] = convertToDashArray(value);
	                    break;
	            }
	        }
	        const matches = FlatSVG.filter(objects, (object, i) => {
	            if (exclude && exclude[i])
	                return false;
	            const { properties } = object;
	            // Check that this object meets ALL the the style requirements.
	            for (let j = 0; j < filterArray.length; j++) {
	                const { key, tolerance } = filterArray[j];
	                let value = filterArrayValues[j];
	                // Special handling of certain keys.
	                let passed = true;
	                switch (key) {
	                    case SVG_STYLE_STROKE_COLOR:
	                    case SVG_STYLE_FILL:
	                    case SVG_STYLE_COLOR:
	                    case SVG_STYLE_OPACITY:
	                        let color;
	                        const computedKey = key === SVG_STYLE_OPACITY ? SVG_STYLE_STROKE_COLOR : key;
	                        if (computedProperties) {
	                            color = computedProperties[i][computedKey];
	                        }
	                        if (color === undefined) {
	                            color = w$1(properties[computedKey]);
	                            // Multiply color.a by properties.opacity.
	                            const opacity = properties[SVG_STYLE_OPACITY];
	                            if (opacity !== undefined) {
	                                const alpha = opacity * color.rgba.a; // Use color.rgba.a instead of alpha() to avoid rounding.
	                                color = color.alpha(alpha); // This makes a copy.
	                            }
	                            // Init computed properties array if needed.
	                            if (!computedProperties) {
	                                computedProperties = new Array(objects.length);
	                                // Fill with empty objects.
	                                // Don't use Array.fill({}) bc all elements will point to same empty object instance.
	                                for (let k = 0; k < objects.length; k++) {
	                                    computedProperties[k] = {};
	                                }
	                            }
	                            computedProperties[i][computedKey] = color;
	                        }
	                        if (key === SVG_STYLE_STROKE_COLOR ||
	                            key === SVG_STYLE_FILL ||
	                            key === SVG_STYLE_COLOR) {
	                            passed = color.delta(value) <= (tolerance || 0);
	                            break;
	                        }
	                        // Else check color opacity for opacity.
	                        // Use color.rgba.a instead of alpha() to avoid rounding.
	                        passed = Math.abs(color.rgba.a - value) <= (tolerance || 0);
	                        break;
	                    case SVG_STYLE_STROKE_DASH_ARRAY:
	                        let dashArray;
	                        if (computedProperties) {
	                            dashArray = computedProperties[i][key];
	                        }
	                        if (!dashArray) {
	                            dashArray = convertToDashArray(properties[key]);
	                            // Init computed properties array if needed.
	                            if (!computedProperties) {
	                                computedProperties = new Array(objects.length);
	                                // Fill with empty objects.
	                                // Don't use Array.fill({}) bc all elements will point to same empty object instance.
	                                for (let k = 0; k < objects.length; k++) {
	                                    computedProperties[k] = {};
	                                }
	                            }
	                            computedProperties[i][key] = dashArray;
	                        }
	                        if (dashArray.length !== value.length) {
	                            if (dashArray.length === value.length * 2) {
	                                value = [...value, ...value];
	                            }
	                            else if (dashArray.length * 2 === value.length) {
	                                dashArray = [
	                                    ...dashArray,
	                                    ...dashArray,
	                                ];
	                            }
	                            else {
	                                passed = false;
	                            }
	                        }
	                        if (passed) {
	                            for (let k = 0; k < value.length; k++) {
	                                if (Math.abs(value[k] - dashArray[k]) >
	                                    (tolerance || 0))
	                                    passed = false;
	                            }
	                        }
	                        break;
	                    default:
	                        // Assume any remaining keys correspond to numbers.
	                        if (!isNumber(value)) {
	                            passed = false;
	                            throw new Error(`flat-svg cannot handle filters with key "${key}" and value ${JSON.stringify(value)} of type ${typeof value}.  Please submit an issue to https://github.com/amandaghassaei/flat-svg if this feature should be added.`);
	                        }
	                        if (properties[key] === undefined ||
	                            Math.abs(properties[key] -
	                                value) > (tolerance || 0)) {
	                            passed = false;
	                        }
	                        break;
	                }
	                if (!passed)
	                    return false;
	            }
	            return true;
	        });
	        return { matches: matches, computedProperties };
	    }
	    /**
	     * Filter FlatSVG elements by style properties.
	     * @param filter - Style properties to filter for.
	     * @param exclude - Optionally pass an array of booleans of the same length as elements with "true" indicating that element should be excluded from the filter.
	     */
	    filterElementsByStyle(filter, exclude) {
	        const { elements } = this;
	        const { matches, computedProperties } = FlatSVG.filterByStyle(elements, filter, this._computedElementProperties, exclude);
	        this._computedElementProperties = computedProperties;
	        return matches;
	    }
	    /**
	     * Filter FlatSVG paths by style properties.
	     * @param filter - Style properties to filter for.
	     * @param exclude - Optionally pass an array of booleans of the same length as paths with "true" indicating that path should be excluded from the filter.
	     */
	    filterPathsByStyle(filter, exclude) {
	        const { paths } = this;
	        const { matches, computedProperties } = FlatSVG.filterByStyle(paths, filter, this._computedPathProperties, exclude);
	        this._computedPathProperties = computedProperties;
	        return matches;
	    }
	    /**
	     * Filter FlatSVG segments by style properties.
	     * @param filter - Style properties to filter for.
	     * @param exclude - Optionally pass an array of booleans of the same length as segments with "true" indicating that segment should be excluded from the filter.
	     */
	    filterSegmentsByStyle(filter, exclude) {
	        const { segments } = this;
	        const { matches, computedProperties } = FlatSVG.filterByStyle(segments, filter, this._computedSegmentProperties, exclude);
	        this._computedSegmentProperties = computedProperties;
	        return matches;
	    }
	}

	exports.FlatSVG = FlatSVG;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=flat-svg.js.map
