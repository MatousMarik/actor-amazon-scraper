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
    let description = descriptionEl.text().trim();

    // avoid captchas
    // TODO: check rly captcha not missing description
    if (descriptionEl.length !== 1) {
        if ($("form[action*=/errors/validateCaptcha]").length > 0) {
            const err = new Error("Captcha.");
            request.pushErrorMessage(err);
            throw err;
        }
        description = "Description not present.";
    }

    // add price, offer list shows without any price present, when there are no other offers
    const price = $("#buybox .a-price .a-offscreen").text().trim();

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
