export function resolveDataSource(
    command: string,
    mode: string,
    configured?: string,
): 'mock' | 'api' {
    if (
        configured !== undefined &&
        configured !== '' &&
        configured !== 'mock' &&
        configured !== 'api'
    )
        throw new Error('VITE_DATA_SOURCE chỉ nhận mock hoặc api.');
    const source =
        configured ||
        (mode === 'mock' || (command === 'serve' && mode !== 'api')
            ? 'mock'
            : 'api');
    if (mode === 'api' && source !== 'api')
        throw new Error('Chế độ api không chấp nhận VITE_DATA_SOURCE=mock.');
    if (command === 'build' && mode !== 'mock' && source === 'mock')
        throw new Error(
            'Build mock cần chọn --mode mock rõ ràng; build triển khai thật dùng api.',
        );
    return source;
}
