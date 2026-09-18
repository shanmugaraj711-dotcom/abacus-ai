#!/usr/bin/env python3
"""Bundle the app into one standalone .html file (for demos, email, or a single-file host).
Usage:  python3 tools/build-single-file.py  ->  writes abacus-buddy-single-file.html
The normal app (index.html + js/) is what you deploy; this is only a convenience build."""
import re, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ORDER = ['engine', 'i18n', 'config', 'store', 'sound', 'babi', 'lessons', 'abacusView', 'ui', 'games', 'exams', 'app']

def module(name):
    src = (ROOT / 'js' / f'{name}.js').read_text()
    exports = re.findall(r'^export (?:async )?(?:function|const|let) ([\w$]+)', src, re.M)
    exports += [n.strip() for m in re.findall(r'^export \{([^}]*)\};', src, re.M) for n in m.split(',')]
    def imp(m):
        names = ', '.join(n.strip().replace(' as ', ': ') for n in m.group(1).split(','))
        return f'const {{ {names} }} = __{m.group(2)};'
    src = re.sub(r"^import \{([^}]*)\} from '\./(\w+)\.js';", imp, src, flags=re.M)
    src = re.sub(r'^export (async )?(function|const|let) ', lambda m: (m.group(1) or '') + m.group(2) + ' ', src, flags=re.M)
    src = re.sub(r'^export \{[^}]*\};', '', src, flags=re.M)
    src = re.sub(r"^async function adminScreen\(\) \{.*$", "async function adminScreen() { (await import('./admin.js')).admin(); }", src, flags=re.M)
    if 'import ' in src.replace("await import('./admin.js')", '') or re.search(r'^export ', src, re.M):
        sys.exit(f'{name}.js still has an import/export the bundler did not understand')
    return f'const __{name} = (() => {{\n{src}\nreturn {{ {", ".join(exports)} }};\n}})();'

js = '\n'.join(module(m) for m in ORDER).replace('</script', '<\\/script')
css = (ROOT / 'css' / 'app.css').read_text()
html = f'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Abacus Buddy</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Baloo+Thambi+2:wght@700;800&family=Nunito:wght@600;700;800&display=swap">
<style>
{css}
</style></head><body>
<div id="app"><p style="text-align:center;padding:40px;font-size:22px">🧮 Babi is waking up…</p></div>
<script>window.__NO_SW__ = true;</script>
<script>
{js}
</script>
</body></html>
'''
out = ROOT / 'abacus-buddy-single-file.html'
out.write_text(html)
print(f'wrote {out} ({len(html) // 1024} KB)')
