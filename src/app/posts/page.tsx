'use client';

import { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Post, PostStatus, PlatformId, PLATFORMS } from '@/types';
import { deletePost, publishPost } from '@/lib/db';
import { usePosts, useInvalidatePosts } from '@/hooks/useQueries';
import { getPlatformIcon } from '@/components/ui/PlatformIcons';
import ConfirmModal from '@/components/ui/ConfirmModal';
import PostPopover from '@/components/calendar/PostPopover';
import styles from './page.module.css';
import { Calendar as CalendarIcon, List as ListIcon, ChevronLeft, ChevronRight, LayoutGrid, CalendarDays, Rows } from 'lucide-react';

type FilterStatus = 'all' | PostStatus;
type ViewType = 'list' | 'calendar';
type CalendarViewType = 'month' | 'week' | 'day';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function PostsPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Data
    const { data: posts = [], isLoading: loading } = usePosts();
    const invalidatePosts = useInvalidatePosts();

    // Stats
    const statusCounts = useMemo(() => ({
        all: posts.length,
        draft: posts.filter(p => p.status === 'draft').length,
        scheduled: posts.filter(p => p.status === 'scheduled').length,
        published: posts.filter(p => p.status === 'published').length,
        failed: posts.filter(p => p.status === 'failed').length,
    }), [posts]);

    // State
    const [view, setView] = useState<ViewType>('list');
    const [calendarView, setCalendarView] = useState<CalendarViewType>('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    // Filters
    const [filterStatus, setFilterStatus] = useState<FilterStatus>(() => {
        const statusParam = searchParams.get('status');
        if (statusParam && ['draft', 'scheduled', 'published', 'failed'].includes(statusParam)) {
            return statusParam as FilterStatus;
        }
        return 'all';
    });
    const [filterPlatform, setFilterPlatform] = useState<PlatformId | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [isProcessing, setIsProcessing] = useState(false);
    const [modal, setModal] = useState<{ isOpen: boolean; type: 'delete' | 'publish' | null; postId: string | null; postContent: string }>({
        isOpen: false, type: null, postId: null, postContent: ''
    });
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });

    // Filter Logic
    const filteredPosts = useMemo(() => {
        return posts.filter(post => {
            if (filterStatus !== 'all' && post.status !== filterStatus) return false;
            if (filterPlatform !== 'all' && !post.platforms.includes(filterPlatform)) return false;
            if (searchQuery && !post.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [posts, filterStatus, filterPlatform, searchQuery]);

    // Calendar Helpers
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const startPadding = firstDay.getDay();
        const days = [];

        // Previous month
        for (let i = startPadding - 1; i >= 0; i--) {
            days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
        }
        // Current month
        const lastDay = new Date(year, month + 1, 0);
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({ date: new Date(year, month, i), isCurrentMonth: true });
        }
        // Next month
        const endPadding = 42 - days.length;
        for (let i = 1; i <= endPadding; i++) {
            days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
        }
        return days;
    };

    const getWeekDays = (date: Date) => {
        const day = date.getDay();
        const diff = date.getDate() - day;
        const days = [];
        for (let i = 0; i < 7; i++) {
            days.push(new Date(date.getFullYear(), date.getMonth(), diff + i));
        }
        return days;
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    };

    const getDayPosts = (date: Date) => {
        // Use filtered posts so filters apply to calendar too
        return filteredPosts.filter(post => {
            const postDate = new Date(post.scheduledAt || post.publishedAt || post.createdAt);
            return postDate.getDate() === date.getDate() &&
                postDate.getMonth() === date.getMonth() &&
                postDate.getFullYear() === date.getFullYear();
        });
    };

    const navigate = (delta: number) => {
        const newDate = new Date(currentDate);
        if (calendarView === 'month') {
            newDate.setMonth(newDate.getMonth() + delta);
        } else if (calendarView === 'week') {
            newDate.setDate(newDate.getDate() + (delta * 7));
        } else {
            newDate.setDate(newDate.getDate() + delta);
        }
        setCurrentDate(newDate);
    };

    // Actions
    const handleEdit = (postId: string) => router.push(`/posts/${postId}`);

    const openDeleteModal = (post: Post) => {
        setModal({ isOpen: true, type: 'delete', postId: post.id, postContent: post.content });
    };

    const openPublishModal = (post: Post) => {
        setModal({ isOpen: true, type: 'publish', postId: post.id, postContent: post.content });
    };

    const handleConfirm = async () => {
        if (!modal.postId) return;
        setIsProcessing(true);
        try {
            if (modal.type === 'delete') await deletePost(modal.postId);
            else if (modal.type === 'publish') await publishPost(modal.postId);
            invalidatePosts();
            setModal({ isOpen: false, type: null, postId: null, postContent: '' });
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePostClick = (post: Post, event: React.MouseEvent) => {
        event.stopPropagation();
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        setPopoverPosition({ x: rect.right + 8, y: rect.top });
        setSelectedPost(post);
    };

    // Render Items
    const renderPostItem = (post: Post, showTime = true) => {
        const platform = PLATFORMS.find(p => p.id === post.platforms[0]);
        const borderColor = platform?.color || '#8b5cf6';
        const postDate = new Date(post.scheduledAt || post.publishedAt || post.createdAt);

        return (
            <div
                key={post.id}
                className={styles.postItem}
                style={{ borderLeftColor: borderColor }}
                onClick={(e) => handlePostClick(post, e)}
            >
                {showTime && (
                    <span className={styles.postTime}>
                        {postDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
                <span className={styles.postText}>{post.content}</span>
                <div className={styles.postPlatforms}>
                    {post.platforms.slice(0, 3).map(pId => {
                        const p = PLATFORMS.find(pl => pl.id === pId);
                        return p ? <span key={pId} style={{ color: p.color }}>{p.icon}</span> : null;
                    })}
                </div>
            </div>
        );
    };

    const statusTabs: { key: FilterStatus; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'draft', label: 'Drafts' },
        { key: 'scheduled', label: 'Scheduled' },
        { key: 'published', label: 'Published' },
        { key: 'failed', label: 'Failed' },
    ];

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>Posts</h1>
                <div className={styles.controls}>
                    <div className={styles.viewToggle}>
                        <button
                            className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`}
                            onClick={() => setView('list')}
                            title="List View"
                        >
                            <ListIcon size={16} />
                        </button>
                        <button
                            className={`${styles.viewBtn} ${view === 'calendar' ? styles.viewBtnActive : ''}`}
                            onClick={() => setView('calendar')}
                            title="Calendar View"
                        >
                            <CalendarIcon size={16} />
                        </button>
                    </div>
                    <Link href="/compose" className={styles.newBtn}>
                        + New Post
                    </Link>
                </div>
            </div>

            {/* Status Tabs */}
            <div className={styles.tabs}>
                {statusTabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`${styles.tab} ${filterStatus === tab.key ? styles.tabActive : ''}`}
                        onClick={() => setFilterStatus(tab.key)}
                    >
                        {tab.label}
                        {statusCounts[tab.key] > 0 && (
                            <span className={styles.tabCount}>{statusCounts[tab.key]}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                <select
                    className={styles.filterSelect}
                    value={filterPlatform}
                    onChange={(e) => setFilterPlatform(e.target.value as PlatformId | 'all')}
                >
                    <option value="all">All Platforms</option>
                    {PLATFORMS.map(p => (
                        <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                    ))}
                </select>

                <div className={styles.searchWrapper}>
                    <span className={styles.searchIcon}>🔍</span>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search posts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {view === 'calendar' && (
                    <div className={styles.headerControls} style={{ marginLeft: 'auto' }}>
                        <div className={styles.viewToggle}>
                            <button className={`${styles.viewBtn} ${calendarView === 'month' ? styles.viewBtnActive : ''}`} onClick={() => setCalendarView('month')}>Month</button>
                            <button className={`${styles.viewBtn} ${calendarView === 'week' ? styles.viewBtnActive : ''}`} onClick={() => setCalendarView('week')}>Week</button>
                            <button className={`${styles.viewBtn} ${calendarView === 'day' ? styles.viewBtnActive : ''}`} onClick={() => setCalendarView('day')}>Day</button>
                        </div>
                        <div className={styles.controls}>
                            <button className={styles.controlBtn} onClick={() => navigate(-1)}><ChevronLeft size={16} /></button>
                            <button className={styles.controlBtn} onClick={() => setCurrentDate(new Date())}>Today</button>
                            <button className={styles.controlBtn} onClick={() => navigate(1)}><ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* View Content */}
            {view === 'list' ? (
                // LIST VIEW
                <div className={styles.postsList}>
                    {loading ? (
                        // Skeleton Loading
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className={styles.postCard} style={{ opacity: 0.7 }}>
                                <div className={styles.postHeader} style={{ marginBottom: '1rem' }}>
                                    <div style={{ width: 80, height: 20, background: 'var(--bg-tertiary)', borderRadius: 4 }} />
                                    <div style={{ width: 120, height: 20, background: 'var(--bg-tertiary)', borderRadius: 4 }} />
                                </div>
                                <div style={{ width: '100%', height: 16, background: 'var(--bg-tertiary)', borderRadius: 4, marginBottom: 8 }} />
                                <div style={{ width: '80%', height: 16, background: 'var(--bg-tertiary)', borderRadius: 4 }} />
                            </div>
                        ))
                    ) : filteredPosts.length === 0 ? (
                        <div className={styles.empty}>
                            <span className={styles.emptyIcon}>📭</span>
                            <h2>No posts found</h2>
                            <p>{filterStatus === 'all' ? 'Create your first post to get started' : 'Try adjusting your filters'}</p>
                            {filterStatus === 'all' && <Link href="/compose" className={styles.emptyBtn}>+ Create Post</Link>}
                        </div>
                    ) : (
                        // Actual Posts List
                        filteredPosts.map(post => {
                            // ... existing list card JSX ...
                            const statusConfig = {
                                draft: { icon: '📝', label: 'Draft', className: styles.statusDraft },
                                scheduled: { icon: '📅', label: 'Scheduled', className: styles.statusScheduled },
                                published: { icon: '✅', label: 'Published', className: styles.statusPublished },
                                failed: { icon: '❌', label: 'Failed', className: styles.statusFailed },
                            }[post.status];

                            const dateInfo = (() => {
                                const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                                if (post.status === 'published' && post.publishedAt) return { label: 'Published', date: formatDate(post.publishedAt), icon: '✅', className: styles.datePublished };
                                if (post.status === 'scheduled' && post.scheduledAt) return { label: 'Scheduled', date: formatDate(post.scheduledAt), icon: '📅', className: styles.dateScheduled };
                                return { label: 'Created', date: formatDate(post.createdAt), icon: '🕐', className: styles.dateCreated };
                            })();

                            return (
                                <div key={post.id} className={styles.postCard}>
                                    <div className={styles.postHeader}>
                                        <span className={`${styles.statusBadge} ${statusConfig.className}`}>
                                            {statusConfig.icon} {statusConfig.label}
                                        </span>
                                        <span className={`${styles.postDate} ${dateInfo.className}`}>
                                            {dateInfo.icon} {dateInfo.label} {dateInfo.date}
                                        </span>
                                    </div>
                                    <p className={styles.postContent}>{post.content.length > 150 ? post.content.slice(0, 150) + '...' : post.content}</p>
                                    <div className={styles.postFooter}>
                                        <div className={styles.platforms}>
                                            {post.platforms.map(pid => (
                                                <span key={pid} className={styles.platformIcon} style={{ color: PLATFORMS.find(p => p.id === pid)?.color }}>
                                                    {getPlatformIcon(pid, 16)}
                                                </span>
                                            ))}
                                        </div>
                                        <div className={styles.actions}>
                                            <button className={styles.actionBtn} onClick={() => handleEdit(post.id)}>✏️ Edit</button>
                                            {(post.status === 'scheduled' || post.status === 'draft') && (
                                                <button className={`${styles.actionBtn} ${styles.publishBtn}`} onClick={() => openPublishModal(post)}>🚀 Publish</button>
                                            )}
                                            <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => openDeleteModal(post)}>🗑️</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }))
                    }
                </div>
            ) : (
                // CALENDAR VIEW
                <>
                    {calendarView === 'month' && (
                        <div className={styles.calendarGrid}>
                            {WEEKDAYS.map(d => <div key={d} className={styles.dayHeader}>{d}</div>)}
                            {getDaysInMonth(currentDate).map((day, idx) => (
                                <div
                                    key={idx}
                                    className={`${styles.dayCell} ${!day.isCurrentMonth ? styles.otherMonth : ''} ${isToday(day.date) ? styles.currentDay : ''}`}
                                    onClick={() => { setCurrentDate(day.date); setCalendarView('day'); }}
                                >
                                    <span className={styles.dayNumber}>{day.date.getDate()}</span>
                                    <div className={styles.postsContainer}>
                                        {getDayPosts(day.date).slice(0, 3).map(p => renderPostItem(p, false))}
                                        {getDayPosts(day.date).length > 3 && <span className={styles.morePosts}>+{getDayPosts(day.date).length - 3} more</span>}
                                    </div>
                                    <div className={styles.addPostHint} style={{ position: 'absolute', bottom: 4, right: 4, width: 24, height: 24, borderRadius: '50%', background: 'var(--gradient-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>+</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {calendarView === 'week' && (
                        <div className={styles.weekView}>
                            <div className={styles.weekHeader}>
                                <div className={styles.timeGutter}></div>
                                {WEEKDAYS.map((dayName, i) => {
                                    const dayDate = getWeekDays(currentDate)[i];
                                    return (
                                        <div key={i} className={`${styles.weekDayHeader} ${isToday(dayDate) ? styles.weekDayToday : ''}`}>
                                            <span className={styles.weekDayName}>{dayName}</span>
                                            <span className={styles.weekDayNumber}>{dayDate.getDate()}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className={styles.weekBody}>
                                <div className={styles.timeColumn}>
                                    {HOURS.map(h => <div key={h} className={styles.timeSlot}>{h}:00</div>)}
                                </div>
                                <div className={styles.weekGrid}>
                                    {WEEKDAYS.map((_, dayIndex) => (
                                        <div key={dayIndex} className={styles.weekDayColumn}>
                                            {getDayPosts(getWeekDays(currentDate)[dayIndex]).map(post => {
                                                const d = new Date(post.scheduledAt || post.publishedAt || post.createdAt);
                                                const top = (d.getHours() * 60) + d.getMinutes();
                                                const platform = PLATFORMS.find(p => p.id === post.platforms[0]);
                                                return (
                                                    <div
                                                        key={post.id}
                                                        className={styles.weekPostItem}
                                                        style={{ top: `${top}px`, borderLeftColor: platform?.color }}
                                                        onClick={(e) => handlePostClick(post, e)}
                                                    >
                                                        <span className={styles.weekPostTime}>{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span className={styles.weekPostText}>{post.content}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {calendarView === 'day' && (
                        <div className={styles.dayView}>
                            <div className={styles.dayTimeline}>
                                {HOURS.map(h => {
                                    const hourPosts = getDayPosts(currentDate).filter(p => new Date(p.scheduledAt || p.publishedAt || p.createdAt).getHours() === h);
                                    return (
                                        <div key={h} className={styles.dayTimeSlot}>
                                            <div className={styles.dayTimeLabel}>{h}:00</div>
                                            <div className={styles.dayTimeContent}>
                                                {hourPosts.map(p => renderPostItem(p, true))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )
            }

            {selectedPost && (
                <PostPopover
                    post={selectedPost}
                    position={popoverPosition}
                    onClose={() => setSelectedPost(null)}
                    onEdit={(post) => { setSelectedPost(null); router.push(`/posts/${post.id}`); }}
                    onPostUpdated={() => { invalidatePosts(); setSelectedPost(null); }}
                />
            )}

            <ConfirmModal
                isOpen={modal.isOpen}
                title={modal.type === 'delete' ? 'Delete Post?' : 'Publish Post?'}
                message={modal.type === 'delete' ? `Are you sure you want to delete this post?` : `Publish this post now?`}
                confirmText={modal.type === 'delete' ? 'Delete' : 'Publish Now'}
                variant={modal.type === 'delete' ? 'danger' : 'success'}
                onConfirm={handleConfirm}
                onCancel={() => setModal({ isOpen: false, type: null, postId: null, postContent: '' })}
                isLoading={isProcessing}
            />
        </div>
    );
}

export default function PostsPage() {
    return (
        <Suspense fallback={<div className={styles.container}>Loading...</div>}>
            <PostsPageContent />
        </Suspense>
    );
}
