import styles from './Skeleton.module.css';

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    variant?: 'text' | 'rect' | 'card';
}

export function Skeleton({ className, width, height, variant = 'rect' }: SkeletonProps) {
    if (variant === 'card') {
        return (
            <div className={styles.card}>
                <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className={styles.cardIcon} />
                    <div className={styles.cardTitle} style={{ width: '60px', height: '20px' }} />
                </div>
                <div className={styles.cardTitle} style={{ marginTop: '1rem' }} />
                <div className={styles.cardBody} />
            </div>
        );
    }

    return (
        <div
            className={`${styles.skeleton} ${styles[variant]} ${className || ''}`}
            style={{ width, height }}
        />
    );
}
