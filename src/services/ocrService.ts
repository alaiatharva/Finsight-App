import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface OcrResult {
  amount?: number;
  merchant?: string;
  date?: string;
  description?: string;
  categoryId?: string;
  currency?: string;
  gst?: number;
  confidence?: number;
  lowConfidenceFields?: string[];
}

export type OcrProgressStage =
  | "Preparing image..."
  | "Preprocessing image..."
  | "Encoding to Base64..."
  | "Initializing Gemini..."
  | "Gemini processing..."
  | "Parsing transaction..."
  | "Completed.";

export type OcrErrorType =
  | "NETWORK_TIMEOUT"
  | "AUTH_FAILURE"
  | "INVALID_IMAGE"
  | "NOT_A_RECEIPT"
  | "GEMINI_FAILURE"
  | "JSON_PARSE_ERROR"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_SERVER_ERROR";

export class OcrPipelineError extends Error {
  stage: string;
  errorType: OcrErrorType;
  originalError: any;
  userMessage: string;

  constructor(stage: string, errorType: OcrErrorType, message: string, userMessage: string, originalError?: any) {
    super(`[OCR Pipeline - ${stage}] ${message}`);
    this.name = "OcrPipelineError";
    this.stage = stage;
    this.errorType = errorType;
    this.originalError = originalError;
    this.userMessage = userMessage;
  }
}

// Helper to log structured events safely without printing sensitive text payloads
function logFrontendEvent(stage: string, message: string) {
  console.log(`[OCR][FRONTEND] ${stage} - ${message}`);
}

/**
 * Standardizes and validates the JSON output returned by the Gemini model.
 */
function sanitizeAndValidateResult(parsed: any): OcrResult {
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
 * On-Device Direct Gemini Vision Multimodal Receipt Scanning Pipeline.
 * Performs EXIF corrections, compresses and resizes the image locally,
 * and calls the Google Generative AI Gemini API directly from the mobile client.
 */
export async function scanReceipt(
  imageUri: string,
  token: string | null,
  onProgress?: (stage: OcrProgressStage) => void
): Promise<OcrResult> {
  const startTime = Date.now();
  
  // Phase 1: Image Validation
  onProgress?.("Preparing image...");
  logFrontendEvent("Image Selected", `Uri: ${imageUri}`);

  if (!imageUri) {
    throw new OcrPipelineError(
      "IMAGE_VERIFY",
      "INVALID_IMAGE",
      "No image path specified.",
      "No image was selected. Please choose a receipt photo to scan."
    );
  }

  // Validate file extension (JPEG, PNG, WEBP)
  const lowerUri = imageUri.toLowerCase();
  const validExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  const hasValidExtension = validExtensions.some(ext => lowerUri.endsWith(ext)) || lowerUri.includes("data:image");
  if (!hasValidExtension) {
    throw new OcrPipelineError(
      "IMAGE_VERIFY",
      "INVALID_IMAGE",
      "Unsupported file format.",
      "The selected file type is not supported. Please choose a JPEG, PNG, or WEBP photo."
    );
  }

  // Check file system availability & size
  let fileInfo;
  try {
    fileInfo = await FileSystem.getInfoAsync(imageUri);
  } catch (err) {
    throw new OcrPipelineError(
      "IMAGE_VERIFY",
      "INVALID_IMAGE",
      "Failed to access local file system.",
      "Unable to read the receipt image on this device.",
      err
    );
  }

  if (!fileInfo.exists) {
    throw new OcrPipelineError(
      "IMAGE_VERIFY",
      "INVALID_IMAGE",
      `Image file does not exist at URI: ${imageUri}`,
      "Could not find the receipt photo on your device."
    );
  }

  if (fileInfo.size === 0) {
    throw new OcrPipelineError(
      "IMAGE_VERIFY",
      "INVALID_IMAGE",
      "Selected file size is 0 bytes.",
      "The selected receipt photo is empty or corrupt."
    );
  }

  // Enforce maximum size limit of 5MB before manipulation
  const maxBytes = 5 * 1024 * 1024;
  if (fileInfo.size > maxBytes) {
    throw new OcrPipelineError(
      "IMAGE_VERIFY",
      "INVALID_IMAGE",
      `File size exceeds 5MB limit (${(fileInfo.size / (1024 * 1024)).toFixed(2)}MB).`,
      "The receipt photo is too large. Please choose a smaller photo or crop the receipt image."
    );
  }

  logFrontendEvent("Image Verified", `File validation passed. Size: ${fileInfo.size} bytes`);

  // Phase 2: Preprocessing (EXIF, resizing, intelligent compression)
  onProgress?.("Preprocessing image...");
  logFrontendEvent("Preprocessing", "Resizing and compressing image...");
  
  let processedUri = imageUri;
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1600 } }], // Resize width/height to 1600px max to preserve text clarity while saving memory/data
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );
    processedUri = manipResult.uri;
    logFrontendEvent("Preprocessed", `Successfully preprocessed image. Temporary URI: ${processedUri}`);
  } catch (manipErr: any) {
    console.warn("[OCR] Image manipulation failed, falling back to original image:", manipErr.message);
  }

  // Phase 3: Encode to Base64
  onProgress?.("Encoding to Base64...");
  logFrontendEvent("Encoding", "Converting image to base64 string...");
  let base64Data = "";
  try {
    base64Data = await FileSystem.readAsStringAsync(processedUri, {
      encoding: "base64",
    });
    logFrontendEvent("Encoded", `Successfully converted image to Base64 (length: ${base64Data.length}).`);
  } catch (readErr: any) {
    throw new OcrPipelineError(
      "ENCODE_BASE64",
      "INVALID_IMAGE",
      "Failed to read image as base64 string.",
      "Could not process the receipt image data locally.",
      readErr
    );
  }

  // Phase 4: Initialize Gemini Client
  onProgress?.("Initializing Gemini...");
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new OcrPipelineError(
      "GEMINI_INIT",
      "AUTH_FAILURE",
      "EXPO_PUBLIC_GEMINI_API_KEY is not defined in the environment.",
      "Missing Gemini API Configuration on this device. Please check the app configuration."
    );
  }

  logFrontendEvent("Gemini Init", "Connecting to Gemini Generative AI SDK...");
  
  let parsedResult: OcrResult;
  try {
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
          mimeType: "image/jpeg"
        }
      }
    ];

    onProgress?.("Gemini processing...");
    logFrontendEvent("Gemini Request", "Executing multimodal generateContent call...");
    
    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text().trim();
    
    logFrontendEvent("Gemini Response", "Model generation successful.");
    onProgress?.("Parsing transaction...");

    const parsed = JSON.parse(responseText);
    parsedResult = sanitizeAndValidateResult(parsed);
  } catch (err: any) {
    let errorCode: OcrErrorType = "INTERNAL_SERVER_ERROR";
    let userMsg = "Failed to scan the receipt image via Gemini Vision.";

    if (err.message === "NOT_A_RECEIPT") {
      errorCode = "NOT_A_RECEIPT";
      userMsg = "The uploaded photo does not appear to be a receipt. Please try another image.";
    } else if (err.message?.includes("API key")) {
      errorCode = "AUTH_FAILURE";
      userMsg = "Authentication failed. The Gemini API key configured on this device is invalid.";
    } else if (err instanceof SyntaxError) {
      errorCode = "JSON_PARSE_ERROR";
      userMsg = "The Gemini model returned an invalid response format. Please try again.";
    } else {
      userMsg = err.message || "Failed to parse receipt details.";
    }

    throw new OcrPipelineError(
      "GEMINI_EXTRACT",
      errorCode,
      err.message || "Gemini parsing failed",
      userMsg,
      err
    );
  }

  // Phase 6: Completed
  logFrontendEvent("Transaction Generated", `Merchant: ${parsedResult.merchant}, Amount: ${parsedResult.amount}, GST: ${parsedResult.gst || 0}, LowConfidenceFields: [${parsedResult.lowConfidenceFields?.join(", ") || ""}]`);
  onProgress?.("Completed.");

  console.log(`[OCR] Direct Client Pipeline finished successfully in ${Date.now() - startTime}ms`);
  return parsedResult;
}

// Deprecated compatibility wrapper
export async function processReceiptOcr(
  uri: string,
  onProgress?: (stage: OcrProgressStage) => void
): Promise<OcrResult> {
  console.warn("[OCR][WARN] processReceiptOcr is deprecated. Use scanReceipt directly with auth token.");
  return scanReceipt(uri, null, onProgress);
}
