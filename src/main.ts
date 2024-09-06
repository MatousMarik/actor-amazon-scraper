// For more information, see https://crawlee.dev/
import { CheerioCrawler, KeyValueStore, log } from "crawlee";

// import { Actor } from 'apify';
import { LABELS, PRODUCT_LINK } from "./constants.js";
import { router } from "./routes.js";
import { Input } from "./types.js";

// Grab our keyword from the input
const { keyword = "iphone" } = (await KeyValueStore.getInput<Input>()) ?? {};

const crawler = new CheerioCrawler({
    requestHandler: router,
    navigationTimeoutSecs: 5,
    // proxyConfiguration: await Actor.createProxyConfiguration({
    //     countryCode: "US"
    // }),
    maxRequestRetries: 50
});

log.info("Starting.");

await crawler.run([
    {
        url: `${PRODUCT_LINK}${keyword}`,
        label: LABELS.START
    }
]);

log.info("Finished.");
