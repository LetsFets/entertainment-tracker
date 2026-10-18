"""Regression against an observed, real GitHub Actions ERR_PNPM_ADDING_TO_ROOT.

Test scope: actual setup shell command is executed against a fake pnpm CLI
that reproduces the workspace-root guard without contacting the npm registry.
It does NOT simulate the real pnpm registry download or Drizzle migrations.
"""
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import profiles
import runtime

FAKE_PNPM = r'''#!/usr/bin/env python3
import os, sys, sqlite3, json
from pathlib import Path
args = sys.argv[1:]
with Path(os.environ['PNPM_TEST_CALLS']).open('a') as file:
    file.write(json.dumps(args) + '\n')
if args[0] == 'add':
    if '-w' not in args and '--workspace-root' not in args:
        print('ERR_PNPM_ADDING_TO_ROOT: must use -w', file=sys.stderr)
        sys.exit(1)
    if not any(pkg.startswith('@libsql/client@') or pkg.startswith('drizzle-kit@') for pkg in args):
        print('Expected explicit test dependency',file=sys.stderr);sys.exit(2)
elif args[:3] == ['exec','drizzle-kit','push']:
    if not any(s.startswith('--config=devsecops.drizzle.config.ts') for s in args):
        print('Wrong schema config',file=sys.stderr);sys.exit(2)
    if not Path('devsecops.drizzle.config.ts').is_file():
        print('Missing generated config',file=sys.stderr);sys.exit(2)
    dburl = os.environ['DATABASE_URL']
    if not dburl.startswith('file:'):
        print('Test DB URL must be file:', file=sys.stderr);sys.exit(2)
    path = Path(dburl.removeprefix('file:'))
    with sqlite3.connect(path) as db:
        db.executescript('CREATE TABLE user (id TEXT PRIMARY KEY); CREATE TABLE session (id TEXT PRIMARY KEY);')
else:
    print('Unknown command',file=sys.stderr);sys.exit(2)
'''

class RealErrorRegression(unittest.TestCase):
    def make_environment(self, root: Path):
        fakebin = root/'fake-bin';fakebin.mkdir()
        executable=fakebin/'pnpm'
        executable.write_text(FAKE_PNPM,encoding='utf-8')
        executable.chmod(0o755)
        return {**os.environ, 'PATH':str(fakebin)+os.pathsep+os.environ['PATH'],
                'PNPM_TEST_CALLS':str(root/'pnpm-calls.jsonl'),
                'DATABASE_URL':'file:'+str(root/'test.sqlite')}

    def test_previous_setup_command_reproduces_exact_failure(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            env=self.make_environment(root)
            old=('pnpm add --save-exact @libsql/client@0.15.15 && '
                 'pnpm add -D --save-exact drizzle-kit@0.31.5 && '
                 'pnpm exec drizzle-kit push --config=devsecops.drizzle.config.ts --force')
            with self.assertRaises(RuntimeError):
                runtime.run_logged(['bash','-c',old],root,env,root/'old-setup.log',30)
            self.assertIn('ERR_PNPM_ADDING_TO_ROOT',(root/'old-setup.log').read_text())
            self.assertEqual(len((root/'pnpm-calls.jsonl').read_text().splitlines()),1)

    def test_fixed_setup_reaches_database_initialization(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            (root/'package.json').write_text('{"dependencies":{"next":"16","better-auth":"1"}}')
            env=self.make_environment(root)
            conf=profiles.configuration(root,'entertainment',root)
            command=conf['services'][0]['setup']
            self.assertIn('--workspace-root',command)
            self.assertTrue((root/'devsecops.drizzle.config.ts').exists())
            runtime.run_logged(['bash','-c',command],root,env,root/'web-setup.log',30)
            cmds=[json.loads(x) for x in (root/'pnpm-calls.jsonl').read_text().splitlines()]
            self.assertEqual(len(cmds),3)
            self.assertTrue(all('--workspace-root' in x for x in cmds[:2]))
            self.assertIn('--save-dev',cmds[1])
            self.assertEqual(cmds[2][:3],['exec','drizzle-kit','push'])
            self.assertTrue((root/'test.sqlite').is_file())
            self.assertNotIn('ERR_PNPM_ADDING_TO_ROOT',(root/'web-setup.log').read_text())

    def test_other_profiles_do_not_run_unnecessary_pnpm_add(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            for profile in ['flatmate','library']:
                conf=profiles.configuration(root,profile,root)
                for svc in conf['services']:
                    self.assertNotIn('pnpm add',svc.get('setup',''))

    def test_real_entertainment_package_lockfile_remain_unmodified(self):
        # The scanner creates a temporary copy, so there is no legitimate reason
        # for installation to mutate the source checkout or project test files.
        source=Path(__file__).resolve().parents[3]
        if not ((source/'package.json').exists() and (source/'pnpm-lock.yaml').exists()):
            self.skipTest('GitHub folder only; complete Entertainment project not present')
        with tempfile.TemporaryDirectory() as td:
            dest=Path(td)/'app'
            profiles.copy_project(source,dest)
            before=(dest/'package.json').read_bytes()
            conf=profiles.configuration(dest,'entertainment',Path(td))
            self.assertEqual(before,(dest/'package.json').read_bytes())
            self.assertTrue((dest/'devsecops.drizzle.config.ts').is_file())
            self.assertIn('pnpm add --workspace-root',conf['services'][0]['setup'])

if __name__=='__main__':
    unittest.main()
