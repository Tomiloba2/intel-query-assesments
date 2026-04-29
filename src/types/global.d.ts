export { }

declare global {
    interface TGenderize {
        count: number;
        name: string;
        gender: string;
        probability: number
    }
    interface TAgify {
        count: number;
        name: string;
        age: number
    }
    interface TNationalize {
        count: number;
        name: string;
        country: {
            country_id: string;
            probability: number
        }[]
    }

}