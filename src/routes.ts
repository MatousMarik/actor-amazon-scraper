import { writeFile } from "fs";

import { createCheerioRouter, MissingRouteError, Dataset } from "crawlee";

import { LABELS, BASE_URL } from "./constants.js";
import { MyRequest } from "./types.js";

export const router = createCheerioRouter();

router.addDefaultHandler(() => {
    throw new MissingRouteError("Default route reached.");
});

router.addHandler(LABELS.START, async ({ $, log, addRequests, request }) => {
    const { keyword } = request.userData;
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
                    title,
                    asin,
                    itemUrl: url,
                    keyword
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
    // check description part loaded
    if (descriptionFeaturesEl.length < 1) {
        if (request.retryCount < (request.maxRetries || 50) - 1) {
            const err = new Error("Description block not found.");
            request.pushErrorMessage(err);
            const html = $.html();
            const timestamp = Date.now();
            writeFile(`htmls/${data.asin}-${timestamp}.html`, html, (e) => {
                if (e) throw e;
                console.log(`The html file has been saved!\nURL: ${request.url}\nLoadedURL: ${request.loadedUrl}`);
            });
            writeFile(`htmls/links-${timestamp}`, `URL: ${request.url}\nLoadedURL: ${request.loadedUrl}`, (e) => {
                if (e) throw e;
                console.log(`Links have been saved!`);
            });
            throw err;
        }
    }

    let description = descriptionFeaturesEl
        .find("#productDescription")
        .text()
        .trim();

    // aplus description feature
    if (description === "") {
        const aplusImages = descriptionFeaturesEl.find(
            "#aplus_feature_div #aplus img"
        );
        log.info("aplus");
        console.log(request.loadedUrl);
        console.log(aplusImages);
        console.log(aplusImages.length);
        console.log("\n\n\n", aplusImages.attr("src"), "\n\n\n");
        description = `aplus${aplusImages.attr("src")?.toString() || ""}`;
    }

    // add default price (offer list has no price present, when there are no other offers)
    let price = $("#buybox .a-price .a-offscreen").text().trim();

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
