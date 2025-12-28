'use client';

import { useState } from 'react';
import { PlatformId, ToneType, PLATFORMS } from '@/types';
import { addSuggestion, getPosts } from '@/lib/storage';
import styles from './AIComposeModal.module.css';

interface AIComposeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerated: () => void;
}

export default function AIComposeModal({ isOpen, onClose, onGenerated }: AIComposeModalProps) {
    const [topic, setTopic] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [tone, setTone] = useState<ToneType>('casual');
    const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>(['twitter']);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const togglePlatform = (id: PlatformId) => {
        setSelectedPlatforms(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleGenerate = async () => {
        if (!topic.trim()) {
            setError('Please enter a topic');
            return;
        }
        if (selectedPlatforms.length === 0) {
            setError('Please select at least one platform');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            // Get past posts for style matching
            const pastPosts = getPosts()
                .slice(0, 5)
                .map(p => p.content);

            // URL content collection would go here if we re-implement it server side or with a new helper
            // For now, we rely on the topic and title only
            const urlContent = undefined;

            // The backend now expects a single platform string, not an array.
            // We'll generate for each selected platform individually or just pick the first one for now
            // since the API route structure suggests singular generation.
            // However, the previous code implies multi-platform generation.
            // Let's iterate sequentially for now to support the UI's promise of multi-platform.

            const newVariants = [];

            for (const platformId of selectedPlatforms) {

                const res = await fetch('/api/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        topic,
                        platform: platformId,
                        includeImage: false // Suggestions page doesn't seem to ask for images here explicitly yet
                    })
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || `Failed for ${platformId}`);
                }

                const data = await res.json();
                newVariants.push({
                    platformId,
                    content: data.post.content
                });
            }

            const suggestion = {
                id: crypto.randomUUID(), // using native crypto for client-side ID
                topic,
                tone,
                sourceUrl,
                variants: newVariants,
                status: 'pending' as const,
                createdAt: new Date().toISOString()
            };

            // Previous logic: generatePosts was likely client-side aggregator or wrapped multiple calls?
            // Since we replaced the single-call wrapper, we construct the suggestion object manually here
            // to pass to addSuggestion.

            // Wait, looking at lines 60-67 in original file, it was calling `generatePosts` from `@/lib/ai`.
            // If I delete `@/lib/ai.ts`, I must inline that logic here or create a new proper service.
            // Inlining is safer for now to ensure we hit the correct API route we verified.


            addSuggestion(suggestion);
            onGenerated();
            onClose();

            // Reset form
            setTopic('');
            setSourceUrl('');
            setTone('casual');
            setSelectedPlatforms(['twitter']);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate content');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        <span>✨</span> AI Generate Post
                    </h2>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                <div className={styles.body}>
                    {/* Topic Input */}
                    <div className={styles.field}>
                        <label className={styles.label}>What do you want to post about?</label>
                        <textarea
                            className={styles.textarea}
                            placeholder="e.g., Announce our new product launch, share tips about productivity, promote our upcoming webinar..."
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* URL Input */}
                    <div className={styles.field}>
                        <label className={styles.label}>
                            Reference URL <span className={styles.optional}>(optional)</span>
                        </label>
                        <input
                            type="url"
                            className={styles.input}
                            placeholder="https://example.com/article-to-summarize"
                            value={sourceUrl}
                            onChange={e => setSourceUrl(e.target.value)}
                        />
                    </div>

                    {/* Tone Selection */}
                    <div className={styles.field}>
                        <label className={styles.label}>Tone</label>
                        <div className={styles.toneGroup}>
                            {(['casual', 'professional', 'promotional'] as ToneType[]).map(t => (
                                <button
                                    key={t}
                                    className={`${styles.toneBtn} ${tone === t ? styles.toneBtnActive : ''}`}
                                    onClick={() => setTone(t)}
                                >
                                    {t === 'casual' && '😊'}
                                    {t === 'professional' && '💼'}
                                    {t === 'promotional' && '🎉'}
                                    <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Platform Selection */}
                    <div className={styles.field}>
                        <label className={styles.label}>Generate for</label>
                        <div className={styles.platformGrid}>
                            {PLATFORMS.map(platform => (
                                <button
                                    key={platform.id}
                                    className={`${styles.platformBtn} ${selectedPlatforms.includes(platform.id) ? styles.platformBtnActive : ''}`}
                                    onClick={() => togglePlatform(platform.id)}
                                    style={{
                                        '--platform-color': platform.color,
                                    } as React.CSSProperties}
                                >
                                    <span className={styles.platformIcon}>{platform.icon}</span>
                                    <span>{platform.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className={styles.error}>
                            ⚠️ {error}
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className={styles.generateBtn}
                        onClick={handleGenerate}
                        disabled={isGenerating || !topic.trim()}
                    >
                        {isGenerating ? (
                            <>
                                <span className={styles.spinner}></span>
                                Generating...
                            </>
                        ) : (
                            <>✨ Generate Posts</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
