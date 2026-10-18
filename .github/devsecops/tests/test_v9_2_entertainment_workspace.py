"""Regression tests for the specific Entertainment Tracker pnpm workspace failure."""
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import runtime

BROKEN = """allowBuilds:
  '@tailwindcss/oxide': set this to true or false
  sharp: set this to true or false
"""
FIXED = """packages:
  - '.'
allowBuilds:
  '@tailwindcss/oxide': true
  sharp: true
"""


class EntertainmentWorkspace(unittest.TestCase):
    def test_original_exported_workspace_normalized(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            (folder / 'package.json').write_text('{"name":"my-v0-project"}')
            (folder / 'pnpm-workspace.yaml').write_text(BROKEN)
            runtime.normalize_entertainment_workspace(folder, folder)
            config = (folder / 'pnpm-workspace.yaml').read_text()
            self.assertIn("packages:\n  - '.'", config)
            self.assertIn("'@tailwindcss/oxide': true", config)
            self.assertIn('sharp: true', config)
            self.assertNotIn('set this to true or false', config)
            report = json.loads((folder / 'workspace-preflight.json').read_text())
            self.assertEqual(report['status'], 'NORMALIZED_COPY')
            self.assertEqual(len(report['actions']), 3)
            self.assertTrue(report['source_checkout_unchanged'])

    def test_existing_correct_workspace_not_rewritten(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            (folder / 'package.json').write_text('{}')
            (folder / 'pnpm-workspace.yaml').write_text(FIXED)
            runtime.normalize_entertainment_workspace(folder, folder)
            self.assertEqual((folder / 'pnpm-workspace.yaml').read_text(), FIXED)
            self.assertEqual(json.loads((folder / 'workspace-preflight.json').read_text())['status'], 'VALID')

    def test_unknown_build_scripts_are_not_auto_approved(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            (folder / 'package.json').write_text('{}')
            (folder / 'pnpm-workspace.yaml').write_text(BROKEN + '  untrusted-dep: set this to true or false\n')
            with self.assertRaisesRegex(RuntimeError, 'weitere ungeklärte'):
                runtime.normalize_entertainment_workspace(folder, folder)
            self.assertEqual((folder / 'pnpm-workspace.yaml').read_text(), BROKEN + '  untrusted-dep: set this to true or false\n')

    def test_missing_package_json_does_not_manufacture_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            (folder / 'pnpm-workspace.yaml').write_text(BROKEN)
            with self.assertRaisesRegex(RuntimeError, 'package.json fehlt'):
                runtime.normalize_entertainment_workspace(folder, folder)

    def test_diagnostic_for_missing_packages_and_network(self):
        with tempfile.TemporaryDirectory() as tmp:
            log = Path(tmp) / 'web-install.log'
            log.write_text('ERROR packages field missing or empty\n')
            self.assertEqual(runtime.installation_error_hint(log), 'WORKSPACE_PACKAGES_MISSING')
            log.write_text('ERR_PNPM_FETCH_403 due to invalid token\n')
            self.assertEqual(runtime.installation_error_hint(log), 'PACKAGE_FETCH_ERROR')
            log.write_text('request to npmjs.org failed: EAI_AGAIN\n')
            self.assertEqual(runtime.installation_error_hint(log), 'REGISTRY_NETWORK_ERROR')

    def test_no_workspace_means_no_unnecessary_modification(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            (folder / 'package.json').write_text('{}')
            runtime.normalize_entertainment_workspace(folder, folder)
            self.assertFalse((folder / 'pnpm-workspace.yaml').exists())

if __name__ == '__main__':
    unittest.main()
