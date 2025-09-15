/* eslint-disable @typescript-eslint/no-unused-vars */
import { Config, microAlgo } from "@algorandfoundation/algokit-utils";
import { registerDebugEventHandlers } from "@algorandfoundation/algokit-utils-debug";
import { algorandFixture } from "@algorandfoundation/algokit-utils/testing";
import { beforeAll, describe, expect, test } from "vitest";

import algosdk, { Account, Address } from "algosdk";
import { exp, len } from "@algorandfoundation/algorand-typescript/op";
import { FluxGateClient, FluxGateFactory } from "../artifacts/flux_gate/flux-gateClient";
import { FluxRecordKey } from "./config.algo";

let appClient: FluxGateClient;
let managerAccount: Account;

describe("flux-gate Testing - config", () => {
  const localnet = algorandFixture();

  // -------------------------------------------------------------------------------------------------
  beforeAll(async () => {
    await localnet.newScope(); // Ensure context is initialized before accessing it

    Config.configure({
      debug: true,
    });
    registerDebugEventHandlers();

    const { generateAccount } = localnet.context;
    managerAccount = await generateAccount({ initialFunds: microAlgo(10000000) });

    const deploy = async () => {
      const factory = localnet.algorand.client.getTypedAppFactory(FluxGateFactory, {
        defaultSender: managerAccount.addr,
      });

      const { appClient } = await factory.send.create.createApplication({
        args: [
          managerAccount.addr.publicKey, // manager address
        ],
        sender: managerAccount.addr,
        accountReferences: [managerAccount.addr],
      });
      appClient.algorand.setSignerFromAccount(managerAccount);
      console.log("app Created, address", algosdk.encodeAddress(appClient.appAddress.publicKey));
      return { client: appClient };
    };

    appClient = (await deploy()).client;
    const mbrTxn = localnet.algorand.createTransaction.payment({
      sender: managerAccount.addr,
      receiver: appClient.appAddress,
      amount: microAlgo(400_000),
    });
    appClient.algorand.setSignerFromAccount(managerAccount);
    await appClient.send.initApplication({
      args: [mbrTxn]
    });

  }, 30000);

  test("addFluxTier", async () => {
    await appClient.send.addFluxTier({ args: [0, 10000] });
    const tiers = await appClient.state.box.fluxTiers();
    expect(tiers?.[0][0]).toBe(0);
    expect(tiers?.[0][1]).toBe(10000n);
  });
  test("addFluxTier", async () => {
    await appClient.send.addFluxTier({ args: [1, 100000] });
    const tiers = await appClient.state.box.fluxTiers();
    expect(tiers?.[1][0]).toBe(1);
    expect(tiers?.[1][1]).toBe(100000n);
  });

  test("Add User", async () => {
    await appClient.send.setUserTier({ args: [managerAccount.addr.toString(), 1] });
    const users = await appClient.state.box.fluxRecords.getMap();
    console.log('user map', users);
  });

  test("Get User", async () => {
    const result = await appClient.send.getUserTier({ args: [managerAccount.addr.toString()] });
    console.log('user tier', result.return);
  });
});
