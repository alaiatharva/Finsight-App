import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      console.warn("[HEALTH][BACKEND] Health check - FAIL (Unauthorized request)");
      return NextResponse.json({
        status: "error",
        errorCode: "AUTH_FAILURE",
        message: "Unauthorized. Please log in again."
      }, {
        status: 401
      });
    }

    return NextResponse.json({
      status: "ok",
      version: "1.0",
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("[HEALTH][BACKEND] Health check route error:", err);
    return NextResponse.json({
      status: "error",
      version: "1.0",
      message: err.message || "Internal server error"
    }, {
      status: 500
    });
  }
}
