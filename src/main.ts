// For more information, see https://crawlee.dev/
import { CheerioCrawler, ProxyConfiguration, KeyValueStore, log } from 'crawlee';
import { Actor } from 'apify';
import { router } from './routes.js';
import { Input } from './types.js';

// Grab our keyword from the input
const { keyword = 'iphone' } = await KeyValueStore.getInput<Input>() ?? {};

const crawler = new CheerioCrawler({
    requestHandler: router,

    // If you have access to Apify Proxy, you can use residential proxies and
    // high retry count which helps with blocking
    // If you don't, your local IP address will likely be fine for a few requests if you scrape slowly.
    proxyConfiguration: await Actor.createProxyConfiguration({ countryCode: 'US' }),
    // maxRequestRetries: 10,
});

log.info('Starting.');

await crawler.run([{
    url: `https://www.amazon.com/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=${keyword}`,
    label: 'START'
}]);

log.info('Finished.');
