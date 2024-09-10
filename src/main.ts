// For more information, see https://crawlee.dev/
import { CheerioCrawler, KeyValueStore, log, Dataset } from "crawlee";

// import { Actor } from 'apify';
import { BASE_URL, LABELS } from "./constants.js";
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

await crawler.addRequests([
    {
        url: `${BASE_URL}/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=${keyword}`,
        label: LABELS.START,
        userData: {
            keyword
        }
    }
]);

log.info("Starting.");

await crawler.run();

await Dataset.exportToJSON("results");
log.info("Finished.");
