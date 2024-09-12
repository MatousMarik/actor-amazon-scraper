// For more information, see https://crawlee.dev/
import { Actor } from 'apify';
import { CheerioCrawler, log } from 'crawlee';

import { BASE_URL, LABELS } from './constants.js';
import { router } from './routes.js';
import { Input } from './types.js';

await Actor.init();

const { keyword = 'iphone', useProxy = false } = (await Actor.getInput<Input>()) ?? {};

// Grab our keyword from the input
// const { keyword = 'iphone', useProxies = 'false' } = (await KeyValueStore.getInput<Input>()) ?? {};

export const dataset = await Actor.openDataset(`offers-${keyword.replace(' ', '-')}`);

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

log.info('Crawler finished.');

const getCheapestOffer = async () => {
    const { items } = await dataset.getData();

    // find lowest price
    const cheapestOffer = items.reduce((cheapest, curr) => {
        const priceStr = curr.price;
        // No price -> 0 would be cheapest price...
        if (priceStr === '') return cheapest;
        // False in case +priceStr -> NaN (price value missing (e. g. 'undeliverable'))
        if (+cheapest.price.slice(1) > +priceStr.slice(1)) return curr;
        return cheapest;
    }, { price: `$${Number.MAX_VALUE}` });

    return cheapestOffer;
};

await Actor.setValue('CHEAPEST_OFFER', await getCheapestOffer());

await Actor.exit();
log.info('Finished.');
