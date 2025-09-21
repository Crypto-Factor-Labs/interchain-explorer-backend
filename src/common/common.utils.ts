import type BN from 'bn.js';

/* Converts a BN instance to a decimal string.
 * If the input is not a BN instance, it returns the string representation of the input.
 *
 * Is meant to be used when you need to ensure that a value is in decimal format,
 * especially when dealing with serialization or API responses.
 *
 * BN is used for heights. When Nest serializes the entity, JSON.stringify calls 
 * BN.prototype.toJSON(), which (in BN.js) returns hex (toString(16)).
*  Result: DB has decimal, but the API emits hex.
* 
*  Use this function to convert BN instances to decimal strings, for example:
*    const decimalString = bnToDec(new BN('1234', 16)); // '4660' in decimal
* 
*  or when you have a block object:
*    height: bnToDec(b.height),
*/
export const bnToDec = (v: BN | any) => v?.toString?.(10) ?? String(v);
