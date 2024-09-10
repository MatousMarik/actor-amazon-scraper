// For more information, see https://crawlee.dev/
import { Actor } from 'apify';
import { CheerioCrawler, log, Dataset } from 'crawlee';

import { BASE_URL, LABELS } from './constants.js';
import { router } from './routes.js';
import { Input } from './types.js';

await Actor.init();

const { keyword = 'iphone', useProxy = false } = (await Actor.getInput<Input>()) ?? {};

// Grab our keyword from the input
// const { keyword = 'iphone', useProxies = 'false' } = (await KeyValueStore.getInput<Input>()) ?? {};

const proxyConfiguration = useProxy
    ? await Actor.createProxyConfiguration({
        countryCode: 'US',
    })
    : undefined;

const crawler = new CheerioCrawler({
    requestHandler: router,
    navigationTimeoutSecs: 5,
    proxyConfiguration,
    maxRequestRetries: 50,
});

await crawler.addRequests([
    {
        url: `${BASE_URL}/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=${keyword}`,
        label: LABELS.START,
        userData: {
            data: {
                keyword,
            },
        },
    },
]);

log.info('Starting.');

await crawler.run();

await Dataset.exportToJSON('results');
await Actor.pushData(Dataset.getData());

await Actor.exit();
log.info('Finished.');
