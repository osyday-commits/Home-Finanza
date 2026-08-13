import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for JSON body parsing (up to 20MB for base64 receipts/statements)
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Helper for lazy Gemini AI instance
  const getGenAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    return new GoogleGenAI({ apiKey });
  };

  // API Route: Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API Route: AI Receipt OCR & Categorization
  app.post('/api/ai/analyze-receipt', async (req, res) => {
    try {
      const { imageBase64, imageMimeType = 'image/jpeg', textContent } = req.body;
      const ai = getGenAI();

      let contents: any[] = [];

      const promptText = `You are a financial AI accountant expert. Analyze this receipt or financial document image or text.
Extract structured financial information into JSON matching this exact structure:
{
  "provider": "Merchant or Store Name",
  "amount": 0.00,
  "date": "YYYY-MM-DD",
  "category": "Everyday" | "Housing" | "Tech & Media" | "Transportation" | "Healthcare" | "Entertainment" | "Income" | "Other",
  "subcategory": "Restaurants" | "Groceries" | "Rent / Mortgage" | "Subscriptions" | "Fuel & Gas" | "Children & Family" | "Utilities" | "Other",
  "type": "Expense" | "Income",
  "description": "Short clean description of items or transaction",
  "items": [
    { "name": "Item Name", "price": 0.00, "qty": 1 }
  ],
  "confidence": 0.95,
  "notes": "Any additional context like tax or payment method",
  "isSubscription": false,
  "frequency": "One Time" | "Weekly" | "Bi-Weekly" | "Monthly" | "Yearly"
}

Ensure the amount is a positive number. If the date is missing, default to current date (2026-08-06).`;

      if (imageBase64) {
        // Remove data URL prefix if provided
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        contents = [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: imageMimeType
            }
          },
          promptText
        ];
      } else if (textContent) {
        contents = [`Text from receipt/statement: ${textContent}\n\n${promptText}`];
      } else {
        return res.status(400).json({ error: 'Either imageBase64 or textContent is required' });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              provider: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              date: { type: Type.STRING },
              category: { type: Type.STRING },
              subcategory: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['Expense', 'Income', 'Transfer'] },
              description: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              notes: { type: Type.STRING },
              isSubscription: { type: Type.BOOLEAN },
              frequency: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    price: { type: Type.NUMBER },
                    qty: { type: Type.NUMBER }
                  },
                  required: ['name', 'price']
                }
              }
            },
            required: ['provider', 'amount', 'date', 'category', 'subcategory', 'type', 'description']
          }
        }
      });

      const extractedText = response.text;
      if (!extractedText) {
        throw new Error('Gemini returned an empty response.');
      }

      const parsedData = JSON.parse(extractedText);
      res.json({ success: true, data: parsedData });
    } catch (err: any) {
      console.error('Receipt AI Analysis Error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to analyze receipt with Gemini AI.'
      });
    }
  });

  // API Route: AI Receipt Extraction for Inventory Products
  app.post('/api/ai/analyze-receipt-inventory', async (req, res) => {
    try {
      const { imageBase64, imageMimeType = 'image/jpeg', textContent } = req.body;
      const ai = getGenAI();

      let contents: any[] = [];
      const promptText = `You are an expert product inventory AI. Analyze this receipt image or receipt text to extract all individual purchased items for product inventory tracking.

Return a JSON object with merchant name, purchase date, total amount, and an array of items:
{
  "merchant": "Store Name",
  "purchaseDate": "YYYY-MM-DD",
  "totalAmount": 0.00,
  "items": [
    {
      "name": "Product Name",
      "category": "Everyday" | "Housing" | "Tech & Media" | "Transportation" | "Healthcare" | "Entertainment" | "Other",
      "subcategory": "Groceries" | "Children & Family" | "Coffee & Snacks" | "Shopping" | "Doctor & Pharmacy" | "Gadgets" | "General",
      "quantity": 1,
      "metric": "Unit" | "Box" | "Can" | "Lt" | "Gallon" | "Pound" | "Kg" | "Oz" | "Bag" | "Pack" | "Bottle" | "Other",
      "unitPrice": 0.00,
      "totalCost": 0.00,
      "location": "Pantry" | "Refrigerator" | "Cabinet" | "Office" | "Drawer" | "General",
      "expirationDate": "YYYY-MM-DD",
      "notes": "Brief detail or brand"
    }
  ]
}

Note: For expirationDate, estimate a realistic date based on item perishability if not printed (e.g. fresh meat 7 days, milk 10 days, canned goods 2 years, dry goods 1 year, electronics N/A). Current date is 2026-08-06. Metric must be one of: "Unit", "Box", "Can", "Lt", "Gallon", "Pound", "Kg", "Oz", "Bag", "Pack", "Bottle", "Other".`;

      if (imageBase64) {
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        contents = [
          { inlineData: { data: cleanBase64, mimeType: imageMimeType } },
          promptText
        ];
      } else if (textContent) {
        contents = [`Receipt text:\n${textContent}\n\n${promptText}`];
      } else {
        return res.status(400).json({ error: 'imageBase64 or textContent is required' });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json({ success: true, data: parsed });
    } catch (err: any) {
      console.error('Inventory Receipt Scan Error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to extract inventory products from receipt.' });
    }
  });

  // API Route: AI Bank Statement Extraction (Batch transactions)
  app.post('/api/ai/analyze-statement', async (req, res) => {
    try {
      const { textContent, imageBase64, mimeType = 'image/png' } = req.body;
      const ai = getGenAI();

      const promptText = `You are a bank statement processing AI. Extract ALL listed transactions from this bank statement into JSON format.
Extract starting balance, ending balance, account name, statement date, and an array of transactions.
Each transaction should contain:
- provider (Merchant/Payer)
- amount (positive number)
- date (YYYY-MM-DD)
- type ("Expense" or "Income")
- category ("Everyday", "Housing", "Tech & Media", "Transportation", "Healthcare", "Entertainment", "Income", "Other")
- subcategory ("Restaurants", "Groceries", "Rent / Mortgage", "Salary", "Subscriptions", "Utilities", "Other")
- description
- isSubscription (boolean)
- frequency ("One Time", "Monthly", "Bi-Weekly", "Yearly")

Respond with JSON:
{
  "accountName": "Checking 4821",
  "statementDate": "2026-08-01",
  "startingBalance": 5000.00,
  "endingBalance": 4850.25,
  "transactions": [
    ...
  ]
}`;

      let contents: any[] = [];
      if (imageBase64) {
        const cleanBase64 = imageBase64.replace(/^data:(image|application)\/\w+;base64,/, '');
        contents = [
          { inlineData: { data: cleanBase64, mimeType } },
          promptText
        ];
      } else {
        contents = [`Bank Statement Content:\n${textContent}\n\n${promptText}`];
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const resultText = response.text || '{}';
      const parsed = JSON.parse(resultText);
      res.json({ success: true, data: parsed });
    } catch (err: any) {
      console.error('Statement Analysis Error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to process bank statement.' });
    }
  });

  // API Route: AI Spending Insights & Projected Savings vs Expense Reports
  app.post('/api/ai/spending-insights', async (req, res) => {
    try {
      const { transactions, accounts, budgets, savingsGoals } = req.body;
      const ai = getGenAI();

      const promptText = `You are an elite personal financial advisor. Analyze the following financial dataset:
Transactions count: ${transactions?.length || 0}
Accounts count: ${accounts?.length || 0}
Budgets: ${JSON.stringify(budgets)}
Savings Goals: ${JSON.stringify(savingsGoals)}

Recent Transactions Sample:
${JSON.stringify(transactions?.slice(0, 15))}

Provide a comprehensive, highly actionable financial intelligence report in JSON format:
{
  "summary": "Short concise executive summary of financial health",
  "totalSpend": 0.00,
  "topSpendingCategory": "Category Name",
  "savingsRate": 28.5,
  "projectedSavingsVsGoal": "Comparison summary of actual monthly net savings vs target goals",
  "recommendations": [
    "Actionable tip 1 to optimize subscriptions or grocery spend",
    "Actionable tip 2 regarding emergency fund or debt reduction",
    "Actionable tip 3 regarding high yield savings allocation"
  ],
  "anomalies": [
    "Notice of unusual expense or spike in specific subcategory"
  ],
  "potentialSavingsMonthly": 150.00
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [promptText],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json({ success: true, data: parsed });
    } catch (err: any) {
      console.error('Spending Insights AI Error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to generate financial insights.' });
    }
  });

  // API Route: Simulated Bank-Grade Live Account Sync
  app.post('/api/bank/sync-live', (req, res) => {
    const { accountId } = req.body;
    // Generate simulated real-time incoming transaction update
    const randomAmount = (Math.random() * 45 + 5).toFixed(2);
    const simulatedTx = {
      id: `TRX-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      type: 'Expense',
      category: 'Everyday',
      subcategory: 'Coffee & Snacks',
      description: 'Artisan Coffee Roasters (Live Sync)',
      amount: parseFloat(randomAmount),
      provider: 'Artisan Coffee',
      frequency: 'One Time',
      month: 'August',
      year: 2026,
      accountId: accountId || 'acc-1',
      status: 'Cleared'
    };

    res.json({
      success: true,
      message: 'Real-time bank API synced successfully.',
      newTransaction: simulatedTx,
      syncedAt: new Date().toISOString()
    });
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
