import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Download MyPhoto — Android i Desktop aplikacija',
  description: 'Preuzmite MyPhoto aplikaciju za Android telefon i Windows/Mac racunar. Besplatno.',
};

export default function DownloadPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
        padding: '48px 16px',
        textAlign: 'center',
        color: '#fff',
      }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>
          Preuzmite MyPhoto
        </h1>
        <p style={{ fontSize: 18, opacity: 0.9, maxWidth: 500, margin: '0 auto' }}>
          Sinhronizujte slike i fajlove sa svih vasih uredjaja
        </p>
      </div>

      {/* Download cards */}
      <div style={{
        maxWidth: 800, margin: '0 auto', padding: '40px 16px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24,
      }}>
        {/* Android */}
        <div style={{
          backgroundColor: '#fff', borderRadius: 16, padding: 32,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📱</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#111827' }}>
            Android
          </h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            Auto-backup slika i videa sa kamere. Sinhronizacija u pozadini.
            AI pretraga, MemeWall, family sharing.
          </p>
          <ul style={{ textAlign: 'left', color: '#374151', fontSize: 13, lineHeight: 2, listStyle: 'none', padding: 0, marginBottom: 24 }}>
            <li>✅ Auto-backup slika i videa</li>
            <li>✅ MySpace cloud storage</li>
            <li>✅ Meme generator + MemeWall</li>
            <li>✅ AI pretraga i tagovanje</li>
            <li>✅ Offline pristup</li>
          </ul>
          <a
            href="https://expo.dev/accounts/chikaaca/projects/myphoto/builds"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block', backgroundColor: '#22c55e', color: '#fff',
              fontWeight: 700, padding: '14px 32px', borderRadius: 12,
              textDecoration: 'none', fontSize: 16,
            }}
          >
            Preuzmi za Android
          </a>
          <p style={{ color: '#9ca3af', fontSize: 11, marginTop: 12 }}>APK · ~40MB · Android 7+</p>
        </div>

        {/* Desktop */}
        <div style={{
          backgroundColor: '#fff', borderRadius: 16, padding: 32,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💻</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#111827' }}>
            Windows / Mac
          </h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            Izaberite folder na racunaru i sve ce se automatski sinhronizovati
            sa vasim cloud-om. Radi u pozadini kao Dropbox.
          </p>
          <ul style={{ textAlign: 'left', color: '#374151', fontSize: 13, lineHeight: 2, listStyle: 'none', padding: 0, marginBottom: 24 }}>
            <li>✅ Folder sync kao Dropbox</li>
            <li>✅ System tray — radi u pozadini</li>
            <li>✅ Auto-start sa racunarom</li>
            <li>✅ Svi fajl tipovi</li>
            <li>✅ +512MB besplatnog prostora</li>
          </ul>
          <a
            href="https://github.com/chikaAcaFaca/myphoto.my.id/releases"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block', backgroundColor: '#3b82f6', color: '#fff',
              fontWeight: 700, padding: '14px 32px', borderRadius: 12,
              textDecoration: 'none', fontSize: 16,
            }}
          >
            Preuzmi za Windows
          </a>
          <p style={{ color: '#9ca3af', fontSize: 11, marginTop: 12 }}>EXE · ~170MB · Windows 10+</p>
        </div>
      </div>

      {/* Web app */}
      <div style={{
        maxWidth: 800, margin: '0 auto', padding: '0 16px 40px',
        textAlign: 'center',
      }}>
        <div style={{
          backgroundColor: '#f0f9ff', borderRadius: 16, padding: 32,
          border: '1px solid #bae6fd',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌐</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#111827' }}>
            Ili koristite Web App
          </h3>
          <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>
            Pristupite vasim slikama i fajlovima iz bilo kog browsera. Nema instalacije.
          </p>
          <Link
            href="/photos"
            style={{
              display: 'inline-block', backgroundColor: '#0ea5e9', color: '#fff',
              fontWeight: 700, padding: '12px 28px', borderRadius: 10,
              textDecoration: 'none',
            }}
          >
            Otvori Web App
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '24px 16px', color: '#9ca3af', fontSize: 12 }}>
        <p>NASRM Kapetan Bogdan Studio · <a href="/" style={{ color: '#0ea5e9' }}>myphotomy.space</a></p>
      </div>
    </div>
  );
}
