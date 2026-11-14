#!/usr/bin/env python3
"""Offline parser regressions. All inputs are synthetic; no project .env is read."""
import pathlib
import subprocess
import tempfile
import unittest

SCRIPTS = pathlib.Path(__file__).resolve().parents[1] / "scripts"
KEYS = "JWT_SECRET POSTGRES_PASSWORD CLICKHOUSE_PASSWORD CLICKHOUSE_API_PASSWORD CLICKHOUSE_WRITER_PASSWORD VIGIL_INGESTION_KEY".split()


class BootstrapParserTest(unittest.TestCase):
    def parse(self, override="", newline="\n", omit=()):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            source = root / "application.env"
            source.write_bytes((newline.join(f"{key}=synthetic-{key}" for key in KEYS if key not in omit) + newline + override).encode())
            result = subprocess.run(
                ["awk", "-v", f"output_dir={root}", "-f", str(SCRIPTS / "read-bootstrap.awk"), str(source)],
                capture_output=True, text=True, check=False,
            )
            values = {key: (root / key).read_text() for key in KEYS if (root / key).exists()}
            return result, values

    def test_plain_values_and_crlf(self):
        result, values = self.parse(newline="\r\n")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(values, {key: f"synthetic-{key}" for key in KEYS})

    def test_quotes_comments_export_and_no_final_newline(self):
        result, values = self.parse('  export JWT_SECRET = "hello # world" # comment\nPOSTGRES_PASSWORD=abc#def # comment\nCLICKHOUSE_WRITER_PASSWORD=\'${LITERAL}: # "quoted"\\value\'')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(values["JWT_SECRET"], "hello # world")
        self.assertEqual(values["POSTGRES_PASSWORD"], "abc#def")
        self.assertEqual(values["CLICKHOUSE_WRITER_PASSWORD"], '${LITERAL}: # "quoted"\\value')

    def test_rejects_unsupported_values_without_disclosing_them(self):
        for value in ['${DO_NOT_EXPAND}', '"private\\nvalue"', "'unterminated", "", "'   '", "'one' trailing", "$(touch /tmp/never-execute-vigil-test)"]:
            with self.subTest(value=value):
                result, values = self.parse(f"JWT_SECRET={value}")
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("JWT_SECRET", result.stderr)
                if value:
                    self.assertNotIn(value, result.stderr)
                self.assertEqual(values, {})

    def test_missing_secret_is_fatal_before_writing(self):
        result, values = self.parse(omit=("CLICKHOUSE_PASSWORD",))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Missing CLICKHOUSE_PASSWORD", result.stderr)
        self.assertEqual(values, {})

    def test_ingestion_key_is_a_single_bearer_token(self):
        result, values = self.parse("VIGIL_INGESTION_KEY='two tokens'")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("whitespace", result.stderr)
        self.assertEqual(values, {})

    def test_non_secret_lines_are_not_evaluated(self):
        result, _ = self.parse('IGNORED="${UNSUPPORTED}\\n"\n# comment\n')
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
