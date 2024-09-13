// For more information, see https://crawlee.dev/
import { Actor } from 'apify';
import { CheerioCrawler, EventType, log } from 'crawlee';

import { BASE_URL, LABELS } from './constants.js';
import { router } from './routes.js';
import { Input, Offer } from './types.js';
import { getCheapestOffer, initTracker } from './utils.js';

await Actor.init();

await initTracker();

Actor.on(EventType.PERSIST_STATE, async () => {
    log.info(`SAVING TEST:`);
    await Actor.setValue('TEST', { blob: 10 });
    await Actor.setValue('TEST_RECORD', { blob: 10 } as Record<string, number>);
});

Actor.on(EventType.EXIT, async () => {
    log.info(`SAVING TEST EXIT:`);
    await Actor.setValue('TEST_EXIT', { blob: 10 });
});

const { keyword = 'iphone', useProxy = false } = (await Actor.getInput<Input>()) ?? {};

export const namedDataset = await Actor.openDataset(`offers-${keyword.replace(' ', '-')}`);

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

await Actor.setValue('CHEAPEST_OFFER', await getCheapestOffer((await namedDataset.getData()).items as Offer[]));

await Actor.exit();
log.info('Finished.');
