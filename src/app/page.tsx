import Link from 'next/link';
import styles from './Home.module.css';

export default function HomePage() {
  const demoShops = [
    {
      slug: 'cafe-central',
      name: 'Café Central',
      color: '#D97706',
      target: 10,
      reward: '1 Free Artisan Cappuccino',
      pin: '1234',
    },
    {
      slug: 'gelato-paradiso',
      name: 'Gelato Paradiso',
      color: '#EC4899',
      target: 8,
      reward: '2 Free Waffle Scoops',
      pin: '5678',
    },
  ];

  return (
    <div className={styles.homeWrapper}>
      <header className={styles.hero}>
        <div className={styles.badge}>⚡ Zero-Friction Multi-Tenant Loyalty</div>
        <h1 className={styles.title}>Digital Punch Card Platform</h1>
        <p className={styles.subtitle}>
          No app downloads. No customer passwords. Zero POS hardware.
          Customers scan counter QR codes, enter their phone number once, and collect rewards.
        </p>
      </header>

      <section>
        <h2 className={styles.sectionTitle}>
          <span>🏪</span> Active Merchant Demonstrations
        </h2>
        <div className={styles.demoGrid}>
          {demoShops.map((shop) => (
            <div key={shop.slug} className={styles.demoCard}>
              <div className={styles.demoCardHeader}>
                <div className={styles.shopAvatar} style={{ background: shop.color }}>
                  {shop.name.charAt(0)}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{shop.name}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Slug: <code>/{shop.slug}</code>
                  </p>
                </div>
              </div>

              <div className={styles.demoDetails}>
                <p>
                  <strong>Target Rule:</strong> {shop.target} stamps → {shop.reward}
                </p>
                <p style={{ marginTop: '0.25rem' }}>
                  <strong>Cashier PIN:</strong> <code>{shop.pin}</code>
                </p>
              </div>

              <div className={styles.buttonPair}>
                <Link
                  href={`/c/${shop.slug}`}
                  className={styles.actionLinkCustomer}
                  id={`link-customer-${shop.slug}`}
                >
                  📱 Customer Pass
                </Link>
                <Link
                  href={`/k/${shop.slug}`}
                  className={styles.actionLinkCashier}
                  style={{ background: shop.color }}
                  id={`link-cashier-${shop.slug}`}
                >
                  💳 Cashier Terminal
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.guideBox}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          🚀 5-Minute Client Onboarding Workflow
        </h2>
        <div className={styles.stepList}>
          <div className={styles.stepItem}>
            <div className={styles.stepNumber}>1</div>
            <div>
              <strong>Database Record:</strong> Insert one line in Neon with shop slug, cashier PIN, target stamp count, and reward prize.
            </div>
          </div>
          <div className={styles.stepItem}>
            <div className={styles.stepNumber}>2</div>
            <div>
              <strong>Print Counter QR:</strong> Generate a QR code pointing directly to <code>/c/[shop-slug]</code> and place it at checkout.
            </div>
          </div>
          <div className={styles.stepItem}>
            <div className={styles.stepNumber}>3</div>
            <div>
              <strong>Cashier Terminal:</strong> Give the merchant their counter link <code>/k/[shop-slug]</code> and 4-digit PIN.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
