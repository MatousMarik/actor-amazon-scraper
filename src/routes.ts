// import { writeFile } from "fs";

import { createCheerioRouter, MissingRouteError, Dataset } from "crawlee";

import { LABELS, BASE_URL } from "./constants.js";
import { MyRequest } from "./types.js";

export const router = createCheerioRouter();

router.addDefaultHandler(() => {
    throw new MissingRouteError("Default route reached.");
});

router.addHandler(LABELS.START, async ({ $, log, addRequests }) => {
    log.debug("START route:");
    const products = $(
        'div.s-result-list div[data-asin][data-component-type=s-search-result]:not([data-asin=""])'
    );

    const requests: MyRequest[] = [];
    for (const product of products.slice(0, 1)) {
        const link = $("div[data-cy=title-recipe] a.a-text-normal", product);

        const asin = product.attribs["data-asin"];
        const url = `${BASE_URL}${link.attr("href")}`;
        const title = link.text().trim();

        // console.log(asin, url, title);

        requests.push({
            url,
            label: LABELS.PRODUCT,
            userData: {
                data: {
                    title,
                    asin,
                    itemUrl: url
                }
            }
        });
        // console.log(title);
    }
    log.debug(`Found ${requests.length} products.`);
    await addRequests(requests);
});

router.addHandler(LABELS.PRODUCT, async ({ $, log, request, addRequests }) => {
    const { data } = (request as MyRequest).userData;
    log.debug(`PRODUCT ${data.asin} route:`);
    log.debug(request.loadedUrl);

    const descriptionEl = $("#productDescription");

    // avoid captchas
    if (descriptionEl.length !== 1) {
        const err = new Error(
            "Description element not found (probably captcha)."
        );
        request.pushErrorMessage(err);
        throw err;
    }
    const description = descriptionEl.text().trim();

    await addRequests([
        {
            url: `${BASE_URL}/gp/product/ajax/ref=dp_aod_ALL_mbc?asin=${data.asin}&pc=dp&experienceId=aodAjaxMain`,
            label: LABELS.OFFERS,
            userData: {
                data: {
                    ...data,
                    description
                }
            }
        }
    ]);
});

router.addHandler(LABELS.OFFERS, async ({ $, request, log }) => {
    const { data } = (request as MyRequest).userData;
    log.debug(`OFFERS ${data.asin}:`);

    // pinned offer + offers
    const offerElementList = $("#aod-pinned-offer").add("#aod-offer");

    for (const offerElement of offerElementList) {
        const price = $(".a-price .a-offscreen", offerElement).text().trim();
        const sellerName = $("#aod-offer-soldBy a", offerElement).text().trim();
        await Dataset.pushData({ ...data, price, sellerName });
    }
});
