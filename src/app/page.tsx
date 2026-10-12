'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getCurrentSession,
  loginMerchant,
  registerMerchant,
  DEMO_USER_1,
  DEMO_USER_2,
  DEMO_USER_ALIAS,
} from '@/lib/auth';
import { AuthSession } from '@/types/auth';
import styles from './Home.module.css';

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const active = getCurrentSession();
    if (active) {
      setSession(active);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (authMode === 'login') {
      const res = loginMerchant(email, password);
      if (res.success && res.user) {
        router.push('/dashboard');
      } else {
        setErrorMsg(res.error || 'Authentication failed.');
      }
    } else {
      const res = registerMerchant(email, password, businessName);
      if (res.success && res.user) {
        router.push('/dashboard');
      } else {
        setErrorMsg(res.error || 'Registration failed.');
      }
    }
  };

  const handleQuickDemo = (demoEmail: string, demoPass: string) => {
    const res = loginMerchant(demoEmail, demoPass);
    if (res.success) {
      router.push('/dashboard');
    }
  };

  return (
    <div className={styles.container}>
      {/* Top Navbar */}
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>P</div>
          <span>STAMPCARD</span>
        </div>

        <div>
          {session ? (
            <Link href="/dashboard" className={`${styles.navBtn} ${styles.navBtnPrimary}`}>
              Dashboard →
            </Link>
          ) : (
            <button
              onClick={() => {
                setAuthMode('login');
                const el = document.getElementById('auth-card');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`${styles.navBtn} ${styles.navBtnPrimary}`}
            >
              Merchant Login
            </button>
          )}
        </div>
      </nav>

      {/* Hero with Auth Split */}
      <section className={styles.heroSplit}>
        <div className={styles.heroContent}>
          <div className={styles.tagline}>Zero-Friction Customer Loyalty</div>
          <h1 className={styles.headline}>
            Digital punch cards.<br />
            No apps. No passwords.
          </h1>
          <p className={styles.subheadline}>
            Customers scan your counter QR code and enter their phone number once.
            Cashiers stamp from any phone or tablet behind the counter with a 4-digit PIN.
          </p>

          <div className={styles.featureList}>
            <div className={styles.featureItem}>
              <div className={styles.featureBullet} />
              <span>Instant customer pass stored directly in browser memory</span>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureBullet} />
              <span>Multi-tenant cash register terminals with 4-digit PIN security</span>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureBullet} />
              <span>Zero POS hardware required — runs on existing shop devices</span>
            </div>
          </div>
        </div>

        {/* Auth Box */}
        <div className={styles.authCard} id="auth-card">
          <div className={styles.tabRow}>
            <button
              type="button"
              className={`${styles.tabBtn} ${authMode === 'login' ? styles.tabBtnActive : ''}`}
              onClick={() => {
                setAuthMode('login');
                setErrorMsg(null);
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${authMode === 'register' ? styles.tabBtnActive : ''}`}
              onClick={() => {
                setAuthMode('register');
                setErrorMsg(null);
              }}
            >
              Create Account
            </button>
          </div>

          {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

          <form onSubmit={handleSubmit}>
            {authMode === 'register' && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Business Name</label>
                <input
                  type="text"
                  placeholder="e.g. Café Central"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.label}>Email Address</label>
              <input
                type="email"
                placeholder="name@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                required
              />
            </div>

            <button type="submit" className={styles.submitBtn}>
              {authMode === 'login' ? 'Sign In to Dashboard' : 'Create Merchant Account'}
            </button>
          </form>

          {/* 1-Click Quick Demo Login matching qrmaker-dz */}
          <div className={styles.demoBox}>
            <div className={styles.demoTitle}>Quick Demo Logins (qrmaker-dz)</div>
            <button
              type="button"
              className={styles.demoChip}
              onClick={() => handleQuickDemo(DEMO_USER_1.email, DEMO_USER_1.passwordHash)}
            >
              <span>{DEMO_USER_1.email}</span>
              <span className={styles.demoChipAction}>Login →</span>
            </button>
            <button
              type="button"
              className={styles.demoChip}
              onClick={() => handleQuickDemo(DEMO_USER_2.email, DEMO_USER_2.passwordHash)}
            >
              <span>{DEMO_USER_2.email}</span>
              <span className={styles.demoChipAction}>Login →</span>
            </button>
            <button
              type="button"
              className={styles.demoChip}
              onClick={() => handleQuickDemo(DEMO_USER_ALIAS.email, DEMO_USER_ALIAS.passwordHash)}
            >
              <span>{DEMO_USER_ALIAS.email}</span>
              <span className={styles.demoChipAction}>Login →</span>
            </button>
          </div>
        </div>
      </section>

      {/* Live Punch Card Prototypes */}
      <section>
        <h2 className={styles.sectionTitle}>Live Merchant Demonstrations</h2>
        <div className={styles.demoCardsGrid}>
          <div className={styles.shopCard}>
            <div className={styles.shopCardHeader}>
              <div className={styles.shopCardName}>Café Central</div>
              <span className={styles.shopCardBadge}>PIN: 1234</span>
            </div>
            <p className={styles.shopCardRule}>
              Target: 10 stamps → 1 Free Artisan Cappuccino
            </p>
            <div className={styles.shopLinks}>
              <Link href="/c/cafe-central" className={styles.btnPass}>
                📱 Customer Pass
              </Link>
              <Link href="/k/cafe-central" className={styles.btnTerminal}>
                💳 Cashier Terminal
              </Link>
            </div>
          </div>

          <div className={styles.shopCard}>
            <div className={styles.shopCardHeader}>
              <div className={styles.shopCardName}>Gelato Paradiso</div>
              <span className={styles.shopCardBadge}>PIN: 5678</span>
            </div>
            <p className={styles.shopCardRule}>
              Target: 8 stamps → 2 Free Waffle Scoops
            </p>
            <div className={styles.shopLinks}>
              <Link href="/c/gelato-paradiso" className={styles.btnPass}>
                📱 Customer Pass
              </Link>
              <Link href="/k/gelato-paradiso" className={styles.btnTerminal}>
                💳 Cashier Terminal
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
