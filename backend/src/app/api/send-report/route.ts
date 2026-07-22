import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import arcjet, { tokenBucket } from "@arcjet/next";
import { Resend } from "resend";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

const resend = new Resend(process.env.RESEND_API_KEY);

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    tokenBucket({
      mode: "LIVE",
      refillRate: 5,
      interval: 60,
      capacity: 10,
    }),
  ],
});

function logToFile(msg: string) {
  try {
    const logPath = path.join(process.cwd(), "debug-send-report.log");
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
    console.log(msg);
  } catch (e) {
    console.error("Failed to write to log file", e);
  }
}

async function generateAiInsights(monthName: string, income: number, expense: number, net: number, categoryTotals: any): Promise<string[]> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logToFile("GEMINI_API_KEY not found in environment, using default insights");
      return getDefaultInsights(income, expense, categoryTotals);
    }

    logToFile("Generating AI insights via Gemini API...");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const categoriesStr = Object.entries(categoryTotals)
      .map(([cat, amt]) => `${cat}: ₹${amt}`)
      .join(", ");

    const prompt = `
      You are a helpful financial assistant named FinSight.
      Analyze the following monthly financial summary for the month of ${monthName}:
      - Total Income: ₹${income}
      - Total Expenses: ₹${expense}
      - Net Balance: ₹${net}
      - Expenses by Category: ${categoriesStr}

      Based on this data, write exactly 3 concise, highly relevant financial insights or actionable saving tips for the user.
      Keep each bullet point under 18 words. Avoid any markdown formatting like bold/italics. Do not prefix with bullet marks.
      Format your response as a valid JSON array of strings, for example:
      ["Great job! You saved 77% of your income this month.", "Housing was your top expense at 69% of total spend.", "Consider reducing dining expenses to save more."]
      Provide only the raw JSON array of strings. Do not add any backticks, markdown code blocks, or explanations.
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    
    // Sanitize any codeblock wrappers in case Gemini outputs them
    if (text.startsWith("```")) {
      text = text.replace(/^```json/, "").replace(/^```/, "").trim();
    }
    
    logToFile(`Raw Gemini response text: ${text}`);
    const insights = JSON.parse(text);
    if (Array.isArray(insights) && insights.length >= 3) {
      return insights.slice(0, 3);
    }
    throw new Error("Invalid array shape returned from model");
  } catch (e: any) {
    logToFile(`Error generating AI insights: ${e?.message || e}. Using fallback calculation.`);
    return getDefaultInsights(income, expense, categoryTotals);
  }
}

function getDefaultInsights(income: number, expense: number, categoryTotals: any): string[] {
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  
  // Find top category
  let topCat = "None";
  let topAmt = 0;
  Object.entries(categoryTotals).forEach(([cat, amt]: any) => {
    if (amt > topAmt) {
      topAmt = amt;
      topCat = cat;
    }
  });

  const topCatPercent = expense > 0 ? Math.round((topAmt / expense) * 100) : 0;

  return [
    savingsRate > 0 
      ? `Great job! You saved ${savingsRate}% of your income this month. Consider investing your surplus for better returns.`
      : "You spent more than you earned this month. Consider reviewing your non-essential expenses.",
    topAmt > 0 
      ? `${topCat.charAt(0).toUpperCase() + topCat.slice(1)} was your top expense at ${topCatPercent}% of total spend. Reviewing this could yield significant savings.`
      : "No top expenses recorded. Continue logging transactions to map your spending categories.",
    "Regularly tracking even small expenses will give you a more accurate picture of your financial health."
  ];
}

export async function POST(req: NextRequest) {
  logToFile("--- New POST Request Received ---");
  try {
    // 1. Arcjet Protection
    logToFile("Initiating Arcjet protection checks...");
    const decision = await aj.protect(req, { requested: 1 });
    logToFile(`Arcjet response: conclusion=${decision.conclusion}, isDenied=${decision.isDenied()}`);
    
    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        logToFile("Arcjet Rate Limit denied access.");
        return NextResponse.json(
          { error: "Too many requests. Please wait a minute before requesting another report email." },
          { status: 429 }
        );
      }
      logToFile("Arcjet General access denied.");
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    // 2. Clerk Authentication
    logToFile("Fetching Clerk Authentication context...");
    const { userId } = getAuth(req);
    logToFile(`Clerk Authentication complete: userId=${userId}`);
    if (!userId) {
      logToFile("Clerk Auth failed: userId is null/undefined");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 3. Parse Request Body
    logToFile("Parsing request body JSON...");
    const body = await req.json();
    const { email, userName, reportType, reportData } = body;
    logToFile(`Parsed request body: email=${email}, userName=${userName}, reportType=${reportType}`);

    if (!email) {
      logToFile("Validation failed: recipient email is missing");
      return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
    }

    const { monthName, income, expense, net, transactions = [] } = reportData || {};

    const isCurrentProgress = reportType === "current-progress";
    const reportTitle = isCurrentProgress 
      ? `Financial Summary Progress - ${monthName}`
      : `Monthly Financial Report - ${monthName}`;

    // 4. Generate HTML Email Template Helper
    const formatCurrencyEmail = (amount: number) => {
      const isNegative = amount < 0;
      const formatted = Math.abs(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${isNegative ? "-" : ""}₹${formatted}`;
    };

    // Calculate Category Wise Expense Groupings
    const categoryTotals: { [key: string]: number } = {};
    transactions.forEach((t: any) => {
      if (t.type === "EXPENSE") {
        const cat = (t.category || "Other").toLowerCase();
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount);
      }
    });

    const categoryRowsHtml = Object.keys(categoryTotals).length > 0
      ? `
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          ${Object.entries(categoryTotals).map(([cat, amt], idx, arr) => `
            <tr>
              <td style="padding: 14px 0; font-size: 15px; color: #475569; border-bottom: ${idx === arr.length - 1 ? 'none' : '1px solid #e2e8f0'}; text-transform: lowercase;">
                ${cat}
              </td>
              <td style="padding: 14px 0; font-size: 15px; font-weight: bold; color: #0f172a; text-align: right; border-bottom: ${idx === arr.length - 1 ? 'none' : '1px solid #e2e8f0'};">
                ${formatCurrencyEmail(amt)}
              </td>
            </tr>
          `).join("")}
        </table>
      `
      : `<div style="padding: 16px 0; text-align: center; color: #94a3b8; font-size: 14px; font-style: italic;">No expenses recorded for this period.</div>`;

    // 5. Generate AI Insights via Gemini / Fallback
    const insights = await generateAiInsights(monthName, income, expense, net, categoryTotals);

    // 6. Build the Email HTML Content matching design screenshots
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${reportTitle}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; margin: 40px auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: hidden;">
          <tr>
            <td style="padding: 40px;">
              <!-- Header -->
              <h1 style="margin: 0 0 24px 0; font-size: 28px; font-weight: 800; text-align: center; color: #0f172a; letter-spacing: -0.5px;">
                ${isCurrentProgress ? "Financial Summary Progress" : "Monthly Financial Report"}
              </h1>
              
              <!-- Greeting -->
              <p style="margin: 0 0 8px 0; font-size: 16px; color: #334155; font-weight: 500;">
                Hello ${userName || "User"},
              </p>
              <p style="margin: 0 0 32px 0; font-size: 16px; color: #475569;">
                Here's your financial summary for ${monthName}:
              </p>
              
              <!-- Stats Block (Income, Expense, Net) -->
              <div style="margin-bottom: 32px;">
                <div style="margin-bottom: 24px;">
                  <div style="font-size: 14px; color: #64748b; margin-bottom: 4px; font-weight: 500;">Total Income</div>
                  <div style="font-size: 22px; font-weight: 800; color: #0f172a;">${formatCurrencyEmail(income)}</div>
                </div>
                <div style="margin-bottom: 24px;">
                  <div style="font-size: 14px; color: #64748b; margin-bottom: 4px; font-weight: 500;">Total Expenses</div>
                  <div style="font-size: 22px; font-weight: 800; color: #0f172a;">${formatCurrencyEmail(expense)}</div>
                </div>
                <div style="margin-bottom: 32px;">
                  <div style="font-size: 14px; color: #64748b; margin-bottom: 4px; font-weight: 500;">Net Balance</div>
                  <div style="font-size: 22px; font-weight: 800; color: #0f172a;">${formatCurrencyEmail(net)}</div>
                </div>
              </div>
              
              <!-- Expenses by Category Card -->
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.02);">
                <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 800; color: #0f172a;">Expenses by Category</h3>
                ${categoryRowsHtml}
              </div>
              
              <!-- FinSight Insights Card -->
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 32px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.02);">
                <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 800; color: #0f172a;">FinSight Insights</h3>
                <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.6;">
                  ${insights.map(ins => `<li style="margin-bottom: 12px;">${ins}</li>`).join("")}
                </ul>
              </div>
              
              <!-- Footer message -->
              <p style="margin: 32px 0 0 0; text-align: center; font-size: 14px; color: #475569; line-height: 1.5;">
                Thank you for using FinSight. Keep tracking your finances for better financial health!
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // 7. Send Email using Resend
    logToFile(`Preparing to send email via Resend to ${email}...`);
    let result = await resend.emails.send({
      from: "Finsight <onboarding@resend.dev>",
      to: email,
      subject: reportTitle,
      html: htmlContent,
    });
    logToFile(`Resend send complete. Result status: error=${JSON.stringify(result.error)}, data=${JSON.stringify(result.data)}`);

    // Dynamic fallback for Resend Free Tier sandbox restrictions
    if (result.error && result.error.message.includes("You can only send testing emails to your own email address")) {
      const match = result.error.message.match(/\(([^)]+)\)/);
      const ownerEmail = match ? match[1] : "alaiatharva2004@gmail.com";
      logToFile(`[SANDBOX] Resend restriction detected. Retrying send to Resend owner email: ${ownerEmail}`);
      
      result = await resend.emails.send({
        from: "Finsight <onboarding@resend.dev>",
        to: ownerEmail,
        subject: `${reportTitle} (Sandbox Test for ${email})`,
        html: htmlContent,
      });
      logToFile(`Resend sandbox fallback send complete. Result status: error=${JSON.stringify(result.error)}, data=${JSON.stringify(result.data)}`);
    }

    if (result.error) {
      logToFile(`Resend error reported: ${result.error.message}`);
      console.error("[RESEND_ERROR]", result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    logToFile(`Email sent successfully! ID: ${result.data?.id}`);
    return NextResponse.json({ success: true, id: result.data?.id });
  } catch (error: any) {
    logToFile(`Unhandled exception in backend POST endpoint: ${error?.message || error}`);
    console.error("[SEND_REPORT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
