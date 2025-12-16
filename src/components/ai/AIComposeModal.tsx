'use client';

import { useState } from 'react';
import { PlatformId, ToneType, PLATFORMS } from '@/types';
import { generatePosts, fetchUrlContent } from '@/lib/ai';
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

            // Fetch URL content if provided
            let urlContent: string | undefined;
            if (sourceUrl.trim()) {
                try {
                    urlContent = await fetchUrlContent(sourceUrl);
                } catch {
                    console.warn('Could not fetch URL content');
                }
            }

            const suggestion = await generatePosts({
                topic,
                tone,
                platforms: selectedPlatforms,
                sourceUrl: sourceUrl || undefined,
                urlContent,
                pastPosts,
            });

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
