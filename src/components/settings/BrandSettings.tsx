"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { useQueryClient } from '@tanstack/react-query';
import { useBrandProfile, queryKeys } from '@/hooks/useQueries';
import { BrandProfile } from '@/types';
import styles from './BrandSettings.module.css';

const PREDEFINED_TONES = [
    'Professional', 'Witty', 'Empathetic', 'Bold', 'Technical', 'Friendly', 'Concise', 'Authoritative'
];

export default function BrandSettings() {
    const queryClient = useQueryClient();
    const { data: serverProfile, isLoading } = useBrandProfile();

    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [profile, setProfile] = useState<Partial<BrandProfile>>({
        brand_name: '',
        audience: '',
        tone: '',
        examples: ['', '', '']
    });

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        if (serverProfile) {
            const examples = serverProfile.examples || [];
            while (examples.length < 3) examples.push('');
            setProfile({ ...serverProfile, examples });
        }
    }, [serverProfile]);

    // Keep loading state true only if we're initially loading and don't have profile data yet
    // This allows background refetching without blocking the UI
    const isInitialLoading = isLoading && !serverProfile;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const profileData = {
                user_id: user.id,
                brand_name: profile.brand_name,
                audience: profile.audience,
                tone: profile.tone,
                examples: profile.examples?.filter(ex => ex.trim() !== '') || [],
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('brand_profiles')
                .upsert(profileData, { onConflict: 'user_id' });

            if (error) throw error;

            await queryClient.invalidateQueries({ queryKey: queryKeys.brandProfile });

            setMessage({ type: 'success', text: 'Brand DNA saved successfully!' });
        } catch (error) {
            console.error('Error saving profile:', error);
            setMessage({ type: 'error', text: 'Failed to save. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    const updateExample = (index: number, value: string) => {
        const newExamples = [...(profile.examples || [])];
        newExamples[index] = value;
        setProfile({ ...profile, examples: newExamples });
    };

    const toggleTone = (t: string) => {
        if (profile.tone?.includes(t)) {
            setProfile({ ...profile, tone: profile.tone.replace(t, '').replace(', ,', ',').trim() });
        } else {
            const newTone = profile.tone ? `${profile.tone}, ${t}` : t;
            setProfile({ ...profile, tone: newTone });
        }
    };

    if (isInitialLoading) {
        return (
            <div className={styles.loadingState}>
                <div className={styles.loadingContainer}>
                    <div className={styles.loadingSpinner} />
                    <p className={styles.loadingText}>Extracting Brand DNA...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <nav className={styles.breadcrumb}>
                <Link href="/settings" className={styles.breadcrumbLink}>Settings</Link>
                <span className={styles.breadcrumbSeparator}>›</span>
                <span className={styles.breadcrumbCurrent}>Brand DNA</span>
            </nav>

            <div className={styles.header}>
                <h1 className={styles.title}>
                    <span className={styles.titleGradient}>Brand DNA</span> 🧬
                </h1>
                <p className={styles.subtitle}>
                    Teach the AI accurately. By defining your voice and providing examples,
                    we ensure every generated post sounds exactly like you.
                </p>
            </div>

            {message && (
                <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
                    <span className={styles.messageIcon}>{message.type === 'success' ? '✅' : '⚠️'}</span>
                    <p>{message.text}</p>
                </div>
            )}

            <form onSubmit={handleSave} className={styles.formGrid}>
                {/* Left Column: Core Identity */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Core Identity</h2>
                        <p className={styles.cardSubtitle}>Who you are & who you talk to</p>
                    </div>

                    <div className={styles.formStack}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Brand Name</label>
                            <input
                                type="text"
                                value={profile.brand_name}
                                onChange={e => setProfile({ ...profile, brand_name: e.target.value })}
                                className={styles.input}
                                placeholder="e.g. Acme Corp"
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Target Audience</label>
                            <input
                                type="text"
                                value={profile.audience}
                                onChange={e => setProfile({ ...profile, audience: e.target.value })}
                                className={styles.input}
                                placeholder="e.g. Busy CTOs, Yoga Moms, Sci-Fi Fans"
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Tone of Voice</label>
                            <div className={styles.toneContainer}>
                                {PREDEFINED_TONES.map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => toggleTone(t)}
                                        className={`${styles.toneBadge} ${profile.tone?.includes(t)
                                            ? styles.toneBadgeActive
                                            : styles.toneBadgeInactive
                                            }`}
                                    >
                                        {profile.tone?.includes(t) ? '✓ ' : '+ '}{t}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={profile.tone}
                                onChange={e => setProfile({ ...profile, tone: e.target.value })}
                                className={styles.textarea}
                                placeholder="Describe your style..."
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Writing Style */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Writing Style</h2>
                        <p className={styles.cardSubtitle}>Paste your best posts to clone your style</p>
                    </div>

                    <div className={styles.formStack}>
                        {[0, 1, 2].map((index) => (
                            <div key={index} className={styles.exampleGroup}>
                                <label className={styles.exampleHeader}>
                                    <span>Example #{index + 1}</span>
                                    <span className={styles.examplePasteHint}>Paste content</span>
                                </label>
                                <textarea
                                    value={profile.examples?.[index] || ''}
                                    onChange={e => updateExample(index, e.target.value)}
                                    className={`${styles.textarea} ${styles.exampleInput}`}
                                    placeholder="Paste a high-performing post here..."
                                    rows={4}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </form>

            <div className={styles.actions}>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className={styles.saveBtn}
                >
                    {saving ? (
                        <>
                            <div className={styles.spinner} />
                            Saving DNA...
                        </>
                    ) : (
                        <>Save Brand Profile ✨</>
                    )}
                </button>
            </div>
        </div>
    );
}
