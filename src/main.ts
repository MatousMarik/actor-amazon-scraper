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
//         label: LABELS.START,
//         userData: {
//             keyword
//         }
//     }
// ]);

await crawler.addRequests([
    {
        url: `https://www.amazon.com/SAMSUNG-Unlocked-Smartphone-Processor-Graphite/dp/B0CD9645MM/ref=sr_1_13?dib=eyJ2IjoiMSJ9.GB4b6u1A3aovRYYitJxtGO1bpeL8AlYcCPDKZ0dae7hWb3PPwzN2GJWz2Jtx_i2OGgjMWmyLF1M98xfGRo5x5u0E5Se6TDoi3bOBuQspunMfVC5CLJKrhHX9L0toImIJpcTC6DeRJYiLhpEczCxGoa1qfalKAc8YPXP2JMN3OUC3bzB5SXt2DeVsy2xpBNde5Nkd_cUErJK8HLpTnc1v7lZa4Xzr_apW-4ZFvj0LE1A.hInPuCotpMmLeYk8WJMS0HA8rcFDTGDkVkgHkP8PWd8&dib_tag=se&keywords=samsung&qid=1725957897&sr=8-13`,
        label: LABELS.PRODUCT,
        userData: {
            data: {
                title: "Galaxy S23 FE AI Phone, 128GB Unlocked Android Smartphone, Long Battery Life, Premium Processor, Tough Gorilla Glass Display, Hi-Res 50MP Camera, US Version, 2023, Graphite",
                asin: "B0CD9645MM",
                itemUrl:
                    "https://www.amazon.com/SAMSUNG-Unlocked-Smartphone-Processor-Graphite/dp/B0CD9645MM/ref=sr_1_13?dib=eyJ2IjoiMSJ9.GB4b6u1A3aovRYYitJxtGO1bpeL8AlYcCPDKZ0dae7hWb3PPwzN2GJWz2Jtx_i2OGgjMWmyLF1M98xfGRo5x5u0E5Se6TDoi3bOBuQspunMfVC5CLJKrhHX9L0toImIJpcTC6DeRJYiLhpEczCxGoa1qfalKAc8YPXP2JMN3OUC3bzB5SXt2DeVsy2xpBNde5Nkd_cUErJK8HLpTnc1v7lZa4Xzr_apW-4ZFvj0LE1A.hInPuCotpMmLeYk8WJMS0HA8rcFDTGDkVkgHkP8PWd8&dib_tag=se&keywords=samsung&qid=1725957897&sr=8-13",
                keyword: "samsung"
            }
        }
    }
]);

log.info("Starting.");

await crawler.run();

await Dataset.exportToJSON("results");
log.info("Finished.");
