import { isArray, isNumber, isPositiveNumber, isString } from '@amandaghassaei/type-checks';
export function removeWhitespacePadding(string) {
    return string.replace(/^\s+|\s+$/g, '');
}
export function convertToDashArray(value) {
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
//# sourceMappingURL=utils.js.map