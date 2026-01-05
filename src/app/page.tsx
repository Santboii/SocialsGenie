'use client';

import Link from 'next/link';
import { useDashboardStats, useActivities, useConnections, useBrandProfile } from '@/hooks/useQueries';
import styles from './page.module.css';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activities = [], isLoading: activitiesLoading } = useActivities();
  const { data: connections = [], isLoading: connectionsLoading } = useConnections();
  const { data: brand } = useBrandProfile();

  const isLoading = statsLoading || activitiesLoading || connectionsLoading;

  if (isLoading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <div>
            <div className="skeleton" style={{ width: '200px', height: '40px', marginBottom: '8px' }}></div>
            <div className="skeleton" style={{ width: '300px', height: '20px' }}></div>
          </div>
        </div>
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: '140px' }}></div>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Posts',
      value: stats?.totalPosts || 0,
      icon: '📊',
      trend: 'All time',
      trendUp: true,
      href: '/posts'
    },
    {
      label: 'Scheduled',
      value: stats?.scheduledPosts || 0,
      icon: '📅',
      trend: 'Upcoming',
      trendUp: true,
      href: '/posts?status=scheduled'
    },
    {
      label: 'Published',
      value: stats?.publishedPosts || 0,
      icon: '✅',
      trend: 'Live',
      trendUp: true,
      href: '/posts?status=published'
    },
    {
      label: 'Drafts',
      value: stats?.draftPosts || 0,
      icon: '📝',
      trend: 'Active',
      trendUp: false,
      href: '/posts?status=draft'
    }
  ];

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Welcome back! Here&apos;s what&apos;s happening with your content.</p>
        </div>
        <div className={styles.dateDisplay}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className={styles.welcomeSection}>
        <div className={styles.welcomeText}>
          <h2>Let AI create your next viral post</h2>
          <p>Generate platform-optimized content in seconds. Just describe your topic.</p>
        </div>
        <Link href="/compose" className={styles.createButton}>
          <span>✨ Create with AI</span>
        </Link>
      </div>

      <div className={styles.statsGrid}>
        {statCards.map((stat, index) => (
          <Link
            key={index}
            href={stat.href}
            className={`${styles.statCard} animate-fadeIn`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>{stat.label}</span>
              <span className={styles.statIcon}>{stat.icon}</span>
            </div>
            <span className={styles.statValue}>{stat.value}</span>
            <div className={styles.statTrend}>
              <span className={stat.trendUp ? styles.trendUp : styles.trendDown}>
                {stat.trend}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
        <section>
          <h2 className={styles.sectionTitle}>
            <span>Recent Activity</span>
          </h2>
          <div className={styles.activityFeed}>
            {activities.length === 0 ? (
              <div className={styles.emptyState}>No recent activity</div>
            ) : (
              activities.slice(0, 5).map((activity, index: number) => {
                // Safer date parsing
                const dateStr = activity.created_at || activity.timestamp;
                const date = dateStr ? new Date(dateStr) : new Date();
                const displayDate = !isNaN(date.getTime()) ? date.toLocaleString() : 'Just now';

                return (
                  <div key={activity.id || index} className={`${styles.activityItem} animate-slideIn`} style={{ animationDelay: `${index * 100}ms` }}>
                    <div className={styles.activityIcon} style={{
                      background: activity.type === 'published' ? 'rgba(16, 185, 129, 0.2)' :
                        activity.type === 'scheduled' ? 'rgba(59, 130, 246, 0.2)' :
                          'rgba(139, 92, 246, 0.2)',
                      color: activity.type === 'published' ? '#10b981' :
                        activity.type === 'scheduled' ? '#3b82f6' :
                          '#8b5cf6'
                    }}>
                      {activity.type === 'published' ? '✅' : activity.type === 'scheduled' ? '📅' : '📝'}
                    </div>
                    <div className={styles.activityContent}>
                      <p className={styles.activityMessage}>{activity.description || activity.message || 'Unknown activity'}</p>
                      <span className={styles.activityTime}>
                        {displayDate}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section>
          <h2 className={styles.sectionTitle}>
            <span>Suggested Actions</span>
          </h2>
          <div className={styles.actionGrid}>
            {/* Dynamic Suggestion: Connect Platform */}
            {connections.length === 0 && (
              <Link href="/settings" className={`${styles.actionCard} ${styles.actionCardPink}`}>
                <div className={styles.actionIcon}>🔌</div>
                <div className={styles.actionContent}>
                  <span className={styles.actionTitle}>Connect Accounts</span>
                  <p className={styles.actionDesc}>Link your social profiles to start posting.</p>
                </div>
                <div className={styles.actionArrow}>→</div>
              </Link>
            )}

            {/* Always Visible: Create Library */}
            <Link href="/libraries" className={`${styles.actionCard} ${styles.actionCardRed}`}>
              <div className={styles.actionIcon}>📚</div>
              <div className={styles.actionContent}>
                <span className={styles.actionTitle}>Create Content Library</span>
                <p className={styles.actionDesc}>Organize your evergreen posts and assets.</p>
              </div>
              <div className={styles.actionArrow}>→</div>
            </Link>

            {/* Always Visible: Schedule Post */}
            <Link href="/schedule" className={`${styles.actionCard} ${styles.actionCardBlue}`}>
              <div className={styles.actionIcon}>📅</div>
              <div className={styles.actionContent}>
                <span className={styles.actionTitle}>View Schedule</span>
                <p className={styles.actionDesc}>Manage your upcoming content calendar.</p>
              </div>
              <div className={styles.actionArrow}>→</div>
            </Link>

            {/* Always Visible: Brand Structure */}
            <Link href="/settings/brand" className={`${styles.actionCard} ${styles.actionCardGreen}`}>
              <div className={styles.actionIcon}>🧬</div>
              <div className={styles.actionContent}>
                <span className={styles.actionTitle}>{brand ? 'Manage Brand DNA' : 'Define Brand DNA'}</span>
                <p className={styles.actionDesc}>
                  {brand ? 'Update your AI personality and tone.' : 'Train your AI to sound exactly like you.'}
                </p>
              </div>
              <div className={styles.actionArrow}>→</div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

