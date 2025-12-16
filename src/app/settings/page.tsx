'use client';

import { useState, useEffect } from 'react';
import { getConnectedPlatforms, updatePlatformConnection, Platform } from '@/lib/storage';
import styles from './page.module.css';

export default function SettingsPage() {
    const [platforms, setPlatforms] = useState<Platform[]>([]);

    useEffect(() => {
        setPlatforms(getConnectedPlatforms());
    }, []);

    const handleConnect = (platform: Platform) => {
        const newStatus = !platform.connected;
        updatePlatformConnection(platform.id, newStatus, newStatus ? '@demo_user' : undefined);
        setPlatforms(getConnectedPlatforms());
    };

    return (
        <div className={styles.settingsContainer}>
            <h1 className={styles.pageTitle}>Settings</h1>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <span>🔌</span>
                    <span>Connected Platforms</span>
                </h2>

                <div className={styles.platformGrid}>
                    {platforms.map(platform => (
                        <div key={platform.id} className={styles.platformRow}>
                            <div className={styles.platformInfo}>
                                <div className={styles.platformIcon} style={{ color: platform.color }}>
                                    {platform.icon}
                                </div>
                                <div>
                                    <div className={styles.platformName}>{platform.name}</div>
                                    <div className={styles.platformStatus}>
                                        {platform.connected ? `Connected as ${platform.username}` : 'Not connected'}
                                    </div>
                                </div>
                            </div>

                            <button
                                className={`${styles.connectBtn} ${platform.connected ? styles.connected : ''}`}
                                onClick={() => handleConnect(platform)}
                                type="button"
                            >
                                {!platform.connected && 'Connect'}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <span>🎨</span>
                    <span>Appearance</span>
                </h2>

                <div className={styles.themeSelector}>
                    <div className={`${styles.themeOption} ${styles.active}`}>
                        <span>🌑</span>
                        <span>Dark</span>
                    </div>
                    <div className={`${styles.themeOption} ${styles.disabledOption}`}>
                        <span>☀️</span>
                        <span>Light (Soon)</span>
                    </div>
                    <div className={`${styles.themeOption} ${styles.disabledOption}`}>
                        <span>💻</span>
                        <span>System (Soon)</span>
                    </div>
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <span>⚡</span>
                    <span>Quick Actions</span>
                </h2>

                <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" type="button">
                        🗑️ Clear All Data
                    </button>
                    <button className="btn btn-secondary" type="button">
                        📤 Export Posts
                    </button>
                    <button className="btn btn-secondary" type="button">
                        🔄 Reset Demo Data
                    </button>
                </div>
            </section>
        </div>
    );
}
