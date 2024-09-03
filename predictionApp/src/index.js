import { createApp } from "@deroll/app";
import { getAddress, hexToString, stringToHex } from "viem";

const app = createApp({ url: process.env.ROLLUP_HTTP_SERVER_URL || "http://127.0.0.1:5004" });
let markets = {};

app.addAdvanceHandler(async ({ metadata, payload }) => {
    const sender = getAddress(metadata.msg_sender);
    const payloadString = hexToString(payload);
    console.log("Sender:", sender, "Payload:", payloadString);

    try {
        const jsonPayload = JSON.parse(payloadString);
        if (jsonPayload.method === "create_market") {
            markets[jsonPayload.marketId] = {
                event: jsonPayload.event,
                options: jsonPayload.options,
                bets: {},
                owner: sender
            };
            console.log("Market created:", jsonPayload.marketId);
        } else if (jsonPayload.method === "place_bet") {
            const market = markets[jsonPayload.marketId];
            if (!market.bets[sender]) market.bets[sender] = {};
            market.bets[sender][jsonPayload.option] = BigInt(jsonPayload.amount);
            console.log("Bet placed:", jsonPayload.amount);
        }
        return "accept";
    } catch (e) {
        console.error(e);
        app.createReport({ payload: stringToHex(String(e)) });
        return "reject";
    }
});

app.addInspectHandler(async ({ payload }) => {
    const marketId = hexToString(payload).split("/")[1];
    const market = markets[marketId] || {};
    const bets = market.bets || {};
    await app.createReport({ payload: stringToHex(JSON.stringify(bets)) });
});

app.start().catch((e) => {
    console.error(e);
    process.exit(1);
});
