'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './Schedule.module.css';
import { ContentLibrary, WeeklySlot, PlatformId, PLATFORMS } from '@/types';
import { useWeeklySlots, useLibraries } from '@/hooks/useQueries';
import { DndContext, DragEndEvent, useDraggable, useDroppable, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/constants';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0-23
const EMPTY_SLOTS: WeeklySlot[] = [];

// --- Draggable Slot Component ---
function DraggableSlot({ slot, onClick, onDelete, isOverlay = false }: { slot: WeeklySlot & { content_libraries?: any }, onClick?: (e: React.MouseEvent) => void, onDelete?: (e: React.MouseEvent, id: string) => void, isOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `slot-${slot.id}`,
        data: slot,
    });

    const [hour] = slot.time_of_day.split(':').map(Number);
    const top = hour * 60; // 60px per hour - relative to parent day column

    const style: React.CSSProperties = {
        top: isOverlay ? 0 : `${top + 4}px`, // In overlay, we let DndContext handle positioning or reset relative top
        height: `52px`,
        backgroundColor: slot.content_libraries?.color || '#6366f1',
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0 : 1, // Hide original when dragging (we use overlay)
        zIndex: isOverlay ? 999 : (isDragging ? 100 : 10),
        position: isOverlay ? 'relative' : 'absolute',
        left: isOverlay ? 0 : '4px',
        right: isOverlay ? 0 : '4px',
        width: isOverlay ? '100%' : 'auto',
        boxShadow: isOverlay ? '0 10px 20px rgba(0,0,0,0.2)' : undefined,
        scale: isOverlay ? '1.05' : '1',
        cursor: 'grab',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={styles.slot}
            {...listeners}
            {...attributes}
            onClick={onClick}
            title={`${slot.content_libraries?.name} (${slot.time_of_day})`}
            data-dragging={isDragging}
        >
            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {slot.content_libraries?.name || 'Unknown'}
            </div>
            <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>
                {slot.time_of_day.slice(0, 5)}
            </div>
            {!isOverlay && onDelete && (
                <button
                    className={styles.deleteBtn}
                    onClick={(e) => onDelete(e, slot.id)}
                >
                    <X size={10} />
                </button>
            )}
        </div>
    );
}

// --- Droppable Cell Component ---
function DroppableCell({ dayIndex, hour, onClick, children }: { dayIndex: number, hour: number, onClick: () => void, children?: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `cell-${dayIndex}-${hour}`,
        data: { dayIndex, hour },
    });

    return (
        <div
            ref={setNodeRef}
            className={styles.hourCell}
            onClick={onClick}
            style={{
                backgroundColor: isOver ? 'var(--bg-elevated)' : undefined,
                transition: 'background-color 0.2s',
                position: 'relative' // Needed for ghost slot absolute positioning
            }}
        >
            {isOver && <div className={styles.ghostSlot} />}
            {children}
        </div>
    );
}


export default function SchedulePage() {
    const queryClient = useQueryClient();

    // Data Queries
    const { data: rawSlots, refetch: refetchSlots, isLoading: slotsLoading, isError: slotsError, error: slotsErr } = useWeeklySlots();
    const slots = rawSlots || EMPTY_SLOTS;

    const { data: libraries = [], isLoading: libsLoading, isError: libsError, error: libsErr } = useLibraries();

    const isLoading = slotsLoading || libsLoading;
    const isError = slotsError || libsError;

    // Local UI State
    const [activeDragSlot, setActiveDragSlot] = useState<WeeklySlot | null>(null);
    const [dragWidth, setDragWidth] = useState<number | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDay, setSelectedDay] = useState<number>(0);
    const [selectedHour, setSelectedHour] = useState<number>(9);
    const [selectedLibraryId, setSelectedLibraryId] = useState<string>('');
    const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>(['twitter', 'linkedin']);
    const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize library selection when libraries load
    useEffect(() => {
        if (libraries.length > 0 && !selectedLibraryId) {
            setSelectedLibraryId(libraries[0].id);
        }
    }, [libraries]);

    const handleCellClick = (dayIndex: number, hour: number) => {
        setSelectedDay(dayIndex);
        setSelectedHour(hour);
        setEditingSlotId(null); // Reset editing state
        setIsModalOpen(true);
        // Reset platforms if needed, or keep defaults
    };


    const openEditModal = (slot: WeeklySlot) => {
        setSelectedDay(slot.day_of_week);
        const [hour] = slot.time_of_day.split(':').map(Number);
        setSelectedHour(hour);
        setSelectedLibraryId(slot.library_id);
        setSelectedPlatforms(slot.platform_ids);
        setEditingSlotId(slot.id);
        setIsModalOpen(true);
    };


    const handleDeleteSlot = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this slot?')) return;

        // Optimistic Delete via Query Cache
        queryClient.setQueryData<WeeklySlot[]>(queryKeys.weeklySlots, (old) => {
            if (!old) return [];
            return old.filter(s => s.id !== id);
        });

        try {
            await fetch(`/api/schedule/slots?id=${id}`, { method: 'DELETE' });
            refetchSlots();
        } catch (error) {
            console.error('Failed to delete slot', error);
            refetchSlots(); // Revert on failure
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const timeString = `${selectedHour.toString().padStart(2, '0')}:00:00`;

        try {
            const url = '/api/schedule/slots';
            const method = editingSlotId ? 'PUT' : 'POST';
            const body = {
                id: editingSlotId,
                library_id: selectedLibraryId,
                day_of_week: selectedDay,
                time_of_day: timeString,
                platform_ids: selectedPlatforms
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                refetchSlots();
                setIsModalOpen(false);
            }
        } catch (error) {
            console.error('Failed to create slot', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragSlot(event.active.data.current as WeeklySlot);
        const width = event.active.rect.current.initial?.width;
        if (width) setDragWidth(width);
    };

    // Drag End Handler
    const handleDragEnd = async (event: DragEndEvent) => {
        // Clear drag state
        setActiveDragSlot(null);
        setDragWidth(null);

        const { active, over } = event;

        if (!over) return;

        const slot = active.data.current as WeeklySlot;
        const { dayIndex, hour } = over.data.current as { dayIndex: number, hour: number };

        // Check if changed
        const currentHour = parseInt(slot.time_of_day.split(':')[0]);
        if (slot.day_of_week === dayIndex && currentHour === hour) {
            return;
        }

        const timeString = `${hour.toString().padStart(2, '0')}:00:00`;
        const updatedSlot = { ...slot, day_of_week: dayIndex, time_of_day: timeString };

        // Save previous state for rollback
        const previousSlots = queryClient.getQueryData<WeeklySlot[]>(queryKeys.weeklySlots);

        // Optimistically update the cache
        queryClient.setQueryData<WeeklySlot[]>(queryKeys.weeklySlots, (old) => {
            if (!old) return [updatedSlot]; // Should rarely happen
            return old.map(s => s.id === slot.id ? updatedSlot : s);
        });
        // We now rely purely on this cache update. No local state sync needed.

        try {
            // Update via API
            const res = await fetch('/api/schedule/slots', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: slot.id,
                    library_id: slot.library_id,
                    day_of_week: dayIndex,
                    time_of_day: timeString,
                    platform_ids: slot.platform_ids
                }),
            });

            if (!res.ok) {
                // Revert only on ERROR
                console.error("Failed to update slot, reverting");
                if (previousSlots) {
                    queryClient.setQueryData(queryKeys.weeklySlots, previousSlots);
                }
                refetchSlots();
            }
        } catch (err) {
            console.error("Failed to move slot", err);
            if (previousSlots) {
                queryClient.setQueryData(queryKeys.weeklySlots, previousSlots);
            }
            refetchSlots();
        }
    };

    const togglePlatform = (id: PlatformId) => {
        if (selectedPlatforms.includes(id)) {
            setSelectedPlatforms(selectedPlatforms.filter(p => p !== id));
        } else {
            setSelectedPlatforms([...selectedPlatforms, id]);
        }
    };

    // Helper to render slots in a day column
    const renderSlotsForDay = (dayIndex: number) => {
        // Render directly from useQuery slots (which encapsulates optimistic updates)
        const daySlots = slots.filter((s: WeeklySlot) => s.day_of_week === dayIndex);

        return daySlots.map((slot: WeeklySlot & { content_libraries?: any }) => (
            <DraggableSlot
                key={slot.id}
                slot={slot}
                onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(slot);
                }}
                onDelete={handleDeleteSlot}
            />
        ));
    };

    if (isError) {
        return (
            <div className={styles.container}>
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <h2>Unable to load schedule</h2>
                    <p style={{ marginBottom: '1rem', color: 'red' }}>
                        {(slotsErr as any)?.message || (libsErr as any)?.message || 'Something went wrong.'}
                    </p>
                    <p>Please check your database migrations if this persists.</p>
                    <button
                        onClick={() => { refetchSlots(); window.location.reload(); }}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'var(--accent-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            marginTop: '1rem'
                        }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Weekly Schedule</h1>
                        <p className={styles.subtitle}>Automate your posting cadence by assigning libraries to time slots.</p>
                    </div>
                </div>

                <div className={styles.calendarWrapper}>
                    <div className={styles.daysHeader}>
                        <div className={styles.timeColHeader} />
                        {DAYS.map((day, i) => (
                            <div key={day} className={styles.dayHeader}>
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className={styles.gridScroller}>
                        <div className={styles.timeGrid}>
                            <div className={styles.timeLabels}>
                                {HOURS.map(h => (
                                    <div key={h} className={styles.timeLabel}>
                                        {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                                    </div>
                                ))}
                            </div>

                            {DAYS.map((_, dayIndex) => (
                                <div key={dayIndex} className={styles.dayColumn}>
                                    {HOURS.map(h => (
                                        <DroppableCell
                                            key={`${dayIndex}-${h}`}
                                            dayIndex={dayIndex}
                                            hour={h}
                                            onClick={() => handleCellClick(dayIndex, h)}
                                        />
                                    ))}

                                    {/* Render Slots Layered on Top */}
                                    {renderSlotsForDay(dayIndex)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DragOverlay>
                    {activeDragSlot ? (
                        <div style={{ width: dragWidth ? `${dragWidth}px` : 'var(--slot-width, 140px)' }}>
                            <DraggableSlot slot={activeDragSlot} isOverlay />
                        </div>
                    ) : null}
                </DragOverlay>

                {isModalOpen && (
                    <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <h2 className={styles.modalTitle}>
                                {editingSlotId ? 'Edit Slot' : 'Add Slot'} for {DAYS[selectedDay]} @ {selectedHour}:00
                            </h2>

                            <form onSubmit={handleSubmit}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Select Library</label>
                                    <select
                                        className={styles.select}
                                        value={selectedLibraryId}
                                        onChange={e => setSelectedLibraryId(e.target.value)}
                                        required
                                    >
                                        <option value="" disabled>Choose a library...</option>
                                        {libraries.map((lib: any) => (
                                            <option key={lib.id} value={lib.id}>
                                                {lib.name} ({lib.post_count || 0} posts)
                                            </option>
                                        ))}
                                    </select>
                                    <p className={styles.helperText}>
                                        📚 Posts from this library will be automatically published at this time slot each week.
                                    </p>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Platforms to Publish To</label>
                                    <div className={styles.platformGrid}>
                                        {PLATFORMS.filter(p => p.id !== 'threads').map(platform => {
                                            const isSelected = selectedPlatforms.includes(platform.id as PlatformId);
                                            return (
                                                <div
                                                    key={platform.id}
                                                    className={`${styles.platformOption} ${isSelected ? styles.selected : ''}`}
                                                    onClick={() => togglePlatform(platform.id as PlatformId)}
                                                    title={platform.name}
                                                >
                                                    {platform.icon}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className={styles.modalActions}>
                                    <button
                                        type="button"
                                        className={styles.cancelBtn}
                                        onClick={() => setIsModalOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={styles.submitBtn}
                                        disabled={isSubmitting || !selectedLibraryId || selectedPlatforms.length === 0}
                                    >
                                        {editingSlotId ? 'Save Changes' : 'Add Slot'}
                                    </button>
                                </div>
                            </form>
                        </div >
                    </div >
                )
                }
            </div >
        </DndContext>
    );
}
