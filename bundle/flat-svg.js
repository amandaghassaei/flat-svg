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
	    return getLocator(source, options)(search, options);
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

	/**
	 * Strip leading and trailing whitespace from a string (equivalent to `.trim()`).
	 * @param string Input string.
	 * @returns The input with all leading/trailing whitespace removed.
	 */
	function removeWhitespacePadding(string) {
	    return string.replace(/^\s+|\s+$/g, '');
	}
	/**
	 * Wrap a string of inner element markup with an `<svg ...>` open tag carrying
	 * the given root's attributes and a matching close tag. Used by FlatSVG's
	 * `*AsSVG` getters to round-trip flattened output as a complete document.
	 * @param root svg-parser root node whose attributes populate the wrapper.
	 * @param svgElements Inner element markup to splice between the tags.
	 * @returns A complete `<svg ...>...</svg>` document string.
	 */
	function wrapWithSVGTag(root, svgElements) {
	    /* c8 ignore start -- defensive: svg-parser always emits a `properties` object
	       (empty `{}` for elements with no attributes), so the `|| {}` fallback only
	       fires if the library changes its contract. Verified for v3.x. */
	    const properties = root.properties || {};
	    /* c8 ignore stop */
	    return `<svg ${Object.keys(properties)
        .map((key) => `${key}="${properties[key]}"`)
        .join(' ')}>\n${svgElements}\n</svg>`;
	}
	/**
	 * Serialize a properties object to a space-separated `key="value"` attribute
	 * string for embedding inside an SVG tag. Every own enumerable key is emitted.
	 * @param properties Object of SVG attribute key/value pairs.
	 * @returns Attribute string (trailing space included).
	 */
	function propertiesToAttributesString(properties) {
	    const keys = Object.keys(properties);
	    let attrs = '';
	    for (let i = 0, length = keys.length; i < length; i++) {
	        const key = keys[i];
	        attrs += `${key}="${properties[key]}" `;
	    }
	    return attrs;
	}
	/**
	 * Normalize a `stroke-dasharray` value (string, number, array, or undefined)
	 * into a positive-number array, doubling odd-length lists per the SVG spec.
	 * @param value Raw dasharray value from an SVG attribute or caller input.
	 * @returns Even-length array of positive numbers (empty for undefined/`''`).
	 */
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

	/**
	 * Build a fresh identity matrix `{a:1, b:0, c:0, d:1, e:0, f:0}`.
	 * @returns A new FlatSVGTransform set to identity.
	 */
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
	/**
	 * Parse an SVG `transform` attribute string into an ordered list of matrices.
	 * Hand-rolled (rather than svgpath's parser) so per-transform warnings can be
	 * surfaced. Spec: https://www.w3.org/TR/SVG11/coords.html#TransformAttribute
	 * @param string Raw transform attribute value (e.g. `"translate(1,2) rotate(45)"`).
	 * @param tagName Optional element tag name, included in warning messages.
	 * @returns Array of parsed transforms in source order; malformed entries carry `warnings`.
	 */
	function parseTransformString(string, tagName) {
	    const transformStrings = string.match(/(translate|matrix|rotate|skewX|skewY|scale)\s*\(\s*(.*?)\s*\)/gi);
	    const unusedCharacters = [string.slice()]; // Place to store any characters in transform that were missed.
	    const transforms = [];
	    if (transformStrings) {
	        // Loop through all transforms (many may be chained together e.g. "translate(1, 45) rotate(56)").
	        for (let i = 0; i < transformStrings.length; i++) {
	            const transform = initIdentityTransform(); // Init identity transform to start.
	            const transformString = transformStrings[i]; // FlatSVGTransform as a string.
	            // Keep track of what hasn't been matched.
	            const lastString = unusedCharacters.pop();
	            const matchIndex = lastString.indexOf(transformString);
	            unusedCharacters.push(lastString.slice(0, matchIndex), lastString.slice(matchIndex + transformString.length));
	            // Split transform into components: transform name and parameters.
	            const transformComponents = transformString.split(/[\(\)]+/);
	            if (transformComponents.length > 2)
	                transformComponents.pop(); // Remove empty string at the end of split.
	            if (transformComponents.length !== 2) {
	                transform.warnings = [`Malformed transform: "${transformString}".`];
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
	                    // translate(<tx> [<ty>]) — ty defaults to 0.
	                    expectedNumParameters = [1, 2];
	                    transform.e = floatParams[0] || 0;
	                    transform.f = floatParams[1] || 0;
	                    break;
	                case 'scale':
	                    // scale(<sx> [<sy>]) — sy defaults to sx.
	                    expectedNumParameters = [1, 2];
	                    // Default 1; allow explicit 0 through.
	                    transform.a = floatParams[0] === 0 ? 0 : floatParams[0] || 1;
	                    transform.d = floatParams[1] === 0 ? 0 : floatParams[1] || transform.a;
	                    break;
	                case 'rotate': {
	                    // rotate(<angle-deg> [<cx> <cy>]) — angle in degrees, optional pivot defaults to origin.
	                    expectedNumParameters = [1, 3];
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
	                    // skewX(<angle-deg>)
	                    expectedNumParameters = [1];
	                    const a = ((floatParams[0] || 0) * Math.PI) / 180;
	                    if (a !== 0)
	                        transform.c = Math.tan(a);
	                    break;
	                }
	                case 'skewy': {
	                    // skewY(<angle-deg>)
	                    expectedNumParameters = [1];
	                    const a = ((floatParams[0] || 0) * Math.PI) / 180;
	                    if (a !== 0)
	                        transform.b = Math.tan(a);
	                    break;
	                }
	                case 'matrix':
	                    // matrix(<a> <b> <c> <d> <e> <f>)
	                    expectedNumParameters = [6];
	                    // Default 1 for a/d; allow explicit 0 through.
	                    transform.a = floatParams[0] === 0 ? 0 : floatParams[0] || 1;
	                    transform.b = floatParams[1] || 0;
	                    transform.c = floatParams[2] || 0;
	                    transform.d = floatParams[3] === 0 ? 0 : floatParams[3] || 1;
	                    transform.e = floatParams[4] || 0;
	                    transform.f = floatParams[5] || 0;
	                    break;
	                /* c8 ignore start -- defensive: unreachable per the regex at the top of this function, which only captures
	                   (translate|matrix|rotate|skewX|skewY|scale). After .toLowerCase() every captured name maps to one of the
	                   six switch cases above. Kept as a guard in case the regex ever expands to accept more transform names. */
	                default:
	                    transform.warnings = [`Unknown transform ${transformName}.`];
	                    break;
	                /* c8 ignore stop */
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
	        transform.warnings = [
	            `Malformed transform, unmatched characters: [ ${unusedCharacters
                .map((str) => `"${str}"`)
                .join(', ')} ].`,
	        ];
	        transforms.push(transform);
	    }
	    return transforms;
	}
	/**
	 * Compose a list of transforms into a single matrix by left-to-right
	 * multiplication. Does not modify the input array or its elements.
	 * @param transforms Ordered list of FlatSVGTransform to compose.
	 * @returns A new FlatSVGTransform equal to `t[0] · t[1] · ... · t[n-1]`.
	 */
	function flattenTransformArray(transforms) {
	    // Flatten transforms to a single matrix.
	    const transform = copyTransform(transforms[0]);
	    for (let i = 1; i < transforms.length; i++) {
	        dotTransforms(transform, transforms[i]);
	    }
	    return transform;
	}
	/**
	 * Matrix-multiply `t2` into `t1` in place. The return value and `t1` reference
	 * the same object after the call.
	 * @param t1 Left operand — mutated to hold the product.
	 * @param t2 Right operand — read only.
	 * @returns The mutated `t1`.
	 */
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
	/**
	 * Apply a transform to a 2D point in place.
	 * @param p Mutable [x, y] tuple — coordinates are overwritten with the result.
	 * @param t Transform to apply.
	 * @returns The mutated `p`.
	 */
	function applyTransform(p, t) {
	    const x = t.a * p[0] + t.c * p[1] + t.e;
	    const y = t.b * p[0] + t.d * p[1] + t.f;
	    // Apply transform in place.
	    p[0] = x;
	    p[1] = y;
	    return p;
	}
	/**
	 * Shallow-copy the 6 matrix fields of a transform. Discards any extra keys
	 * (e.g. `warnings` on a TransformParsed) — copy those explicitly if needed.
	 * @param t Source transform.
	 * @returns A new FlatSVGTransform with matching a/b/c/d/e/f.
	 */
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
	/**
	 * Serialize a transform to SVG `matrix(a b c d e f)` form.
	 * @param t Transform to serialize.
	 * @returns String of the form `matrix(a b c d e f)`.
	 */
	function transformToString(t) {
	    return `matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.e} ${t.f})`;
	}

	var r$2={grad:.9,turn:360,rad:360/(2*Math.PI)},t$2=function(r){return "string"==typeof r?r.length>0:"number"==typeof r},n$2=function(r,t,n){return void 0===t&&(t=0),void 0===n&&(n=Math.pow(10,t)),Math.round(n*r)/n+0},e$2=function(r,t,n){return void 0===t&&(t=0),void 0===n&&(n=1),r>n?n:r>t?r:t},u$1=function(r){return (r=isFinite(r)?r%360:0)>0?r:r+360},a$1=function(r){return {r:e$2(r.r,0,255),g:e$2(r.g,0,255),b:e$2(r.b,0,255),a:e$2(r.a)}},o$2=function(r){return {r:n$2(r.r),g:n$2(r.g),b:n$2(r.b),a:n$2(r.a,3)}},i$2=/^#([0-9a-f]{3,8})$/i,s$1=function(r){var t=r.toString(16);return t.length<2?"0"+t:t},h$1=function(r){var t=r.r,n=r.g,e=r.b,u=r.a,a=Math.max(t,n,e),o=a-Math.min(t,n,e),i=o?a===t?(n-e)/o:a===n?2+(e-t)/o:4+(t-n)/o:0;return {h:60*(i<0?i+6:i),s:a?o/a*100:0,v:a/255*100,a:u}},b$1=function(r){var t=r.h,n=r.s,e=r.v,u=r.a;t=t/360*6,n/=100,e/=100;var a=Math.floor(t),o=e*(1-n),i=e*(1-(t-a)*n),s=e*(1-(1-t+a)*n),h=a%6;return {r:255*[e,i,o,o,s,e][h],g:255*[s,e,e,i,o,o][h],b:255*[o,o,s,e,e,i][h],a:u}},g=function(r){return {h:u$1(r.h),s:e$2(r.s,0,100),l:e$2(r.l,0,100),a:e$2(r.a)}},d=function(r){return {h:n$2(r.h),s:n$2(r.s),l:n$2(r.l),a:n$2(r.a,3)}},f=function(r){return b$1((n=(t=r).s,{h:t.h,s:(n*=((e=t.l)<50?e:100-e)/100)>0?2*n/(e+n)*100:0,v:e+n,a:t.a}));var t,n,e;},c$1=function(r){return {h:(t=h$1(r)).h,s:(u=(200-(n=t.s))*(e=t.v)/100)>0&&u<200?n*e/100/(u<=100?u:200-u)*100:0,l:u/2,a:t.a};var t,n,e,u;},l$1=/^hsla?\(\s*([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s*,\s*([+-]?\d*\.?\d+)%\s*,\s*([+-]?\d*\.?\d+)%\s*(?:,\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,p$1=/^hsla?\(\s*([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s+([+-]?\d*\.?\d+)%\s+([+-]?\d*\.?\d+)%\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,v=/^rgba?\(\s*([+-]?\d*\.?\d+)(%)?\s*,\s*([+-]?\d*\.?\d+)(%)?\s*,\s*([+-]?\d*\.?\d+)(%)?\s*(?:,\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,m$1=/^rgba?\(\s*([+-]?\d*\.?\d+)(%)?\s+([+-]?\d*\.?\d+)(%)?\s+([+-]?\d*\.?\d+)(%)?\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,y={string:[[function(r){var t=i$2.exec(r);return t?(r=t[1]).length<=4?{r:parseInt(r[0]+r[0],16),g:parseInt(r[1]+r[1],16),b:parseInt(r[2]+r[2],16),a:4===r.length?n$2(parseInt(r[3]+r[3],16)/255,2):1}:6===r.length||8===r.length?{r:parseInt(r.substr(0,2),16),g:parseInt(r.substr(2,2),16),b:parseInt(r.substr(4,2),16),a:8===r.length?n$2(parseInt(r.substr(6,2),16)/255,2):1}:null:null},"hex"],[function(r){var t=v.exec(r)||m$1.exec(r);return t?t[2]!==t[4]||t[4]!==t[6]?null:a$1({r:Number(t[1])/(t[2]?100/255:1),g:Number(t[3])/(t[4]?100/255:1),b:Number(t[5])/(t[6]?100/255:1),a:void 0===t[7]?1:Number(t[7])/(t[8]?100:1)}):null},"rgb"],[function(t){var n=l$1.exec(t)||p$1.exec(t);if(!n)return null;var e,u,a=g({h:(e=n[1],u=n[2],void 0===u&&(u="deg"),Number(e)*(r$2[u]||1)),s:Number(n[3]),l:Number(n[4]),a:void 0===n[5]?1:Number(n[5])/(n[6]?100:1)});return f(a)},"hsl"]],object:[[function(r){var n=r.r,e=r.g,u=r.b,o=r.a,i=void 0===o?1:o;return t$2(n)&&t$2(e)&&t$2(u)?a$1({r:Number(n),g:Number(e),b:Number(u),a:Number(i)}):null},"rgb"],[function(r){var n=r.h,e=r.s,u=r.l,a=r.a,o=void 0===a?1:a;if(!t$2(n)||!t$2(e)||!t$2(u))return null;var i=g({h:Number(n),s:Number(e),l:Number(u),a:Number(o)});return f(i)},"hsl"],[function(r){var n=r.h,a=r.s,o=r.v,i=r.a,s=void 0===i?1:i;if(!t$2(n)||!t$2(a)||!t$2(o))return null;var h=function(r){return {h:u$1(r.h),s:e$2(r.s,0,100),v:e$2(r.v,0,100),a:e$2(r.a)}}({h:Number(n),s:Number(a),v:Number(o),a:Number(s)});return b$1(h)},"hsv"]]},N=function(r,t){for(var n=0;n<t.length;n++){var e=t[n][0](r);if(e)return [e,t[n][1]]}return [null,void 0]},x=function(r){return "string"==typeof r?N(r.trim(),y.string):"object"==typeof r&&null!==r?N(r,y.object):[null,void 0]},M$1=function(r,t){var n=c$1(r);return {h:n.h,s:e$2(n.s+100*t,0,100),l:n.l,a:n.a}},H=function(r){return (299*r.r+587*r.g+114*r.b)/1e3/255},$=function(r,t){var n=c$1(r);return {h:n.h,s:n.s,l:e$2(n.l+100*t,0,100),a:n.a}},j=function(){function r(r){this.parsed=x(r)[0],this.rgba=this.parsed||{r:0,g:0,b:0,a:1};}return r.prototype.isValid=function(){return null!==this.parsed},r.prototype.brightness=function(){return n$2(H(this.rgba),2)},r.prototype.isDark=function(){return H(this.rgba)<.5},r.prototype.isLight=function(){return H(this.rgba)>=.5},r.prototype.toHex=function(){return r=o$2(this.rgba),t=r.r,e=r.g,u=r.b,i=(a=r.a)<1?s$1(n$2(255*a)):"","#"+s$1(t)+s$1(e)+s$1(u)+i;var r,t,e,u,a,i;},r.prototype.toRgb=function(){return o$2(this.rgba)},r.prototype.toRgbString=function(){return r=o$2(this.rgba),t=r.r,n=r.g,e=r.b,(u=r.a)<1?"rgba("+t+", "+n+", "+e+", "+u+")":"rgb("+t+", "+n+", "+e+")";var r,t,n,e,u;},r.prototype.toHsl=function(){return d(c$1(this.rgba))},r.prototype.toHslString=function(){return r=d(c$1(this.rgba)),t=r.h,n=r.s,e=r.l,(u=r.a)<1?"hsla("+t+", "+n+"%, "+e+"%, "+u+")":"hsl("+t+", "+n+"%, "+e+"%)";var r,t,n,e,u;},r.prototype.toHsv=function(){return r=h$1(this.rgba),{h:n$2(r.h),s:n$2(r.s),v:n$2(r.v),a:n$2(r.a,3)};var r;},r.prototype.invert=function(){return w$1({r:255-(r=this.rgba).r,g:255-r.g,b:255-r.b,a:r.a});var r;},r.prototype.saturate=function(r){return void 0===r&&(r=.1),w$1(M$1(this.rgba,r))},r.prototype.desaturate=function(r){return void 0===r&&(r=.1),w$1(M$1(this.rgba,-r))},r.prototype.grayscale=function(){return w$1(M$1(this.rgba,-1))},r.prototype.lighten=function(r){return void 0===r&&(r=.1),w$1($(this.rgba,r))},r.prototype.darken=function(r){return void 0===r&&(r=.1),w$1($(this.rgba,-r))},r.prototype.rotate=function(r){return void 0===r&&(r=15),this.hue(this.hue()+r)},r.prototype.alpha=function(r){return "number"==typeof r?w$1({r:(t=this.rgba).r,g:t.g,b:t.b,a:r}):n$2(this.rgba.a,3);var t;},r.prototype.hue=function(r){var t=c$1(this.rgba);return "number"==typeof r?w$1({h:r,s:t.s,l:t.l,a:t.a}):n$2(t.h)},r.prototype.isEqual=function(r){return this.toHex()===w$1(r).toHex()},r}(),w$1=function(r){return r instanceof j?r:new j(r)},S=[],k=function(r){r.forEach(function(r){S.indexOf(r)<0&&(r(j,y),S.push(r));});};

	function namesPlugin(e,f){var a={white:"#ffffff",bisque:"#ffe4c4",blue:"#0000ff",cadetblue:"#5f9ea0",chartreuse:"#7fff00",chocolate:"#d2691e",coral:"#ff7f50",antiquewhite:"#faebd7",aqua:"#00ffff",azure:"#f0ffff",whitesmoke:"#f5f5f5",papayawhip:"#ffefd5",plum:"#dda0dd",blanchedalmond:"#ffebcd",black:"#000000",gold:"#ffd700",goldenrod:"#daa520",gainsboro:"#dcdcdc",cornsilk:"#fff8dc",cornflowerblue:"#6495ed",burlywood:"#deb887",aquamarine:"#7fffd4",beige:"#f5f5dc",crimson:"#dc143c",cyan:"#00ffff",darkblue:"#00008b",darkcyan:"#008b8b",darkgoldenrod:"#b8860b",darkkhaki:"#bdb76b",darkgray:"#a9a9a9",darkgreen:"#006400",darkgrey:"#a9a9a9",peachpuff:"#ffdab9",darkmagenta:"#8b008b",darkred:"#8b0000",darkorchid:"#9932cc",darkorange:"#ff8c00",darkslateblue:"#483d8b",gray:"#808080",darkslategray:"#2f4f4f",darkslategrey:"#2f4f4f",deeppink:"#ff1493",deepskyblue:"#00bfff",wheat:"#f5deb3",firebrick:"#b22222",floralwhite:"#fffaf0",ghostwhite:"#f8f8ff",darkviolet:"#9400d3",magenta:"#ff00ff",green:"#008000",dodgerblue:"#1e90ff",grey:"#808080",honeydew:"#f0fff0",hotpink:"#ff69b4",blueviolet:"#8a2be2",forestgreen:"#228b22",lawngreen:"#7cfc00",indianred:"#cd5c5c",indigo:"#4b0082",fuchsia:"#ff00ff",brown:"#a52a2a",maroon:"#800000",mediumblue:"#0000cd",lightcoral:"#f08080",darkturquoise:"#00ced1",lightcyan:"#e0ffff",ivory:"#fffff0",lightyellow:"#ffffe0",lightsalmon:"#ffa07a",lightseagreen:"#20b2aa",linen:"#faf0e6",mediumaquamarine:"#66cdaa",lemonchiffon:"#fffacd",lime:"#00ff00",khaki:"#f0e68c",mediumseagreen:"#3cb371",limegreen:"#32cd32",mediumspringgreen:"#00fa9a",lightskyblue:"#87cefa",lightblue:"#add8e6",midnightblue:"#191970",lightpink:"#ffb6c1",mistyrose:"#ffe4e1",moccasin:"#ffe4b5",mintcream:"#f5fffa",lightslategray:"#778899",lightslategrey:"#778899",navajowhite:"#ffdead",navy:"#000080",mediumvioletred:"#c71585",powderblue:"#b0e0e6",palegoldenrod:"#eee8aa",oldlace:"#fdf5e6",paleturquoise:"#afeeee",mediumturquoise:"#48d1cc",mediumorchid:"#ba55d3",rebeccapurple:"#663399",lightsteelblue:"#b0c4de",mediumslateblue:"#7b68ee",thistle:"#d8bfd8",tan:"#d2b48c",orchid:"#da70d6",mediumpurple:"#9370db",purple:"#800080",pink:"#ffc0cb",skyblue:"#87ceeb",springgreen:"#00ff7f",palegreen:"#98fb98",red:"#ff0000",yellow:"#ffff00",slateblue:"#6a5acd",lavenderblush:"#fff0f5",peru:"#cd853f",palevioletred:"#db7093",violet:"#ee82ee",teal:"#008080",slategray:"#708090",slategrey:"#708090",aliceblue:"#f0f8ff",darkseagreen:"#8fbc8f",darkolivegreen:"#556b2f",greenyellow:"#adff2f",seagreen:"#2e8b57",seashell:"#fff5ee",tomato:"#ff6347",silver:"#c0c0c0",sienna:"#a0522d",lavender:"#e6e6fa",lightgreen:"#90ee90",orange:"#ffa500",orangered:"#ff4500",steelblue:"#4682b4",royalblue:"#4169e1",turquoise:"#40e0d0",yellowgreen:"#9acd32",salmon:"#fa8072",saddlebrown:"#8b4513",sandybrown:"#f4a460",rosybrown:"#bc8f8f",darksalmon:"#e9967a",lightgoldenrodyellow:"#fafad2",snow:"#fffafa",lightgrey:"#d3d3d3",lightgray:"#d3d3d3",dimgray:"#696969",dimgrey:"#696969",olivedrab:"#6b8e23",olive:"#808000"},r={};for(var d in a)r[a[d]]=d;var l={};e.prototype.toName=function(f){if(!(this.rgba.a||this.rgba.r||this.rgba.g||this.rgba.b))return "transparent";var d,i,n=r[this.toHex()];if(n)return n;if(null==f?void 0:f.closest){var o=this.toRgb(),t=1/0,b="black";if(!l.length)for(var c in a)l[c]=new e(a[c]).toRgb();for(var g in a){var u=(d=o,i=l[g],Math.pow(d.r-i.r,2)+Math.pow(d.g-i.g,2)+Math.pow(d.b-i.b,2));u<t&&(t=u,b=g);}return b}};f.string.push([function(f){var r=f.toLowerCase(),d="transparent"===r?"#0000":a[r];return d?new e(d).toRgb():null},"name"]);}

	var a=function(a){return "string"==typeof a?a.length>0:"number"==typeof a},t$1=function(a,t,o){return void 0===t&&(t=0),void 0===o&&(o=Math.pow(10,t)),Math.round(o*a)/o+0},o$1=function(a,t,o){return void 0===t&&(t=0),void 0===o&&(o=1),a>o?o:a>t?a:t},r$1=function(a){var t=a/255;return t<.04045?t/12.92:Math.pow((t+.055)/1.055,2.4)},h=function(a){return 255*(a>.0031308?1.055*Math.pow(a,1/2.4)-.055:12.92*a)},n$1=96.422,p=100,M=82.521,u=function(a){var t,r,n={x:.9555766*(t=a).x+-0.0230393*t.y+.0631636*t.z,y:-0.0282895*t.x+1.0099416*t.y+.0210077*t.z,z:.0122982*t.x+-0.020483*t.y+1.3299098*t.z};return r={r:h(.032404542*n.x-.015371385*n.y-.004985314*n.z),g:h(-969266e-8*n.x+.018760108*n.y+41556e-8*n.z),b:h(556434e-9*n.x-.002040259*n.y+.010572252*n.z),a:a.a},{r:o$1(r.r,0,255),g:o$1(r.g,0,255),b:o$1(r.b,0,255),a:o$1(r.a)}},e$1=function(a){var t=r$1(a.r),h=r$1(a.g),u=r$1(a.b);return function(a){return {x:o$1(a.x,0,n$1),y:o$1(a.y,0,p),z:o$1(a.z,0,M),a:o$1(a.a)}}(function(a){return {x:1.0478112*a.x+.0228866*a.y+-0.050127*a.z,y:.0295424*a.x+.9904844*a.y+-0.0170491*a.z,z:-92345e-7*a.x+.0150436*a.y+.7521316*a.z,a:a.a}}({x:100*(.4124564*t+.3575761*h+.1804375*u),y:100*(.2126729*t+.7151522*h+.072175*u),z:100*(.0193339*t+.119192*h+.9503041*u),a:a.a}))},w=216/24389,b=24389/27,i$1=function(t){var r=t.l,h=t.a,n=t.b,p=t.alpha,M=void 0===p?1:p;if(!a(r)||!a(h)||!a(n))return null;var u=function(a){return {l:o$1(a.l,0,400),a:a.a,b:a.b,alpha:o$1(a.alpha)}}({l:Number(r),a:Number(h),b:Number(n),alpha:Number(M)});return l(u)},l=function(a){var t=(a.l+16)/116,o=a.a/500+t,r=t-a.b/200;return u({x:(Math.pow(o,3)>w?Math.pow(o,3):(116*o-16)/b)*n$1,y:(a.l>8?Math.pow((a.l+16)/116,3):a.l/b)*p,z:(Math.pow(r,3)>w?Math.pow(r,3):(116*r-16)/b)*M,a:a.alpha})};function labPlugin(a,r){a.prototype.toLab=function(){return o=e$1(this.rgba),h=o.y/p,u=o.z/M,r=(r=o.x/n$1)>w?Math.cbrt(r):(b*r+16)/116,a={l:116*(h=h>w?Math.cbrt(h):(b*h+16)/116)-16,a:500*(r-h),b:200*(h-(u=u>w?Math.cbrt(u):(b*u+16)/116)),alpha:o.a},{l:t$1(a.l,2),a:t$1(a.a,2),b:t$1(a.b,2),alpha:t$1(a.alpha,3)};var a,o,r,h,u;},a.prototype.delta=function(r){ void 0===r&&(r="#FFF");var h=r instanceof a?r:new a(r),n=function(a,t){var o=a.l,r=a.a,h=a.b,n=t.l,p=t.a,M=t.b,u=180/Math.PI,e=Math.PI/180,w=Math.pow(Math.pow(r,2)+Math.pow(h,2),.5),b=Math.pow(Math.pow(p,2)+Math.pow(M,2),.5),i=(o+n)/2,l=Math.pow((w+b)/2,7),c=.5*(1-Math.pow(l/(l+Math.pow(25,7)),.5)),f=r*(1+c),y=p*(1+c),v=Math.pow(Math.pow(f,2)+Math.pow(h,2),.5),x=Math.pow(Math.pow(y,2)+Math.pow(M,2),.5),z=(v+x)/2,s=0===f&&0===h?0:Math.atan2(h,f)*u,d=0===y&&0===M?0:Math.atan2(M,y)*u;s<0&&(s+=360),d<0&&(d+=360);var g=d-s,m=Math.abs(d-s);m>180&&d<=s?g+=360:m>180&&d>s&&(g-=360);var N=s+d;m<=180?N/=2:N=(s+d<360?N+360:N-360)/2;var F=1-.17*Math.cos(e*(N-30))+.24*Math.cos(2*e*N)+.32*Math.cos(e*(3*N+6))-.2*Math.cos(e*(4*N-63)),L=n-o,I=x-v,P=2*Math.sin(e*g/2)*Math.pow(v*x,.5),j=1+.015*Math.pow(i-50,2)/Math.pow(20+Math.pow(i-50,2),.5),k=1+.045*z,q=1+.015*z*F,A=30*Math.exp(-1*Math.pow((N-275)/25,2)),B=-2*Math.pow(l/(l+Math.pow(25,7)),.5)*Math.sin(2*e*A);return Math.pow(Math.pow(L/1/j,2)+Math.pow(I/1/k,2)+Math.pow(P/1/q,2)+B*I*P/(1*k*1*q),.5)}(this.toLab(),h.toLab())/100;return o$1(t$1(n,3))},r.object.push([i$1,"lab"]);}

	// Geometry element tag names. Referenced by FlatLineElement / FlatRectElement /
	// etc. via `typeof`, so consumers can discriminate FlatElement.tagName by import.
	const SVG_LINE = 'line';
	const SVG_RECT = 'rect';
	const SVG_POLYGON = 'polygon';
	const SVG_POLYLINE = 'polyline';
	const SVG_PATH = 'path';
	const SVG_CIRCLE = 'circle';
	const SVG_ELLIPSE = 'ellipse';
	// FlatSVGStrayVertex.cause values. A stray vertex is an isolated point with no
	// connecting segments. Asymmetric by design: zero-size rects and zero-radius
	// circles/ellipses are NOT stray vertices — they produce zero-length segments
	// (FlatSVG.zeroLengthSegments) and flow through the normal segment pipeline.
	const FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY = 'FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY';
	const FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT = 'FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT';
	const FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT = 'FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT';
	// FlatSegment.type discriminator. String value matches constant name so JSON
	// output is self-describing.
	const FLAT_SEGMENT_LINE = 'FLAT_SEGMENT_LINE';
	const FLAT_SEGMENT_BEZIER = 'FLAT_SEGMENT_BEZIER';
	const FLAT_SEGMENT_ARC = 'FLAT_SEGMENT_ARC';

	// Internal-only constants — not re-exported from index.ts. SVG_STYLE_* values
	// are used as computed keys on the public FlatSVGStyle interface; the .d.ts
	// emit inlines them to plain string keys, so consumers don't need to import.
	// Container / non-geometry tag names used internally during parse tree traversal.
	const SVG = 'svg';
	const DEFS = 'defs';
	const STYLE = 'style';
	const G = 'g';
	// SVG "no paint" sentinel — compared against fill/stroke and clip-path/mask/
	// filter attribute values to disable the effect on that element.
	const SVG_PAINT_NONE = 'none';
	// SVG path command letters after svgpath's `.abs()` normalization — all
	// uppercase, including the coord-less `Z`.
	const SVG_PATH_CMD_MOVETO = 'M';
	const SVG_PATH_CMD_LINETO = 'L';
	const SVG_PATH_CMD_HLINETO = 'H';
	const SVG_PATH_CMD_VLINETO = 'V';
	const SVG_PATH_CMD_CURVETO = 'C';
	const SVG_PATH_CMD_QUADRATIC = 'Q';
	const SVG_PATH_CMD_ARC = 'A';
	const SVG_PATH_CMD_CLOSE = 'Z';
	// SVG style property keys. https://css-tricks.com/svg-properties-and-css/
	const SVG_STYLE_FILL = 'fill';
	const SVG_STYLE_STROKE_COLOR = 'stroke';
	const SVG_STYLE_COLOR = 'color';
	const SVG_STYLE_OPACITY = 'opacity';
	const SVG_STYLE_MASK = 'mask';
	const SVG_STYLE_CLIP_PATH = 'clip-path';
	const SVG_STYLE_FILTER = 'filter';
	const SVG_STYLE_STROKE_DASH_ARRAY = 'stroke-dasharray';
	// Tags flat-svg converts into paths/segments. Anything else (<use>, <text>,
	// <image>, <foreignObject>, nested <svg>, unknown) routes to unsupportedElements.
	const SUPPORTED_GEOMETRY_TAG_NAMES = new Set([
	    SVG_LINE, SVG_RECT, SVG_POLYGON, SVG_POLYLINE, SVG_CIRCLE, SVG_ELLIPSE, SVG_PATH,
	]);

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	var path_parse;
	var hasRequiredPath_parse;

	function requirePath_parse () {
		if (hasRequiredPath_parse) return path_parse;
		hasRequiredPath_parse = 1;


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
		path_parse = function pathParse(svgPath) {
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
		return path_parse;
	}

	var matrix;
	var hasRequiredMatrix;

	function requireMatrix () {
		if (hasRequiredMatrix) return matrix;
		hasRequiredMatrix = 1;

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


		function Matrix() {
		  if (!(this instanceof Matrix)) { return new Matrix(); }
		  this.queue = [];   // list of matrixes to apply
		  this.cache = null; // combined matrix cache
		}


		Matrix.prototype.matrix = function (m) {
		  if (m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0) {
		    return this;
		  }
		  this.cache = null;
		  this.queue.push(m);
		  return this;
		};


		Matrix.prototype.translate = function (tx, ty) {
		  if (tx !== 0 || ty !== 0) {
		    this.cache = null;
		    this.queue.push([ 1, 0, 0, 1, tx, ty ]);
		  }
		  return this;
		};


		Matrix.prototype.scale = function (sx, sy) {
		  if (sx !== 1 || sy !== 1) {
		    this.cache = null;
		    this.queue.push([ sx, 0, 0, sy, 0, 0 ]);
		  }
		  return this;
		};


		Matrix.prototype.rotate = function (angle, rx, ry) {
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


		Matrix.prototype.skewX = function (angle) {
		  if (angle !== 0) {
		    this.cache = null;
		    this.queue.push([ 1, 0, Math.tan(angle * Math.PI / 180), 1, 0, 0 ]);
		  }
		  return this;
		};


		Matrix.prototype.skewY = function (angle) {
		  if (angle !== 0) {
		    this.cache = null;
		    this.queue.push([ 1, Math.tan(angle * Math.PI / 180), 0, 1, 0, 0 ]);
		  }
		  return this;
		};


		// Flatten queue
		//
		Matrix.prototype.toArray = function () {
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
		Matrix.prototype.calc = function (x, y, isRelative) {
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


		matrix = Matrix;
		return matrix;
	}

	var transform_parse;
	var hasRequiredTransform_parse;

	function requireTransform_parse () {
		if (hasRequiredTransform_parse) return transform_parse;
		hasRequiredTransform_parse = 1;


		var Matrix = requireMatrix();

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


		transform_parse = function transformParse(transformString) {
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
		return transform_parse;
	}

	var a2c;
	var hasRequiredA2c;

	function requireA2c () {
		if (hasRequiredA2c) return a2c;
		hasRequiredA2c = 1;


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
		  if (dot < -1) { dot = -1; }

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

		a2c = function a2c(x1, y1, x2, y2, fa, fs, rx, ry, phi) {
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
		return a2c;
	}

	var ellipse;
	var hasRequiredEllipse;

	function requireEllipse () {
		if (hasRequiredEllipse) return ellipse;
		hasRequiredEllipse = 1;

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

		ellipse = Ellipse;
		return ellipse;
	}

	var svgpath$2;
	var hasRequiredSvgpath$1;

	function requireSvgpath$1 () {
		if (hasRequiredSvgpath$1) return svgpath$2;
		hasRequiredSvgpath$1 = 1;


		var pathParse      = requirePath_parse();
		var transformParse = requireTransform_parse();
		var matrix         = requireMatrix();
		var a2c            = requireA2c();
		var ellipse        = requireEllipse();


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


		svgpath$2 = SvgPath;
		return svgpath$2;
	}

	var svgpath$1;
	var hasRequiredSvgpath;

	function requireSvgpath () {
		if (hasRequiredSvgpath) return svgpath$1;
		hasRequiredSvgpath = 1;

		svgpath$1 = requireSvgpath$1();
		return svgpath$1;
	}

	var svgpathExports = requireSvgpath();
	var svgpath = /*@__PURE__*/getDefaultExportFromCjs(svgpathExports);

	// Convert SVG geometry to absolute-coordinate path strings (L, H, V, B, C only).
	const temp = [0, 0];
	/**
	 * Convert an SVG `<line>` to a path d-string. Missing x1/y1/x2/y2 default to 0;
	 * non-numeric values push a warning and return undefined.
	 * @param properties Source `<line>` attributes.
	 * @param parsingWarnings Mutable array — populated when input is invalid.
	 * @param transform Optional matrix baked into the emitted coordinates.
	 * @returns Path d-string, or undefined on invalid input.
	 */
	function convertLineToPath(properties, parsingWarnings, transform) {
	    let { x1, x2, y1, y2 } = properties;
	    // x1, x2, y1, y2 default to 0.
	    if (x1 === undefined)
	        x1 = 0;
	    if (x2 === undefined)
	        x2 = 0;
	    if (y1 === undefined)
	        y1 = 0;
	    if (y2 === undefined)
	        y2 = 0;
	    if (!isNumber(x1) || !isNumber(x2) || !isNumber(y1) || !isNumber(y2)) {
	        parsingWarnings.push(`Invalid <line> properties: ${JSON.stringify({ x1, y1, x2, y2 })}.`);
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
	/**
	 * Convert an SVG `<rect>` to a path d-string with four explicit edges + Z.
	 * Pushes a warning and returns undefined on invalid x/y/width/height.
	 * @param properties Source `<rect>` attributes.
	 * @param parsingWarnings Mutable array — populated when input is invalid.
	 * @param transform Optional matrix baked into the emitted coordinates.
	 * @returns Path d-string, or undefined on invalid input.
	 */
	function convertRectToPath(properties, parsingWarnings, transform) {
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
	        parsingWarnings.push(`Invalid <rect> properties: ${JSON.stringify({ x, y, width, height })}.`);
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
	    // 4 explicit L edges + redundant Z (dropped by Z-to-self heuristic) → uniform
	    // "4 edges = 4 segments" for every rect, even degenerate ones. Matches how
	    // Illustrator/Inkscape serialize <rect>.
	    return `M${x1},${y1} L${x2},${y2} L${x3},${y3} L${x4},${y4} L${x1},${y1} Z`;
	}
	/**
	 * Convert an SVG `<circle>` to a svgpath PathParser. Encoded as two arcs
	 * (or a degenerate there-and-back line when r=0); arcs are flattened to
	 * cubic beziers unless `_preserveArcs` is true.
	 * @param properties Source `<circle>` attributes.
	 * @param parsingWarnings Mutable array — populated when input is invalid.
	 * @param _preserveArcs Keep `A` commands; otherwise approximate with cubics.
	 * @param transform Optional matrix baked into the emitted coordinates.
	 * @returns svgpath PathParser, or undefined on invalid input.
	 */
	function convertCircleToPath(properties, parsingWarnings, _preserveArcs, transform) {
	    let { cx, cy, r } = properties;
	    // cx, cy, r default to 0.
	    if (cx === undefined)
	        cx = 0;
	    if (cy === undefined)
	        cy = 0;
	    if (r === undefined)
	        r = 0;
	    if (!isNumber(cx) || !isNumber(cy) || !isNonNegativeNumber(r)) {
	        parsingWarnings.push(`Invalid <circle> properties: ${JSON.stringify({ cx, cy, r })}.`);
	        return;
	    }
	    const pathParser = _convertEllipseToPath(cx, cy, r, r, _preserveArcs, transform);
	    /* c8 ignore start -- defensive: _convertEllipseToPath always returns a valid svgpath (it constructs the
	       d-string from validated numeric inputs and never produces a parse error). The err check is here
	       to catch a future change in _convertEllipseToPath's contract. */
	    if (pathParser.err) {
	        parsingWarnings.push(`Problem parsing <circle> ${JSON.stringify({ cx, cy, r })} with ${pathParser.err}.`);
	        return;
	    }
	    /* c8 ignore stop */
	    return pathParser;
	}
	/**
	 * Convert an SVG `<ellipse>` to a svgpath PathParser. Same encoding as
	 * convertCircleToPath but with separate rx / ry radii.
	 * @param properties Source `<ellipse>` attributes.
	 * @param parsingWarnings Mutable array — populated when input is invalid.
	 * @param _preserveArcs Keep `A` commands; otherwise approximate with cubics.
	 * @param transform Optional matrix baked into the emitted coordinates.
	 * @returns svgpath PathParser, or undefined on invalid input.
	 */
	function convertEllipseToPath(properties, parsingWarnings, _preserveArcs, transform) {
	    let { cx, cy, rx, ry } = properties;
	    // cx, cy, rx, ry default to 0.
	    if (cx === undefined)
	        cx = 0;
	    if (cy === undefined)
	        cy = 0;
	    if (rx === undefined)
	        rx = 0;
	    if (ry === undefined)
	        ry = 0;
	    if (!isNumber(cx) || !isNumber(cy) || !isNonNegativeNumber(rx) || !isNonNegativeNumber(ry)) {
	        parsingWarnings.push(`Invalid <ellipse> properties: ${JSON.stringify({ cx, cy, rx, ry })}.`);
	        return;
	    }
	    const pathParser = _convertEllipseToPath(cx, cy, rx, ry, _preserveArcs, transform);
	    /* c8 ignore start -- defensive: same rationale as convertCircleToPath above — _convertEllipseToPath
	       always returns a valid svgpath from validated numeric inputs. */
	    if (pathParser.err) {
	        parsingWarnings.push(`Problem parsing <ellipse> ${JSON.stringify({ cx, cy, rx, ry })} with ${pathParser.err}.`);
	        return;
	    }
	    /* c8 ignore stop */
	    return pathParser;
	}
	// Reference: https://stackoverflow.com/questions/59011294/ellipse-to-path-convertion-using-javascript
	function _convertEllipseToPath(cx, cy, rx, ry, _preserveArcs, transform) {
	    // Degenerate ellipses (rx=0 || ry=0): emit as a there-and-back line so
	    // every degenerate case yields exactly 2 segments uniformly. Diverges
	    // from browser rendering, which treats rx=0 || ry=0 as no-render.
	    let d;
	    if (rx === 0 || ry === 0) {
	        d = `M${cx - rx},${cy - ry} L${cx + rx},${cy + ry} L${cx - rx},${cy - ry} Z`;
	    }
	    else {
	        // Normal ellipse: encode as 2 arcs.
	        d = `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${rx * 2},0 a ${rx},${ry} 0 1,0 -${rx * 2},0`;
	    }
	    let pathParser = svgpath(d).abs();
	    if (!_preserveArcs)
	        pathParser = pathParser.unarc();
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
	}
	/**
	 * Convert an SVG `<polygon>` to a path d-string with explicit L-back-to-start
	 * + Z. A single-point points list returns `{ strayPoint }` instead of a path.
	 * @param properties Source `<polygon>` attributes.
	 * @param parsingWarnings Mutable array — populated when input is invalid.
	 * @param transform Optional matrix baked into the emitted coordinates.
	 * @returns Path d-string, stray-point object, or undefined on invalid input.
	 */
	function convertPolygonToPath(properties, parsingWarnings, transform) {
	    const { points } = properties;
	    if (!isString(points)) {
	        parsingWarnings.push(`Invalid <polygon> properties: ${JSON.stringify({ points })}.`);
	        return undefined;
	    }
	    return _convertPointsToPath(points, parsingWarnings, SVG_POLYGON, transform);
	}
	/**
	 * Convert an SVG `<polyline>` to a path d-string. Same as convertPolygonToPath
	 * but without the closing edge + Z.
	 * @param properties Source `<polyline>` attributes.
	 * @param parsingWarnings Mutable array — populated when input is invalid.
	 * @param transform Optional matrix baked into the emitted coordinates.
	 * @returns Path d-string, stray-point object, or undefined on invalid input.
	 */
	function convertPolylineToPath(properties, parsingWarnings, transform) {
	    const { points } = properties;
	    if (!isString(points)) {
	        parsingWarnings.push(`Invalid <polyline> properties: ${JSON.stringify({ points })}.`);
	        return undefined;
	    }
	    return _convertPointsToPath(points, parsingWarnings, SVG_POLYLINE, transform);
	}
	/**
	 * Tokenize a points attribute into (x, y) pairs. Per SVG spec, coordinates may
	 * be separated by any combination of commas and whitespace. Returns undefined
	 * if any token isn't a valid number, or if there aren't at least 2 valid tokens.
	 * Trailing odd tokens are truncated (browser-compatible) — diverges from strict
	 * spec but matches what real-world SVG renderers do.
	 */
	function _parsePointPairs(pointsString) {
	    const tokens = pointsString.trim().split(/[\s,]+/).filter((s) => s !== '');
	    const pairCount = Math.floor(tokens.length / 2);
	    if (pairCount === 0)
	        return undefined;
	    const pairs = [];
	    for (let i = 0; i < pairCount; i++) {
	        const x = parseFloat(tokens[2 * i]);
	        const y = parseFloat(tokens[2 * i + 1]);
	        if (isNaN(x) || isNaN(y))
	            return undefined;
	        pairs.push([x, y]);
	    }
	    return pairs;
	}
	function _convertPointsToPath(pointsString, parsingWarnings, elementType, transform) {
	    const pairs = _parsePointPairs(pointsString);
	    if (!pairs) {
	        parsingWarnings.push(`Unable to parse points string: "${pointsString}" in <${elementType}>.`);
	        return undefined;
	    }
	    if (pairs.length === 1) {
	        // Single-point polygon/polyline produces no edges — surface as a stray
	        // vertex so the caller can flag it diagnostically rather than emit a
	        // zero-length path. Caller applies any transform (kept here in source
	        // coords, parallel to how other stray-vertex sites work).
	        return { strayPoint: pairs[0] };
	    }
	    let d = '';
	    let firstX = 0;
	    let firstY = 0;
	    for (let i = 0; i < pairs.length; i++) {
	        let x = pairs[i][0];
	        let y = pairs[i][1];
	        if (transform) {
	            temp[0] = x;
	            temp[1] = y;
	            [x, y] = applyTransform(temp, transform);
	        }
	        if (i === 0) {
	            firstX = x;
	            firstY = y;
	            d = `M${x},${y}`;
	        }
	        else {
	            d += ` L${x},${y}`;
	        }
	    }
	    if (elementType === SVG_POLYGON) {
	        // Explicit L back to the first point so N points → N edges (rather
	        // than N-1 + an implicit Z-closure). Trailing Z is dropped as
	        // close-to-self by FlatSVG's z-to-self heuristic.
	        d += ` L${firstX},${firstY} Z`;
	    }
	    return d;
	}
	/**
	 * Normalize an SVG `<path>` d-string: absolute coordinates (.abs()), short
	 * forms expanded to full Q/C (.unshort()), and arcs flattened to cubics
	 * (.unarc()) unless `_preserveArcs` is true.
	 * @param properties Source `<path>` attributes.
	 * @param parsingWarnings Mutable array — populated when input is invalid.
	 * @param _preserveArcs Keep `A` commands; otherwise approximate with cubics.
	 * @param transform Optional matrix baked into the emitted coordinates.
	 * @returns svgpath PathParser, or undefined on invalid input.
	 */
	function convertPathToPath(properties, parsingWarnings, _preserveArcs, transform) {
	    const { d } = properties;
	    if (!isString(d)) {
	        parsingWarnings.push(`Invalid <path> properties: ${JSON.stringify({ d })}.`);
	        return;
	    }
	    // .abs() → absolute coords; .unshort() → expand T/S to Q/C.
	    let pathParser = svgpath(d).abs().unshort();
	    if (!_preserveArcs)
	        pathParser = pathParser.unarc();
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
	        parsingWarnings.push(`Problem parsing <path> ${JSON.stringify({ d })} with ${pathParser.err}.`);
	        return;
	    }
	    return pathParser;
	}

	class t extends Error{reason;filename;line;column;source;constructor(t,e,i,s,n){super(`${t}:${i}:${s}: ${e}`),this.reason=e,this.filename=t,this.line=i,this.column=s,this.source=n;}}class e{start;end;source;constructor(t,e,i){this.start=t,this.end=e,this.source=i;}}var i;!function(t){t.stylesheet="stylesheet",t.rule="rule",t.declaration="declaration",t.comment="comment",t.container="container",t.charset="charset",t.document="document",t.customMedia="custom-media",t.fontFace="font-face",t.host="host",t.import="import",t.keyframes="keyframes",t.keyframe="keyframe",t.layer="layer",t.media="media",t.namespace="namespace",t.page="page",t.startingStyle="starting-style",t.supports="supports";}(i||(i={}));const s=(t,e,i)=>{let s=i,n=1e4;do{const i=e.map(e=>t.indexOf(e,s));i.push(t.indexOf("\\",s));const r=i.filter(t=>-1!==t);if(0===r.length)return  -1;const o=Math.min(...r);if("\\"!==t[o])return o;s=o+2,n--;}while(n>0);throw new Error("Too many escaping")},n=(t,e,i)=>{let r=i,o=1e4;do{const i=e.map(e=>t.indexOf(e,r));i.push(t.indexOf("(",r)),i.push(t.indexOf('"',r)),i.push(t.indexOf("'",r)),i.push(t.indexOf("\\",r));const c=i.filter(t=>-1!==t);if(0===c.length)return  -1;const a=Math.min(...c);switch(t[a]){case "\\":r=a+2;break;case "(":{const e=n(t,[")"],a+1);if(-1===e)return  -1;r=e+1;}break;case '"':{const e=s(t,['"'],a+1);if(-1===e)return  -1;r=e+1;}break;case "'":{const e=s(t,["'"],a+1);if(-1===e)return  -1;r=e+1;}break;default:return a}o--;}while(o>0);throw new Error("Too many escaping")},r=/\/\*[^]*?(?:\*\/|$)/g;function o(t){return t?t.trim():""}function c(t,e){const i=t&&"string"==typeof t.type,s=i?t:e;for(const e in t){const i=t[e];Array.isArray(i)?i.forEach(t=>{c(t,s);}):i&&"object"==typeof i&&c(i,s);}return i&&Object.defineProperty(t,"parent",{configurable:true,writable:true,enumerable:false,value:e||null}),t}const m=(s,a)=>{a=a||{};let m=1,h=1;function u(){const t={line:m,column:h};return i=>(i.position=new e(t,{line:m,column:h},a?.source||""),$(),i)}const p=[];function l(e){const i=new t(a?.source||"",e,m,h,s);if(!a?.silent)throw i;p.push(i);}function f(){const t=/^{\s*/.exec(s);return !!t&&(g(t),true)}function d(){const t=/^}/.exec(s);return !!t&&(g(t),true)}function y(){let t;const e=[];for($(),x(e);s.length&&"}"!==s.charAt(0)&&(t=A()||S(),t);)e.push(t),x(e);return e}function g(t){const e=t[0];return function(t){const e=t.match(/\n/g);e&&(m+=e.length);const i=t.lastIndexOf("\n");h=~i?t.length-i:h+t.length;}(e),s=s.slice(e.length),t}function $(){const t=/^\s*/.exec(s);t&&g(t);}function x(t){t=t||[];let e=V();for(;e;)t.push(e),e=V();return t}function V(){const t=u();if("/"!==s.charAt(0)||"*"!==s.charAt(1))return;const e=/^\/\*[^]*?\*\//.exec(s);return e?(g(e),t({type:i.comment,comment:e[0].slice(2,-2)})):l("End of comment missing")}function k(){const t=/^([^{]+)/.exec(s);if(!t)return;g(t);return ((t,e)=>{const i=[];let s=0;for(;s<t.length;){const r=n(t,e,s);if(-1===r)return i.push(t.substring(s)),i;i.push(t.substring(s,r)),s=r+1;}return i})(o(t[0]).replace(r,""),[","]).map(t=>o(t))}function v(){const t=u(),e=/^(\*?[-#/*\\\w]+(\[[0-9a-z_-]+\])?)\s*/.exec(s);if(!e)return;g(e);const c=o(e[0]),a=/^:\s*/.exec(s);if(!a)return l("property missing ':'");g(a);let m="";const h=n(s,[";","}"]);if(-1!==h){m=s.substring(0,h);g([m]),m=o(m).replace(r,"");}const p=t({type:i.declaration,property:c.replace(r,""),value:m}),f=/^[;\s]*/.exec(s);return f&&g(f),p}function w(){const t=[];if(!f())return l("missing '{'");x(t);let e=v();for(;e;)t.push(e),x(t),e=v();return d()?t:l("missing '}'")}function b(){const t=[],e=u();let n=/^((\d+\.\d+|\.\d+|\d+)%?|[a-z]+)\s*/.exec(s);for(;n;){const e=g(n);t.push(e[1]);const i=/^,\s*/.exec(s);i&&g(i),n=/^((\d+\.\d+|\.\d+|\d+)%?|[a-z]+)\s*/.exec(s);}if(t.length)return e({type:i.keyframe,values:t,declarations:w()||[]})}const j=M("import"),O=M("charset"),E=M("namespace");function M(t){const e=new RegExp("^@"+t+"\\s*((?::?[^;'\"]|\"(?:\\\\\"|[^\"])*?\"|'(?:\\\\'|[^'])*?')+)(?:;|$)");return ()=>{const i=u(),n=e.exec(s);if(!n)return;const r=g(n),o={type:t};return o[t]=r[1].trim(),i(o)}}function A(){if("@"===s[0])return function(){const t=u(),e=/^@([-\w]+)?keyframes\s*/.exec(s);if(!e)return;const n=g(e)[1],r=/^([-\w]+)\s*/.exec(s);if(!r)return l("@keyframes missing name");const o=g(r)[1];if(!f())return l("@keyframes missing '{'");let c=x(),a=b();for(;a;)c.push(a),c=c.concat(x()),a=b();return d()?t({type:i.keyframes,name:o,vendor:n,keyframes:c}):l("@keyframes missing '}'")}()||function(){const t=u(),e=/^@media *([^{]+)/.exec(s);if(!e)return;const n=o(g(e)[1]);if(!f())return l("@media missing '{'");const r=x().concat(y());return d()?t({type:i.media,media:n,rules:r}):l("@media missing '}'")}()||function(){const t=u(),e=/^@custom-media\s+(--\S+)\s+([^{;\s][^{;]*);/.exec(s);if(!e)return;const n=g(e);return t({type:i.customMedia,name:o(n[1]),media:o(n[2])})}()||function(){const t=u(),e=/^@supports *([^{]+)/.exec(s);if(!e)return;const n=o(g(e)[1]);if(!f())return l("@supports missing '{'");const r=x().concat(y());return d()?t({type:i.supports,supports:n,rules:r}):l("@supports missing '}'")}()||j()||O()||E()||function(){const t=u(),e=/^@([-\w]+)?document *([^{]+)/.exec(s);if(!e)return;const n=g(e),r=o(n[1]),c=o(n[2]);if(!f())return l("@document missing '{'");const a=x().concat(y());return d()?t({type:i.document,document:c,vendor:r,rules:a}):l("@document missing '}'")}()||function(){const t=u(),e=/^@page */.exec(s);if(!e)return;g(e);const n=k()||[];if(!f())return l("@page missing '{'");let r=x(),o=v();for(;o;)r.push(o),r=r.concat(x()),o=v();return d()?t({type:i.page,selectors:n,declarations:r}):l("@page missing '}'")}()||function(){const t=u(),e=/^@host\s*/.exec(s);if(!e)return;if(g(e),!f())return l("@host missing '{'");const n=x().concat(y());return d()?t({type:i.host,rules:n}):l("@host missing '}'")}()||function(){const t=u(),e=/^@font-face\s*/.exec(s);if(!e)return;if(g(e),!f())return l("@font-face missing '{'");let n=x(),r=v();for(;r;)n.push(r),n=n.concat(x()),r=v();return d()?t({type:i.fontFace,declarations:n}):l("@font-face missing '}'")}()||function(){const t=u(),e=/^@container *([^{]+)/.exec(s);if(!e)return;const n=o(g(e)[1]);if(!f())return l("@container missing '{'");const r=x().concat(y());return d()?t({type:i.container,container:n,rules:r}):l("@container missing '}'")}()||function(){const t=u(),e=/^@starting-style\s*/.exec(s);if(!e)return;if(g(e),!f())return l("@starting-style missing '{'");const n=x().concat(y());return d()?t({type:i.startingStyle,rules:n}):l("@starting-style missing '}'")}()||function(){const t=u(),e=/^@layer *([^{;@]+)/.exec(s);if(!e)return;const n=o(g(e)[1]);if(!f()){const e=/^[;\s]*/.exec(s);return e&&g(e),t({type:i.layer,layer:n})}const r=x().concat(y());return d()?t({type:i.layer,layer:n,rules:r}):l("@layer missing '}'")}()}function S(){const t=u(),e=k();return e?(x(),t({type:i.rule,selectors:e,declarations:w()||[]})):l("selector missing")}return c(function(){const t=y();return {type:i.stylesheet,stylesheet:{source:a?.source,rules:t,parsingErrors:p}}}())};

	// Plugins extend colord to accept named colors ("tomato") and Lab/LCH inputs
	// (the latter powers Delta E2000 in `.delta()`, used by color-tolerance filters).
	//
	// Caveat: colord's extend() mutates a single global singleton — there is no per-
	// instance or per-bundle extend API. Any other code in the same bundle that
	// imports colord will see these plugins applied as a side effect of importing
	// flat-svg. Both plugins are additive (they enable new parses / methods, not
	// override existing behavior), so the practical impact is limited to "some color
	// strings that previously failed to parse now succeed." Documented in README
	// Limitations. Cannot be fixed without dropping colord.
	k([namesPlugin]);
	k([labPlugin]);
	class FlatSVG {
	    /************************************************
	     * CONSTRUCTOR
	     ************************************************/
	    /**
	     * Parse an SVG string and eagerly flatten elements/paths/segments.
	     * @param string - SVG document to parse.
	     * @param options - Optional settings.
	     * @param options.preserveArcs - Keep arcs (and circle/ellipse encodings) as
	     *     `A` commands in paths/segments. Defaults to false, which approximates
	     *     arcs as cubic beziers via svgpath's .unarc().
	     */
	    constructor(string, options) {
	        var _a;
	        // Definition items collected from top-level `<defs>` (clipPath, mask, gradient, ...).
	        this._defs = [];
	        // Parse-time warnings accumulated during construction (transforms, CSS, viewBox, ...).
	        this._warnings = [];
	        this._rootNode = FlatSVG._parseSVGRoot(string, 'FlatSVG()');
	        this._preserveArcs = !!(options === null || options === void 0 ? void 0 : options.preserveArcs);
	        // Parse viewBox once at construction so any malformed-viewBox warning fires
	        // exactly once (the getter would otherwise re-warn on every read). Passing
	        // the warnings array opts into the tuple-fallback overload, so this always
	        // resolves to a tuple — keeping the instance `viewBox` getter total.
	        this._viewBox = FlatSVG._viewBoxFromRoot(this._rootNode, this._warnings);
	        this._units = FlatSVG._unitsFromRoot(this._rootNode);
	        // Collect top-level <defs> and <style> without mutating the parse tree.
	        // <defs> children populate `_defs`; <style> contents merge into `_globalStyles`.
	        // _deepIterChildren later skips both tags so they don't produce geometry.
	        const topChildren = this._rootNode.children;
	        for (let i = 0, numChildren = topChildren.length; i < numChildren; i++) {
	            const child = topChildren[i];
	            if (child.tagName === DEFS) {
	                // <style> children → global CSS rules; others (clipPath, mask,
	                // gradient, symbol, marker, ...) → FlatSVGDef entries.
	                if (child.children) {
	                    for (let j = 0, numDefsChildren = child.children.length; j < numDefsChildren; j++) {
	                        const defsChild = child.children[j];
	                        if (!defsChild.tagName)
	                            continue;
	                        if (defsChild.tagName === STYLE &&
	                            defsChild.children &&
	                            defsChild.children[0] &&
	                            defsChild.children[0].type === 'text') {
	                            this._globalStyles = Object.assign(Object.assign({}, this._globalStyles), this._parseStyleToObject(defsChild.children[0].value));
	                        }
	                        else if (defsChild.tagName !== STYLE) {
	                            this._defs.push({
	                                tagName: defsChild.tagName,
	                                id: (_a = defsChild.properties) === null || _a === void 0 ? void 0 : _a.id,
	                            });
	                        }
	                    }
	                }
	            }
	            else if (child.tagName === STYLE &&
	                child.children &&
	                child.children[0] &&
	                child.children[0].type === 'text') {
	                this._globalStyles = Object.assign(Object.assign({}, this._globalStyles), this._parseStyleToObject(child.children[0].value));
	            }
	        }
	        this._deepIterChildren = this._deepIterChildren.bind(this);
	        // Eagerly run elements → paths → segments so warnings, unsupportedElements,
	        // and strayVertices are populated by end-of-constructor. Each stage is
	        // pure; orchestration lives here, not in the getters.
	        const elemResult = this._buildElements();
	        const pathResult = this._buildPaths(elemResult.elements);
	        const segResult = this._buildSegments(pathResult.paths, pathResult.pathParsers);
	        this._elements = elemResult.elements;
	        this._unsupportedElements = elemResult.unsupportedElements;
	        this._paths = pathResult.paths;
	        this._strayVertices = pathResult.strayVertices;
	        this._segments = segResult.segments;
	        this._warnings.push(...elemResult.warnings, ...pathResult.warnings, ...segResult.warnings);
	    }
	    /************************************************
	     * SVG METADATA PARSING
	     ************************************************/
	    /**
	     * Parse an SVG string and return the validated <svg> SVGParserElementNode. Used by
	     * the constructor and by the static viewBox/units helpers so input
	     * validation and "must contain a single <svg> root" stay in lockstep.
	     * Unwraps svg-parser's document-level RootNode here because flat-svg
	     * forbids any sibling top-level nodes — every caller wants the <svg>
	     * element, never the wrapper.
	     * @private
	     */
	    static _parseSVGRoot(string, callerName) {
	        if (string === undefined || !isString(string)) {
	            // String(value) coerces any non-string to a printable form: "undefined",
	            // "123", "[object Object]", "[object Array]", "null", etc. Avoid
	            // JSON.stringify here — a caller passing a large object would inflate
	            // the error message with the entire serialized payload.
	            throw new Error(`Must pass in an SVG string to ${callerName}, got ${String(string)}.`);
	        }
	        if (string === '') {
	            throw new Error(`SVG string passed to ${callerName} is empty.`);
	        }
	        const rootNode = parse(string);
	        if (rootNode.children.length !== 1 ||
	            rootNode.children[0].type !== 'element' ||
	            rootNode.children[0].tagName !== SVG) {
	            const numChildren = rootNode.children.length;
	            const firstChild = rootNode.children[0];
	            /* c8 ignore start -- defensive: svg-parser's parse() throws on inputs that would
	               produce a length-0 root.children or a non-element first child (text-only,
	               comment-only, CDATA-only, XML-decl-only, trailing text after an element), AND
	               collapses sibling top-level elements so root.children.length never exceeds 1.
	               So only firstChild=<tagName> with numChildren=1 reaches here; the firstChildDesc
	               fallbacks and the `ren` arm of the count-pluralization ternary are unreachable
	               unless svg-parser's output shape changes. */
	            const firstChildDesc = !firstChild
	                ? 'no children'
	                : firstChild.type === 'element'
	                    ? `<${firstChild.tagName}>`
	                    : `${firstChild.type} node`;
	            throw new Error(`Malformed SVG passed to ${callerName}: expected a single root <svg> element, got ${numChildren} root child${numChildren === 1 ? `: ${firstChildDesc}` : `ren`}.`);
	            /* c8 ignore stop */
	        }
	        return rootNode.children[0];
	    }
	    static _viewBoxFromRoot(root, warnings) {
	        var _a;
	        /* c8 ignore start -- defensive: svg-parser always emits a `properties` object
	           (empty `{}` for elements with no attributes), so the `?? {}` fallback only
	           fires if the library changes its contract. Verified for v3.x. */
	        const properties = (_a = root.properties) !== null && _a !== void 0 ? _a : {};
	        /* c8 ignore stop */
	        const viewBoxRaw = properties.viewBox;
	        if (viewBoxRaw !== undefined && viewBoxRaw !== '') {
	            // String() coerces single-number viewBoxes (svg-parser hands us a number
	            // for purely-numeric attributes); split on whitespace and/or commas per
	            // spec; filter empties so leading/trailing/repeated separators don't
	            // produce phantom NaN tokens.
	            const parts = String(viewBoxRaw)
	                .split(/[\s,]+/)
	                .filter((s) => s !== '')
	                .map(parseFloat);
	            if (parts.length === 4 && parts.every(Number.isFinite)) {
	                return [parts[0], parts[1], parts[2], parts[3]];
	            }
	            // Malformed: signal via undefined unless the caller opted into the
	            // fallback path by passing a warnings sink.
	            if (!warnings)
	                return undefined;
	            warnings.push(`Malformed viewBox "${viewBoxRaw}".`);
	        }
	        // Missing viewBox attribute, or malformed-with-warnings → derive viewport
	        // from root x/y/width/height (matches browser behavior per SVG 2 §8.2).
	        return [
	            Number.parseFloat((properties.x || '0')),
	            Number.parseFloat((properties.y || '0')),
	            Number.parseFloat((properties.width || '0')),
	            Number.parseFloat((properties.height || '0')),
	        ];
	    }
	    /**
	     * Detect length units from the root `<svg>` element's width/height/x/y
	     * attribute suffixes. First attribute with a recognized suffix wins;
	     * defaults to 'px' when none of them carry a unit.
	     * @private
	     */
	    static _unitsFromRoot(root) {
	        // Default to pixels when no unit suffix is present.
	        const regex = /(em|ex|px|pt|pc|cm|mm|in)$/;
	        /* c8 ignore start -- defensive: svg-parser always emits a `properties` object
	           (empty `{}` for elements with no attributes), so the `|| {}` fallback only
	           fires if the library changes its contract. Verified for v3.x. */
	        const { x, y, width, height } = root.properties || {};
	        /* c8 ignore stop */
	        if (isNumber(x) || isNumber(y) || isNumber(width) || isNumber(height)) {
	            return 'px';
	        }
	        // First attribute with a recognized unit suffix wins; default to 'px'.
	        for (const attr of [x, y, width, height]) {
	            const match = attr === null || attr === void 0 ? void 0 : attr.match(regex);
	            if (match)
	                return match[0];
	        }
	        return 'px';
	    }
	    /**
	     * Read viewBox without doing a full FlatSVG construction — useful for
	     * thumbnails / preview sizing. Returns [min-x, min-y, width, height] for a
	     * valid viewBox or one derived from root x/y/width/height when no viewBox
	     * attribute is present; returns undefined when the viewBox attribute is
	     * present but malformed (per SVG 2 §8.2).
	     * @param string - SVG string to parse.
	     * @returns Parsed/derived viewBox tuple, or undefined on malformed input.
	     */
	    static viewBox(string) {
	        const rootNode = FlatSVG._parseSVGRoot(string, 'FlatSVG.viewBox()');
	        return FlatSVG._viewBoxFromRoot(rootNode);
	    }
	    /**
	     * Read units without doing a full FlatSVG construction. Returns one of
	     * the SVG-spec unit suffixes; defaults to 'px' if no suffix is present
	     * on width/height.
	     * @param string - SVG string to parse.
	     */
	    static units(string) {
	        const rootNode = FlatSVG._parseSVGRoot(string, 'FlatSVG.units()');
	        return FlatSVG._unitsFromRoot(rootNode);
	    }
	    /**
	     * Read root-level SVG metadata in a single parse — saves a round trip when
	     * multiple fields are needed. Each field follows the contract of its
	     * dedicated static helper (e.g. `FlatSVG.viewBox`, `FlatSVG.units`).
	     * @param string - SVG string to parse.
	     * @returns Object with metadata fields derived from the SVG root.
	     */
	    static metadata(string) {
	        const rootNode = FlatSVG._parseSVGRoot(string, 'FlatSVG.metadata()');
	        return {
	            viewBox: FlatSVG._viewBoxFromRoot(rootNode),
	            units: FlatSVG._unitsFromRoot(rootNode),
	        };
	    }
	    /************************************************
	     * SETTERS / GETTERS
	     ************************************************/
	    /**
	     * Raw svg-parser parse tree root. Untouched by flat-svg's flattening —
	     * useful for inspecting attributes the library doesn't surface explicitly.
	     */
	    get root() {
	        return this._rootNode;
	    }
	    set root(_value) {
	        throw new Error(`No root setter on ${this.constructor.name}.`);
	    }
	    /**
	     * Get the viewBox of the SVG as [min-x, min-y, width, height].
	     */
	    get viewBox() {
	        return this._viewBox;
	    }
	    set viewBox(_value) {
	        throw new Error(`No viewBox setter on ${this.constructor.name}.`);
	    }
	    /**
	     * Length units detected from the SVG's width/height attribute suffixes
	     * (e.g. 'in', 'mm', 'px'). Defaults to 'px' when no unit suffix is present.
	     */
	    get units() {
	        return this._units;
	    }
	    set units(_value) {
	        throw new Error(`No units setter on ${this.constructor.name}.`);
	    }
	    /**
	     * Definition items (clipPath, mask, linearGradient, etc.) collected from
	     * top-level <defs> blocks in the SVG. Excludes <style> children (those feed
	     * the global CSS rules instead). Each entry has `tagName` and optional `id`.
	     */
	    get defs() {
	        return this._defs;
	    }
	    set defs(_value) {
	        throw new Error(`No defs setter on ${this.constructor.name}.`);
	    }
	    /**
	     * Parse-time warnings: anything flat-svg couldn't fully interpret but kept
	     * going from (malformed transforms, CSS parse failures, skipped children,
	     * unconvertible paths, etc.). Fully populated by end-of-constructor.
	     */
	    get warnings() {
	        return this._warnings;
	    }
	    set warnings(_value) {
	        throw new Error(`No warnings setter on ${this.constructor.name}.`);
	    }
	    /**
	     * Flattened geometry elements (line / rect / polyline / polygon / circle /
	     * ellipse / path) with composed ancestor transforms. Coordinates remain in
	     * source space — apply `element.transform` for viewBox-space geometry.
	     */
	    get elements() {
	        return this._elements;
	    }
	    set elements(_value) {
	        throw new Error(`No elements setter on ${this.constructor.name}.`);
	    }
	    /**
	     * Geometry re-encoded as `<path>` records with absolute coordinates and
	     * ancestor transforms baked into `properties.d`. One FlatPath per element.
	     */
	    get paths() {
	        return this._paths;
	    }
	    set paths(_value) {
	        throw new Error(`No paths setter on ${this.constructor.name}.`);
	    }
	    /**
	     * Per-edge segments split out of FlatSVG.paths — lines, quadratic/cubic
	     * beziers, and (when `preserveArcs`) arcs. Coordinates in viewBox space.
	     */
	    get segments() {
	        return this._segments;
	    }
	    set segments(_value) {
	        throw new Error(`No segments setter on ${this.constructor.name}.`);
	    }
	    /**
	     * Reconstructed SVG document from FlatSVG.elements — same `<svg>` wrapper
	     * as the input, with each element re-emitted as its original tag.
	     */
	    get elementsAsSVG() {
	        const { elements, root } = this;
	        return wrapWithSVGTag(root, elements
	            .map((element) => {
	            const { tagName, properties, transform } = element;
	            let propertiesString = propertiesToAttributesString(properties);
	            if (transform)
	                propertiesString += `transform="${transformToString(transform)}" `;
	            return `<${tagName} ${propertiesString}/>`;
	        })
	            .join('\n'));
	    }
	    set elementsAsSVG(_value) {
	        throw new Error(`No elementsAsSVG setter on ${this.constructor.name}.`);
	    }
	    /**
	     * Reconstructed SVG document from FlatSVG.paths — same `<svg>` wrapper
	     * as the input, with every shape re-emitted as a `<path>`.
	     */
	    get pathsAsSVG() {
	        const { paths, root } = this;
	        return wrapWithSVGTag(root, paths
	            .map((path) => {
	            const { properties } = path;
	            const propertiesString = propertiesToAttributesString(properties);
	            return `<path ${propertiesString}/>`;
	        })
	            .join('\n'));
	    }
	    set pathsAsSVG(_value) {
	        throw new Error(`No pathsAsSVG setter on ${this.constructor.name}.`);
	    }
	    /**
	     * Reconstructed SVG document from FlatSVG.segments — every edge re-emitted
	     * as its own `<line>` or `<path>` element under the original `<svg>` wrapper.
	     */
	    get segmentsAsSVG() {
	        const { segments, root } = this;
	        return wrapWithSVGTag(root, segments
	            .map((segment) => {
	            const { p1, p2, properties } = segment;
	            const propertiesString = propertiesToAttributesString(properties);
	            switch (segment.type) {
	                case FLAT_SEGMENT_BEZIER: {
	                    const { controlPoints } = segment;
	                    const curveType = controlPoints.length === 1
	                        ? SVG_PATH_CMD_QUADRATIC
	                        : SVG_PATH_CMD_CURVETO;
	                    let d = `${SVG_PATH_CMD_MOVETO} ${p1[0]} ${p1[1]} ${curveType} ${controlPoints[0][0]} ${controlPoints[0][1]} `;
	                    if (curveType === SVG_PATH_CMD_CURVETO)
	                        d += `${controlPoints[1][0]} ${controlPoints[1][1]} `;
	                    d += `${p2[0]} ${p2[1]} `;
	                    return `<path d="${d}" ${propertiesString}/>`;
	                }
	                case FLAT_SEGMENT_ARC: {
	                    const { rx, ry, xAxisRotation, largeArcFlag, sweepFlag } = segment;
	                    return `<path d="M ${p1[0]} ${p1[1]} A ${rx} ${ry} ${xAxisRotation} ${largeArcFlag ? 1 : 0} ${sweepFlag ? 1 : 0} ${p2[0]} ${p2[1]}" ${propertiesString}/>`;
	                }
	                case FLAT_SEGMENT_LINE:
	                    return `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" ${propertiesString}/>`;
	            }
	        })
	            .join('\n'));
	    }
	    set segmentsAsSVG(_value) {
	        throw new Error(`No segmentsAsSVG setter on ${this.constructor.name}.`);
	    }
	    /**
	     * Elements flat-svg can't convert to paths/segments (<use>, <text>, <image>,
	     * <foreignObject>, nested <svg>, unknown tags). Routed here at flatten time
	     * with transform/properties preserved; do NOT appear in elements/paths/
	     * segments/*AsSVG outputs.
	     */
	    get unsupportedElements() {
	        return this._unsupportedElements;
	    }
	    set unsupportedElements(_value) {
	        throw new Error(`No unsupportedElements setter on ${this.constructor.name}.`);
	    }
	    /**
	     * True iff any element has a non-empty clipPaths chain. flat-svg does NOT
	     * perform geometric clipping — clipped elements appear unclipped in
	     * elements/paths/segments. Use this to warn consumers about ignored masks.
	     */
	    get containsClipPaths() {
	        const { elements } = this;
	        for (let i = 0; i < elements.length; i++) {
	            const clipPaths = elements[i].clipPaths;
	            if (clipPaths && clipPaths.length > 0)
	                return true;
	        }
	        return false;
	    }
	    set containsClipPaths(_value) {
	        throw new Error(`No containsClipPaths setter on ${this.constructor.name}.`);
	    }
	    /**
	     * Indices into FlatSVG.segments of zero-length segments. A segment is
	     * zero-length iff endpoints coincide AND no geometry strays away and
	     * returns:
	     *   - Line: p1 === p2
	     *   - Bezier: p1 === p2 AND every control point === p1 (otherwise the
	     *     curve traces a loop with nonzero arc length)
	     *   - Arc: p1 === p2 (per SVG spec, identical endpoints render nothing
	     *     regardless of radii)
	     * Returned as indices for use with the `excluded[]` filter pattern.
	     */
	    get zeroLengthSegmentIndices() {
	        if (this._zeroLengthSegmentIndices)
	            return this._zeroLengthSegmentIndices;
	        const { segments } = this;
	        const zeroLengthSegmentIndices = [];
	        for (let i = 0; i < segments.length; i++) {
	            const segment = segments[i];
	            const { p1, p2 } = segment;
	            if (p1[0] !== p2[0] || p1[1] !== p2[1])
	                continue;
	            if (segment.type === FLAT_SEGMENT_BEZIER) {
	                const { controlPoints } = segment;
	                let allMatch = true;
	                for (let j = 0; j < controlPoints.length; j++) {
	                    if (controlPoints[j][0] !== p1[0] || controlPoints[j][1] !== p1[1]) {
	                        allMatch = false;
	                        break;
	                    }
	                }
	                if (!allMatch)
	                    continue;
	            }
	            // Line or arc with p1 === p2 — falls through as zero-length.
	            zeroLengthSegmentIndices.push(i);
	        }
	        this._zeroLengthSegmentIndices = zeroLengthSegmentIndices;
	        return zeroLengthSegmentIndices;
	    }
	    set zeroLengthSegmentIndices(_value) {
	        throw new Error(`No zeroLengthSegmentIndices setter on ${this.constructor.name}.`);
	    }
	    /**
	     * Isolated points from degenerate elements that produce no edges (single-
	     * point polylines, single-point polygons, moveto-only paths). Position is
	     * in viewBox coordinates (transforms applied). Zero-radius circles/ellipses
	     * and zero-size rects are NOT stray vertices — they produce zero-length
	     * segments via `zeroLengthSegmentIndices` instead.
	     */
	    get strayVertices() {
	        return this._strayVertices;
	    }
	    set strayVertices(_value) {
	        throw new Error(`No strayVertices setter on ${this.constructor.name}.`);
	    }
	    /************************************************
	     * SVG PARSING AND FLATTENING
	     ************************************************/
	    /**
	     * Parse a CSS string from a `<style>` block into a selector→FlatSVGStyle map.
	     * Recognized selectors are bare `.class` and `#id`; unsupported selectors
	     * still parse but never match during the cascade. Pushes any CSS parse
	     * errors onto `_warnings`.
	     * @param styleString - Raw text content of a top-level `<style>` element.
	     * @returns Map of selector string (e.g. `.foo`, `#bar`) to FlatSVGStyle.
	     */
	    _parseStyleToObject(styleString) {
	        const { _warnings } = this;
	        const result = {};
	        const css = m(styleString, { silent: true });
	        const { stylesheet } = css;
	        /* c8 ignore start -- defensive: @adobe/css-tools' parse() returns CssStylesheetAST
	           with `stylesheet` typed as non-optional. Only fires if the library changes its contract. */
	        if (!stylesheet) {
	            return result;
	        }
	        /* c8 ignore stop */
	        if (stylesheet.parsingErrors) {
	            const cssWarnings = stylesheet.parsingErrors
	                .map((error) => error.message)
	                .filter((error) => error !== undefined);
	            _warnings.push(...cssWarnings);
	        }
	        // Extract style info.
	        /* c8 ignore start -- defensive: @adobe/css-tools always populates `rules` (empty array
	           for empty CSS). Only fires if the library changes its contract. */
	        if (!stylesheet.rules) {
	            return result;
	        }
	        /* c8 ignore stop */
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
	     * Recursively walk the SVG parse tree, composing inherited context
	     * (transforms, ancestor id/class chains, clip-path/mask/filter chains, and
	     * cascaded styles) and invoking `callback` on each leaf geometry element.
	     * Recurses only into `<g>` containers; nested `<defs>`/`<style>` and
	     * unknown tags are routed to unsupportedElements by the caller.
	     * @param callback - Invoked once per leaf with the composed context.
	     * @param node - Subtree root to walk; defaults to the SVG root.
	     * @param inherited - Context accumulated from ancestors; recursive seed.
	     */
	    _deepIterChildren(callback, node = this.root, inherited = {}) {
	        const { _globalStyles } = this;
	        const { transform, ancestorIds, ancestorClasses, properties, clipPaths, masks, filters } = inherited;
	        const isTopLevel = node === this.root;
	        for (let i = 0, numChildren = node.children.length; i < numChildren; i++) {
	            const child = node.children[i];
	            // Top-level <defs>/<style> are already handled in the constructor — skip.
	            // Nested <defs>/<style> are unsupported (documented limitation): they
	            // fall through to unsupportedElements; don't recurse into their children.
	            const isMetaNode = child.tagName === DEFS || child.tagName === STYLE;
	            if (isMetaNode && isTopLevel)
	                continue;
	            // <g> is the only container flat-svg recurses into. Containers
	            // contribute their id/class to the ancestor chain; leaves keep
	            // id/class as their own properties.
	            const isContainer = child.tagName === G;
	            let childTransform = transform;
	            // Chains passed DOWN to descendants. For containers, augmented below
	            // with the container's own id/class; for leaves they stay = inherited.
	            let childAncestorIds = ancestorIds;
	            let childAncestorClasses = ancestorClasses;
	            let childProperties;
	            // clip-path / mask / filter accumulate outermost→self. Per SVG spec
	            // these don't inherit as styles — every link composes, so an element
	            // can have multiple in effect at once.
	            let childClipPaths = clipPaths;
	            let childMasks = masks;
	            let childFilters = filters;
	            if (child.properties) {
	                // Add transforms to list.
	                if (child.properties.transform) {
	                    const childTransforms = parseTransformString(child.properties.transform, child.tagName);
	                    // Get any warnings the transform parser emitted.
	                    for (let transformIndex = 0, numTransforms = childTransforms.length; transformIndex < numTransforms; transformIndex++) {
	                        const { warnings } = childTransforms[transformIndex];
	                        if (warnings)
	                            this._warnings.push(...warnings);
	                    }
	                    // Merge transforms.
	                    if (childTransforms.length) {
	                        if (childTransform) {
	                            childTransforms.unshift(childTransform);
	                        }
	                        // Flatten transforms to a new matrix.
	                        childTransform = flattenTransformArray(childTransforms);
	                    }
	                }
	                // Work on a fresh copy so we can delete keys freely without mutating
	                // child.properties (which is the parsed tree, shared across the original SVG).
	                let childPropertiesToMerge = Object.assign({}, child.properties);
	                delete childPropertiesToMerge.transform;
	                // Extract clip-path / mask / filter — these don't inherit as style
	                // properties per SVG spec. Append to per-element chain accumulators.
	                const ownClipPath = childPropertiesToMerge[SVG_STYLE_CLIP_PATH];
	                if (ownClipPath !== undefined && ownClipPath !== SVG_PAINT_NONE) {
	                    childClipPaths = childClipPaths
	                        ? [...childClipPaths, ownClipPath]
	                        : [ownClipPath];
	                }
	                delete childPropertiesToMerge[SVG_STYLE_CLIP_PATH];
	                const ownMask = childPropertiesToMerge[SVG_STYLE_MASK];
	                if (ownMask !== undefined && ownMask !== SVG_PAINT_NONE) {
	                    childMasks = childMasks ? [...childMasks, ownMask] : [ownMask];
	                }
	                delete childPropertiesToMerge[SVG_STYLE_MASK];
	                const ownFilter = childPropertiesToMerge[SVG_STYLE_FILTER];
	                if (ownFilter !== undefined && ownFilter !== SVG_PAINT_NONE) {
	                    childFilters = childFilters ? [...childFilters, ownFilter] : [ownFilter];
	                }
	                delete childPropertiesToMerge[SVG_STYLE_FILTER];
	                // Apply global stylesheet rules in CSS specificity order: class < id <
	                // inline `style="..."`. Each later layer's spread wins over earlier ones.
	                // Presentation attributes already on childPropertiesToMerge sit at the
	                // bottom and lose to all three (matches CSS spec).
	                if (childPropertiesToMerge.class) {
	                    // Apply any global `.class` selector styles.
	                    if (_globalStyles) {
	                        const classArray = childPropertiesToMerge.class.split(' ');
	                        for (let j = 0, numClasses = classArray.length; j < numClasses; j++) {
	                            const classStyle = _globalStyles[`.${classArray[j]}`];
	                            if (classStyle) {
	                                childPropertiesToMerge = Object.assign(Object.assign({}, childPropertiesToMerge), classStyle);
	                            }
	                        }
	                    }
	                    // Containers contribute their class to the descendant ancestor chain
	                    // and strip it from merged properties (so it doesn't inherit to
	                    // grandchildren). Leaves keep their own class on properties.class.
	                    if (isContainer) {
	                        childAncestorClasses = `${childAncestorClasses ? `${childAncestorClasses} ` : ''}${childPropertiesToMerge.class}`;
	                        delete childPropertiesToMerge.class;
	                    }
	                }
	                if (childPropertiesToMerge.id) {
	                    // Apply any global `#id` selector styles. Per HTML/SVG, id is a
	                    // single token (unlike class), so no split.
	                    if (_globalStyles) {
	                        const idStyle = _globalStyles[`#${childPropertiesToMerge.id}`];
	                        if (idStyle) {
	                            childPropertiesToMerge = Object.assign(Object.assign({}, childPropertiesToMerge), idStyle);
	                        }
	                    }
	                    // Same container-vs-leaf split as class above.
	                    if (isContainer) {
	                        childAncestorIds = `${childAncestorIds ? `${childAncestorIds} ` : ''}${childPropertiesToMerge.id}`;
	                        delete childPropertiesToMerge.id;
	                    }
	                }
	                // Add child properties to properties list.
	                childProperties = properties;
	                // Inline `style="..."` wins over class/id selectors per CSS specificity —
	                // spread it last so its values override.
	                if (childPropertiesToMerge.style) {
	                    const style = this._parseStyleToObject(`#this { ${childPropertiesToMerge.style} }`)['#this'];
	                    childPropertiesToMerge = Object.assign(Object.assign({}, childPropertiesToMerge), style);
	                    delete childPropertiesToMerge.style;
	                }
	                const propertyKeys = Object.keys(childPropertiesToMerge);
	                for (let j = 0, numProperties = propertyKeys.length; j < numProperties; j++) {
	                    const key = propertyKeys[j];
	                    if (childPropertiesToMerge[key] !== undefined) {
	                        // Make a copy.
	                        if (!childProperties || childProperties === properties)
	                            childProperties = Object.assign({}, properties);
	                        // Opacity is multiplicative per SVG spec — child opacity multiplies
	                        // by the ancestor-accumulated opacity.
	                        if (key === SVG_STYLE_OPACITY) {
	                            if (!isNumber(childPropertiesToMerge[key])) {
	                                // Data problem (malformed SVG), not API misuse — warn and skip.
	                                this._warnings.push(`Invalid <${child.tagName}> opacity value: "${String(childPropertiesToMerge[key])}".`);
	                                continue;
	                            }
	                            childProperties[key] =
	                                childPropertiesToMerge[key] *
	                                    (childProperties[key] !== undefined
	                                        ? childProperties[key]
	                                        : 1);
	                        }
	                        else {
	                            // All other style properties: child's explicit value overrides
	                            // any inherited ancestor value (per CSS/SVG spec).
	                            childProperties[key] =
	                                childPropertiesToMerge[key];
	                        }
	                    }
	                }
	            }
	            // Callback fires for leaves (anything we don't recurse into).
	            if (!isContainer) {
	                // No defensive copies — InheritedContext is readonly and FlatElement
	                // exposes shared refs as Readonly/ReadonlyArray. ancestorIds/
	                // ancestorClasses exclude this element's own id/class.
	                callback(child, {
	                    transform: childTransform,
	                    ancestorIds,
	                    ancestorClasses,
	                    properties: childProperties,
	                    clipPaths: childClipPaths,
	                    masks: childMasks,
	                    filters: childFilters,
	                });
	            }
	            // Only descend into containers. Children of unsupported tags
	            // (<use>, <text>, <foreignObject>, nested <svg>) stay buried with
	            // the parent in unsupportedElements rather than leaking into
	            // elements/paths/segments under a parent that wasn't processed.
	            if (isContainer) {
	                this._deepIterChildren(callback, child, {
	                    transform: childTransform,
	                    // childAncestor* includes this container's id/class.
	                    ancestorIds: childAncestorIds,
	                    ancestorClasses: childAncestorClasses,
	                    properties: childProperties,
	                    clipPaths: childClipPaths,
	                    masks: childMasks,
	                    filters: childFilters,
	                });
	            }
	        }
	    }
	    /************************************************
	     * ELEMENTS
	     ************************************************/
	    /**
	     * Walk the parse tree and build the flat element list. Pure — caller stores
	     * the returned arrays and merges warnings into _warnings.
	     */
	    _buildElements() {
	        // Init output arrays.
	        const elements = [];
	        const unsupportedElements = [];
	        const parsingWarnings = [];
	        // Flatten all children and return.
	        this._deepIterChildren((child, { transform, ancestorIds, ancestorClasses, properties, clipPaths, masks, filters }) => {
	            /* c8 ignore start -- defensive: svg-parser sets `value` and `metadata` on TextNodes, not on
	           ElementNodes that reach this callback. Per @types/svg-parser, SVGParserElementNode.value/metadata are
	           typed as optional but never populated for normal SVG input. Kept as a guard for hand-crafted
	           or future-version parser nodes that might set these. */
	            if (child.value) {
	                parsingWarnings.push(`Skipping child ${child.tagName} with value: ${child.value}`);
	                return;
	            }
	            if (child.metadata) {
	                parsingWarnings.push(`Skipping child ${child.tagName} with metadata: ${child.metadata}`);
	                return;
	            }
	            /* c8 ignore stop */
	            if (!child.tagName) {
	                parsingWarnings.push(`Skipping child with no tagName: ${JSON.stringify(child)}.`);
	                return;
	            }
	            // Unsupported tags (<use>, <text>, <image>, nested <style>/<defs>)
	            // route to unsupportedElements *before* the property-validation gate
	            // so meta-nodes without attributes still surface to consumers.
	            if (!SUPPORTED_GEOMETRY_TAG_NAMES.has(child.tagName)) {
	                const unsupportedChild = {
	                    tagName: child.tagName,
	                    properties: properties !== null && properties !== void 0 ? properties : {},
	                };
	                if (transform)
	                    unsupportedChild.transform = transform;
	                if (clipPaths)
	                    unsupportedChild.clipPaths = clipPaths;
	                if (masks)
	                    unsupportedChild.masks = masks;
	                if (filters)
	                    unsupportedChild.filters = filters;
	                if (ancestorIds)
	                    unsupportedChild.ancestorIds = ancestorIds;
	                if (ancestorClasses)
	                    unsupportedChild.ancestorClasses = ancestorClasses;
	                unsupportedElements.push(unsupportedChild);
	                return;
	            }
	            if (!properties) {
	                parsingWarnings.push(`Skipping child with no properties: ${JSON.stringify(child)}.`);
	                return;
	            }
	            // Resolve currentColor (case-insensitive) in fill/stroke against
	            // inherited `color`. Defaults to 'black' (canvas-text default) when
	            // `color` is missing or itself currentColor — recursive resolution
	            // is unsupported. Other indirections (var(), inherit, color-mix(),
	            // stop-color/flood-color/lighting-color) also not resolved; see
	            // README "Divergences from the SVG spec".
	            // Do NOT mutate `properties` — siblings/descendants may share it by
	            // reference. Spread into a fresh object only when something changes.
	            const props = properties;
	            const rawColor = typeof props.color === 'string' ? props.color : undefined;
	            const effectiveColor = rawColor && !/^currentcolor$/i.test(rawColor) ? rawColor : 'black';
	            const resolvedFill = typeof props.fill === 'string' && /^currentcolor$/i.test(props.fill)
	                ? effectiveColor
	                : props.fill;
	            const resolvedStroke = typeof props.stroke === 'string' && /^currentcolor$/i.test(props.stroke)
	                ? effectiveColor
	                : props.stroke;
	            const resolvedProperties = resolvedFill !== props.fill || resolvedStroke !== props.stroke
	                ? Object.assign(Object.assign({}, props), { fill: resolvedFill, stroke: resolvedStroke }) : props;
	            // ancestorIds/ancestorClasses live at the top level (alongside transform/
	            // clipPaths/masks/filters) — they're flat-svg-internal lineage metadata,
	            // not real SVG attributes.
	            //
	            // Type invariant the cast can't enforce: tagName must be paired with the
	            // matching FlatElement variant (line ↔ SVGLineProperties, etc.). svg-parser
	            // produces them from the same DOM element so they're consistent in
	            // practice, but a future refactor that decouples them would silently
	            // produce mistyped FlatElements.
	            const flatChild = {
	                tagName: child.tagName,
	                properties: resolvedProperties,
	            };
	            if (transform)
	                flatChild.transform = transform;
	            if (clipPaths)
	                flatChild.clipPaths = clipPaths;
	            if (masks)
	                flatChild.masks = masks;
	            if (filters)
	                flatChild.filters = filters;
	            if (ancestorIds)
	                flatChild.ancestorIds = ancestorIds;
	            if (ancestorClasses)
	                flatChild.ancestorClasses = ancestorClasses;
	            elements.push(flatChild);
	        });
	        return { elements, unsupportedElements, warnings: parsingWarnings };
	    }
	    /************************************************
	     * PATHS
	     ************************************************/
	    /**
	     * Convert flat elements to <path>-like records. Pure. Returns pathParsers
	     * as a side-channel for _buildSegments — circle/ellipse/path build a parser
	     * here; line/rect/polygon/polyline get one built lazily downstream.
	     */
	    _buildPaths(elements) {
	        const { _preserveArcs } = this;
	        // Init output arrays.
	        const paths = [];
	        const pathParsers = [];
	        const parsingWarnings = [];
	        const strayVertices = [];
	        const pushStrayVertex = (x, y, transform, cause, sourceElementIndex) => {
	            const pos = [x, y];
	            if (transform)
	                applyTransform(pos, transform);
	            strayVertices.push({
	                position: pos,
	                cause,
	                sourceElementIndex,
	            });
	        };
	        for (let i = 0; i < elements.length; i++) {
	            const child = elements[i];
	            const { transform, tagName, properties } = child;
	            const propertiesCopy = Object.assign({}, properties);
	            // Convert all object types to path with absolute coordinates and transform applied.
	            let d;
	            let pathParser;
	            switch (tagName) {
	                case SVG_LINE:
	                    d = convertLineToPath(properties, parsingWarnings, transform);
	                    delete propertiesCopy.x1;
	                    delete propertiesCopy.y1;
	                    delete propertiesCopy.x2;
	                    delete propertiesCopy.y2;
	                    break;
	                case SVG_RECT:
	                    d = convertRectToPath(properties, parsingWarnings, transform);
	                    delete propertiesCopy.x;
	                    delete propertiesCopy.y;
	                    delete propertiesCopy.width;
	                    delete propertiesCopy.height;
	                    break;
	                case SVG_POLYGON: {
	                    const result = convertPolygonToPath(properties, parsingWarnings, transform);
	                    if (typeof result === 'object') {
	                        pushStrayVertex(result.strayPoint[0], result.strayPoint[1], transform, FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT, i);
	                        continue;
	                    }
	                    // result is string | undefined; the d === undefined check below handles undefined.
	                    d = result;
	                    delete propertiesCopy.points;
	                    break;
	                }
	                case SVG_POLYLINE: {
	                    const result = convertPolylineToPath(properties, parsingWarnings, transform);
	                    if (typeof result === 'object') {
	                        pushStrayVertex(result.strayPoint[0], result.strayPoint[1], transform, FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT, i);
	                        continue;
	                    }
	                    // result is string | undefined; the d === undefined check below handles undefined.
	                    d = result;
	                    delete propertiesCopy.points;
	                    break;
	                }
	                case SVG_CIRCLE:
	                    pathParser = convertCircleToPath(properties, parsingWarnings, _preserveArcs, transform);
	                    if (pathParser)
	                        d = pathParser.toString();
	                    delete propertiesCopy.cx;
	                    delete propertiesCopy.cy;
	                    delete propertiesCopy.r;
	                    break;
	                case SVG_ELLIPSE:
	                    pathParser = convertEllipseToPath(properties, parsingWarnings, _preserveArcs, transform);
	                    if (pathParser)
	                        d = pathParser.toString();
	                    delete propertiesCopy.cx;
	                    delete propertiesCopy.cy;
	                    delete propertiesCopy.rx;
	                    delete propertiesCopy.ry;
	                    break;
	                case SVG_PATH:
	                    pathParser = convertPathToPath(properties, parsingWarnings, _preserveArcs, transform);
	                    if (pathParser) {
	                        // Detect dangling M commands (moveto with no subsequent draw).
	                        // pathParser.segments is in source coordinates (.abs()
	                        // only normalizes relative→absolute; .matrix() is queued on
	                        // a lazy stack and doesn't touch segments[]). Pass the
	                        // element's transform to pushStrayVertex so it lands in
	                        // viewBox coordinates — same pattern as the polygon/polyline cases.
	                        const segs = pathParser.segments;
	                        for (let j = 0, numSegs = segs.length; j < numSegs; j++) {
	                            const cmd = segs[j][0];
	                            if (cmd !== SVG_PATH_CMD_MOVETO)
	                                continue;
	                            const next = segs[j + 1];
	                            const nextCmd = next && next[0];
	                            if (next === undefined ||
	                                nextCmd === SVG_PATH_CMD_MOVETO ||
	                                nextCmd === SVG_PATH_CMD_CLOSE) {
	                                pushStrayVertex(segs[j][1], segs[j][2], transform, FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY, i);
	                            }
	                        }
	                        d = pathParser.toString();
	                    }
	                    delete propertiesCopy.d;
	                    break;
	                /* c8 ignore stop */
	            }
	            if (d === undefined || d === '') {
	                continue;
	            }
	            const path = {
	                properties: Object.assign(Object.assign({}, propertiesCopy), { d }),
	                sourceElementIndex: i,
	            };
	            paths.push(path);
	            pathParsers.push(pathParser);
	        }
	        return { paths, pathParsers, strayVertices, warnings: parsingWarnings };
	    }
	    /************************************************
	     * SEGMENTS
	     ************************************************/
	    /**
	     * Convert paths into edge segments (lines, quadratic/cubic beziers, arcs).
	     * Pure. Reads pathParsers[i] when present (circle/ellipse/path); otherwise
	     * builds a transient parser from path.properties.d.
	     */
	    _buildSegments(paths, pathParsers) {
	        // Init output arrays.
	        const segments = [];
	        const parsingWarnings = [];
	        for (let i = 0, numPaths = paths.length; i < numPaths; i++) {
	            const path = paths[i];
	            const { properties, sourceElementIndex } = path;
	            let pathParser = pathParsers[i];
	            if (pathParser === undefined) {
	                // line/rect/polygon/polyline don't build a parser in _buildPaths
	                // (their d-strings are hand-built with the transform pre-baked).
	                // Build one here just to enumerate commands. Not written back to
	                // pathParsers[i] — the array is discarded after this function returns.
	                pathParser = svgpath(properties.d);
	            }
	            /* c8 ignore start -- defensive: pathParser.err is checked and the path is dropped at the
	               convertPathToPath stage in get paths, so any path that reaches get segments here has already
	               been validated. Kept in case a parser change ever lets an err-tagged parser through. */
	            if (pathParser.err) {
	                parsingWarnings.push(`Problem parsing path to segments with ${pathParser.err}.`);
	            }
	            /* c8 ignore stop */
	            // Split paths to segments.
	            const startPoint = [0, 0];
	            pathParser.iterate((command, index, x, y) => {
	                const p1 = [x, y];
	                // Copy parent properties to segment (minus the "d" property).
	                const propertiesCopy = Object.assign({}, properties);
	                delete propertiesCopy.d;
	                // Mutable<FlatSegment> so we can populate fields incrementally,
	                // then push as the readonly public type. The double-cast through
	                // `unknown` is needed because the partial literal doesn't overlap
	                // any single variant (each requires p2, added in the switch below).
	                const segment = {
	                    p1,
	                    properties: propertiesCopy,
	                    sourceElementIndex,
	                };
	                const segmentType = command[0];
	                /* c8 ignore start -- defensive: svgpath's iterate() always emits an M as the first command
	                   (synthesizes one if the source d-string doesn't start with M, otherwise reports an err
	                   that's caught upstream in convertPathToPath). Kept as a guard against svgpath behavior
	                   changes. */
	                if (index === 0 && segmentType !== SVG_PATH_CMD_MOVETO) {
	                    parsingWarnings.push(`Malformed svg path: "${pathParser.toString()}", should start with M command.`);
	                }
	                /* c8 ignore stop */
	                switch (segmentType) {
	                    case SVG_PATH_CMD_MOVETO:
	                        startPoint[0] = command[1];
	                        startPoint[1] = command[2];
	                        return;
	                    case SVG_PATH_CMD_LINETO:
	                        segment.type = FLAT_SEGMENT_LINE;
	                        segment.p2 = [command[1], command[2]];
	                        break;
	                    case SVG_PATH_CMD_HLINETO:
	                        segment.type = FLAT_SEGMENT_LINE;
	                        segment.p2 = [command[1], y];
	                        break;
	                    case SVG_PATH_CMD_VLINETO:
	                        segment.type = FLAT_SEGMENT_LINE;
	                        segment.p2 = [x, command[1]];
	                        break;
	                    case SVG_PATH_CMD_QUADRATIC: {
	                        const bezier = segment;
	                        bezier.type = FLAT_SEGMENT_BEZIER;
	                        bezier.controlPoints = [[command[1], command[2]]];
	                        bezier.p2 = [command[3], command[4]];
	                        break;
	                    }
	                    case SVG_PATH_CMD_CURVETO: {
	                        const bezier = segment;
	                        bezier.type = FLAT_SEGMENT_BEZIER;
	                        bezier.controlPoints = [
	                            [command[1], command[2]],
	                            [command[3], command[4]],
	                        ];
	                        bezier.p2 = [command[5], command[6]];
	                        break;
	                    }
	                    case SVG_PATH_CMD_ARC: {
	                        const arc = segment;
	                        arc.type = FLAT_SEGMENT_ARC;
	                        arc.rx = command[1];
	                        arc.ry = command[2];
	                        arc.xAxisRotation = command[3];
	                        arc.largeArcFlag = !!command[4];
	                        arc.sweepFlag = !!command[5];
	                        arc.p2 = [command[6], command[7]];
	                        break;
	                    }
	                    case SVG_PATH_CMD_CLOSE:
	                        // Close subpath: emit a segment from current point back to startPoint.
	                        // If they coincide (z closes to itself), drop it — every major editor
	                        // (Illustrator, Inkscape, etc.) exports `... L startX,startY z` with a
	                        // redundant explicit line before z; emitting that zero-length segment
	                        // would inflate counts on nearly every real-world SVG and pollute
	                        // zeroLengthSegments with non-diagnostic noise.
	                        if (startPoint[0] === x && startPoint[1] === y) {
	                            return;
	                        }
	                        segment.type = FLAT_SEGMENT_LINE;
	                        segment.p2 = [startPoint[0], startPoint[1]];
	                        break;
	                    /* c8 ignore start -- defensive: svgpath only emits the standard SVG path commands
	                       (M/L/H/V/C/S/Q/T/A/Z, all handled above after .abs() normalization). The default
	                       branch is unreachable for any input that successfully parses through svgpath. */
	                    default:
	                        parsingWarnings.push(`Unknown <path> command: ${segmentType}.`);
	                        return;
	                    /* c8 ignore stop */
	                }
	                segments.push(segment);
	            });
	        }
	        return { segments, warnings: parsingWarnings };
	    }
	    /************************************************
	     * FILTERING
	     ************************************************/
	    /**
	     * Shared engine behind every public `filter*ByStyle` / `filter*IndicesByStyle`
	     * method. Walks `objects`, tests each against the (possibly chained) filter
	     * spec, and returns matching indices. Reuses (and writes back) a per-object-
	     * type computed-properties cache so the cascade resolves once per filter session.
	     * @param objects - The element/path/segment array being filtered.
	     * @param filter - One filter or array of filters; all must match (AND).
	     * @param computedProperties - Optional cached cascade results to reuse.
	     * @param exclude - Optional skip mask matching `objects.length`.
	     * @returns Indices of passing entries plus the (possibly populated) cache.
	     */
	    _filterByStyle(objects, filter, computedProperties, exclude) {
	        const filterArray = Array.isArray(filter) ? filter : [filter];
	        const filterArrayValues = [];
	        // Lazy init: only allocate when a filter actually consults the cache
	        // (color/opacity/dash filters do; numeric/string filters don't).
	        const getOrInitComputedProperties = () => {
	            if (!computedProperties) {
	                computedProperties = new Array(objects.length);
	                // Fresh objects — Array.fill({}) would alias one instance.
	                for (let k = 0; k < objects.length; k++)
	                    computedProperties[k] = {};
	            }
	            return computedProperties;
	        };
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
	        const indices = [];
	        for (let i = 0, n = objects.length; i < n; i++) {
	            if (exclude && exclude[i])
	                continue;
	            const { properties } = objects[i];
	            // Check that this object meets ALL the the style requirements.
	            let allPassed = true;
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
	                        const isColorFilter = key === SVG_STYLE_STROKE_COLOR ||
	                            key === SVG_STYLE_FILL ||
	                            key === SVG_STYLE_COLOR;
	                        // value='none' matches elements whose resolved attribute is
	                        // 'none' OR missing — the "author wrote no paint here" query.
	                        // Pure source check (no alpha/opacity math); inheritance is
	                        // already in the resolved properties.
	                        if (isColorFilter && filterArray[j].value === SVG_PAINT_NONE) {
	                            const raw = properties[computedKey];
	                            passed = raw === undefined || raw === SVG_PAINT_NONE;
	                            break;
	                        }
	                        if (computedProperties) {
	                            color = computedProperties[i][computedKey];
	                        }
	                        if (color === undefined) {
	                            const raw = properties[computedKey];
	                            // Color filter is over source colors, not rendered output:
	                            // missing attribute / 'none' never matches a non-'none' filter.
	                            if (isColorFilter && (raw === undefined || raw === SVG_PAINT_NONE)) {
	                                passed = false;
	                                break;
	                            }
	                            color = w$1(raw);
	                            if (isColorFilter && !color.isValid()) {
	                                passed = false;
	                                break;
	                            }
	                            // Multiply color.a by properties.opacity.
	                            const opacity = properties[SVG_STYLE_OPACITY];
	                            if (opacity !== undefined) {
	                                const alpha = opacity * color.rgba.a; // Use color.rgba.a instead of alpha() to avoid rounding.
	                                color = color.alpha(alpha); // This makes a copy.
	                            }
	                            getOrInitComputedProperties()[i][computedKey] = color;
	                        }
	                        if (isColorFilter) {
	                            passed = color.delta(value) <= (tolerance || 0);
	                            break;
	                        }
	                        // Else check color opacity for opacity.
	                        // Use color.rgba.a instead of alpha() to avoid rounding.
	                        passed = Math.abs(color.rgba.a - value) <= (tolerance || 0);
	                        break;
	                    case SVG_STYLE_STROKE_DASH_ARRAY: {
	                        let dashArray;
	                        if (computedProperties) {
	                            dashArray = computedProperties[i][key];
	                        }
	                        if (!dashArray) {
	                            dashArray = convertToDashArray(properties[key]);
	                            getOrInitComputedProperties()[i][key] = dashArray;
	                        }
	                        // Dash arrays are cyclic — both sides describe a pattern that
	                        // repeats infinitely along the stroke. Two arrays match if one
	                        // is the other repeated some integer number of times: e.g.
	                        // [5,10] and [5,10,5,10,5,10] both render as "5 10 5 10 ..."
	                        // Compare by walking `longer` and indexing into `shorter` modulo
	                        // its length. If `shorter`'s length doesn't divide `longer`'s,
	                        // they can't be n× repetitions of each other — fail fast.
	                        // (Coprime-but-equivalent cases like [5,10,5,10] vs
	                        // [5,10,5,10,5,10] don't match here, but no real-world SVG
	                        // tool emits redundant-period dash arrays.)
	                        const filterValue = value;
	                        const [shorter, longer] = dashArray.length <= filterValue.length
	                            ? [dashArray, filterValue]
	                            : [filterValue, dashArray];
	                        if (shorter.length === 0) {
	                            // Both empty (no stroke-dasharray on element / filter): match.
	                            // Shorter empty + longer non-empty: one side has dashes, the
	                            // other doesn't — no match.
	                            passed = longer.length === 0;
	                        }
	                        else if (longer.length % shorter.length !== 0) {
	                            passed = false;
	                        }
	                        else {
	                            for (let k = 0; k < longer.length; k++) {
	                                if (Math.abs(longer[k] - shorter[k % shorter.length]) >
	                                    (tolerance || 0)) {
	                                    passed = false;
	                                    break;
	                                }
	                            }
	                        }
	                        break;
	                    }
	                    default: {
	                        // Numeric filter: use tolerance; string filter: exact equality.
	                        const attr = properties[key];
	                        if (isNumber(value)) {
	                            if (attr === undefined ||
	                                Math.abs(attr - value) > (tolerance || 0)) {
	                                passed = false;
	                            }
	                        }
	                        else if (typeof value === 'string') {
	                            passed = attr === value;
	                        }
	                        else {
	                            // Caller error: value type (Colord/array/object) doesn't
	                            // make sense for this key. Throw rather than silently
	                            // returning an empty match set.
	                            throw new Error(`flat-svg cannot handle filters with key "${key}" and value ${JSON.stringify(value)} of type ${typeof value}.`);
	                        }
	                        break;
	                    }
	                }
	                if (!passed) {
	                    allPassed = false;
	                    break;
	                }
	            }
	            if (allPassed)
	                indices.push(i);
	        }
	        return { indices, computedProperties: computedProperties };
	    }
	    /**
	     * Filter FlatSVG.elements by style properties, returning matching indices.
	     * Useful when threading an `excluded[]` tracker through multiple filter steps.
	     * @param filter - FlatSVGStyle properties to filter for.
	     * @param exclude - Booleans matching elements length; true entries skip that element.
	     * @returns Indices into FlatSVG.elements of matching entries, ascending.
	     */
	    filterElementIndicesByStyle(filter, exclude) {
	        const { elements } = this;
	        const { indices, computedProperties } = this._filterByStyle(elements, filter, this._computedElementProperties, exclude);
	        this._computedElementProperties = computedProperties;
	        return indices;
	    }
	    /**
	     * Like filterElementIndicesByStyle but returns the matching elements themselves.
	     * @param filter - FlatSVGStyle properties to filter for.
	     * @param exclude - Booleans matching elements length; true entries skip that element.
	     * @returns Matching elements in source order.
	     */
	    filterElementsByStyle(filter, exclude) {
	        const elements = this.elements;
	        const indices = this.filterElementIndicesByStyle(filter, exclude);
	        return indices.map((i) => elements[i]);
	    }
	    /**
	     * Filter FlatSVG.paths by style properties, returning matching indices.
	     * @param filter - FlatSVGStyle properties to filter for.
	     * @param exclude - Booleans matching paths length; true entries skip that path.
	     * @returns Indices into FlatSVG.paths of matching entries, ascending.
	     */
	    filterPathIndicesByStyle(filter, exclude) {
	        const { paths } = this;
	        const { indices, computedProperties } = this._filterByStyle(paths, filter, this._computedPathProperties, exclude);
	        this._computedPathProperties = computedProperties;
	        return indices;
	    }
	    /**
	     * Like filterPathIndicesByStyle but returns the matching paths themselves.
	     * @param filter - FlatSVGStyle properties to filter for.
	     * @param exclude - Booleans matching paths length; true entries skip that path.
	     * @returns Matching paths in source order.
	     */
	    filterPathsByStyle(filter, exclude) {
	        const paths = this.paths;
	        const indices = this.filterPathIndicesByStyle(filter, exclude);
	        return indices.map((i) => paths[i]);
	    }
	    /**
	     * Filter FlatSVG.segments by style properties, returning matching indices.
	     * @param filter - FlatSVGStyle properties to filter for.
	     * @param exclude - Booleans matching segments length; true entries skip that segment.
	     * @returns Indices into FlatSVG.segments of matching entries, ascending.
	     */
	    filterSegmentIndicesByStyle(filter, exclude) {
	        const { segments } = this;
	        const { indices, computedProperties } = this._filterByStyle(segments, filter, this._computedSegmentProperties, exclude);
	        this._computedSegmentProperties = computedProperties;
	        return indices;
	    }
	    /**
	     * Like filterSegmentIndicesByStyle but returns the matching segments themselves.
	     * @param filter - FlatSVGStyle properties to filter for.
	     * @param exclude - Booleans matching segments length; true entries skip that segment.
	     * @returns Matching segments in source order.
	     */
	    filterSegmentsByStyle(filter, exclude) {
	        const segments = this.segments;
	        const indices = this.filterSegmentIndicesByStyle(filter, exclude);
	        return indices.map((i) => segments[i]);
	    }
	    /************************************************
	     * DIAGNOSTICS
	     ************************************************/
	    /**
	     * Histogram of stroke/fill colors across elements. Colors normalize to hex
	     * ('#F00', 'red', 'rgb(255,0,0)' all bucket together); invalid values
	     * bucket by raw string. SVG spec defaults are NOT synthesized — `none`
	     * counts both explicit 'none' and missing attributes ("no authored color").
	     */
	    _histogramByStyleKey(key) {
	        var _a;
	        const { elements } = this;
	        let none = 0;
	        const colors = {};
	        for (let i = 0; i < elements.length; i++) {
	            const value = elements[i].properties[key];
	            if (value === undefined || value === SVG_PAINT_NONE) {
	                none++;
	                continue;
	            }
	            const c = w$1(value);
	            const bucket = c.isValid() ? c.toHex() : String(value);
	            colors[bucket] = ((_a = colors[bucket]) !== null && _a !== void 0 ? _a : 0) + 1;
	        }
	        return { none, colors };
	    }
	    /**
	     * Aggregate JSON-serializable overview — counts, color histograms, and
	     * diagnostic arrays in one object.
	     * @returns FlatSVGAnalysis snapshot of the parsed SVG.
	     */
	    analyze() {
	        const { viewBox, units, elements, paths, segments, defs, warnings } = this;
	        const zeroLengthSegmentIndices = this.zeroLengthSegmentIndices;
	        const strayVertices = this.strayVertices;
	        const unsupportedElements = this.unsupportedElements;
	        return {
	            viewBox,
	            units,
	            counts: {
	                elements: elements.length,
	                paths: paths.length,
	                segments: segments.length,
	                zeroLengthSegments: zeroLengthSegmentIndices.length,
	                strayVertices: strayVertices.length,
	                defs: defs.length,
	                unsupportedElements: unsupportedElements.length,
	            },
	            strokeColors: this._histogramByStyleKey(SVG_STYLE_STROKE_COLOR),
	            fillColors: this._histogramByStyleKey(SVG_STYLE_FILL),
	            containsClipPaths: this.containsClipPaths,
	            zeroLengthSegmentIndices,
	            strayVertices,
	            unsupportedElements,
	            warnings: [...warnings],
	        };
	    }
	}

	exports.FLAT_SEGMENT_ARC = FLAT_SEGMENT_ARC;
	exports.FLAT_SEGMENT_BEZIER = FLAT_SEGMENT_BEZIER;
	exports.FLAT_SEGMENT_LINE = FLAT_SEGMENT_LINE;
	exports.FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY = FLAT_SVG_STRAY_VERTEX_MOVETO_ONLY;
	exports.FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT = FLAT_SVG_STRAY_VERTEX_POLYGON_SINGLE_POINT;
	exports.FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT = FLAT_SVG_STRAY_VERTEX_POLYLINE_SINGLE_POINT;
	exports.FlatSVG = FlatSVG;
	exports.SVG_CIRCLE = SVG_CIRCLE;
	exports.SVG_ELLIPSE = SVG_ELLIPSE;
	exports.SVG_LINE = SVG_LINE;
	exports.SVG_PATH = SVG_PATH;
	exports.SVG_POLYGON = SVG_POLYGON;
	exports.SVG_POLYLINE = SVG_POLYLINE;
	exports.SVG_RECT = SVG_RECT;

}));
//# sourceMappingURL=flat-svg.js.map
