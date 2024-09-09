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

// await crawler.addRequests([
//     {
//         url: `${BASE_URL}/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=${keyword}`,
//         label: LABELS.START
//     }
// ]);

const tmp = `${BASE_URL}${keyword}`;
await crawler.addRequests([
    {
        url: "https://www.amazon.com/SAMSUNG-Smartphone-Unlocked-Android-Processor/dp/B0CMDL3H3V/ref=sr_1_10?dib=eyJ2IjoiMSJ9.TtApUx6-Lq44oH4MPcA8mv5J5vY_KETd_12CCrk_YzGGHMcfUygCUfwLQVp9V0MEGWMWa1yXRTYM5Br7CwrQV9vVIY3tJ2UpUGu_UkIgyw5oH5Br2KpLpCl1QWcWIFbCpcTC6DeRJYiLhpEczCxGoeNEPCnL5TclAptG8zyEsxfzA2olR72rA5oo3DvswyINBdnw4VK4tpPoe6z-NeNd6L3Nh7NITzFQ_dgvG0STpQ4.fKHdxmnNFroefOT6P_dfRcBFNo9VHcdUcdoyhHwaqz4&dib_tag=se&keywords=samsung&qid=1725872043&sr=8-10",
        label: LABELS.PRODUCT,
        userData: {
            data: {
                title: "Galaxy S24+ Plus Cell Phone, 256GB AI Smartphone, Unlocked Android, 50MP Camera, Fastest Processor, Long Battery Life, US Version, 2024, Onyx Black",
                asin: "B0CMDL3H3V",
                itemUrl:
                    "https://www.amazon.com/SAMSUNG-Smartphone-Unlocked-Android-Processor/dp/B0CMDL3H3V/ref=sr_1_10?dib=eyJ2IjoiMSJ9.TtApUx6-Lq44oH4MPcA8mv5J5vY_KETd_12CCrk_YzGGHMcfUygCUfwLQVp9V0MEGWMWa1yXRTYM5Br7CwrQV9vVIY3tJ2UpUGu_UkIgyw5oH5Br2KpLpCl1QWcWIFbCpcTC6DeRJYiLhpEczCxGoeNEPCnL5TclAptG8zyEsxfzA2olR72rA5oo3DvswyINBdnw4VK4tpPoe6z-NeNd6L3Nh7NITzFQ_dgvG0STpQ4.fKHdxmnNFroefOT6P_dfRcBFNo9VHcdUcdoyhHwaqz4&dib_tag=se&keywords=samsung&qid=1725872043&sr=8-10",
                tmp
            }
        }
    }
]);

log.info("Starting.");

await crawler.run();

await Dataset.exportToJSON("results");
log.info("Finished.");
