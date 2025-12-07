import type { ValueTransformer } from 'typeorm';
import BN from 'bn.js';

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

/**
 * TypeORM column transformer for big integers stored as DECIMAL/NUMERIC.
 *
 * - DB side: always writes a **decimal string** (base-10), suitable for NUMERIC(78,0).
 * - App side: always reads back a **BN** instance for safe arithmetic.
 *
 * BN.js serializes to hex in JSON by default; meanwhile Postgres NUMERIC expects
 * decimal text. This transformer keeps storage correct (decimal) and gives a BN
 * in code. It does **not** affect JSON output — use a DTO/mapper (e.g. bnToDec)
 * if you want to emit decimal strings to clients.
 *
 * Example usage:
 *   @Column({
 *     name: 'fee_per_unit',
 *     type: 'numeric',
 *     precision: 78,
 *     scale: 0,
 *     transformer: BigNumericTransformer,
 *   })
 *   feePerUnit!: BN;
 */
export const BigNumericTransformer: ValueTransformer = {
  to: (value: BN | string | number | null | undefined): string | null => {
    if (value == null) return null;                 // handles undefined/null
    if (BN.isBN && BN.isBN(value)) return value.toString(10);
    return new BN(String(value), 10).toString(10);  // accepts string/number
  },
  from: (value: string | null): BN | null => {
    if (value == null) return null;
    return new BN(value, 10);
  },
};
