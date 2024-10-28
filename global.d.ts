interface Window {
    PartnersCoupang: {
        G: (config: {
            id: string;
            template: string;
            trackingCode: string;
            width: string;
            height: string;
        }) => void;
    };
}
