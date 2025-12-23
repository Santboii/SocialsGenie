'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PLATFORMS, PlatformId } from '@/types';
import { getSupabase } from '@/lib/supabase';
import { useConnections, useInvalidateConnections } from '@/hooks/useQueries';
import styles from './page.module.css';

export default function SettingsPage() {
    const searchParams = useSearchParams();

    // Use cached query for connections
    const { data: connections = [], isLoading: loading } = useConnections();
    const invalidateConnections = useInvalidateConnections();

    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Check for OAuth callback messages
    useEffect(() => {
        const success = searchParams.get('success');
        const error = searchParams.get('error');

        if (success) {
            setMessage({ type: 'success', text: success });
            // Invalidate connections cache after OAuth success
            invalidateConnections();
        } else if (error) {
            setMessage({ type: 'error', text: error });
        }
    }, [searchParams, invalidateConnections]);

    const getConnection = (platformId: PlatformId) => {
        return connections.find(c => c.platform === platformId);
    };

    const handleConnectMeta = () => {
        // Redirect to Meta OAuth endpoint
        window.location.href = '/api/auth/meta';
    };

    const handleDisconnect = async (platformId: PlatformId) => {
        if (!confirm(`Disconnect ${platformId}? You'll need to reconnect to post.`)) return;

        const supabase = getSupabase();
        await supabase
            .from('connected_accounts')
            .delete()
            .eq('platform', platformId);

        invalidateConnections(); // Refresh cache
        setMessage({ type: 'success', text: `Disconnected from ${platformId}` });
    };

    // Delete account state and handler
    const [deleting, setDeleting] = useState(false);

    const handleDeleteAccount = async () => {
        const confirmText = prompt(
            'This will permanently delete your account and all data. Type "DELETE" to confirm:'
        );

        if (confirmText !== 'DELETE') {
            if (confirmText !== null) {
                setMessage({ type: 'error', text: 'Account deletion cancelled. You must type "DELETE" to confirm.' });
            }
            return;
        }

        setDeleting(true);
        try {
            const response = await fetch('/api/account/delete', {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete account');
            }

            // Sign out and redirect to landing
            const supabase = getSupabase();
            await supabase.auth.signOut();
            window.location.href = '/landing?deleted=true';
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to delete account' });
            setDeleting(false);
        }
    };

    // Platforms with real OAuth support
    const metaPlatforms: PlatformId[] = ['facebook', 'instagram'];
    const otherPlatforms: PlatformId[] = ['twitter', 'linkedin', 'threads'];

    return (
        <div className={styles.settingsContainer}>
            <h1 className={styles.pageTitle}>Settings</h1>

            {message && (
                <div className={`${styles.message} ${styles[message.type]}`}>
                    {message.type === 'success' ? '✅' : '❌'} {message.text}
                    <button onClick={() => setMessage(null)}>×</button>
                </div>
            )}

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <span>🧬</span>
                    <span>AI & Content</span>
                </h2>

                <div className={styles.platformGrid}>
                    <Link href="/settings/brand" className={styles.platformRow}>
                        <div className={styles.platformInfo}>
                            <div className={styles.platformIcon} style={{ background: 'var(--bg-elevated)', color: 'var(--accent-purple)' }}>
                                ✨
                            </div>
                            <div>
                                <div className={styles.platformName}>Brand DNA</div>
                                <div className={styles.platformStatus}>
                                    Configure your voice, audience, and style
                                </div>
                            </div>
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                            →
                        </div>
                    </Link>
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <span>🔌</span>
                    <span>Connected Platforms</span>
                </h2>

                {/* Meta Platforms (Facebook + Instagram) */}
                <div className={styles.platformGroup}>
                    <div className={styles.groupHeader}>
                        <span>📱 Meta (Facebook & Instagram)</span>
                        <button
                            className="btn btn-primary"
                            onClick={handleConnectMeta}
                            type="button"
                        >
                            {connections.some(c => metaPlatforms.includes(c.platform))
                                ? '🔄 Reconnect'
                                : '🔗 Connect with Facebook'}
                        </button>
                    </div>

                    <div className={styles.platformGrid}>
                        {metaPlatforms.map(platformId => {
                            const platform = PLATFORMS.find(p => p.id === platformId);
                            const connection = getConnection(platformId);

                            if (!platform) return null;

                            return (
                                <div key={platformId} className={styles.platformRow}>
                                    <div className={styles.platformInfo}>
                                        <div className={styles.platformIcon} style={{ color: platform.color }}>
                                            {platform.icon}
                                        </div>
                                        <div>
                                            <div className={styles.platformName}>{platform.name}</div>
                                            <div className={styles.platformStatus}>
                                                {connection
                                                    ? `✓ Connected ${connection.platform_username ? `as ${connection.platform_username}` : ''}`
                                                    : 'Not connected'}
                                            </div>
                                        </div>
                                    </div>

                                    {connection && (
                                        <button
                                            className={styles.disconnectBtn}
                                            onClick={() => handleDisconnect(platformId)}
                                            type="button"
                                        >
                                            Disconnect
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Other Platforms (Coming Soon) */}
                <div className={styles.platformGroup}>
                    <div className={styles.groupHeader}>
                        <span>🚀 More Platforms (Coming Soon)</span>
                    </div>

                    <div className={styles.platformGrid}>
                        {otherPlatforms.map(platformId => {
                            const platform = PLATFORMS.find(p => p.id === platformId);
                            if (!platform) return null;

                            return (
                                <div key={platformId} className={`${styles.platformRow} ${styles.disabled}`}>
                                    <div className={styles.platformInfo}>
                                        <div className={styles.platformIcon} style={{ color: platform.color, opacity: 0.5 }}>
                                            {platform.icon}
                                        </div>
                                        <div>
                                            <div className={styles.platformName}>{platform.name}</div>
                                            <div className={styles.platformStatus}>Coming soon</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
                </div>
            </section>

            {/* Danger Zone */}
            <section className={`${styles.section} ${styles.dangerSection}`}>
                <h2 className={styles.sectionTitle}>
                    <span>⚠️</span>
                    <span>Danger Zone</span>
                </h2>

                <div className={styles.dangerContent}>
                    <div className={styles.dangerInfo}>
                        <h3>Delete Account</h3>
                        <p>
                            Permanently delete your account and all associated data including posts,
                            connected accounts, and brand settings. This action cannot be undone.
                        </p>
                    </div>
                    <button
                        className={styles.deleteBtn}
                        onClick={handleDeleteAccount}
                        disabled={deleting}
                        type="button"
                    >
                        {deleting ? 'Deleting...' : 'Delete My Account'}
                    </button>
                </div>
            </section>
        </div>
    );
}
