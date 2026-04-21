"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface OcrExtractedItem {
    name: string;
    sku: string;
    quantity: number;
    price: number;
    costPrice: number;
}

export async function processInvoiceOCRAction(base64Image: string, mimeType: string): Promise<{ success: boolean; data?: OcrExtractedItem[]; error?: string }> {
    try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return { success: false, error: "Missing Gemini API Key in .env.local" };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // Using user-verified model endpoint
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `
        You are a generic data extraction AI for a POS & Inventory system. 
        Analyze this supplier invoice image.
        Extract all line items in the invoice into a valid JSON array of objects.
        Do not include any styling, markdown wrappers, or explanation. Only return raw JSON.
        
        Mandatory Schema for each object in the array:
        [
            {
                "name": "Product Name",
                "sku": "Guess a short unique 5-8 char SKU or use the one on the invoice",
                "quantity": 10,
                "price": 100.00, // Guess retail price if only cost is present, otherwise 0
                "costPrice": 80.00 // The cost per unit listed on the invoice
            }
        ]
        `;

        const imageParts = [
            {
                inlineData: {
                    data: base64Image.split(",")[1] || base64Image, // remove data:image/jpeg;base64, if present
                    mimeType
                }
            }
        ];

        const result = await model.generateContent([prompt, ...imageParts]);
        const responseText = result.response.text();

        // Safely parse JSON even if the AI responds with markdown ```json ... ```
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
        const rawJsonText = jsonMatch ? jsonMatch[1] : responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        const extractedData = JSON.parse(rawJsonText) as OcrExtractedItem[];

        if (!Array.isArray(extractedData)) {
            throw new Error("AI did not return an array.");
        }

        return { success: true, data: extractedData };
    } catch (e: any) {
        console.error("OCR Extraction Error:", e);
        return { success: false, error: e.message || "Failed to parse invoice using AI." };
    }
}
