'use client';

import { useEffect, useState, useCallback } from 'react';
import { CustomerCardState, ShopPublicConfig, ApiResponse } from '@/types/loyalty';
import { formatPhoneNumber, normalizePhoneNumber } from '@/lib/phone';
import styles from './CustomerPass.module.css';

interface CustomerPassClientProps {
  shop: ShopPublicConfig;
}

export default function CustomerPassClient({ shop }: CustomerPassClientProps) {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [inputPhone, setInputPhone] = useState<string>('');
  const [cardState, setCardState] = useState<CustomerCardState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isNewStampAdded, setIsNewStampAdded] = useState<boolean>(false);

  const storageKey = `punch_phone_${shop.slug}`;

  // Fetch current stamp card status
  const fetchCard = useCallback(async (phone: string, isSilent = false) => {
    if (!isSilent) setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/customers/${shop.slug}?phone=${encodeURIComponent(phone)}`);
      const json = (await res.json()) as ApiResponse<CustomerCardState>;
      if (json.success && json.data) {
        setCardState((prev) => {
          if (prev && json.data && json.data.stampBalance > prev.stampBalance) {
            setIsNewStampAdded(true);
            setTimeout(() => setIsNewStampAdded(false), 2000);
          }
          return json.data ?? null;
        });
      } else {
        setErrorMsg(json.error?.message || 'Failed to load card status.');
      }
    } catch {
      if (!isSilent) setErrorMsg('Network error. Retrying...');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [shop.slug]);

  // Initial load: check device localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setPhoneNumber(saved);
      fetchCard(saved);
    } else {
      setLoading(false);
    }
  }, [storageKey, fetchCard]);

  // Real-time polling every 3.5 seconds so stamps update live when cashier taps +1
  useEffect(() => {
    if (!phoneNumber) return;
    const interval = setInterval(() => {
      fetchCard(phoneNumber, true);
    }, 3500);
    return () => clearInterval(interval);
  }, [phoneNumber, fetchCard]);

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhoneNumber(inputPhone);
    if (!normalized) {
      setErrorMsg('Please enter a valid phone number (at least 7 digits).');
      return;
    }
    localStorage.setItem(storageKey, normalized);
    setPhoneNumber(normalized);
    fetchCard(normalized);
  };

  const handleSwitchNumber = () => {
    localStorage.removeItem(storageKey);
    setPhoneNumber('');
    setCardState(null);
    setInputPhone('');
    setErrorMsg(null);
  };

  // Convert brand hex to RGB for CSS dynamic variable injection
  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  };

  const dynamicStyle = {
    '--brand-primary': shop.brandColor,
    '--brand-primary-rgb': hexToRgb(shop.brandColor || '#d97706'),
  } as React.CSSProperties;

  // Screen 1: First Visit Phone Entry
  if (!phoneNumber) {
    return (
      <main className={styles.wrapper} style={dynamicStyle}>
        <div className={styles.brandHeader}>
          <div className={styles.logoBadge}>{shop.name.charAt(0)}</div>
          <h1 className={styles.shopTitle}>{shop.name}</h1>
          <p className={styles.shopSubtitle}>Digital Loyalty Card</p>
        </div>

        <div className={styles.phoneEntryCard}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem', fontWeight: 700 }}>
            Start Collecting Rewards
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Enter your phone number once. No app download or password needed.
          </p>

          <form onSubmit={handlePhoneSubmit}>
            <div className={styles.inputGroup}>
              <input
                id="phone-input"
                type="tel"
                inputMode="numeric"
                placeholder="(555) 000-0000"
                value={inputPhone}
                onChange={(e) => setInputPhone(e.target.value)}
                className={styles.phoneInput}
                autoFocus
                required
              />
            </div>

            {errorMsg && (
              <p style={{ color: 'var(--danger-crimson)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {errorMsg}
              </p>
            )}

            <button type="submit" id="phone-submit-btn" className={styles.primaryBtn}>
              Open My Stamp Card →
            </button>
          </form>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.25rem' }}>
            Target: {shop.targetStamps} stamps for {shop.rewardDescription}
          </p>
        </div>
      </main>
    );
  }

  const currentStamps = cardState ? cardState.stampBalance : 0;
  const isUnlocked = cardState ? cardState.isRewardUnlocked : false;
  const remaining = Math.max(0, shop.targetStamps - currentStamps);

  return (
    <main className={styles.wrapper} style={dynamicStyle}>
      <header className={styles.brandHeader}>
        <div className={styles.logoBadge}>{shop.name.charAt(0)}</div>
        <h1 className={styles.shopTitle}>{shop.name}</h1>
        <p className={styles.shopSubtitle}>Official Member Pass</p>
      </header>

      {/* Main Punch Card */}
      <section className={`${styles.cardSurface} ${isUnlocked ? styles.cardSurfaceUnlocked : ''}`}>
        <div className={`${styles.cardGlowTop} ${isUnlocked ? styles.cardGlowTopUnlocked : ''}`} />

        <div className={styles.statusBar}>
          <span className={styles.statusLabel}>
            {isUnlocked ? '🌟 Reward Status' : 'Stamp Progress'}
          </span>
          <span className={styles.stampCountBadge} id="stamp-counter-badge">
            {currentStamps} / {shop.targetStamps} Stamps
          </span>
        </div>

        {/* Dynamic Punch Slot Grid */}
        <div className={styles.grid} id="stamp-grid">
          {Array.from({ length: shop.targetStamps }).map((_, idx) => {
            const isFilled = idx < currentStamps;
            const isJustAdded = isFilled && idx === currentStamps - 1 && isNewStampAdded;

            return (
              <div
                key={idx}
                className={`${styles.slot} ${
                  isFilled
                    ? isUnlocked
                      ? `${styles.slotFilled} ${styles.slotFilledUnlocked}`
                      : styles.slotFilled
                    : styles.slotEmpty
                } ${isJustAdded ? 'animate-stamp' : ''}`}
              >
                {isFilled ? (
                  <span className={styles.slotIcon}>{isUnlocked ? '★' : '✓'}</span>
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Reward Box */}
        <div className={`${styles.rewardBanner} ${isUnlocked ? styles.rewardBannerUnlocked : ''}`}>
          {isUnlocked ? (
            <>
              <p className={styles.rewardHeadlineUnlocked}>🎉 Reward Unlocked!</p>
              <p style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 600 }}>
                {shop.rewardDescription}
              </p>
              <p className={styles.rewardDetail}>
                Show your phone number to the cashier to claim your reward.
              </p>
            </>
          ) : (
            <>
              <p className={styles.rewardHeadline}>Reward: {shop.rewardDescription}</p>
              <p className={styles.rewardDetail}>
                {remaining === 1 ? '1 more stamp to unlock!' : `Collect ${remaining} more stamps to claim.`}
              </p>
            </>
          )}
        </div>
      </section>

      {/* Footer Info */}
      <footer className={styles.footerInfo}>
        <span>Card linked to {formatPhoneNumber(phoneNumber)}</span>
        <button
          onClick={handleSwitchNumber}
          className={styles.switchNumberBtn}
          id="switch-number-btn"
        >
          Change Number
        </button>
      </footer>

      {loading && (
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Syncing with counter...
        </p>
      )}
    </main>
  );
}
