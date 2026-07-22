"use server";

import { auth } from "@clerk/nextjs/server";
import { processReceiptOcr } from "@/lib/ocr/receiptOcrService";
import { ReceiptOcrResult } from "@/lib/ocr/types";

export interface ServerActionResponse {
  success: boolean;
  data?: ReceiptOcrResult;
  errorCode?: string;
  message?: string;
}

/**
 * Next.js Server Action to parse a receipt image (Base64).
 * Invoked internally by the web application.
 */
export async function scanReceipt(base64Image: string): Promise<ServerActionResponse> {
  console.log("[OCR][SERVER_ACTION] scanReceipt action triggered");

  try {
    // 1. Authenticate user
    const { userId } = await auth();
    if (!userId) {
      console.warn("[OCR][SERVER_ACTION] Authentication - FAIL (Unauthorized Server Action call)");
      return {
        success: false,
        errorCode: "AUTH_FAILURE",
        message: "Unauthorized. Please log in again.",
      };
    }
    console.log(`[OCR][SERVER_ACTION] Authentication - SUCCESS (userId: ${userId})`);

    // 2. Validate payload
    if (!base64Image) {
      console.warn("[OCR][SERVER_ACTION] Image check - FAIL (Missing base64 data)");
      return {
        success: false,
        errorCode: "INVALID_IMAGE",
        message: "Missing image base64 data.",
      };
    }

    // Clean up data prefix if passed
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    if (base64Data.length === 0) {
      console.warn("[OCR][SERVER_ACTION] Image check - FAIL (Empty base64 data payload)");
      return {
        success: false,
        errorCode: "INVALID_IMAGE",
        message: "Empty base64 data payload.",
      };
    }

    // 3. Process image via shared service
    const data = await processReceiptOcr(base64Data, "image/jpeg");
    console.log("[OCR][SERVER_ACTION] scanReceipt - SUCCESS");
    
    return {
      success: true,
      data,
    };
  } catch (err: any) {
    console.error("[OCR][SERVER_ACTION] Error executing scanReceipt action:", err);
    return {
      success: false,
      errorCode: err.message === "Gemini API key is not configured on the server." ? "GEMINI_FAILURE" : "INTERNAL_SERVER_ERROR",
      message: err.message || "Failed to process receipt OCR",
    };
  }
}
