export interface Input {
    keyword: string;
    useProxy: boolean;
}
export interface MyRequest {
    url: string;
    label: string;
    userData: {
        data: {
            title: string;
            asin: string;
            itemUrl: string;
            keyword: string;
            price?: string;
            description?: string;
        };
    };
}
