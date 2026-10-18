"""V9.1 regression checks for genuine pnpm lockfile drift in a disposable app."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import runtime, reporting, aggregate


class PnpmRecovery(unittest.TestCase):
    def make_workspace(self):
        return tempfile.TemporaryDirectory(prefix='v91-pnpm-')

    def test_recognizes_lockfile_drift_and_retries_only_in_copy(self):
        with self.make_workspace() as tmp:
            folder = Path(tmp)
            (folder/'pnpm-lock.yaml').write_text('lockfileVersion: "9.0"\n')
            (folder/'package.json').write_text('{"dependencies":{"next":"15"}}')
            log = folder/'web-install.log'
            calls = []
            def fake_run(cmd, cwd, env, dest, timeout=420):
                calls.append(cmd)
                if '--frozen-lockfile' in cmd:
                    dest.write_text('ERR_PNPM_OUTDATED_LOCKFILE Cannot install with frozen-lockfile\n')
                    raise RuntimeError('Installation failed')
                with dest.open('a') as fh:
                    fh.write('Done in 2s\n')
            with mock.patch.object(runtime, 'run_logged', side_effect=fake_run):
                runtime.install_package('pnpm',None,folder,{},log,folder,'web',profile='entertainment')
            self.assertEqual(calls, [['pnpm','install','--frozen-lockfile'],
                                     ['pnpm','install','--no-frozen-lockfile']])
            report = json.loads((folder/'web-install-status.json').read_text())
            self.assertEqual(report['status'], 'RECOVERED')
            self.assertTrue(report['lockfile_repaired_in_test_copy'])
            self.assertEqual(report['profile'], 'entertainment')
            self.assertTrue((folder/'pnpm-lock.yaml').exists())

    def test_strict_install_stays_strict_when_valid(self):
        with self.make_workspace() as tmp:
            folder = Path(tmp)
            (folder/'pnpm-lock.yaml').write_text('lockfileVersion: 9.0\n')
            with mock.patch.object(runtime, 'run_logged') as runner:
                runtime.install_package('pnpm',None,folder,{},folder/'install.log',folder,'web')
            self.assertEqual(runner.call_count, 1)
            self.assertEqual(json.loads((folder/'web-install-status.json').read_text())['status'], 'STRICT_OK')

    def test_no_retry_for_non_lock_error(self):
        with self.make_workspace() as tmp:
            folder = Path(tmp)
            (folder/'pnpm-lock.yaml').write_text('lockfileVersion: 9.0\n')
            def fake_run(cmd, cwd, env, dest, timeout=420):
                dest.write_text('ERR_PNPM_UNSUPPORTED_ENGINE Unsupported environment\n')
                raise RuntimeError('Installation failed')
            with mock.patch.object(runtime, 'run_logged',side_effect=fake_run) as runner:
                with self.assertRaisesRegex(RuntimeError,'ERR_PNPM_UNSUPPORTED_ENGINE'):
                    runtime.install_package('pnpm',None,folder,{},folder/'install.log',folder,'web')
            self.assertEqual(runner.call_count, 1)
            report = json.loads((folder/'web-install-status.json').read_text())
            self.assertEqual(report['status'], 'ERROR')
            self.assertEqual(report['error_code'],'ERR_PNPM_UNSUPPORTED_ENGINE')

    def test_retry_failure_is_not_marked_successful(self):
        with self.make_workspace() as tmp:
            folder = Path(tmp)
            (folder/'pnpm-lock.yaml').write_text('lockfileVersion: 9.0\n')
            def fake_run(cmd, cwd, env, dest, timeout=420):
                with dest.open('a') as fh:
                    fh.write('ERR_PNPM_OUTDATED_LOCKFILE\n' if '--frozen-lockfile' in cmd
                             else 'ERR_PNPM_FETCH_404 Package not found\n')
                raise RuntimeError('Installation failed')
            with mock.patch.object(runtime,'run_logged',side_effect=fake_run) as runner:
                with self.assertRaisesRegex(RuntimeError,'ERR_PNPM_FETCH_404'):
                    runtime.install_package('pnpm',None,folder,{},folder/'install.log',folder,'web')
            self.assertEqual(runner.call_count, 2)
            report=json.loads((folder/'web-install-status.json').read_text())
            self.assertEqual(report['status'],'ERROR')
            self.assertFalse(report['lockfile_repaired_in_test_copy'])

    def test_npm_never_retried(self):
        with self.make_workspace() as tmp:
            folder=Path(tmp)
            (folder/'package-lock.json').write_text('{}')
            def fake_run(cmd,cwd,env,dest,timeout=420):
                dest.write_text('ERR_PNPM_OUTDATED_LOCKFILE\n')
                raise RuntimeError('Installation failed')
            with mock.patch.object(runtime,'run_logged',side_effect=fake_run) as runner:
                with self.assertRaisesRegex(RuntimeError,'kein Lockfile-Konflikt'):
                    runtime.install_package('npm',None,folder,{},folder/'install.log',folder,'web')
            self.assertEqual(runner.call_count, 1)

    def test_report_displays_warning_and_original_repo_instruction(self):
        with self.make_workspace() as tmp:
            report_dir=Path(tmp)
            result={'tool':'dalfox','project':'.','profile':'entertainment','status':'OK',
                    'count':0,'candidates':1,'scanned':1,'requests':35,'skipped':0,
                    'findings':[],'tested':[], 'installations':[
                      {'service':'web','package_manager':'pnpm','status':'RECOVERED',
                       'error_code':'ERR_PNPM_OUTDATED_LOCKFILE'}]}
            markdown=reporting.dalfox_markdown(result,report_dir)
            self.assertIn('pnpm-lock.yaml',markdown)
            self.assertIn('pnpm install',markdown)
            self.assertIn('temporäre Kopie',markdown)
            rows=[{'name':'entertainment','profile':'entertainment',
                   'static':{t:{'tool':t,'status':'OK','count':0} for t in aggregate.TOOLS},
                   'dalfox':result,'artifacts':{'static':None,'dalfox':None}}]
            summary,incomplete=aggregate.markdown(rows,False)
            self.assertFalse(incomplete)
            self.assertIn('Installationswarnung',summary)

    def test_outdated_error_detection_in_plain_wording(self):
        with self.make_workspace() as tmp:
            log=Path(tmp)/'install.log'
            log.write_text('ERR_PNPM_FROZEN_LOCKFILE_WITH_OUTDATED_LOCKFILE\n')
            self.assertTrue(runtime.pnpm_lockfile_outdated(log))
            log.write_text('ERROR Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with package.json\n')
            self.assertTrue(runtime.pnpm_lockfile_outdated(log))
            log.write_text('ERR_PNPM_FETCH_403\n')
            self.assertFalse(runtime.pnpm_lockfile_outdated(log))


if __name__ == '__main__':
    unittest.main()
