import { notFound } from 'next/navigation';
import { getShopBySlug } from '@/lib/db';
import CashierTerminalClient from './CashierTerminalClient';
import { ShopPublicConfig } from '@/types/loyalty';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) {
    return { title: 'Terminal Not Found — StampCard' };
  }
  return {
    title: `${shop.name} — Cashier Terminal`,
    description: `Cashier terminal interface for ${shop.name} digital punch cards.`,
  };
}

export default async function CashierTerminalPage({ params }: Props) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);

  if (!shop) {
    notFound();
  }

  const publicConfig: ShopPublicConfig = {
    slug: shop.slug,
    name: shop.name,
    brandColor: shop.brandColor,
    logoUrl: shop.logoUrl,
    targetStamps: shop.targetStamps,
    rewardDescription: shop.rewardDescription,
  };

  return <CashierTerminalClient shop={publicConfig} />;
}
