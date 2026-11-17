/** Keep list results during filtering/paging, but never carry them into a different context. */
export function retainScopedList(filters: object, scopeKeys: string[]) {
    return <T>(
        data: T | undefined,
        previousQuery: { queryKey: readonly unknown[] } | undefined,
    ): T | undefined => {
        const previous = previousQuery?.queryKey.at(-1);
        if (!previous || typeof previous !== 'object') return undefined;
        const nextScope = filters as Record<string, unknown>;
        const oldScope = previous as Record<string, unknown>;
        return scopeKeys.every((key) => oldScope[key] === nextScope[key])
            ? data
            : undefined;
    };
}
