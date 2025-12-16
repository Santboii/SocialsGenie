'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Suggestion, PLATFORMS, PlatformId } from '@/types';
import { getSuggestions, updateSuggestion, deleteSuggestion, createPost } from '@/lib/storage';
import AIComposeModal from '@/components/ai/AIComposeModal';
import styles from './page.module.css';

export default function SuggestionsPage() {
    const router = useRouter();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showAIModal, setShowAIModal] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Scheduling state per suggestion
    const [scheduleData, setScheduleData] = useState<Record<string, { date: string; time: string }>>({});

    useEffect(() => {
        loadSuggestions();
    }, []);

    const loadSuggestions = () => {
        setSuggestions(getSuggestions());
    };

    const getMinDate = (): string => {
        const now = new Date();
        return now.toISOString().split('T')[0];
    };

    const getScheduledAt = (suggestionId: string): string | undefined => {
        const data = scheduleData[suggestionId];
        if (!data?.date || !data?.time) return undefined;
        return new Date(`${data.date}T${data.time}`).toISOString();
    };

    const updateSchedule = (suggestionId: string, field: 'date' | 'time', value: string) => {
        setScheduleData(prev => ({
            ...prev,
            [suggestionId]: {
                ...prev[suggestionId],
                [field]: value,
            },
        }));
    };

    const handleApprove = (suggestion: Suggestion, platformId: PlatformId, schedule: boolean = false) => {
        const variant = suggestion.variants.find(v => v.platformId === platformId);
        if (!variant) return;

        const scheduledAt = schedule ? getScheduledAt(suggestion.id) : undefined;
        const status = scheduledAt ? 'scheduled' : 'draft';

        createPost(variant.content, [platformId], status, scheduledAt);
        updateSuggestion(suggestion.id, { status: 'approved' });
        loadSuggestions();

        if (scheduledAt) {
            // Stay on suggestions page, show feedback
        } else {
            router.push('/compose');
        }
    };

    const handleApproveAll = (suggestion: Suggestion, schedule: boolean = false) => {
        const scheduledAt = schedule ? getScheduledAt(suggestion.id) : undefined;
        const status = scheduledAt ? 'scheduled' : 'draft';

        suggestion.variants.forEach(variant => {
            createPost(variant.content, [variant.platformId], status, scheduledAt);
        });

        updateSuggestion(suggestion.id, { status: 'approved' });
        loadSuggestions();

        if (!scheduledAt) {
            router.push('/compose');
        }
    };

    const handleReject = (id: string) => {
        deleteSuggestion(id);
        loadSuggestions();
    };

    const formatSchedulePreview = (suggestionId: string): string => {
        const data = scheduleData[suggestionId];
        if (!data?.date || !data?.time) return '';
        const date = new Date(`${data.date}T${data.time}`);
        return date.toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const pendingSuggestions = suggestions.filter(s => s.status === 'pending');

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>AI Suggestions</h1>
                <button
                    className={styles.generateBtn}
                    onClick={() => setShowAIModal(true)}
                >
                    ✨ Generate New
                </button>
            </div>

            {pendingSuggestions.length === 0 ? (
                <div className={styles.empty}>
                    <span className={styles.emptyIcon}>💡</span>
                    <h2>No suggestions yet</h2>
                    <p>Generate AI-powered posts to get started</p>
                    <button
                        className={styles.emptyBtn}
                        onClick={() => setShowAIModal(true)}
                    >
                        ✨ Generate Posts
                    </button>
                </div>
            ) : (
                <div className={styles.suggestionsList}>
                    {pendingSuggestions.map(suggestion => {
                        const hasSchedule = scheduleData[suggestion.id]?.date && scheduleData[suggestion.id]?.time;

                        return (
                            <div
                                key={suggestion.id}
                                className={`${styles.suggestionCard} ${expandedId === suggestion.id ? styles.expanded : ''}`}
                            >
                                <div
                                    className={styles.cardHeader}
                                    onClick={() => setExpandedId(expandedId === suggestion.id ? null : suggestion.id)}
                                >
                                    <div className={styles.cardInfo}>
                                        <span className={styles.toneBadge}>
                                            {suggestion.tone === 'casual' && '😊'}
                                            {suggestion.tone === 'professional' && '💼'}
                                            {suggestion.tone === 'promotional' && '🎉'}
                                            {suggestion.tone}
                                        </span>
                                        <h3 className={styles.topic}>{suggestion.topic}</h3>
                                    </div>
                                    <div className={styles.cardMeta}>
                                        <span className={styles.variantCount}>
                                            {suggestion.variants.length} variant{suggestion.variants.length !== 1 ? 's' : ''}
                                        </span>
                                        <span className={styles.expandIcon}>
                                            {expandedId === suggestion.id ? '▲' : '▼'}
                                        </span>
                                    </div>
                                </div>

                                {expandedId === suggestion.id && (
                                    <div className={styles.cardBody}>
                                        {suggestion.variants.map(variant => {
                                            const platform = PLATFORMS.find(p => p.id === variant.platformId);
                                            return (
                                                <div key={variant.platformId} className={styles.variant}>
                                                    <div className={styles.variantHeader}>
                                                        <span
                                                            className={styles.platformBadge}
                                                            style={{ color: platform?.color }}
                                                        >
                                                            {platform?.icon} {platform?.name}
                                                        </span>
                                                        <span className={styles.charCount}>
                                                            {variant.content.length} chars
                                                        </span>
                                                    </div>
                                                    <p className={styles.variantContent}>
                                                        {variant.content}
                                                    </p>
                                                    <div className={styles.variantActions}>
                                                        <button
                                                            className={styles.approveBtn}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleApprove(suggestion, variant.platformId, false);
                                                            }}
                                                        >
                                                            ✅ Use as Draft
                                                        </button>
                                                        {hasSchedule && (
                                                            <button
                                                                className={styles.scheduleVariantBtn}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleApprove(suggestion, variant.platformId, true);
                                                                }}
                                                            >
                                                                📅 Schedule This
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Scheduling Section */}
                                        <div className={styles.scheduleSection}>
                                            <div className={styles.scheduleHeader}>
                                                <span>📅</span>
                                                <span>Schedule for later</span>
                                            </div>
                                            <div className={styles.schedulePicker}>
                                                <div className={styles.scheduleInputGroup}>
                                                    <label>Date</label>
                                                    <input
                                                        type="date"
                                                        className={styles.scheduleInput}
                                                        value={scheduleData[suggestion.id]?.date || ''}
                                                        onChange={(e) => updateSchedule(suggestion.id, 'date', e.target.value)}
                                                        min={getMinDate()}
                                                    />
                                                </div>
                                                <div className={styles.scheduleInputGroup}>
                                                    <label>Time</label>
                                                    <input
                                                        type="time"
                                                        className={styles.scheduleInput}
                                                        value={scheduleData[suggestion.id]?.time || ''}
                                                        onChange={(e) => updateSchedule(suggestion.id, 'time', e.target.value)}
                                                    />
                                                </div>
                                                {hasSchedule && (
                                                    <div className={styles.schedulePreview}>
                                                        🕐 {formatSchedulePreview(suggestion.id)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className={styles.cardActions}>
                                            <button
                                                className={styles.approveAllBtn}
                                                onClick={() => handleApproveAll(suggestion, false)}
                                            >
                                                ✅ Save All as Drafts
                                            </button>
                                            {hasSchedule && (
                                                <button
                                                    className={styles.scheduleAllBtn}
                                                    onClick={() => handleApproveAll(suggestion, true)}
                                                >
                                                    📅 Schedule All
                                                </button>
                                            )}
                                            <button
                                                className={styles.rejectBtn}
                                                onClick={() => handleReject(suggestion.id)}
                                            >
                                                🗑️ Discard
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <AIComposeModal
                isOpen={showAIModal}
                onClose={() => setShowAIModal(false)}
                onGenerated={loadSuggestions}
            />
        </div>
    );
}
