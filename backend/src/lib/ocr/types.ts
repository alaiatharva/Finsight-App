export interface ReceiptOcrResult {
  amount: number;
  merchant: string;
  date: string;
  description: string;
  categoryId: string;
  currency: string;
  gst?: number;
  confidence: number;
  lowConfidenceFields: string[];
}
