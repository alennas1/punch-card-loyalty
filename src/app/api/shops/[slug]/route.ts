import { NextRequest, NextResponse } from 'next/server';
import { getShopBySlug } from '@/lib/db';
import { ApiResponse, ShopPublicConfig } from '@/types/loyalty';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<NextResponse<ApiResponse<ShopPublicConfig>>> {
  try {
    const { slug } = await context.params;
    if (!slug) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Shop slug is required' } },
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

    const publicConfig: ShopPublicConfig = {
      slug: shop.slug,
      name: shop.name,
      brandColor: shop.brandColor,
      logoUrl: shop.logoUrl,
      targetStamps: shop.targetStamps,
      rewardDescription: shop.rewardDescription,
    };

    return NextResponse.json({ success: true, data: publicConfig });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: errorMessage } },
      { status: 500 }
    );
  }
}
