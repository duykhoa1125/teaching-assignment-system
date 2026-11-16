export class MockError extends Error {
    readonly status: number;
    readonly code: string;
    readonly location: string | null;
    readonly details?: Record<string, unknown>;

    constructor(
        status: number,
        code: string,
        message: string,
        options: {
            location?: string | null;
            details?: Record<string, unknown>;
        } = {},
    ) {
        super(message);
        this.status = status;
        this.code = code;
        this.location = options.location ?? null;
        this.details = options.details;
    }
}
