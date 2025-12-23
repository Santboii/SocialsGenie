import styles from '../privacy/legal.module.css';

interface PageProps {
    searchParams: Promise<{ code?: string }>;
}

export default async function DataDeletionStatusPage({ searchParams }: PageProps) {
    const { code } = await searchParams;

    return (
        <div className={styles.legalContainer}>
            <h1 className={styles.title}>Data Deletion Request</h1>

            <section className={styles.section}>
                <h2>Request Status</h2>
                {code ? (
                    <>
                        <p>
                            <strong>Confirmation Code:</strong> {code}
                        </p>
                        <p>
                            <strong>Status:</strong> ✅ Completed
                        </p>
                        <p>
                            Your data deletion request has been processed. All data associated
                            with your Facebook/Instagram account has been removed from SocialsGenie,
                            including:
                        </p>
                        <ul>
                            <li>Connected social media accounts</li>
                            <li>Posts and drafts</li>
                            <li>Activity history</li>
                            <li>Brand profile settings</li>
                        </ul>
                    </>
                ) : (
                    <p>
                        No confirmation code provided. If you submitted a data deletion request
                        through Facebook, please use the link provided in your confirmation.
                    </p>
                )}
            </section>

            <section className={styles.section}>
                <h2>Questions?</h2>
                <p>
                    If you have questions about your data deletion request, please contact us at{' '}
                    <a href="mailto:privacy@socialsgenie.com">privacy@socialsgenie.com</a>
                </p>
            </section>
        </div>
    );
}
