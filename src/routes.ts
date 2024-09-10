import { createCheerioRouter, MissingRouteError, Dataset } from "crawlee";

import { LABELS, BASE_URL } from "./constants.js";
import { MyRequest } from "./types.js";

export const router = createCheerioRouter();

router.addDefaultHandler(() => {
    throw new MissingRouteError("Default route reached.");
});

router.addHandler(LABELS.START, async ({ $, log, addRequests, request }) => {
    const { data } = (request as MyRequest).userData;
    log.debug("START route:");
    // TODO: captcha check (now fails naturally)
    const products = $(
        'div.s-result-list div[data-asin][data-component-type=s-search-result]:not([data-asin=""])'
    );

    const requests: MyRequest[] = [];
    for (const product of products) {
        const link = $("div[data-cy=title-recipe] a.a-text-normal", product);

        const asin = product.attribs["data-asin"];
        const url = `${BASE_URL}${link.attr("href")}`;
        const title = link.text().trim();

        requests.push({
            url,
            label: LABELS.PRODUCT,
            userData: {
                data: {
                    ...data,
                    title,
                    asin,
                    itemUrl: url
                }
            }
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
    if ($("form[action*=/errors/validateCaptcha]").length > 0) {
        const err = new Error("Captcha.");
        request.pushErrorMessage(err);
        throw err;
    }

    const descriptionFeaturesEl = $("#btf_arenas");
    // // check description part present
    // if (descriptionFeaturesEl.length < 1) {
    //     if (request.retryCount < (request.maxRetries || 50)) {
    //         const err = new Error("Description block not found.");
    //         request.pushErrorMessage(err);
    //         throw err;
    //     }
    // }

    let description = descriptionFeaturesEl
        .find("#productDescription")
        .text()
        .trim();

    // aplus description feature
    if (description === "") {
        // description = descriptionFeaturesEl
        //     .find("#aplus_feature_div #aplus")
        //     .text()
        //     .trim();
        description = "aplus";
    }

    // add default price (offer list has no price present, when there are no other offers)
    let price = $("#corePrice_desktop .apexPriceToPay .a-offscreen")
        .text()
        .trim();

    if (price === "" && $("#outOfStockBuyBox_feature_div").length > 0) {
        // out of stock -> no offer
        price = "out-of-stock";
    }

    await addRequests([
        {
            url: `${BASE_URL}/gp/product/ajax/ref=dp_aod_ALL_mbc?asin=${data.asin}&pc=dp&experienceId=aodAjaxMain`,
            label: LABELS.OFFERS,
            userData: {
                data: {
                    ...data,
                    price,
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
        const price =
            $(".a-price .a-offscreen", offerElement)
                .first() // avoid selecting discount
                .text()
                .trim() || data.price; // if no price present use default
        const sellerName = $("#aod-offer-soldBy [aria-label]", offerElement)
            .text()
            .trim();
        await Dataset.pushData({ ...data, price, sellerName });
    }
});
