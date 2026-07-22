import { GoogleGenerativeAI } from "@google/generative-ai";
import { ReceiptOcrResult } from "./types";

/**
 * Standardizes and validates the JSON output returned by the Gemini model.
 */
function sanitizeAndValidateResult(parsed: any): ReceiptOcrResult {
  if (parsed && parsed.isReceipt === false) {
    throw new Error("NOT_A_RECEIPT");
  }
  const amount = typeof parsed.amount === "number" && !isNaN(parsed.amount) ? parsed.amount : 0;
  const merchant = parsed.merchant && typeof parsed.merchant === "string" ? parsed.merchant.trim() : "Unknown Merchant";
  const date = parsed.date && typeof parsed.date === "string" ? parsed.date.trim() : new Date().toISOString().split("T")[0];
  const description = parsed.description && typeof parsed.description === "string" ? parsed.description.trim() : "Receipt Scan";
  const categoryId = parsed.categoryId && typeof parsed.categoryId === "string" ? parsed.categoryId.trim() : "cat-7";
  const currency = parsed.currency && typeof parsed.currency === "string" ? parsed.currency.trim().toUpperCase() : "INR";
  const gst = typeof parsed.gst === "number" && !isNaN(parsed.gst) ? parsed.gst : undefined;
  const confidence = typeof parsed.confidence === "number" && !isNaN(parsed.confidence) ? parsed.confidence : 0.8;
  
  let lowConfidenceFields: string[] = [];
  if (Array.isArray(parsed.lowConfidenceFields)) {
    lowConfidenceFields = parsed.lowConfidenceFields
      .filter((f: any) => typeof f === "string")
      .map((f: string) => f.trim());
  }

  return {
    amount,
    merchant,
    date,
    description,
    categoryId,
    currency,
    gst,
    confidence,
    lowConfidenceFields,
  };
}

/**
 * Legacy API: Parses a receipt image (Base64).
 */
export async function processReceiptOcr(
  base64Data: string,
  mimeType: string = "image/jpeg"
): Promise<ReceiptOcrResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[OCR][SERVICE] Failed - GEMINI_API_KEY is not configured on the server.");
    throw new Error("Gemini API key is not configured on the server.");
  }

  console.log(`[OCR][SERVICE] Initializing Gemini for Image OCR...`);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const prompt = `
    You are a precise receipt parsing OCR assistant.
    Analyze the attached image and extract the following details into a JSON object:
    1. isReceipt: A boolean value (true or false). Set to true only if the image is a financial transaction receipt, invoice, bill, or ticket showing a purchase. Set to false if the image is of general objects, landscape, a screenshot of a non-financial app/page, general text document, or anything that is clearly not a financial receipt/invoice.
    2. amount: The final total paid amount as a number (float).
    3. merchant: The name of the store, business, or merchant.
    4. date: The date of the transaction in YYYY-MM-DD format (if found, otherwise return the current date: ${new Date().toISOString().split('T')[0]}).
    5. description: A short description of what was purchased (e.g. "Groceries shopping", "Lunch at cafe").
    6. categoryId: Match the purchase to the most appropriate category ID:
       - "cat-2" for Food & Dining (restaurant, cafe, grocery, food delivery)
       - "cat-3" for Rent & Housing (rent, home maintenance, housing)
       - "cat-4" for Utilities (electricity, water, gas, internet, phone bill)
       - "cat-5" for Transportation (gas, Uber, train, parking, taxi)
       - "cat-6" for Entertainment (movies, concerts, subscriptions, gaming)
       - "cat-7" for Shopping (clothes, electronics, general retail, Amazon)
    7. currency: The ISO currency code (e.g. "INR", "USD", "EUR"). Default is "INR".
    8. gst: The tax or GST amount as a number (float) if listed on the receipt, otherwise null or undefined.
    9. confidence: An overall confidence float value between 0.0 and 1.0.
    10. lowConfidenceFields: A string array list of fields (any of "amount", "merchant", "date", "categoryId") where you are uncertain or had to make a guess.
    
    Respond ONLY with a valid JSON object matching this schema. Do not wrap in markdown code blocks. Example response format:
    {
      "isReceipt": true,
      "amount": 1250.00,
      "merchant": "Swiggy",
      "date": "2026-06-17",
      "description": "Lunch at restaurant",
      "categoryId": "cat-2",
      "currency": "INR",
      "gst": 190.84,
      "confidence": 0.95,
      "lowConfidenceFields": []
    }
  `;

  const imageParts = [
    {
      inlineData: {
        data: base64Data,
        mimeType
      }
    }
  ];

  const result = await model.generateContent([prompt, ...imageParts]);
  const responseText = result.response.text().trim();
  const jsonStr = responseText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return sanitizeAndValidateResult(parsed);
  } catch (err: any) {
    if (err.message === "NOT_A_RECEIPT") {
      throw err;
    }
    console.error("[OCR][SERVICE] Failed to parse image response as JSON:", responseText);
    throw new Error("Failed to parse OCR response from Gemini model.");
  }
}

/**
 * Modern API: Parses raw OCR text extracted on-device (no image upload required).
 */
export async function processReceiptTextOcr(text: string): Promise<ReceiptOcrResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[OCR][SERVICE] Failed - GEMINI_API_KEY is not configured on the server.");
    throw new Error("Gemini API key is not configured on the server.");
  }

  console.log(`[OCR][SERVICE] Initializing Gemini for Text OCR parsing...`);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const prompt = `
    You are an expert financial receipt analysis assistant.
    Read the raw receipt OCR text below and extract these fields into a JSON object:
    1. Amount: The final total paid amount as a number (float). Be careful to find the final TOTAL, taking discounts or taxes into account, rather than intermediate subtotals.
    2. Merchant: The name of the store, store name, restaurant, or business.
    3. Date: The transaction date in YYYY-MM-DD format (if found, otherwise return the current date: ${new Date().toISOString().split('T')[0]}).
    4. Description: A short description of the transaction based on items purchased (e.g. "Lunch at Starbucks", "Grocery bill", "Stationery shopping").
    5. CategoryId: Select the category ID that best fits this purchase:
       - "cat-2" for Food & Dining (restaurant, cafe, grocery, food delivery)
       - "cat-3" for Rent & Housing (rent, home maintenance, housing)
       - "cat-4" for Utilities (electricity, water, gas, internet, phone bill)
       - "cat-5" for Transportation (gas, Uber, train, parking, taxi)
       - "cat-6" for Entertainment (movies, concerts, subscriptions like Netflix, gaming)
       - "cat-7" for Shopping (clothes, electronics, general retail, Amazon)
    6. Currency: The ISO 3-letter currency code (e.g. "INR", "USD", "EUR"). If not explicitly visible, default to "INR".
    7. Confidence: A float score between 0.0 and 1.0 representing how confident you are in the accuracy of the overall extraction.
    8. LowConfidenceFields: A string array of fields (containing any of: "amount", "merchant", "date", "categoryId") where the source text was blurry, fragmented, missing, or ambiguous, requiring you to guess or make an educated estimate.

    Respond ONLY with a valid JSON object matching this schema. Do not wrap in markdown code blocks. Example response format:
    {
      "amount": 420.50,
      "merchant": "McDonalds",
      "date": "2026-06-25",
      "description": "Lunch at McDonalds",
      "categoryId": "cat-2",
      "currency": "INR",
      "confidence": 0.90,
      "lowConfidenceFields": []
    }

    Raw Receipt OCR Text:
    """
    ${text}
    """
  `;

  const geminiStartTime = Date.now();
  const result = await model.generateContent([prompt]);
  const responseText = result.response.text().trim();
  
  console.log(`[OCR][SERVICE] Text Gemini parsing completed in ${Date.now() - geminiStartTime}ms`);

  const jsonStr = responseText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return sanitizeAndValidateResult(parsed);
  } catch (err) {
    console.error("[OCR][SERVICE] Failed to parse text response as JSON. Raw text:", responseText);
    throw new Error("Failed to parse OCR response from Gemini model.");
  }
}
