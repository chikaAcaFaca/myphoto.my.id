import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import NextImage from 'next/image';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  Cloud,
  Lock,
  Zap,
  Upload,
  FolderSync,
  HardDrive,
  Shield,
  Server,
  Check,
  Images,
} from 'lucide-react';
import { SharedGallery } from '@/components/shared/shared-gallery';
import { SharedImage } from '@/components/shared/shared-image';
import { getT } from '@/i18n/server';

type T = Awaited<ReturnType<typeof getT>>;

interface PageProps {
  params: Promise<{ token: string }>;
}

async function getSharedLink(token: string) {
  const doc = await db.collection('shared').doc(token).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  if (!data.isActive) return null;
  return data;
}

async function getUserReferralCode(userId: string): Promise<string | null> {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return null;
    const data = userDoc.data()!;

    // Auto-generate referral code if missing (legacy users)
    if (!data.referralCode) {
      const { nanoid } = await import('nanoid');
      const code = nanoid(8).toUpperCase();
      await db.collection('users').doc(userId).update({ referralCode: code });
      return code;
    }

    return data.referralCode;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const shared = await getSharedLink(token);
  const t = await getT();

  if (!shared) {
    return {
      title: t('pages.shared.link.meta.notFoundTitle'),
    };
  }

  const isAlbum = shared.type === 'album';
  const title = isAlbum
    ? t('pages.shared.link.meta.albumTitle', { name: shared.albumName })
    : t('pages.shared.link.meta.fileTitle', { name: shared.fileName });
  const description = t('pages.shared.link.meta.description');
  const coverFileId = isAlbum ? shared.coverFileId : shared.fileId;
  const ogImageUrl = coverFileId
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://myphotomy.space'}/api/thumbnail/${coverFileId}?share=${token}`
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(ogImageUrl && {
        images: [
          {
            url: ogImageUrl,
            width: shared.width || 1200,
            height: shared.height || 630,
            alt: isAlbum ? shared.albumName : shared.fileName,
          },
        ],
      }),
      type: 'article',
      siteName: 'myphotomy.space',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImageUrl && { images: [ogImageUrl] }),
    },
  };
}

export default async function SharedPhotoPage({ params }: PageProps) {
  const { token } = await params;
  const shared = await getSharedLink(token);
  const t = await getT();

  if (!shared) {
    return <NotFoundPage t={t} />;
  }

  // Increment view count (fire-and-forget)
  db.collection('shared')
    .doc(token)
    .update({ viewCount: FieldValue.increment(1) })
    .catch(() => {});

  // Get sharer's referral code for CTA links
  const referralCode = await getUserReferralCode(shared.userId);
  // Build register URL with referral code AND share token for attribution tracking
  const registerParams = new URLSearchParams();
  if (referralCode) registerParams.set('ref', referralCode);
  registerParams.set('via', 'share');
  registerParams.set('st', token); // share token — so we know which shared content brought them
  const registerUrl = `/register?${registerParams.toString()}`;

  const isAlbum = shared.type === 'album';
  const isImage = shared.mimeType?.startsWith('image/');
  const isVideo = shared.mimeType?.startsWith('video/');

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Section A: Shared Content */}
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center px-4 py-8">
        <p className="mb-4 text-sm text-gray-400">
          {t('pages.shared.link.sharedVia')}{' '}
          <Link href="/" className="text-primary-400 hover:underline">
            myphotomy.space
          </Link>
        </p>

        {isAlbum ? (
          <>
            <div className="mb-4 flex items-center gap-3">
              <Images className="h-6 w-6 text-primary-400" />
              <h1 className="text-2xl font-bold text-white">{shared.albumName}</h1>
            </div>
            {shared.albumDescription && (
              <p className="mb-6 max-w-2xl text-center text-gray-400">{shared.albumDescription}</p>
            )}
            <p className="mb-6 text-sm text-gray-500">
              {t('pages.shared.link.albumFileCount', { count: shared.albumFileCount || shared.albumFileIds?.length || 0 })}
            </p>
            <SharedGallery
              fileIds={shared.albumFileIds || []}
              shareToken={token}
              albumName={shared.albumName}
              permission={shared.permission || 'read'}
            />
          </>
        ) : isImage || isVideo ? (
          <SharedImage
            fileId={shared.fileId}
            fileName={shared.fileName}
            shareToken={token}
            isVideo={isVideo}
          />
        ) : (
          <div className="flex h-48 w-full max-w-md items-center justify-center rounded-lg bg-gray-800">
            <p className="text-gray-400">{shared.fileName}</p>
          </div>
        )}

        {!isAlbum && <p className="mt-4 text-sm text-gray-500">{shared.fileName}</p>}
      </section>

      {/* Section B: Viral Landing Page */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-800">
        {/* Divider */}
        <div className="mx-auto h-px w-full max-w-4xl bg-gradient-to-r from-transparent via-gray-600 to-transparent" />

        {/* Value Props */}
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="mb-2 text-center text-2xl font-bold text-white md:text-3xl">
            {t('pages.shared.link.heroTitle')}
          </h2>
          <p className="mb-12 text-center text-gray-400">
            {t('pages.shared.link.heroSubtitle')}
          </p>

          <div className="grid gap-8 md:grid-cols-3">
            <ValueProp
              icon={<div className="relative"><Cloud className="h-7 w-7 text-green-400" /><Lock className="absolute -bottom-1 -right-1 h-4 w-4 text-green-300" /></div>}
              title={t('pages.shared.link.valuePrivateTitle')}
              description={t('pages.shared.link.valuePrivateDesc')}
            />
            <ValueProp
              icon={<Zap className="h-7 w-7 text-yellow-400" />}
              title={t('pages.shared.link.valueSignupTitle')}
              description={t('pages.shared.link.valueSignupDesc')}
            />
            <ValueProp
              icon={<Upload className="h-7 w-7 text-blue-400" />}
              title={t('pages.shared.link.valueUploadTitle')}
              description={t('pages.shared.link.valueUploadDesc')}
            />
          </div>
        </div>

        {/* Coming Soon */}
        <div className="mx-auto max-w-4xl px-4 pb-16">
          <h3 className="mb-6 text-center text-lg font-semibold text-gray-300">
            {t('pages.shared.link.comingSoon')}
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            <ComingSoonCard
              icon={<FolderSync className="h-6 w-6 text-purple-400" />}
              title={t('pages.shared.link.soonSyncTitle')}
              description={t('pages.shared.link.soonSyncDesc')}
            />
            <ComingSoonCard
              icon={<HardDrive className="h-6 w-6 text-orange-400" />}
              title={t('pages.shared.link.soonAllFilesTitle')}
              description={t('pages.shared.link.soonAllFilesDesc')}
            />
          </div>
        </div>

        {/* CTA */}
        <div className="mx-auto max-w-2xl px-4 pb-16 text-center">
          <Link
            href={registerUrl}
            className="inline-block rounded-xl bg-primary-500 px-10 py-4 text-lg font-bold text-white shadow-lg transition-all hover:bg-primary-600 hover:shadow-xl"
          >
            {t('pages.shared.link.cta')}
          </Link>
          <p className="mt-3 text-sm text-gray-500">
            {t('pages.shared.link.ctaNote')}
          </p>
        </div>

        {/* Trust Badges */}
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3 px-4 pb-12">
          <div className="flex items-center gap-2 rounded-full bg-gray-700/50 px-4 py-2 text-xs text-gray-300">
            <Server className="h-3.5 w-3.5" />
            {t('pages.shared.link.badgeEuServers')}
          </div>
          <div className="flex items-center gap-2 rounded-full bg-gray-700/50 px-4 py-2 text-xs text-gray-300">
            <Shield className="h-3.5 w-3.5" />
            {t('pages.shared.link.badgeGdpr')}
          </div>
          <div className="flex items-center gap-2 rounded-full bg-gray-700/50 px-4 py-2 text-xs text-gray-300">
            <Lock className="h-3.5 w-3.5" />
            {t('pages.shared.link.badgeNoAi')}
          </div>
        </div>

        {/* Compact Pricing */}
        <div className="mx-auto max-w-4xl px-4 pb-16">
          <h3 className="mb-8 text-center text-xl font-bold text-white">
            {t('pages.shared.link.plansTitle')}
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <PricingCard
              name="Free"
              price="€0"
              storage="1 GB"
              features={[t('pages.shared.link.featureWebMobile'), t('pages.shared.link.featureSharing')]}
              perMonth={t('pages.shared.link.perMonth')}
            />
            <PricingCard
              name="Plus + AI"
              price="€4.49"
              storage="250 GB"
              features={[t('pages.shared.link.featureSmartSearch'), t('pages.shared.link.featureFaceRecognition'), t('pages.shared.link.featureFamilySharing')]}
              perMonth={t('pages.shared.link.perMonth')}
              highlighted
              badge={t('pages.shared.link.mostPopular')}
            />
            <PricingCard
              name="Pro+ + AI"
              price="€17.99"
              storage="1.25 TB"
              features={[t('pages.shared.link.featureUnlimitedAi'), t('pages.shared.link.featurePremiumSupport'), t('pages.shared.link.featureApiAccess')]}
              perMonth={t('pages.shared.link.perMonth')}
            />
          </div>
          <div className="mt-6 text-center">
            <Link href={referralCode ? `/pricing?ref=${referralCode}&via=share&st=${token}` : `/pricing?via=share&st=${token}`} className="text-sm text-primary-400 hover:underline">
              {t('pages.shared.link.seeAllPlans')} &rarr;
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-700/50 py-8">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 md:flex-row md:justify-between">
            <NextImage
              src="/logo.png"
              alt="myphotomy.space"
              width={160}
              height={48}
              className="h-10 w-auto"
            />
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
              <Link href="/pricing" className="hover:text-gray-300">
                {t('pages.shared.link.footerPricing')}
              </Link>
              <Link href="/privacy" className="hover:text-gray-300">
                {t('pages.shared.link.footerPrivacy')}
              </Link>
              <Link href="/terms" className="hover:text-gray-300">
                {t('pages.shared.link.footerTerms')}
              </Link>
              <Link href="/contact" className="hover:text-gray-300">
                {t('pages.shared.link.footerContact')}
              </Link>
              <Link href="/support" className="hover:text-gray-300">
                {t('pages.shared.link.footerSupport')}
              </Link>
            </div>
            <p className="text-xs text-gray-600">
              &copy; {new Date().getFullYear()} myphotomy.space
            </p>
          </div>
        </footer>
      </section>
    </div>
  );
}

function NotFoundPage({ t }: { t: T }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4 text-center">
      <div className="mb-6 text-6xl">🔗</div>
      <h1 className="mb-3 text-2xl font-bold text-white">
        {t('pages.shared.link.notFoundTitle')}
      </h1>
      <p className="mb-8 max-w-md text-gray-400">
        {t('pages.shared.link.notFoundDesc')}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/register"
          className="rounded-lg bg-primary-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-600"
        >
          {t('pages.shared.link.notFoundCta')}
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-gray-600 px-6 py-3 font-semibold text-gray-300 transition-colors hover:bg-gray-800"
        >
          {t('pages.shared.link.home')}
        </Link>
      </div>
    </div>
  );
}

function ValueProp({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-800">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

function ComingSoonCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <h4 className="mb-1 text-sm font-semibold text-white">{title}</h4>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    </div>
  );
}

function PricingCard({
  name,
  price,
  storage,
  features,
  highlighted,
  badge,
  perMonth,
}: {
  name: string;
  price: string;
  storage: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  perMonth: string;
}) {
  return (
    <div
      className={`relative rounded-xl p-5 ${
        highlighted
          ? 'bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-xl'
          : 'bg-gray-800 text-gray-200'
      }`}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900">
          {badge}
        </div>
      )}
      <h4 className="text-sm font-semibold">{name}</h4>
      <div className="mb-1 mt-2">
        <span className="text-2xl font-bold">{price}</span>
        <span className={highlighted ? 'text-primary-100' : 'text-gray-500'}>
          {perMonth}
        </span>
      </div>
      <p
        className={`mb-4 text-lg font-medium ${
          highlighted ? 'text-primary-100' : 'text-gray-400'
        }`}
      >
        {storage}
      </p>
      <ul className="space-y-1.5">
        {features.map((feature, i) => (
          <li
            key={i}
            className={`flex items-center gap-2 text-xs ${
              highlighted ? 'text-primary-100' : 'text-gray-400'
            }`}
          >
            <Check
              className={`h-3.5 w-3.5 ${
                highlighted ? 'text-white' : 'text-primary-500'
              }`}
            />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
