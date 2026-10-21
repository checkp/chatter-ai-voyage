import { describe, expect, it } from 'vitest';
import {
  STARTER_FULLSTACK, exportFiles, parseBundle, projectParts, renderPage, resolvePage, serializeBundle,
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
