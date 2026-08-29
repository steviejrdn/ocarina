import os from "os"
import path from "path"
import { mkdtempSync } from "fs"

// Isolate every test run into its own throwaway runtime so tests never read or
// write the real Ocarina runtime directory.
process.env.OCARINA_RUNTIME_DIR = mkdtempSync(path.join(os.tmpdir(), "ocarina-test-"))
process.env.HOME = path.join(process.env.OCARINA_RUNTIME_DIR, "home")