import { NextRequest, NextResponse } from 'next/server';
import { getShopBySlug } from '@/lib/db';
import { verifyPin } from '@/lib/crypto';
import { ApiResponse, CashierAuthRequest } from '@/types/loyalty';

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ authorized: boolean; shopName: string }>>> {
  try {
    const body = (await request.json()) as Partial<CashierAuthRequest>;
    const { slug, pin } = body;

    if (!slug || !pin) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PIN', message: 'Shop slug and PIN are required' } },
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

    const isValid = verifyPin(pin, shop.cashierPinHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PIN', message: 'Incorrect 4-digit PIN' } },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { authorized: true, shopName: shop.name },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: errorMessage } },
      { status: 500 }
    );
  }
}
