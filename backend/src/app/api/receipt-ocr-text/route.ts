import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { processReceiptTextOcr } from "@/lib/ocr/receiptOcrService";

export async function POST(req: NextRequest) {
  const routeStartTime = Date.now();
  console.log("[OCR-TEXT][BACKEND] Request Received - POST /api/receipt-ocr-text");

  try {
    // 1. Authenticate using Clerk
    const { userId } = getAuth(req);
    if (!userId) {
      console.warn("[OCR-TEXT][BACKEND] Authentication - FAIL (Unauthorized request)");
      return NextResponse.json(
        { success: false, errorCode: "AUTH_FAILURE", message: "Unauthorized. Please log in again." },
        { status: 401 }
      );
    }
    console.log(`[OCR-TEXT][BACKEND] Authentication - SUCCESS (userId: ${userId})`);

    // 2. Parse request JSON body
    let body: any;
    try {
      body = await req.json();
    } catch (parseErr: any) {
      console.error("[OCR-TEXT][BACKEND] JSON Parse - FAIL (Invalid body request):", parseErr);
      return NextResponse.json(
        { success: false, errorCode: "INVALID_TEXT", message: "Invalid JSON request body payload." },
        { status: 400 }
      );
    }

    const { text } = body;
    if (!text || typeof text !== "string") {
      console.warn("[OCR-TEXT][BACKEND] Text validation - FAIL (Missing or invalid text parameter)");
      return NextResponse.json(
        { success: false, errorCode: "INVALID_TEXT", message: "Missing or invalid 'text' payload parameter." },
        { status: 400 }
      );
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      console.warn("[OCR-TEXT][BACKEND] Text validation - FAIL (Empty text content)");
      return NextResponse.json(
        { success: false, errorCode: "INVALID_TEXT", message: "Extracted receipt text is empty." },
        { status: 400 }
      );
    }

    console.log(`[OCR-TEXT][BACKEND] Text validation - SUCCESS (text length: ${trimmedText.length} chars)`);

    // 3. Process text via shared Gemini OCR service
    const data = await processReceiptTextOcr(trimmedText);

    const totalRouteDuration = Date.now() - routeStartTime;
    console.log(`[OCR-TEXT][BACKEND] Response Returned - SUCCESS (took ${totalRouteDuration}ms)`);

    return NextResponse.json({
      success: true,
      ...data
    });
  } catch (err: any) {
    console.error("[OCR-TEXT][BACKEND] Error executing OCR text request:", err);

    let errorCode = "INTERNAL_SERVER_ERROR";
    let status = 500;

    if (err.message === "Gemini API key is not configured on the server.") {
      errorCode = "GEMINI_FAILURE";
    } else if (err.message === "Failed to parse OCR response from Gemini model.") {
      errorCode = "JSON_PARSE_ERROR";
    }

    return NextResponse.json(
      { success: false, errorCode, message: err.message || "Failed to process receipt OCR text" },
      { status }
    );
  }
}
