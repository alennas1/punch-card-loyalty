import { notFound } from 'next/navigation';
import { getShopBySlug } from '@/lib/db';
import CustomerPassClient from './CustomerPassClient';
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
    return { title: 'Shop Not Found — StampCard' };
  }
  return {
    title: `${shop.name} — Digital Punch Card`,
    description: `Earn ${shop.rewardDescription} at ${shop.name}. Collect ${shop.targetStamps} stamps!`,
  };
}

export default async function CustomerPassPage({ params }: Props) {
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

  return <CustomerPassClient shop={publicConfig} />;
}
