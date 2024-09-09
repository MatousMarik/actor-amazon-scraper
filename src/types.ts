export interface Input {
    keyword: string;
}
export interface MyRequest {
    url: string;
    label: string;
    userData: {
        data: {
            title: string;
            asin: string;
            itemUrl: string;
            price?: string;
            description?: string;
        };
    };
}
