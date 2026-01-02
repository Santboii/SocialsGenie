

export type LogPlatform = 'bluesky' | 'linkedin' | 'twitter' | 'facebook' | 'pinterest' | 'system';

export interface LogContext {
    platform: LogPlatform;
    action: string;
    postId?: string;
    userId?: string;
    requestId?: string;
    [key: string]: any;
}

export class SocialLogger {
    private static SENSITIVE_KEYS = new Set([
        'token',
        'access_token',
        'refresh_token',
        'secret',
        'key',
        'password',
        'authorization',
        'dpop',
        'cookie',
        'privateKey',
        'publicKey'
    ]);

    /**
     * Recursively redacts sensitive information from objects
     */
    private static redact(data: any): any {
        if (!data) return data;
        if (typeof data !== 'object') return data;

        if (Array.isArray(data)) {
            return data.map(item => this.redact(item));
        }

        const redacted: any = {};
        for (const [key, value] of Object.entries(data)) {
            // Check if key is sensitive (case-insensitive partial match for safety)
            const lowerKey = key.toLowerCase();
            const isSensitive = Array.from(this.SENSITIVE_KEYS).some(k => lowerKey.includes(k.toLowerCase()));

            if (isSensitive && value) {
                redacted[key] = '[REDACTED]';
            } else if (typeof value === 'object') {
                redacted[key] = this.redact(value);
            } else {
                redacted[key] = value;
            }
        }
        return redacted;
    }

    private static log(level: 'info' | 'warn' | 'error', context: LogContext, message: string, data?: any) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context: {
                ...context,
                requestId: context.requestId || globalThis.crypto.randomUUID(),
            },
            data: data ? this.redact(data) : undefined,
        };

        // In development, pretty print. In production, single-line JSON.
        if (process.env.NODE_ENV === 'development') {
            console[level](JSON.stringify(entry, null, 2));
        } else {
            console[level](JSON.stringify(entry));
        }
    }

    static info(context: LogContext, message: string, data?: any) {
        this.log('info', context, message, data);
    }

    static warn(context: LogContext, message: string, data?: any) {
        this.log('warn', context, message, data);
    }

    static error(context: LogContext, message: string, error?: any) {
        // Handle Error objects specifically to extract stack traces
        const errorData = error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause
        } : error;

        this.log('error', context, message, errorData);
    }
}
