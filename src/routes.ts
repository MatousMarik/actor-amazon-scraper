import { createCheerioRouter, MissingRouteError } from "crawlee";

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

        // TODO: sponsored?

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
        // if (true) break;
    }
    log.debug(`Found ${requests.length} products.`);
    await addRequests(requests);
});

router.addHandler(LABELS.PRODUCT, async ({ $, log, request, addRequests }) => {
    const { data } = (request as MyRequest).userData;
    log.info(`PRODUCT ${data.asin} route:`);
    console.log(request.loadedUrl);

    const descriptionEl = $('#productDescription');

    // console.log("RETRY COUNT: ", request.retryCount);
    console.log(descriptionEl.length);
    // console.log(descriptionEl);

    // avoid captchas
    if (descriptionEl.length !== 1) {
        const err = new Error('Description element not found (probably captcha).');
        request.pushErrorMessage(err);
        throw err;
    }
    const description = descriptionEl.text().trim();
    
    console.log("Description: \n", description);
    
    // const html = $.html();
    // writeFile("p.html", html, (err) => {
    //     if (err) throw err;
    //     console.log('The file has been saved!');
    //   });

    await addRequests([{
        url: `${BASE_URL}/gp/product/ajax/ref=dp_aod_ALL_mbc?asin=${data.asin}&pc=dp&experienceId=aodAjaxMain`,
        label: LABELS.OFFERS,
        userData: {
            data: {
                ...data,
                description
            }
        }
    }]);
});
