import test from 'node:test';
import assert from 'node:assert/strict';
import tmdb from '../backend/tmdb.cjs';

test(
  'TMDB selects a trimmed token first and falls back to a server API key',
  () => {
    const key = '0'.repeat(32);
    const token = tmdb.credentialFor({ TMDB_READ_ACCESS_TOKEN: ' token-value ', TMDB_API_KEY: key });
    const bearer = tmdb.upstreamRequest('configuration', { api_key: 'client-value' }, token);
    assert.equal(bearer.headers.authorization, 'Bearer token-value');
    assert.equal(new URL(bearer.url).searchParams.has('api_key'), false);
    const fallback = tmdb.credentialFor({ TMDB_READ_ACCESS_TOKEN: ' ', TMDB_API_KEY: ` ${key} ` });
    const request = tmdb.upstreamRequest('configuration', {}, fallback);
    assert.equal(new URL(request.url).searchParams.get('api_key'), key);
    assert.equal(request.headers.authorization, undefined);
  }
);

test(
  'TMDB diagnostics expose known connection codes without error messages or URLs',
  () => {
    assert.equal(tmdb.failureCode({ name: 'TimeoutError' }), 'TIMEOUT');
    assert.equal(tmdb.failureCode({ cause: { code: 'EBUSY' } }), 'EBUSY');
    assert.equal(tmdb.failureCode({      
cause: {        
errors: [
          { code: 'ENETUNREACH' }
        ]      
}    
}), 'ENETUNREACH');
    assert.equal(
      tmdb.failureCode({ message: 'credential-value', code: 'credential-value' }),
      'CONNECTION_FAILED'
    );
  }
);
