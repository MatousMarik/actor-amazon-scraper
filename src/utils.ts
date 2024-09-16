import { Actor, log } from 'apify';
import { EventType } from 'crawlee';

import { Offer, StatsState } from './types.js';

/**
 * Return the cheapest offer from the array.
 *
 * Offers are compared by price property of value "$number"
 * (offers with invalid price values are skipped)
 */
export const getCheapestOffer = (offers: Offer[]) => {
    // Comparison by price -> string "$number"

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

/**
 * ASIN Tracker closure functions:
 * - initTracker: Initialize Tracker state by KVStore 'ASINS' and set it to run on persistState events.
 * - addASIN: Add ASIN to the state (first addition sets count to 0)
 * @returns \{ initTracker: () => Promise<void>; addASIN: (asin: string) => void }
 */
const getASINTrackerUpdateFunc = async () => {
    const state: Record<string, number> = {};

    const asinKey = 'ASINS';

    /**
     * Initialize Tracker state by KVStore 'ASINS' and set it to run on persistState events.
     */
    const initTracker = async () => {
        const initValue = await Actor.getValue(asinKey);
        if (initValue) {
            Object.entries(initValue).forEach(([key, value]) => {
                state[key] = +value;
            });
        }

        Actor.on(EventType.PERSIST_STATE, async () => {
            log.debug(`SAVING STATE: ${state}`);
            await Actor.setValue(asinKey, state);
        });
        log.debug('Tracker initialized');
    };

    /**
     * Add ASIN to the state
     * (first addition sets count to 0)
     * @param {string} asin - Product ASIN Id
     */
    const addASIN = (asin: string) => {
        log.debug(`Adding asin "${asin}" to tracker.`);
        if (state[asin] === undefined) {
            state[asin] = 0;
            return;
        }
        state[asin] += 1;
    };
    return { initTracker, addASIN };
};

export const { initTracker, addASIN: addASINToTracker } = await getASINTrackerUpdateFunc();

class StatsCls {
    logStats: boolean;
    state: StatsState;

    constructor() {
        this.logStats = false;
        this.state = {
            errors: {},
            noDescriptionProducts: [],
            totalSaved: 0,
        };
    }

    /**
     * Initialize Stats state by KVStore 'STATS' and set it to run on persistState events.
     * @param logStats - log.info stats each 10 seconds
     */
    async initialize(logStats: boolean = false) {
        this.logStats = logStats;
        const statsKey = 'STATS';
        const state = (await Actor.getValue(statsKey)) as StatsState;
        if (state) {
            Object.entries(state.errors).forEach(([key, value]) => {
                this.state.errors[key] = value;
            });
            this.state.totalSaved = state.totalSaved;
        }

        Actor.on(EventType.PERSIST_STATE, async () => {
            await Actor.setValue(statsKey, this.state);
        });

        if (this.logStats) setInterval(() => log.info('STATS state', this.state), 10000);
    }

    /**
     * Add error for url request to stats.
     * @param url error handled request url
     */
    addError(url: string, errorMessage: string) {
        if (!this.state.errors[url]) this.state.errors[url] = [];
        this.state.errors[url].push(errorMessage);
    }

    /**
     * Add product asin, whose description was not found during all retries, to the state.
     * @param asin asin of the product.
     */
    addNoDescProduct(asin: string) {
        this.state.noDescriptionProducts.push(asin);
    }

    /**
     * Inc totalSaved counter.
     */
    addSaved() {
        this.state.totalSaved += 1;
    }
}

/**
 * Stats logger and tracker instance.
 * Has to be initialized by .initialize().
 */
export const Stats = new StatsCls();
