import { NextRequest, NextResponse } from 'next/server';
import { getCustomer, getShopBySlug } from '@/lib/db';
import { normalizePhoneNumber } from '@/lib/phone';
import { ApiResponse, CustomerCardState } from '@/types/loyalty';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<NextResponse<ApiResponse<CustomerCardState>>> {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get('phone');

    if (!rawPhone) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PHONE', message: 'Phone parameter is required' } },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhoneNumber(rawPhone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PHONE', message: 'Invalid phone number format' } },
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

    const customer = await getCustomer(shop.id, normalizedPhone);
    const stampBalance = customer ? customer.stampBalance : 0;
    const lifetimeRewardsClaimed = customer ? customer.lifetimeRewardsClaimed : 0;
    const lastVisitAt = customer ? customer.lastVisitAt : new Date().toISOString();

    const cardState: CustomerCardState = {
      phoneNumber: normalizedPhone,
      stampBalance,
      targetStamps: shop.targetStamps,
      lifetimeRewardsClaimed,
      isRewardUnlocked: stampBalance >= shop.targetStamps,
      rewardDescription: shop.rewardDescription,
      lastVisitAt,
    };

    return NextResponse.json({ success: true, data: cardState });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: errorMessage } },
      { status: 500 }
    );
  }
}
