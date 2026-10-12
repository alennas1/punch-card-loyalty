import { NextRequest, NextResponse } from 'next/server';
import { getRecentTransactions, getShopBySlug } from '@/lib/db';
import { verifyPin } from '@/lib/crypto';
import { ApiResponse, TransactionRecord } from '@/types/loyalty';

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Array<TransactionRecord & { phoneNumber: string }>>>> {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const pin = searchParams.get('pin');

    if (!slug || !pin) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PIN', message: 'Slug and PIN query parameters are required' } },
        { status: 400 }
      );
    }

    const shop = await getShopBySlug(slug);
    if (!shop) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Shop '${slug}' not found` } },
        { status: 404 }
      );
    }

    const isPinValid = verifyPin(pin, shop.cashierPinHash);
    if (!isPinValid) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized: Invalid Cashier PIN' } },
        { status: 401 }
      );
    }

    const transactions = await getRecentTransactions(shop.id, 8);
    return NextResponse.json({ success: true, data: transactions });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: errorMessage } },
      { status: 500 }
    );
  }
}
