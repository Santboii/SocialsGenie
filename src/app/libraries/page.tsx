'use client';

import { useState, useEffect } from 'react';
import { Plus, Library as LibraryIcon, MoreVertical, FileText, Check, Pause } from 'lucide-react';
import styles from './Libraries.module.css';
import { ContentLibrary } from '@/types';
import Modal from '@/components/ui/Modal';

const PRESET_COLORS = [
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#ef4444', // Red
    '#14b8a6', // Teal
];

export default function LibrariesPage() {
    const [libraries, setLibraries] = useState<(ContentLibrary & { post_count?: number })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [color, setColor] = useState(PRESET_COLORS[0]);
    const [isPaused, setIsPaused] = useState(false);
    const [autoRemix, setAutoRemix] = useState(false);
    const [generateImages, setGenerateImages] = useState(false);
    const [editingLibraryId, setEditingLibraryId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchLibraries();
    }, []);

    const fetchLibraries = async () => {
        try {
            const res = await fetch('/api/libraries');
            if (res.ok) {
                const data = await res.json();
                setLibraries(data);
            }
        } catch (error) {
            console.error('Failed to fetch libraries', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setColor(PRESET_COLORS[0]);
        setIsPaused(false);
        setAutoRemix(false);
        setGenerateImages(false);
        setEditingLibraryId(null);
    };

    const handleEdit = (lib: ContentLibrary & { post_count?: number }) => {
        setName(lib.name);
        setColor(lib.color);
        setIsPaused(lib.is_paused);
        setAutoRemix(lib.auto_remix);
        setGenerateImages(lib.generate_images || false);
        setEditingLibraryId(lib.id);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const url = '/api/libraries';
            const method = editingLibraryId ? 'PUT' : 'POST';
            const body = {
                id: editingLibraryId, // Included but ignored by POST
                name,
                color,
                is_paused: isPaused,
                auto_remix: autoRemix,
                generate_images: generateImages
            };

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setIsModalOpen(false);
                resetForm();
                fetchLibraries();
            }
        } catch (error) {
            console.error('Failed to create/update library', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Content Libraries</h1>
                    <p className={styles.subtitle}>Manage your evergreen content assets and queues.</p>
                </div>
                <button className={styles.addButton} onClick={() => { resetForm(); setIsModalOpen(true); }}>
                    <Plus size={20} />
                    New Library
                </button>
            </div>

            <div className={styles.grid}>
                {isLoading ? (
                    // Skeleton Loading State
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className={styles.card} style={{ cursor: 'default' }}>
                            <div className={styles.cardHeader}>
                                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', opacity: 0.5 }} />
                                <div style={{ width: 60, height: 24, borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', opacity: 0.5 }} />
                            </div>
                            <div style={{ height: 24, width: '70%', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', opacity: 0.5 }} />
                            <div style={{ height: 16, width: '40%', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', opacity: 0.5 }} />
                        </div>
                    ))
                ) : libraries.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>
                            <LibraryIcon size={48} />
                        </div>
                        <h3 className={styles.emptyTitle}>No Libraries Yet</h3>
                        <p className={styles.emptyText}>Create your first content library to start organizing your evergreen posts.</p>
                        <button className={styles.emptyButton} onClick={() => setIsModalOpen(true)}>
                            <Plus size={18} />
                            Create Library
                        </button>
                    </div>
                ) : (
                    libraries.map((lib) => (
                        <div key={lib.id} className={styles.card} onClick={() => handleEdit(lib)}>
                            <div className={styles.cardHeader}>
                                <div
                                    className={styles.libraryIcon}
                                    style={{ backgroundColor: lib.color }}
                                >
                                    <LibraryIcon size={24} />
                                </div>
                                <span className={`${styles.badge} ${lib.is_paused ? styles.paused : styles.active}`}>
                                    {lib.is_paused ? 'Paused' : 'Active'}
                                </span>
                            </div>

                            <h3 className={styles.cardTitle} style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                {lib.name}
                            </h3>

                            <div className={styles.postCount}>
                                <FileText size={16} />
                                <span>{lib.post_count || 0} posts in queue</span>
                            </div>

                            {lib.auto_remix && (
                                <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>✨ AI Auto-Remix Enabled</span>
                                </div>
                            )}
                            {lib.generate_images && (
                                <div style={{ marginTop: lib.auto_remix ? '0.25rem' : '1rem', fontSize: '0.8rem', color: '#ec4899', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>🎨 Auto-Generate Images</span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingLibraryId ? "Edit Content Library" : "Create Content Library"}
                footer={
                    <>
                        <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={() => setIsModalOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="create-library-form" // Link button to form
                            className={styles.submitBtn}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (editingLibraryId ? 'Saving...' : 'Creating...') : (editingLibraryId ? 'Save Changes' : 'Create Library')}
                        </button>
                    </>
                }
            >
                <form id="create-library-form" onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Library Name</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="e.g. Motivational Quotes"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Color Code</label>
                        <div className={styles.colorGrid}>
                            {PRESET_COLORS.map(c => (
                                <div
                                    key={c}
                                    className={`${styles.colorOption} ${color === c ? styles.selected : ''}`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setColor(c)}
                                />
                            ))}
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.checkbox}>
                            <input
                                type="checkbox"
                                checked={autoRemix}
                                onChange={e => setAutoRemix(e.target.checked)}
                            />
                            <div>
                                <span style={{ display: 'block', fontWeight: 500 }}>Enable AI Smart Remix ✨</span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Automatically rephrase posts before publishing.
                                </span>
                            </div>
                        </label>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.checkbox}>
                            <input
                                type="checkbox"
                                checked={generateImages}
                                onChange={e => setGenerateImages(e.target.checked)}
                            />
                            <div>
                                <span style={{ display: 'block', fontWeight: 500 }}>Auto-Generate Images 🎨</span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Create visuals using AI if none provided.
                                </span>
                            </div>
                        </label>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.checkbox}>
                            <input
                                type="checkbox"
                                checked={isPaused}
                                onChange={e => setIsPaused(e.target.checked)}
                            />
                            <span>Start as Paused</span>
                        </label>
                    </div>
                </form>
            </Modal>

        </div>
    );
}
