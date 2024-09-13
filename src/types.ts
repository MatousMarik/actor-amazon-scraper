export interface Input {
    keyword: string;
    useProxy: boolean;
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
    };
}

export interface StatsState {
    errors: Record<string, string[]>;
    totalSaved: number;
}
