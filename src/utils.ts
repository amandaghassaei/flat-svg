import { isArray, isNumber, isPositiveNumber, isString } from '@amandaghassaei/type-checks';

export function removeWhitespacePadding(string: string) {
	return string.replace(/^\s+|\s+$/g,'');
}

export function convertToDashArray(value: string | number | number[] | undefined) {
	let dashArray: number[] = [];
	if (value === '' || value === undefined) return dashArray;
	if (isNumber(value)) {
		if (!isPositiveNumber(value)) {
			throw new Error(`Expected positive number for stroke-dasharray value, got ${value}.`);
		}
		dashArray = [value as number];
	} else if (isString(value)) {
		dashArray = (value as string).split(' ').map(_el => {
			const el = Number.parseFloat(_el);
			if (!isPositiveNumber(el)) {
				throw new Error(`Expected positive number for stroke-dasharray value, got ${el} from string "${_el}".`);
			}
			return el;
		});
	} else if (isArray(value)) {
		for (let i = 0, len = (value as number[]).length; i < len; i++) {
			const el = (value as number[])[i];
			if (!isPositiveNumber(el)) {
				throw new Error(`Expected positive number for stroke-dasharray value, got ${el} from array ${JSON.stringify(value)}.`);
			}
			dashArray.push(el);
		}
	} else {
		throw new Error(`Invalid type ${typeof value} for stroke-dasharray property ${value}.`);
	}
	if (dashArray.length % 2 === 1) {
		// Odd length dash arrays should be repeated. 
		dashArray = [...dashArray, ...dashArray];
	}
	return dashArray;
}