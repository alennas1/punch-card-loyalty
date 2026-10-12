'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clearSession, getCurrentSession } from '@/lib/auth';
import { AuthSession } from '@/types/auth';
import styles from './Dashboard.module.css';

interface DashboardCard {
  id: string;
  name: string;
  slug: string;
  targetStamps: number;
  rewardDescription: string;
  pin: string;
}

const DEFAULT_CARDS: DashboardCard[] = [
  {
    id: 'c1',
    name: 'Café Central',
    slug: 'cafe-central',
    targetStamps: 10,
    rewardDescription: '1 Free Artisan Cappuccino',
    pin: '1234',
  },
  {
    id: 'c2',
    name: 'Gelato Paradiso',
    slug: 'gelato-paradiso',
    targetStamps: 8,
    rewardDescription: '2 Free Waffle Scoops',
    pin: '5678',
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [cards, setCards] = useState<DashboardCard[]>(DEFAULT_CARDS);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [qrModalCard, setQrModalCard] = useState<DashboardCard | null>(null);

  // New Card Form State
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newTarget, setNewTarget] = useState(10);
  const [newReward, setNewReward] = useState('');
  const [newPin, setNewPin] = useState('1234');

  useEffect(() => {
    const active = getCurrentSession();
    if (!active) {
      router.push('/');
    } else {
      setSession(active);
    }
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.push('/');
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = newSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const newCard: DashboardCard = {
      id: `c_${Date.now()}`,
      name: newName.trim(),
      slug: cleanSlug,
      targetStamps: Number(newTarget),
      rewardDescription: newReward.trim(),
      pin: newPin.trim(),
    };

    setCards((prev) => [newCard, ...prev]);
    setIsNewModalOpen(false);
    setNewName('');
    setNewSlug('');
    setNewReward('');
    setNewPin('1234');
  };

  if (!session) {
    return (
      <div className={styles.dashboardWrapper} style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading Merchant Portal...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardWrapper}>
      {/* Top Navigation */}
      <header className={styles.topBar}>
        <div className={styles.brandGroup}>
          <div className={styles.brandLogo}>P</div>
          <div>
            <h1 className={styles.merchantName}>{session.user.businessName}</h1>
            <span className={styles.planTag}>{session.user.email} • Merchant Portal</span>
          </div>
        </div>

        <button onClick={handleLogout} className={styles.logoutBtn}>
          Sign Out
        </button>
      </header>

      {/* Metrics Row */}
      <section className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Active Punch Cards</div>
          <div className={styles.metricValue}>{cards.length}</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Stamp Quota</div>
          <div className={styles.metricValue}>Unlimited</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Platform Status</div>
          <div className={styles.metricValue} style={{ fontSize: '1.4rem', color: '#ffffff' }}>
            Connected (Neon)
          </div>
        </div>
      </section>

      {/* Main Punch Cards Section */}
      <section>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Your Digital Loyalty Programs</h2>
          <button onClick={() => setIsNewModalOpen(true)} className={styles.primaryActionBtn}>
            + Create Punch Card
          </button>
        </div>

        <div className={styles.cardsGrid}>
          {cards.map((card) => (
            <div key={card.id} className={styles.cardItem}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardName}>{card.name}</h3>
                  <div className={styles.cardSlug}>/c/{card.slug}</div>
                </div>
                <div className={styles.pinBadge}>PIN: {card.pin}</div>
              </div>

              <div className={styles.cardSpecs}>
                <div>
                  <strong>Target Rule:</strong> {card.targetStamps} Stamps
                </div>
                <div>
                  <strong>Reward Prize:</strong> {card.rewardDescription}
                </div>
              </div>

              <div className={styles.actionsRow}>
                <Link
                  href={`/c/${card.slug}`}
                  target="_blank"
                  className={styles.actionBtnSecondary}
                >
                  📱 Customer Pass
                </Link>
                <Link
                  href={`/k/${card.slug}`}
                  target="_blank"
                  className={styles.actionBtnPrimary}
                >
                  💳 Terminal
                </Link>
                <button
                  type="button"
                  onClick={() => setQrModalCard(card)}
                  className={styles.actionBtnSecondary}
                >
                  🖨️ Counter QR
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Create Card Modal */}
      {isNewModalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>New Digital Punch Card</h3>
              <button onClick={() => setIsNewModalOpen(false)} className={styles.closeBtn}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCard}>
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Shop / Brand Name</label>
                <input
                  type="text"
                  placeholder="e.g. Blue Bottle Coffee"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (!newSlug) {
                      setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }
                  }}
                  className={styles.fieldInput}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.fieldLabel}>URL Slug</label>
                <input
                  type="text"
                  placeholder="blue-bottle"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  className={styles.fieldInput}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Target Stamps (Goal)</label>
                <input
                  type="number"
                  min="3"
                  max="30"
                  value={newTarget}
                  onChange={(e) => setNewTarget(Number(e.target.value))}
                  className={styles.fieldInput}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Reward Description</label>
                <input
                  type="text"
                  placeholder="e.g. 1 Free Hand-Drip Coffee"
                  value={newReward}
                  onChange={(e) => setNewReward(e.target.value)}
                  className={styles.fieldInput}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Cashier 4-Digit PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="1234"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className={styles.fieldInput}
                  required
                />
              </div>

              <button type="submit" className={styles.modalSubmit}>
                Launch Punch Card
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Printable Modal */}
      {qrModalCard && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Counter QR Stand Sticker</h3>
              <button onClick={() => setQrModalCard(null)} className={styles.closeBtn}>
                ✕
              </button>
            </div>

            <div className={styles.qrStickerCard} id="printable-qr-card">
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.2rem' }}>
                {qrModalCard.name}
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#52525b' }}>
                Scan to collect your digital stamp
              </p>

              {/* Vector QR code rendered via public zero-dependency API */}
              <div className={styles.qrImageWrap}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/c/${qrModalCard.slug}`
                      : `https://punch-card.vercel.app/c/${qrModalCard.slug}`
                  )}`}
                  alt={`${qrModalCard.name} QR Code`}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
              </div>

              <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                NO APP DOWNLOAD REQUIRED
              </div>
              <div style={{ fontSize: '0.72rem', color: '#71717a', marginTop: '0.2rem' }}>
                Reward: {qrModalCard.rewardDescription}
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className={styles.modalSubmit}
            >
              Print Acrylic Stand Sticker
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
