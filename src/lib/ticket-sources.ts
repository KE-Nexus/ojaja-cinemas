export const SALES_SOURCES = ["Connect", "POS", "Web", "Kiosk", "Mobile App", "Atlas"] as const;
export type SalesSource = (typeof SALES_SOURCES)[number];
