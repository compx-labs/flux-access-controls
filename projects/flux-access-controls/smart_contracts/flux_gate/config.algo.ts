import { arc4 } from "@algorandfoundation/algorand-typescript"

export class FluxRecord extends arc4.Struct<{
  tier: arc4.UintN8
}> {}

export class FluxRecordKey extends arc4.Struct<{
  userAddress: arc4.Address
}> {}

export class FluxTier extends arc4.Struct<{
  tierNumber: arc4.UintN8
  minRequired: arc4.UintN64
}> {}
