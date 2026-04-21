export interface Suggestion {
    productId: string;
    productName: string;
    confidence: number;  // 0-100, "how often this pair appears together"
    lift: number;        // >1 = genuinely related, not just popular
}

export interface RecommendationResponse {
    suggestions: Suggestion[];
}
