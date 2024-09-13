// For more information, see https://crawlee.dev/
import { Actor } from 'apify';
import { CheerioCrawler, log } from 'crawlee';

import { BASE_URL, LABELS } from './constants.js';
import { errorHandler, router } from './routes.js';
import { Input, Offer } from './types.js';
import { getCheapestOffer, initTracker, Stats } from './utils.js';

await Actor.init();

await Stats.initialize(true);

await initTracker();

const { keyword = 'iphone', useProxy = false } = (await Actor.getInput<Input>()) ?? {};

export const namedDataset = await Actor.openDataset(`offers-${keyword.replace(' ', '-')}`);

const proxyConfiguration = useProxy
    ? await Actor.createProxyConfiguration({
        countryCode: 'US',
        groups: ['RESIDENTIAL'],
    })
    : undefined;

const crawler = new CheerioCrawler({
    requestHandler: router,
    navigationTimeoutSecs: 10,
    proxyConfiguration,
    maxRequestRetries: 50,

    useSessionPool: true,
    sessionPoolOptions: {
        persistStateKey: 'AMAZON-SESSIONS',
        sessionOptions: {
            maxUsageCount: 5,
            maxErrorScore: 1,
        },
    },
    maxConcurrency: 50,
    errorHandler,
});

await crawler.addRequests([
    {
        // TODO: check for other special chars in keyword
        url: `${BASE_URL}/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=${
            keyword.replace(' ', '+')}`,
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

log.info('Crawler finished./\nCalculating cheapest offer.');

await Actor.setValue('CHEAPEST_OFFER', getCheapestOffer((await namedDataset.getData()).items as Offer[]));

await Actor.exit();
log.info('Finished.');
