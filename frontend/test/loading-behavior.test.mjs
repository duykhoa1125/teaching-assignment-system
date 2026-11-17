import assert from 'node:assert/strict';
import test from 'node:test';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { retainScopedList } from '../src/shared/query/retain-scoped-list.ts';

test('filtering retains results, a new context clears them, and errors do not masquerade as success', async () => {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    const old = [{ id: 11 }];
    client.setQueryData(
        ['preparation', 'demands', { semester_id: 1, q: '' }],
        old,
    );
    let resolveRequest;
    let rejectRequest;
    const options = (filters) => ({
        queryKey: ['preparation', 'demands', filters],
        queryFn: () =>
            new Promise((resolve, reject) => {
                resolveRequest = resolve;
                rejectRequest = reject;
            }),
        placeholderData: retainScopedList(filters, ['semester_id']),
        staleTime: Infinity,
    });
    const observer = new QueryObserver(
        client,
        options({ semester_id: 1, q: '' }),
    );
    const unsubscribe = observer.subscribe(() => {});
    try {
        observer.setOptions(options({ semester_id: 1, q: 'new' }));
        assert.equal(observer.getCurrentResult().isPlaceholderData, true);
        assert.deepEqual(observer.getCurrentResult().data, old);
        assert.equal(observer.getCurrentResult().isFetching, true);
        resolveRequest([{ id: 12 }]);
        await new Promise((resolve) => setImmediate(resolve));
        assert.deepEqual(observer.getCurrentResult().data, [{ id: 12 }]);
        assert.equal(observer.getCurrentResult().isPlaceholderData, false);
        observer.setOptions(options({ semester_id: 2, q: 'new' }));
        assert.equal(observer.getCurrentResult().data, undefined);
        assert.equal(observer.getCurrentResult().isPending, true);
        resolveRequest([{ id: 21 }]);
        await new Promise((resolve) => setImmediate(resolve));
        observer.setOptions(options({ semester_id: 2, q: 'failure' }));
        assert.deepEqual(observer.getCurrentResult().data, [{ id: 21 }]);
        rejectRequest(new Error('unavailable'));
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(observer.getCurrentResult().isError, true);
        assert.equal(observer.getCurrentResult().data, undefined);
    } finally {
        unsubscribe();
        client.clear();
    }
});

test('scope guards prevent carrying rows across school, round, scope or applicability changes', () => {
    for (const key of [
        'school_id',
        'round_id',
        'scope_id',
        'applicability_id',
        'semester_id',
    ]) {
        const retain = retainScopedList({ [key]: 2, offset: 20 }, [key]);
        assert.equal(
            retain(['old'], { queryKey: ['list', { [key]: 1, offset: 0 }] }),
            undefined,
        );
        assert.deepEqual(
            retain(['old'], { queryKey: ['list', { [key]: 2, offset: 0 }] }),
            ['old'],
        );
    }
});
