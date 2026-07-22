import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { processReceiptOcr } from "@/lib/ocr/receiptOcrService";

export async function POST(req: NextRequest) {
  const routeStartTime = Date.now();
  console.log("[OCR][BACKEND] Request Received - POST /api/receipt-ocr");

  try {
    // 1. Authenticate the request using Clerk
    const { userId } = getAuth(req);
    if (!userId) {
      console.warn("[OCR][BACKEND] Authentication - FAIL (Unauthorized request)");
      return NextResponse.json(
        { success: false, errorCode: "AUTH_FAILURE", message: "Unauthorized. Please log in again." },
        { status: 401 }
      );
    }
    console.log(`[OCR][BACKEND] Authentication - SUCCESS (userId: ${userId})`);

    // 2. Parse content type and parse FormData
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      console.warn("[OCR][BACKEND] Content-Type check - FAIL (Not multipart/form-data)");
      return NextResponse.json(
        { success: false, errorCode: "INVALID_IMAGE", message: "Content-Type must be multipart/form-data." },
        { status: 400 }
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (formErr: any) {
      console.error("[OCR][BACKEND] Failed to parse form data:", formErr);
      return NextResponse.json(
        { success: false, errorCode: "INVALID_IMAGE", message: "Invalid form data payload." },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      console.warn("[OCR][BACKEND] File extraction - FAIL (Missing 'file' field)");
      return NextResponse.json(
        { success: false, errorCode: "INVALID_IMAGE", message: "Missing 'file' field in multipart/form-data upload." },
        { status: 400 }
      );
    }

    // 3. Validate image size (Limit to 5MB)
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      console.warn(`[OCR][BACKEND] File size check - FAIL (${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds 5MB limit)`);
      return NextResponse.json(
        { success: false, errorCode: "INVALID_IMAGE", message: "Selected receipt photo size exceeds 5MB limit." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      console.warn("[OCR][BACKEND] File size check - FAIL (Empty file upload)");
      return NextResponse.json(
        { success: false, errorCode: "INVALID_IMAGE", message: "Empty file payload." },
        { status: 400 }
      );
    }

    // Determine MIME type
    const mimeType = file.type || "image/jpeg";
    console.log(`[OCR][BACKEND] Image validation - SUCCESS (size: ${file.size} bytes, type: ${mimeType})`);

    // 4. Read file binary buffer and convert to Base64
    let base64Data = "";
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      base64Data = buffer.toString("base64");
    } catch (readErr: any) {
      console.error("[OCR][BACKEND] Binary read - FAIL (Failed to read uploaded file buffer):", readErr);
      return NextResponse.json(
        { success: false, errorCode: "INVALID_IMAGE", message: "Failed to process receipt file data on server." },
        { status: 400 }
      );
    }

    // 5. Invoke shared OCR service
    const data = await processReceiptOcr(base64Data, mimeType);

    const totalRouteDuration = Date.now() - routeStartTime;
    console.log(`[OCR][BACKEND] Response Returned - SUCCESS (took ${totalRouteDuration}ms)`);
    
    return NextResponse.json({
      success: true,
      ...data
    });
  } catch (err: any) {
    console.error("[OCR][BACKEND] Error executing OCR request:", err);

    let errorCode = "INTERNAL_SERVER_ERROR";
    let status = 500;

    if (err.message === "NOT_A_RECEIPT") {
      errorCode = "NOT_A_RECEIPT";
      status = 400;
    } else if (err.message === "Gemini API key is not configured on the server.") {
      errorCode = "GEMINI_FAILURE";
    } else if (err.message === "Failed to parse OCR response from Gemini model.") {
      errorCode = "JSON_PARSE_ERROR";
    }

    return NextResponse.json(
      { 
        success: false, 
        errorCode, 
        message: err.message === "NOT_A_RECEIPT" 
          ? "The uploaded photo does not appear to be a receipt. Please try another image." 
          : (err.message || "Failed to process receipt OCR")
      },
      { status }
    );
  }
}
