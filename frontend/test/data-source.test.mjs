import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveDataSource } from '../src/shared/config/data-source.ts';

test('local development defaults to mock and deployment builds default to api', () => {
    assert.equal(resolveDataSource('serve', 'development'), 'mock');
    assert.equal(resolveDataSource('serve', 'api'), 'api');
    assert.equal(resolveDataSource('build', 'production'), 'api');
    assert.equal(resolveDataSource('build', 'mock'), 'mock');
    assert.equal(resolveDataSource('serve', 'development', 'api'), 'api');
});
test('invalid and unsafe mode combinations fail instead of falling back', () => {
    assert.throws(() => resolveDataSource('serve', 'development', 'typo'));
    assert.throws(() => resolveDataSource('build', 'production', 'mock'));
    assert.throws(() => resolveDataSource('serve', 'api', 'mock'));
});
