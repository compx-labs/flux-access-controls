import {
  Account,
  BoxMap,
  contract,
  abimethod,
  Contract,
  GlobalState,
  uint64,
  Box,
  gtxn,
  assertMatch,
  Global,
  op,
  Uint64,
  assert,
} from "@algorandfoundation/algorand-typescript";
import { FluxRecord, FluxRecordKey, FluxTier } from "./config.algo";
import { Address, StaticArray, UintN64, UintN8 } from "@algorandfoundation/algorand-typescript/arc4";

@contract({ name: "flux-gate", avmVersion: 11 })
export class FluxGate extends Contract {
  //Globals
  admin_account = GlobalState<Account>();

  flux_records = BoxMap<FluxRecordKey, FluxRecord>({ keyPrefix: "flux_record" });

  flux_tiers = Box<StaticArray<FluxTier, 10>>({ key: "ft" });

  current_num_tiers = GlobalState<uint64>();

  // Methods

  @abimethod({ allowActions: "NoOp", onCreate: "require" })
  public createApplication(admin: Account, baseTokenId: uint64): void {
    this.admin_account.value = admin;
  }

  @abimethod({ allowActions: "NoOp" })
  public initApplication(mbrTxn: gtxn.PaymentTxn): void {
    assertMatch(mbrTxn, { receiver: Global.currentApplicationAddress, amount: 400_000 });
    this.flux_tiers.create();
  }

  @abimethod({ allowActions: "NoOp" })
  public addFluxTier(tierNumber: uint64, minRequired: UintN64): void {
    //only admin can call
    assert(op.Txn.sender === this.admin_account.value);

    const currentTiers = this.flux_tiers.value.copy();
    const newTier = new FluxTier({ tierNumber: new UintN8(tierNumber), minRequired });
    let tierAdded = false;
    for (var i:uint64 = 0; i < this.current_num_tiers.value; i++) {
      if (currentTiers[i].tierNumber === new UintN8(0) && !tierAdded) {
        // empty slot
        currentTiers[i] = newTier.copy();
        tierAdded = true;
        break;
      }
    }
    this.flux_tiers.value = currentTiers.copy();
  }
  @abimethod({ allowActions: "NoOp" })
  removeFluxTier(tierNumber: uint64): void {
    //only admin can call
    assert(op.Txn.sender === this.admin_account.value);

    const currentTiers = this.flux_tiers.value.copy();
    let tierRemoved = false;
    for (var i:uint64 = 0; i < this.current_num_tiers.value; i++) {
      if (currentTiers[i].tierNumber === new UintN8(tierNumber) && !tierRemoved) {
        // empty slot
        currentTiers[i] = new FluxTier({ tierNumber: new UintN8(0), minRequired: new UintN64(0) });
        tierRemoved = true;
        break;
      }
    }
    this.flux_tiers.value = currentTiers.copy();
  }

  @abimethod({ allowActions: "NoOp" })
  public setUserTier(user: Address, tier: uint64): void {
    //only admin can call
    assert(op.Txn.sender === this.admin_account.value);

    const recordKey = new FluxRecordKey({ userAddress: user });
    const record = new FluxRecord({ tier: new UintN8(tier) });
    this.flux_records(recordKey).value = record.copy();
  }

  @abimethod({ allowActions: "NoOp" })
  public getUserTier(user: Address): UintN8 {
    const recordKey = new FluxRecordKey({ userAddress: user });
    const record = this.flux_records(recordKey).value.copy();
    return record.tier;
  }
}
