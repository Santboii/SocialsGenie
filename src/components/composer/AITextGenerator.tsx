'use client';

import { useState } from 'react';
import { PlatformId } from '@/types';
import styles from './Composer.module.css';

interface AITextGeneratorProps {
    onGenerate: (content: string) => void;
    onClose: () => void;
    platform: PlatformId;
}

export default function AITextGenerator({ onGenerate, onClose, platform }: AITextGeneratorProps) {
    const [aiTopic, setAiTopic] = useState('');
    const [originalAiTopic, setOriginalAiTopic] = useState<string | null>(null);
    const [isAiTopicOptimized, setIsAiTopicOptimized] = useState(false);
    const [isOptimizingAiTopic, setIsOptimizingAiTopic] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleOptimizeAiTopic = async () => {
        if (!aiTopic || isOptimizingAiTopic) return;

        setIsOptimizingAiTopic(true);
        try {
            const response = await fetch('/api/ai/optimize-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiTopic, platform })
            });

            if (!response.ok) throw new Error('Failed to optimize');

            const data = await response.json();
            setOriginalAiTopic(aiTopic);
            setAiTopic(data.optimizedPrompt);
            setIsAiTopicOptimized(true);
        } catch (error: any) {
            console.error('Topic optimization failed', error);
            setError(error.message);
        } finally {
            setIsOptimizingAiTopic(false);
        }
    };

    const handleRevertAiTopic = () => {
        if (originalAiTopic) {
            setAiTopic(originalAiTopic);
            setOriginalAiTopic(null);
            setIsAiTopicOptimized(false);
        }
    };

    const handleAIGenerate = async () => {
        if (!aiTopic) return;

        setIsGeneratingAI(true);
        setError(null);

        try {
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: aiTopic,
                    platform: platform,
                })
            });

            if (!response.ok) throw new Error('Failed to generate');

            const data = await response.json();
            onGenerate(data.post.content);
            // We successfully generated content, let's close the panel
            onClose();

        } catch (error: any) {
            console.error('Generation failed', error);
            setError(error.message || 'Failed to generate post.');
        } finally {
            setIsGeneratingAI(false);
        }
    };

    return (
        <div
            className={styles.aiPopoverFromButton}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={styles.aiPopoverHeader}>
                <h3 className={styles.aiPopoverTitle}>
                    <span>✨</span> AI Text
                </h3>
                <button
                    onClick={onClose}
                    className={styles.aiPopoverClose}
                >
                    ✕
                </button>
            </div>

            <div className={styles.aiPopoverBody}>
                <div>
                    <label className={styles.aiPopoverLabel}>
                        What would you like to post about?
                    </label>
                    <textarea
                        value={aiTopic}
                        onChange={(e) => {
                            setAiTopic(e.target.value);
                            if (isAiTopicOptimized) {
                                setIsAiTopicOptimized(false);
                                setOriginalAiTopic(null);
                            }
                        }}
                        className={`${styles.aiPopoverTextarea} ${isAiTopicOptimized ? styles.optimizedTextarea : ''}`}
                        placeholder="e.g., Announcing our summer collection..."
                        autoFocus
                    />
                    <div className={styles.optimizeRow}>
                        <button
                            onClick={handleOptimizeAiTopic}
                            disabled={!aiTopic || isOptimizingAiTopic || isAiTopicOptimized}
                            className={styles.optimizeBtnSecondary}
                            type="button"
                        >
                            {isOptimizingAiTopic ? (
                                <>
                                    <span className={styles.spinner} />
                                    <span>Optimizing...</span>
                                </>
                            ) : isAiTopicOptimized ? (
                                <>
                                    <span>✨</span>
                                    <span>Prompt optimized</span>
                                </>
                            ) : (
                                <>
                                    <span>✨</span>
                                    <span>Optimize Prompt</span>
                                </>
                            )}
                        </button>
                        {isAiTopicOptimized && originalAiTopic && (
                            <button
                                onClick={handleRevertAiTopic}
                                className={styles.revertBtn}
                                type="button"
                            >
                                ↩ Revert
                            </button>
                        )}
                    </div>
                </div>

                {error && <div className={styles.errorText}>{error}</div>}

                <div className={styles.aiPopoverActions}>
                    <button
                        onClick={handleAIGenerate}
                        disabled={isGeneratingAI || !aiTopic}
                        className={styles.aiPopoverSubmit}
                    >
                        {isGeneratingAI ? (
                            <>
                                <span className={styles.spinner} />
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <span>✨</span>
                                <span>Generate</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
