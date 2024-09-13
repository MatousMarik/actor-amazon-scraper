import { Actor, log } from 'apify';
import { EventType } from 'crawlee';

import { Offer, StatsState } from './types.js';

export const getCheapestOffer = async (offers: Offer[]) => {
    // Return cheapest offer found in dataset
    // (comparison by price, "" and not "$number.number" omitted)

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

    const asinKey = 'ASINS';

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
            totalSaved: 0,
        };
    }

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

    setErrors(url: string, errorMessage: string) {
        if (!this.state.errors[url]) this.state.errors[url] = [];
        this.state.errors[url].push(errorMessage);
    }

    addSaved() {
        this.state.totalSaved += 1;
    }
}

export const Stats = new StatsCls();
