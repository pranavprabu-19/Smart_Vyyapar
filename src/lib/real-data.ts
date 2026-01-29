export const REAL_CUSTOMERS = [
    { id: "CUST001", name: "Sri Santhosh Enterprises", location: "Pallavaram, Chennai", lat: 12.9691, lng: 80.1472, balance: 2540, phone: "9876543210" },
    { id: "CUST002", name: "Murugan Stores", location: "Padappai, Chennai", lat: 12.8786, lng: 80.0245, balance: 1490, phone: "9876543211" },
    { id: "CUST003", name: "Balaji Water Supply", location: "Vandalur, Chennai", lat: 12.8916, lng: 80.0811, balance: 2025, phone: "9876543212" },
    { id: "CUST004", name: "Sakthi Murugan Stores", location: "Padappai, Chennai", lat: 12.8790, lng: 80.0250, balance: 165, phone: "9876543213" },
    { id: "CUST005", name: "Sankar Cool Drinks", location: "Padappai, Chennai", lat: 12.8775, lng: 80.0230, balance: 1840, phone: "9876543214" },
    { id: "CUST006", name: "Taj Supermarket", location: "Padappai, Chennai", lat: 12.8795, lng: 80.0260, balance: 765, phone: "9876543215" },
    { id: "CUST007", name: "Sheeba Stores", location: "Manivakkam, Chennai", lat: 12.8996, lng: 80.0536, balance: 590, phone: "9876543216" },
    { id: "CUST008", name: "Spice S Supermarket", location: "Manivakkam, Chennai", lat: 12.9000, lng: 80.0540, balance: 3065, phone: "9876543217" },
    { id: "CUST009", name: "Poonkodi Medicals", location: "Manivakkam, Chennai", lat: 12.8990, lng: 80.0530, balance: 260, phone: "9876543218" },
    { id: "CUST010", name: "RR Snacks", location: "Mudichur, Chennai", lat: 12.9250, lng: 80.0850, balance: 440, phone: "9876543219" },
];

export interface Product {
    sku: string;
    name: string;
    price: number;
    stock: number;
    costPrice?: number;
}

// Real Products Extracted from User Images & Web Search
export const REAL_PRODUCTS: Product[] = [
    // Core Water
    { sku: "BIS-250ML", name: "Bisleri Water 250ml", price: 216, costPrice: 209.53, stock: 1200 }, // Box Price? Assuming image shows box/crate prices.
    { sku: "BIS-500ML", name: "Bisleri Water 500ml", price: 10, stock: 850 }, // Not in list, keeping old
    { sku: "BIS-1L", name: "Bisleri Water 1L", price: 130, costPrice: 114, stock: 900 }, // BISLERI WATER 1 LT
    { sku: "BIS-2L", name: "Bisleri Water 2L", price: 105, costPrice: 87.62, stock: 400 }, // BISLERI WATER 2 LT
    { sku: "BIS-5L", name: "Bisleri Water 5L Jar", price: 60, costPrice: 44.49, stock: 150 }, // BISLERI WATER 5 LT
    { sku: "BIS-10L", name: "Bisleri Water 10L Jar", price: 108, stock: 80 }, // Not in list
    { sku: "BIS-20L", name: "Bisleri Water 20L Jar", price: 90, costPrice: 69, stock: 250 }, // Bisleri Water 20 LT

    // Soft Drinks / Carbonated
    { sku: "BIS-SODA-750", name: "Bisleri Club Soda 750ml", price: 20, stock: 300 }, // Not in list
    { sku: "BIS-POP-ORG-600", name: "Bisleri Pop Orange 600ml", price: 40, stock: 220 }, // Not in list

    // New Items from Image
    { sku: "BIS-BLISS-1L", name: "Bisleri Bliss 1L", price: 175, costPrice: 121.5, stock: 50 },
    { sku: "BIS-1L-BOX", name: "Bisleri Water 1L Box", price: 130, costPrice: 114, stock: 200 }, // Duplicate naming in image?
    { sku: "BIS-1L-ALT", name: "Bisleri Water 1L (Alt)", price: 100, costPrice: 88, stock: 100 },
    { sku: "BIS-2L-BOX", name: "Bisleri Water 2L Box", price: 205, costPrice: 184, stock: 150 },

    { sku: "BIS-250ML-BOX", name: "Bisleri Water 250ml Box", price: 223.60, costPrice: 209.53, stock: 200 },

    { sku: "BIS-300ML", name: "Bisleri Water 300ml", price: 145, costPrice: 121, stock: 180 },
    { sku: "BIS-500ML-BOX", name: "Bisleri Water 500ml Box", price: 165, costPrice: 143, stock: 200 },

    { sku: "BIS-GB-750", name: "Bisleri Water GB-750", price: 1000, costPrice: 504.45, stock: 50 },
    { sku: "BIS-N-300", name: "Bisleri Water N 300ml", price: 60, costPrice: 53, stock: 100 },
    { sku: "BIS-V-500", name: "Bisleri Water V 500ml", price: 480, costPrice: 221, stock: 60 },
    { sku: "BIS-V-1L", name: "Bisleri Water V 1L", price: 235, costPrice: 177.97, stock: 80 },

    // Premium Water
    { sku: "VEDICA-500", name: "Vedica Himalayan Water 500ml", price: 40, stock: 120 },
    { sku: "VEDICA-1L", name: "Vedica Himalayan Water 1L", price: 60, stock: 100 },
];
