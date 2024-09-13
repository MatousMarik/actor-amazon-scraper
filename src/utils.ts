import { Actor, log } from 'apify';

import { Offer } from './types.js';

export const getCheapestOffer = async (offers: Offer[]) => {
    // Return cheapest offer found in dataset
    // (comparison by price, "" and not "$number.number" ommited)

    const dummyOffer: Offer = {
        title: 'Dummy Offer',
        asin: 'dummy',
        itemUrl: '',
        keyword: 'dummy',
        price: `$${Number.MAX_VALUE}`,
    };

    // find lowest price item
    const cheapestOffer = offers.reduce((cheapest, curr) => {
        const priceStr = curr.price || '';
        // No price -> 0 would be cheapest price...
        if (priceStr === '') return cheapest;
        // False in case +priceStr -> NaN (price value missing (e. g. 'undeliverable'))
        if (+cheapest.price!.slice(1) > +priceStr.slice(1)) return curr;
        return cheapest;
    }, dummyOffer);

    if (cheapestOffer === dummyOffer) return null;
    return cheapestOffer;
};
const getASINTrackerUpdateFunc = async () => {
    const state: Record<string, number> = {};
    Actor.on('persistState', async () => {
        log.info(`SAVING STATE: ${state}`);
        await Actor.setValue('ASINS', state);
    });
    const addASIN = (asin: string) => {
        if (state[asin] === undefined) {
            state[asin] = 0;
            return;
        }
        state[asin] += 1;
    };
    return addASIN;
};

export const addASINToTracker = await getASINTrackerUpdateFunc();
