const baseUrl = normalizeBaseUrl(process.env.API_BASE_URL ?? 'http://localhost:3000/api/v1');

const checks = [
  { name: 'live', path: '/health/live', expectStatus: 200 },
  { name: 'ready', path: '/health/ready', expectStatus: 200 },
  { name: 'health', path: '/health', expectStatus: 200 },
  { name: 'openapi', path: '/openapi.json', expectStatus: 200 },
];

for (const check of checks) {
  const url = `${baseUrl}${check.path}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (response.status !== check.expectStatus) {
    const text = await response.text();
    throw new Error(`${check.name} smoke failed: ${response.status} ${url} ${text.slice(0, 300)}`);
  }

  if (check.name === 'openapi') {
    const document = await response.json();
    if (!String(document.openapi ?? '').startsWith('3.')) {
      throw new Error('openapi smoke failed: missing OpenAPI 3.x document');
    }
  }

  console.log(`OK ${check.name}: ${url}`);
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, '');
}
