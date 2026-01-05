'use client';

import { useState } from 'react';
import styles from './WaitlistForm.module.css';

export default function WaitlistForm() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setStatus('loading');
        setMessage('');

        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Something went wrong');
            }

            setStatus('success');
            setMessage(data.message || "You're on the list! Watch your inbox.");
            setEmail('');
        } catch (err: unknown) {
            setStatus('error');
            setMessage(err instanceof Error ? err.message : 'Failed to join. Please try again.');
        }
    };

    return (
        <div className={styles.container}>
            {status === 'success' ? (
                <div className={styles.successMessage}>
                    <span className={styles.icon}>🎉</span>
                    <p>{message}</p>
                    <button
                        onClick={() => setStatus('idle')}
                        className={styles.resetBtn}
                    >
                        Register another email
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email address"
                            className={styles.input}
                            required
                            disabled={status === 'loading'}
                        />
                        <button
                            type="submit"
                            className={styles.button}
                            disabled={status === 'loading'}
                        >
                            {status === 'loading' ? (
                                <span className={styles.spinner} />
                            ) : (
                                <>
                                    <span>Join Waitlist</span>
                                    <span className={styles.arrow}>→</span>
                                </>
                            )}
                        </button>
                    </div>
                    {status === 'error' && (
                        <p className={styles.errorMessage}>{message}</p>
                    )}
                    <p className={styles.note}>
                        Get early access + exclusive launch pricing.
                    </p>
                </form>
            )}
        </div>
    );
}
