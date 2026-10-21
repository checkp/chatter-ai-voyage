import { describe, expect, it } from 'vitest';
import {
  STARTER_FULLSTACK, STARTER_HERD, exportFiles, parseBundle, projectParts, renderPage,
  resolvePage, serializeBundle, splitHref,
} from '@/lib/fullstack';
import { extractArtifact } from '@/config/buildMode';

describe('full-stack bundle', () => {
  it('round-trips files through the bundle format', () => {
    const files = parseBundle(STARTER_FULLSTACK);
    expect(files.map(f => f.path)).toEqual(['db/schema.sql', 'backend/app.py', 'frontend/index.html']);
    expect(parseBundle(serializeBundle(files))).toEqual(files);
  });

  it('splits schema, routes and pages', () => {
    const p = projectParts(parseBundle(STARTER_FULLSTACK));
    expect(p.schema).toContain('CREATE TABLE IF NOT EXISTS notes');
    expect(p.app?.path).toBe('backend/app.py');
    expect(p.pages).toEqual(['frontend/index.html']);
  });

  it('resolves page links between frontend pages', () => {
    const files = parseBundle(serializeBundle([
      { path: 'frontend/index.html', content: 'a' },
      { path: 'frontend/about.html', content: 'b' },
    ]));
    expect(resolvePage(files, 'frontend/index.html', 'about.html')).toBe('frontend/about.html');
    expect(resolvePage(files, 'frontend/about.html', '/')).toBe('frontend/index.html');
    expect(resolvePage(files, 'frontend/index.html', '/about')).toBe('frontend/about.html');
    expect(resolvePage(files, 'frontend/index.html', 'missing.html')).toBeNull();
  });

  it('inlines local css/js and injects the api bridge', () => {
    const files = parseBundle(serializeBundle([
      { path: 'frontend/index.html', content: '<html><head><link rel="stylesheet" href="style.css"></head><body><script src="app.js"></script></body></html>' },
      { path: 'frontend/style.css', content: 'body{color:red}' },
      { path: 'frontend/app.js', content: 'console.log(1)' },
    ]));
    const html = renderPage(files, 'frontend/index.html');
    expect(html).toContain('body{color:red}');
    expect(html).toContain('console.log(1)');
    expect(html).toContain('__rhApi');
  });

  it('export always ships the runtime and server', () => {
    const paths = exportFiles(parseBundle(STARTER_FULLSTACK)).map(f => f.path);
    expect(paths).toEqual(expect.arrayContaining(['backend/rh.py', 'server.py', 'run_tests.py', 'README.md']));
  });

  it('extracts a project block from an agent reply', () => {
    const reply = 'Added notes.\n\n```project\n' + STARTER_FULLSTACK + '```';
    const out = extractArtifact(reply, 'fullstack');
    expect(out.lang).toBe('fullstack');
    expect(parseBundle(out.code!).length).toBe(3);
    expect(out.notes).toBe('Added notes.');
  });
});

describe('herd starter project', () => {
  const files = parseBundle(STARTER_HERD);

  it('ships schema, backend and the four pages', () => {
    expect(files.map(f => f.path)).toEqual([
      'db/schema.sql', 'backend/app.py', 'frontend/style.css', 'frontend/app.js',
      'frontend/index.html', 'frontend/model.html', 'frontend/history.html', 'frontend/admin.html',
    ]);
    const p = projectParts(files);
    expect(p.schema).toContain('CREATE TABLE IF NOT EXISTS models');
    expect(p.pages).toHaveLength(4);
  });

  it('seeds exactly nine models', () => {
    const schema = projectParts(files).schema;
    expect(schema.match(/\('[a-z0-9.-]+', '/g)).toHaveLength(9);
  });

  it('covers the asked-for routes and backend tests', () => {
    const app = files.find(f => f.path === 'backend/app.py')!.content;
    for (const route of [
      '@get("/api/models")', '@get("/api/models/<slug>")', '@patch("/api/models/<slug>")',
      '@get("/api/chats")', '@post("/api/chats")', '@get("/api/chats/<cid>")',
      '@post("/api/chats/<cid>/messages")', '@delete("/api/chats/<cid>")', '@get("/api/admin/stats")',
    ]) expect(app).toContain(route);
    expect(app.match(/^def test_/gm)!.length).toBeGreaterThanOrEqual(5);
  });

  it('links model cards to the details page with a slug query', () => {
    const index = files.find(f => f.path === 'frontend/index.html')!.content;
    expect(index).toContain('model.html?slug=');
    expect(resolvePage(files, 'frontend/index.html', 'model.html?slug=gpt-6.1-sol')).toBe('frontend/model.html');
  });

  it('passes the navigation query into the rendered page', () => {
    const html = renderPage(files, 'frontend/model.html', 'slug=gpt-6.1-sol');
    expect(html).toContain('window.__RH_QUERY__="slug=gpt-6.1-sol"');
    expect(html).toContain('__rhApi');
  });

  it('splits hrefs into path and query', () => {
    expect(splitHref('model.html?slug=gpt-5')).toEqual({ path: 'model.html', query: 'slug=gpt-5' });
    expect(splitHref('history.html')).toEqual({ path: 'history.html', query: '' });
    expect(splitHref('a.html?x=1#top')).toEqual({ path: 'a.html', query: 'x=1' });
  });
});
