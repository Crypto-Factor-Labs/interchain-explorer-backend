import {AvlTreeKey, bn_wrap} from "@unleashed-business/ts-web3-commons";
import {BN} from "@partisiablockchain/abi-client";

export class U32AvlKey implements AvlTreeKey {
    constructor(
        public readonly value: number,
    ) {
    }

    public toBuffer(): Buffer {
        return new BN(bn_wrap(this.value).toString(16), "hex").toBuffer('le', 4);
    }
}

export class HashAvlKey implements AvlTreeKey {
    constructor(
        public readonly value: string,
    ) {
    }

    public toBuffer(): Buffer {
        return Buffer.from(this.value, "hex");
    }
}

export class PartisiaUtils {
    public static toU32AvlKey(value: number): U32AvlKey {
        return new U32AvlKey(value);
    }

    public static toHashAvlKey(value: string): HashAvlKey {
        return new HashAvlKey(value);
    }
}