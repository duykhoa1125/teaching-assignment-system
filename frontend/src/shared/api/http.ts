const API_BASE_URL = '/api';

export class ApiError extends Error {
    readonly status: number;
    readonly code: string;
    readonly details: unknown;
    readonly location: string | null;
    constructor(
        status: number,
        code: string,
        message: string,
        details?: unknown,
        location: string | null = null,
    ) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
        this.location = location;
    }
}

type QueryValue = string | number | boolean | null | undefined;
type RequestOptions = Omit<RequestInit, 'body'> & {
    json?: unknown;
    query?: Record<string, QueryValue>;
};
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export type ApiResponseMeta<T> = {
    data: T;
    status: number;
    location: string | null;
};

/** Parse `/api/solver-runs/{id}` or `/solver-runs/{id}` Location headers safely. */
export function parseSolverRunLocation(location: string | null): number | null {
    if (!location) return null;
    try {
        const parsed = new URL(location, 'http://localhost');
        const match = parsed.pathname.match(
            /^\/(?:api\/)?solver-runs\/(\d+)\/?$/,
        );
        if (!match) return null;
        const id = Number(match[1]);
        return Number.isSafeInteger(id) && id > 0 ? id : null;
    } catch {
        return null;
    }
}

/** Network and abort errors remain native errors so callers can distinguish them. */
export async function apiRequestWithMeta<T>(
    path: string,
    options: RequestOptions = {},
): Promise<ApiResponseMeta<T>> {
    if (
        !path.startsWith('/') ||
        path.startsWith('//') ||
        path.includes('?') ||
        path.includes('#')
    ) {
        throw new TypeError(
            'API path phải bắt đầu bằng /; truyền bộ lọc qua query.',
        );
    }
    const { json, query, ...init } = options;
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
        if (value !== undefined && value !== null && value !== '')
            search.set(key, String(value));
    }
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (json !== undefined) headers.set('Content-Type', 'application/json');
    const response = await fetch(
        `${API_BASE_URL}${path}${search.size ? `?${search}` : ''}`,
        {
            ...init,
            credentials: init.credentials ?? 'same-origin',
            headers,
            body: json === undefined ? undefined : JSON.stringify(json),
        },
    );
    const location = response.headers.get('Location');
    if (response.ok && response.status === 204) {
        return { data: undefined as T, status: response.status, location };
    }
    const contentType = response.headers.get('content-type') ?? '';
    const isJson =
        contentType.includes('application/json') ||
        contentType.includes('+json');
    let payload: unknown;
    if (isJson) {
        try {
            payload = await response.json();
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError')
                throw error;
            if (response.ok)
                throw new ApiError(
                    response.status,
                    'INVALID_RESPONSE',
                    'Phản hồi JSON không hợp lệ.',
                );
        }
    }
    if (!response.ok) {
        const error = isRecord(payload) ? payload : {};
        throw new ApiError(
            response.status,
            typeof error.code === 'string' ? error.code : 'HTTP_ERROR',
            typeof error.message === 'string'
                ? error.message
                : `Yêu cầu thất bại (HTTP ${response.status}).`,
            payload,
            location,
        );
    }
    if (!isJson)
        throw new ApiError(
            response.status,
            'INVALID_RESPONSE',
            'Máy chủ chưa trả về dữ liệu JSON.',
        );
    return { data: payload as T, status: response.status, location };
}

export async function apiRequest<T>(
    path: string,
    options: RequestOptions = {},
): Promise<T> {
    const response = await apiRequestWithMeta<T>(path, options);
    return response.data;
}
