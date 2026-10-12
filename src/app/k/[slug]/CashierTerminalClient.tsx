'use client';

import { useState, useEffect, useCallback } from 'react';
import { ApiResponse, CustomerCardState, ShopPublicConfig, TransactionRecord } from '@/types/loyalty';
import { formatPhoneNumber, normalizePhoneNumber } from '@/lib/phone';
import styles from './CashierTerminal.module.css';

interface CashierTerminalClientProps {
  shop: ShopPublicConfig;
}

export default function CashierTerminalClient({ shop }: CashierTerminalClientProps) {
  const [pin, setPin] = useState<string>('');
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [customerState, setCustomerState] = useState<CustomerCardState | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [recentTransactions, setRecentTransactions] = useState<Array<TransactionRecord & { phoneNumber: string }>>([]);

  const pinSessionKey = `cashier_pin_${shop.slug}`;

  // Fetch recent terminal transactions
  const loadRecentTransactions = useCallback(async (activePin: string) => {
    try {
      const res = await fetch(`/api/cashier/recent?slug=${shop.slug}&pin=${encodeURIComponent(activePin)}`);
      const json = (await res.json()) as ApiResponse<Array<TransactionRecord & { phoneNumber: string }>>;
      if (json.success && json.data) {
        setRecentTransactions(json.data);
      }
    } catch {
      // Non-critical audit stream failure
    }
  }, [shop.slug]);

  // Check saved session PIN on load
  useEffect(() => {
    const savedPin = sessionStorage.getItem(pinSessionKey);
    if (savedPin) {
      setPin(savedPin);
      setIsAuthorized(true);
      loadRecentTransactions(savedPin);
    }
  }, [pinSessionKey, loadRecentTransactions]);

  // Handle PIN unlock
  const handlePinSubmit = async (enteredPin: string) => {
    setPinError(null);
    try {
      const res = await fetch('/api/cashier/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: shop.slug, pin: enteredPin }),
      });
      const json = (await res.json()) as ApiResponse<{ authorized: boolean }>;
      if (json.success && json.data?.authorized) {
        setIsAuthorized(true);
        sessionStorage.setItem(pinSessionKey, enteredPin);
        loadRecentTransactions(enteredPin);
      } else {
        setPinError(json.error?.message || 'Invalid PIN code.');
        setPin('');
      }
    } catch {
      setPinError('Connection error. Please try again.');
    }
  };

  const handleNumpadPress = (val: string) => {
    if (val === 'backspace') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (pin.length < 4) {
      const nextPin = pin + val;
      setPin(nextPin);
      if (nextPin.length === 4) {
        handlePinSubmit(nextPin);
      }
    }
  };

  const handleLock = () => {
    sessionStorage.removeItem(pinSessionKey);
    setIsAuthorized(false);
    setPin('');
    setCustomerState(null);
    setPhoneNumber('');
    setFeedback(null);
  };

  // Lookup customer state as phone number changes
  useEffect(() => {
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!normalized || normalized.length < 10) {
      setCustomerState(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers/${shop.slug}?phone=${encodeURIComponent(normalized)}`);
        const json = (await res.json()) as ApiResponse<CustomerCardState>;
        if (json.success && json.data) {
          setCustomerState(json.data);
        }
      } catch {
        // Silently handle debounce lookup errors
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [phoneNumber, shop.slug]);

  // Cashier Action: Add +1 Stamp
  const handleAddStamp = async () => {
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!normalized) {
      setFeedback({ type: 'error', message: 'Enter a valid phone number first.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/cashier/stamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: shop.slug, pin, phoneNumber: normalized }),
      });
      const json = (await res.json()) as ApiResponse<CustomerCardState>;
      if (json.success && json.data) {
        setCustomerState(json.data);
        setFeedback({
          type: 'success',
          message: `✓ Added 1 stamp! New balance: ${json.data.stampBalance} / ${shop.targetStamps}`,
        });
        loadRecentTransactions(pin);
      } else {
        setFeedback({ type: 'error', message: json.error?.message || 'Failed to add stamp.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network connection failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cashier Action: Redeem Reward
  const handleRedeemReward = async () => {
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!normalized) return;

    if (!customerState || customerState.stampBalance < shop.targetStamps) {
      setFeedback({ type: 'error', message: 'Customer target has not been reached yet.' });
      return;
    }

    const confirmRedeem = window.confirm(
      `Redeem reward (${shop.rewardDescription}) for ${formatPhoneNumber(normalized)} and reset stamps to 0?`
    );
    if (!confirmRedeem) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/cashier/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: shop.slug, pin, phoneNumber: normalized }),
      });
      const json = (await res.json()) as ApiResponse<CustomerCardState>;
      if (json.success && json.data) {
        setCustomerState(json.data);
        setFeedback({
          type: 'success',
          message: `🎉 Reward Claimed! Customer card reset to 0/${shop.targetStamps}.`,
        });
        loadRecentTransactions(pin);
      } else {
        setFeedback({ type: 'error', message: json.error?.message || 'Failed to redeem reward.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network connection error.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  };

  const dynamicStyle = {
    '--brand-primary': shop.brandColor,
    '--brand-primary-rgb': hexToRgb(shop.brandColor || '#d97706'),
  } as React.CSSProperties;

  // View A: Terminal PIN Screen
  if (!isAuthorized) {
    return (
      <main className={styles.terminalContainer} style={dynamicStyle}>
        <div className={styles.pinCard}>
          <div
            className={styles.merchantIcon}
            style={{ margin: '0 auto 1rem', width: 48, height: 48 }}
          >
            {shop.name.charAt(0)}
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{shop.name}</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Enter Cashier PIN to unlock terminal
          </p>

          <div className={styles.pinDots}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`${styles.pinDot} ${i < pin.length ? styles.pinDotFilled : ''}`}
              />
            ))}
          </div>

          {pinError && (
            <p style={{ color: 'var(--danger-crimson)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {pinError}
            </p>
          )}

          <div className={styles.numpad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                className={styles.numKey}
                onClick={() => handleNumpadPress(digit)}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              className={styles.numKey}
              onClick={() => setPin('')}
              style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}
            >
              Clear
            </button>
            <button
              type="button"
              className={styles.numKey}
              onClick={() => handleNumpadPress('0')}
            >
              0
            </button>
            <button
              type="button"
              className={styles.numKey}
              onClick={() => handleNumpadPress('backspace')}
              style={{ fontSize: '1.1rem' }}
            >
              ⌫
            </button>
          </div>
        </div>
      </main>
    );
  }

  // View B: Active Cashier Terminal Workspace
  const currentStamps = customerState ? customerState.stampBalance : 0;
  const isRewardReady = currentStamps >= shop.targetStamps;

  return (
    <main className={styles.terminalContainer} style={dynamicStyle}>
      <header className={styles.terminalHeader}>
        <div className={styles.merchantBadge}>
          <div className={styles.merchantIcon}>{shop.name.charAt(0)}</div>
          <div>
            <h1 className={styles.merchantName}>{shop.name}</h1>
            <span className={styles.terminalModeTag}>Cashier Counter Terminal</span>
          </div>
        </div>
        <button onClick={handleLock} className={styles.lockBtn} id="terminal-lock-btn">
          🔒 Lock Terminal
        </button>
      </header>

      {/* Live Feedback Toast */}
      {feedback && (
        <div
          className={`${styles.feedbackToast} ${
            feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError
          }`}
          id="cashier-feedback-toast"
        >
          {feedback.message}
        </div>
      )}

      {/* Primary Action Card */}
      <section className={styles.actionCard}>
        <div className={styles.phoneInputContainer}>
          <label htmlFor="customer-phone-input" className={styles.phoneInputLabel}>
            Customer Phone Number
          </label>
          <input
            id="customer-phone-input"
            type="tel"
            inputMode="numeric"
            placeholder="Type or tap customer phone..."
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className={styles.terminalPhoneInput}
            autoFocus
          />
        </div>

        {/* Customer Balance Summary */}
        <div className={styles.customerStateSummary}>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Customer Balance</p>
            <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>
              {phoneNumber ? formatPhoneNumber(phoneNumber) : 'No customer selected'}
            </p>
          </div>
          <div className={styles.balanceHighlight} id="terminal-balance-badge">
            {currentStamps} / {shop.targetStamps}
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.buttonRow}>
          <button
            type="button"
            onClick={handleAddStamp}
            disabled={!phoneNumber || isSubmitting}
            className={styles.stampBtn}
            id="terminal-add-stamp-btn"
          >
            +1 Stamp
          </button>
          <button
            type="button"
            onClick={handleRedeemReward}
            disabled={!isRewardReady || isSubmitting}
            className={`${styles.redeemBtn} ${isRewardReady ? styles.redeemBtnActive : ''}`}
            id="terminal-redeem-btn"
          >
            {isRewardReady ? '★ Claim Reward' : 'Reward Locked'}
          </button>
        </div>
      </section>

      {/* Quick Touch Keypad for Counter Tablet */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div className={styles.numpad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              className={styles.numKey}
              onClick={() => setPhoneNumber((p) => p + digit)}
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            className={styles.numKey}
            onClick={() => setPhoneNumber('')}
            style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}
          >
            Clear
          </button>
          <button
            type="button"
            className={styles.numKey}
            onClick={() => setPhoneNumber((p) => p + '0')}
          >
            0
          </button>
          <button
            type="button"
            className={styles.numKey}
            onClick={() => setPhoneNumber((p) => p.slice(0, -1))}
            style={{ fontSize: '1.1rem' }}
          >
            ⌫
          </button>
        </div>
      </div>

      {/* Recent Activity Audit Stream */}
      <section className={styles.auditSection}>
        <h2 className={styles.auditTitle}>Terminal Recent Activity</h2>
        {recentTransactions.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            No recent punches recorded for this shift.
          </p>
        ) : (
          recentTransactions.map((tx) => (
            <div key={tx.id} className={styles.auditItem}>
              <div>
                <span
                  className={
                    tx.actionType === 'REWARD_CLAIMED'
                      ? styles.auditActionRedeemed
                      : styles.auditActionAdded
                  }
                >
                  {tx.actionType === 'REWARD_CLAIMED' ? '★ Reward Redeemed' : '+1 Stamp'}
                </span>
                <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>
                  {formatPhoneNumber(tx.phoneNumber)}
                </span>
              </div>
              <span className={styles.auditTime}>
                {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
