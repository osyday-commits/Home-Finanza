import { GmailMessageItem } from '../types';
import { getCachedAccessToken } from './driveService';

/**
 * Searches Gmail for financial receipts, subscription notices, and invoices.
 */
export const searchFinancialEmails = async (
  customQuery?: string,
  maxResults: number = 15
): Promise<GmailMessageItem[]> => {
  const token = await getCachedAccessToken();
  if (!token) {
    throw new Error('Google Workspace access token missing. Please sign in with Google.');
  }

  const query = customQuery || 'receipt OR invoice OR statement OR payment OR order OR subscription OR charge';
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;

  const listRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!listRes.ok) {
    const errText = await listRes.text();
    throw new Error(`Failed to search Gmail: ${errText}`);
  }

  const listData = await listRes.json();
  const messages: { id: string; threadId: string }[] = listData.messages || [];

  if (messages.length === 0) {
    return [];
  }

  // Fetch message details in parallel
  const detailsPromises = messages.slice(0, maxResults).map(async (msg) => {
    try {
      const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!msgRes.ok) return null;
      const msgData = await msgRes.json();

      const headers = msgData.payload?.headers || [];
      const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const subject = getHeader('subject') || 'No Subject';
      const from = getHeader('from') || 'Unknown Sender';
      const dateStr = getHeader('date') || new Date().toISOString();
      const snippet = msgData.snippet || '';

      // Intelligent extraction of amount and merchant from subject + snippet
      const combinedText = `${subject} ${snippet}`;
      let extractedAmount: number | undefined;
      const amountMatch = combinedText.match(/\$\s?([0-9]+[0-9,]*\.?[0-9]{0,2})/);
      if (amountMatch && amountMatch[1]) {
        const parsedNum = parseFloat(amountMatch[1].replace(/,/g, ''));
        if (!isNaN(parsedNum) && parsedNum > 0 && parsedNum < 100000) {
          extractedAmount = parsedNum;
        }
      }

      // Extract Clean Merchant name from Sender
      let merchant = from.replace(/<.*?>/, '').replace(/"/g, '').trim();
      if (merchant.includes('@')) {
        merchant = merchant.split('@')[0];
      }

      // Categorize
      let category = 'Everyday';
      const lower = combinedText.toLowerCase();
      if (lower.includes('uber') || lower.includes('lyft') || lower.includes('flight') || lower.includes('gas') || lower.includes('transit')) {
        category = 'Transportation';
      } else if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('apple') || lower.includes('google play') || lower.includes('subscription')) {
        category = 'Subscriptions';
      } else if (lower.includes('amazon') || lower.includes('target') || lower.includes('walmart') || lower.includes('best buy')) {
        category = 'Shopping';
      } else if (lower.includes('restaurant') || lower.includes('doordash') || lower.includes('grubhub') || lower.includes('coffee') || lower.includes('starbucks')) {
        category = 'Food & Dining';
      } else if (lower.includes('utility') || lower.includes('electric') || lower.includes('internet') || lower.includes('water') || lower.includes('insurance')) {
        category = 'Housing & Utilities';
      }

      return {
        id: msg.id,
        threadId: msg.threadId,
        subject,
        from,
        date: dateStr,
        snippet,
        extractedAmount,
        extractedMerchant: merchant,
        extractedCategory: category,
        isFinancial: true
      } as GmailMessageItem;
    } catch (e) {
      console.error('Failed to parse Gmail message', msg.id, e);
      return null;
    }
  });

  const parsedItems = (await Promise.all(detailsPromises)).filter((item): item is GmailMessageItem => item !== null);
  return parsedItems;
};

/**
 * Sends a financial report or transaction summary email on behalf of the user.
 * Note: Must be called only after user confirmation dialog!
 */
export const sendFinancialEmail = async (
  recipient: string,
  subject: string,
  bodyHtml: string
): Promise<{ success: boolean; messageId: string }> => {
  const token = await getCachedAccessToken();
  if (!token) {
    throw new Error('Google Workspace access token missing. Please sign in with Google.');
  }

  // Build standard RFC 2822 email
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const emailLines = [
    `To: ${recipient}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    bodyHtml
  ];
  const rawEmail = emailLines.join('\r\n');

  // Base64url encode
  const encodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: encodedEmail
    })
  });

  if (!sendRes.ok) {
    const errText = await sendRes.text();
    throw new Error(`Failed to send email via Gmail API: ${errText}`);
  }

  const result = await sendRes.json();
  return {
    success: true,
    messageId: result.id
  };
};
