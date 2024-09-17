import { CheerioCrawlingContext, createCheerioRouter, Dataset, MissingRouteError } from 'crawlee';

import { LABELS, BASE_URL, OFFER_REL_URL } from './constants.js';
// import { namedDataset } from './main.js';
import { MyRequest } from './types.js';
import { addASINToTracker, Stats } from './utils.js';

export const router = createCheerioRouter();

router.addDefaultHandler(() => {
    throw new MissingRouteError('Default route reached.');
});

router.addHandler(LABELS.START, async ({ $, log, addRequests, request }) => {
    const { data } = (request as MyRequest).userData;
    log.debug('START route:');
    // TODO: captcha check (now fails naturally)
    const products = $(
        'div.s-result-list div[data-asin][data-component-type=s-search-result]:not([data-asin=""])',
    );

    const requests: MyRequest[] = [];
    for (const product of products) {
        const link = $('div[data-cy=title-recipe] a.a-text-normal', product);

        const asin = product.attribs['data-asin'];
        const url = `${BASE_URL}${link.attr('href')}`;
        const title = link.text().trim();

        addASINToTracker(asin);

        requests.push({
            url,
            label: LABELS.PRODUCT,
            userData: {
                data: {
                    ...data,
                    title,
                    asin,
                    itemUrl: url,
                },
            },
        });
    }
    log.debug(`Found ${requests.length} products.`);
    await addRequests(requests);
});

router.addHandler(LABELS.PRODUCT, async ({ $, log, request, addRequests }) => {
    const { data } = (request as MyRequest).userData;
    log.debug(`PRODUCT ${data.asin} route:`);
    log.debug(request.loadedUrl);

    // captcha
    if ($('form[action*=/errors/validateCaptcha]').length > 0) {
        const err = new Error('Captcha.');
        throw err;
    }

    // add default price (offer list might have no price present, when there are no other offers)
    let price = $('#corePrice_desktop .apexPriceToPay .a-offscreen')
        .first()
        .text()
        .trim();

    // another default price selector
    if (price === '') {
        price = $('.priceToPay').text().trim();

        if (price === '') {
            if (('#outOfStockBuyBox_feature_div').length > 0) {
                // out of stock -> no offer for location
                price = 'undeliverable';
            }
            price = 'not found';
        }
    }

    let description = 'not found';

    const descriptionFeaturesEl = $('#btf_arenas');
    // check description part present
    if (descriptionFeaturesEl.length < 1) {
        // TODO: not sure why sometimes description is missing, when I load link in browser
        // it is always loaded fully by single request

        // fill request with default found values, flag noDescription and retry
        request.userData.data = {
            ...data,
            price,
            description,
        };
        request.userData.noDescription = true;
        const err = new Error('Description block not found.');
        throw err;
    }

    description = descriptionFeaturesEl
        .find('#productDescription')
        .text()
        .trim();

    if (description === '') {
        const aplus = descriptionFeaturesEl.find('#aplus_feature_div #aplus');
        if (aplus.length > 1) {
            // TODO: scrape images links?
            description = 'aplus';
        } else {
            description = 'not found';
        }
    }

    await addRequests([
        {
            url: `${BASE_URL}${OFFER_REL_URL}${data.asin}`,
            label: LABELS.OFFERS,
            userData: {
                data: {
                    ...data,
                    price,
                    description,
                },
                productNumberOfRetries: request.retryCount,
            },
        },
    ]);
});

router.addHandler(LABELS.OFFERS, async ({ $, request, log, crawler }) => {
    const { data } = (request as MyRequest).userData;
    log.debug(`OFFERS ${data.asin}:`);

    // pinned offer + offers
    const offerElementList = $('#aod-pinned-offer').add('#aod-offer');

    for (const offerElement of offerElementList) {
        const price = $('.a-price .a-offscreen', offerElement)
            .first() // avoid selecting discount
            .text()
            .trim() || data.price; // if no price present use default
        const sellerName = $('#aod-offer-soldBy [aria-label]', offerElement)
            .text()
            .trim();

        // TODO: don't know why seller is not found but in such case only one result is added
        // do fail request hack again?
        if (sellerName === '' && request.retryCount < (request.maxRetries || 50) / 2) throw new Error('No seller found.');
        const offer = {
            ...data,
            price,
            sellerName,
            dateHandled: request.handledAt || new Date().toISOString(),
            numberOfRetries: +request.userData.productNumberOfRetries + request.retryCount,
            currentPendingRequests: (await crawler.requestQueue?.getInfo())?.pendingRequestCount,
        };

        // await namedDataset.pushData(offer);
        await Dataset.pushData(offer);

        addASINToTracker(offer.asin);
        Stats.addSaved();
    }
});

export const errorHandler = async ({ request }: CheerioCrawlingContext, error: Error) => {
    Stats.addError(request.url, error.message);
};

/**
 * For failed product request with reason missing description scrape offers anyway.
 */
export const failedRequestHandler = async ({ request, addRequests }: CheerioCrawlingContext) => {
    if (request.label !== LABELS.PRODUCT || !request.userData.noDescription) {
        return;
    }

    // handle missing description product
    const { data } = (request as MyRequest).userData;
    Stats.addNoDescProduct(data.asin);
    await addRequests([
        {
            url: `${BASE_URL}${OFFER_REL_URL}${data.asin}`,
            label: LABELS.OFFERS,
            userData: {
                data: {
                    ...data,
                },
                productNumberOfRetries: request.retryCount,
            },
        },
    ]);
};
