export interface Input {
    keyword: string;
    useProxies: boolean;
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
