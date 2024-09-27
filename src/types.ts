export interface Input {
    keyword: string;
    useProxy: boolean;
    maxRetries: number;
    skipNoDescription: boolean;
}

export interface Offer {
    title: string;
    asin: string;
    itemUrl: string;
    keyword: string;
    price?: string;
    description?: string;
    sellerName?: string;
}

export interface MyRequest {
    url: string;
    label: string;
    userData: {
        data: Offer;
        skipNoDescription?: boolean;
        noDescription?: boolean;
        productNumberOfRetries?: number;
    };
}

export interface StatsState {
    errors: Record<string, string[]>;
    noDescriptionProducts: string[];
    totalSaved: number;
}
