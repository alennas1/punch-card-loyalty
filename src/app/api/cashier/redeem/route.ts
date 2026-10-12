import { NextRequest, NextResponse } from 'next/server';
import { getCustomer, getShopBySlug, redeemReward } from '@/lib/db';
import { verifyPin } from '@/lib/crypto';
import { normalizePhoneNumber } from '@/lib/phone';
import { ApiResponse, CustomerCardState, RedeemActionRequest } from '@/types/loyalty';

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<CustomerCardState>>> {
  try {
    const body = (await request.json()) as Partial<RedeemActionRequest>;
    const { slug, pin, phoneNumber } = body;

    if (!slug || !pin || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PIN', message: 'Slug, PIN, and phone number are required' } },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
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

    const isPinValid = verifyPin(pin, shop.cashierPinHash);
    if (!isPinValid) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized: Invalid Cashier PIN' } },
        { status: 401 }
      );
    }

    const existingCustomer = await getCustomer(shop.id, normalizedPhone);
    if (!existingCustomer || existingCustomer.stampBalance < shop.targetStamps) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LIMIT_EXCEEDED',
            message: `Customer only has ${existingCustomer ? existingCustomer.stampBalance : 0}/${shop.targetStamps} stamps. Target not reached.`,
          },
        },
        { status: 400 }
      );
    }

    const { customer } = await redeemReward(shop.id, normalizedPhone);

    const cardState: CustomerCardState = {
      phoneNumber: customer.phoneNumber,
      stampBalance: customer.stampBalance,
      targetStamps: shop.targetStamps,
      lifetimeRewardsClaimed: customer.lifetimeRewardsClaimed,
      isRewardUnlocked: false,
      rewardDescription: shop.rewardDescription,
      lastVisitAt: customer.lastVisitAt,
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
