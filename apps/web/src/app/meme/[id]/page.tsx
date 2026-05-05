import { Metadata } from 'next';
import { db } from '@/lib/firebase-admin';
import { generateDownloadUrl } from '@/lib/s3';
import { initAdmin } from '@/lib/firebase-admin';

interface MemePageProps {
  params: Promise<{ id: string }>;
}

async function getMeme(id: string) {
  initAdmin();
  const doc = await db.collection('memes').doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  let imageUrl = '';
  if (data.s3Key) {
    try { imageUrl = await generateDownloadUrl(data.s3Key); } catch {}
  }
  return {
    id: doc.id,
    caption: data.caption || '',
    topText: data.topText || '',
    bottomText: data.bottomText || '',
    imageUrl,
    authorName: data.authorName || 'Anonymous',
    likes: data.likes || 0,
    shares: data.shares || 0,
    views: data.views || 0,
  };
}

export async function generateMetadata({ params }: MemePageProps): Promise<Metadata> {
  const { id } = await params;
  const meme = await getMeme(id);
  if (!meme) return { title: 'Meme not found' };
  return {
    title: `${meme.caption || 'Meme'} | MyPhoto MemeWall`,
    description: `${meme.caption} — Napravljeno u MyPhoto. Napravi i ti svoj meme besplatno!`,
    openGraph: {
      title: meme.caption || 'MyPhoto Meme',
      description: 'Napravi i ti svoj meme besplatno u MyPhoto!',
      images: meme.imageUrl ? [{ url: meme.imageUrl, width: 800, height: 800 }] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: meme.caption || 'MyPhoto Meme',
      description: 'Napravi i ti svoj meme besplatno!',
      images: meme.imageUrl ? [meme.imageUrl] : [],
    },
  };
}

export default async function MemePage({ params }: MemePageProps) {
  const { id } = await params;
  const meme = await getMeme(id);

  if (!meme) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 48 }}>404</h1>
          <p>Meme nije pronadjen</p>
          <a href="/" style={{ color: '#0ea5e9' }}>Idi na MyPhoto</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', fontFamily: 'system-ui' }}>
      {/* Meme content */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>☁️</span>
            <span style={{ color: '#0ea5e9', fontWeight: 700, fontSize: 20 }}>MyPhoto</span>
          </a>
          <span style={{ color: '#64748b', fontSize: 14 }}>MemeWall</span>
        </div>

        {/* Meme image */}
        {meme.imageUrl && (
          <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
            <img
              src={meme.imageUrl}
              alt={meme.caption}
              style={{ width: '100%', display: 'block' }}
            />
          </div>
        )}

        {/* Caption */}
        <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{meme.caption}</p>

        {/* Author & stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
          <span>@{meme.authorName}</span>
          <span>❤️ {meme.likes}</span>
          <span>🔗 {meme.shares}</span>
          <span>👁️ {meme.views}</span>
        </div>

        {/* CTA */}
        <div style={{
          background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
          borderRadius: 16,
          padding: 24,
          textAlign: 'center',
          marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#fff' }}>
            Napravi i ti svoj meme!
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 16 }}>
            Besplatna registracija. Napravi meme, podeli na MemeWall-u, osvoji lajkove!
          </p>
          <a
            href="/register"
            style={{
              display: 'inline-block',
              backgroundColor: '#fff',
              color: '#0ea5e9',
              fontWeight: 700,
              padding: '12px 32px',
              borderRadius: 10,
              textDecoration: 'none',
              fontSize: 16,
            }}
          >
            Registruj se besplatno
          </a>
        </div>

        {/* App features */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>MyPhoto — vise od memova</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#94a3b8', fontSize: 14, lineHeight: 2 }}>
            <li>📸 Auto-backup slika sa telefona</li>
            <li>☁️ Cloud storage za fajlove (MySpace)</li>
            <li>🤖 AI pretraga i tagovanje</li>
            <li>🎨 Meme generator + MemeWall</li>
            <li>👨‍👩‍👧‍👦 Family plan — deli sa porodicom</li>
            <li>🔒 EU serveri, GDPR, bez AI treninga</li>
          </ul>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', color: '#475569', fontSize: 12, paddingBottom: 40 }}>
          <a href="/" style={{ color: '#0ea5e9' }}>myphotomy.space</a> · NASRM Kapetan Bogdan Studio
        </div>
      </div>
    </div>
  );
}
