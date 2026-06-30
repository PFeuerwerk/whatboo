import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const filePath = resolve(process.cwd(), '../../docs/api/openapi.yml');
const raw = readFileSync(filePath, 'utf8');
let document;

try {
  document = JSON.parse(raw);
} catch (error) {
  throw new Error(`docs/api/openapi.yml debe ser JSON valido: ${error.message}`);
}

const operations = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace']);

assert(document.openapi?.startsWith('3.'), 'openapi debe declarar version 3.x');
assert(document.info?.title, 'info.title es obligatorio');
assert(document.info?.version, 'info.version es obligatorio');
assert(isPlainObject(document.paths), 'paths debe ser un objeto');
assert(isPlainObject(document.components?.schemas), 'components.schemas debe ser un objeto');

for (const [path, pathItem] of Object.entries(document.paths)) {
  assert(path.startsWith('/'), `path invalido: ${path}`);
  assert(isPlainObject(pathItem), `path item invalido: ${path}`);

  for (const [method, operation] of Object.entries(pathItem)) {
    if (!operations.has(method)) continue;
    assert(operation.summary, `${method.toUpperCase()} ${path} necesita summary`);
    assert(isPlainObject(operation.responses), `${method.toUpperCase()} ${path} necesita responses`);
  }
}

const refs = collectRefs(document);
for (const ref of refs) {
  assert(ref.startsWith('#/'), `Solo se permiten refs locales: ${ref}`);
  const target = ref
    .slice(2)
    .split('/')
    .reduce((current, segment) => current?.[segment], document);
  assert(target !== undefined, `Referencia no resuelta: ${ref}`);
}

console.log(`OpenAPI OK: ${Object.keys(document.paths).length} paths, ${refs.length} refs validadas.`);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function collectRefs(value, refs = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, refs);
    return refs;
  }

  if (!isPlainObject(value)) return refs;

  for (const [key, child] of Object.entries(value)) {
    if (key === '$ref' && typeof child === 'string') {
      refs.push(child);
      continue;
    }
    collectRefs(child, refs);
  }

  return refs;
}
