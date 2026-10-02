"""
Tests d'intégration et d'idempotence du script install/setup.ps1 (US-DEVOPS-01 / TNR-SETUP-01).
Vérifie le mode -CheckOnly, l'exit code 0 et la préservation de .env s'il existe déjà.
"""

import os
import subprocess
import unittest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SETUP_PS1 = os.path.join(PROJECT_ROOT, "install", "setup.ps1")
ENV_PATH = os.path.join(PROJECT_ROOT, ".env")


class TestSetupPs1(unittest.TestCase):
    def test_setup_file_exists(self):
        """Vérifie que le script install/setup.ps1 est présent et non vide."""
        self.assertTrue(os.path.exists(SETUP_PS1), f"{SETUP_PS1} doit exister.")
        self.assertGreater(os.path.getsize(SETUP_PS1), 1000, "setup.ps1 ne doit pas être vide.")

    def test_check_only_mode(self):
        r"""Vérifie que powershell .\install\setup.ps1 -CheckOnly s'exécute avec exit code 0."""
        cmd = [
            "powershell.exe",
            "-ExecutionPolicy", "Bypass",
            "-File", SETUP_PS1,
            "-CheckOnly"
        ]
        result = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True)
        self.assertEqual(
            result.returncode, 0,
            f"setup.ps1 -CheckOnly doit renvoyer 0. Stdout: {result.stdout} Stderr: {result.stderr}"
        )
        self.assertIn("DIAGNOSTIC", result.stdout)
        self.assertIn("0", result.stdout)

    def test_tnr_setup_01_env_preservation(self):
        """TNR-SETUP-01: Vérifie que .env existant n'est pas écrasé sans -ForceEnv."""
        self.assertTrue(os.path.exists(ENV_PATH), ".env doit exister suite au setup initial.")
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            content_before = f.read()

        # Re-run du check sans altération
        cmd = [
            "powershell.exe",
            "-ExecutionPolicy", "Bypass",
            "-File", SETUP_PS1,
            "-CheckOnly"
        ]
        subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True)

        with open(ENV_PATH, "r", encoding="utf-8") as f:
            content_after = f.read()

        self.assertEqual(
            content_before, content_after,
            "TNR-SETUP-01 VIOLATION: Le fichier .env a été altéré lors d'une vérification."
        )


if __name__ == "__main__":
    unittest.main()
