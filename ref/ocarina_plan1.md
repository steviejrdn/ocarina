# Ocarina Plan 1 — Interface-First OpenCode Fork

## 1. Tujuan milestone

Membangun **Ocarina** sebagai executable terminal terpisah yang memakai fork OpenCode sebagai fondasi, tanpa mengubah, membaca, atau menulis konfigurasi, session, credential, cache, maupun plugin dari OpenCode yang sudah terpasang di komputer.

Milestone ini hanya menghasilkan shell TUI Ocarina yang minimal dan fungsional: setup provider/model, research session chat, permission/question dialog, history, dan branding. Belum ada integrasi OpenTab, Oh My OpenCode, import data, tabel, analisis, atau report.

## 2. Keputusan arsitektur

```text
/mnt/shared/ocarina/
├── app/                    # Fork OpenCode yang dimodifikasi menjadi Ocarina
├── ref/                    # Referensi dan dokumen keputusan
├── scripts/                # Build/dev/launch wrapper Ocarina
├── runtime/                # Hanya untuk development; gitignored
└── docs/                   # Dokumentasi operasional Ocarina
```

- `app/` adalah clone tersendiri dari `opencode-ocarina`, bukan copy atau modifikasi instalasi OpenCode global.
- `/home/steviejrdn/Documents/ocarina-ref-repo/opencode-ocarina` tetap hanya menjadi repository referensi.
- Internal package/module OpenCode **tidak** diganti namanya secara massal agar fork tetap mudah mengikuti upstream.
- Identity, runtime path, binary, title, command/help copy, dan client-facing configuration diganti melalui lapisan Ocarina yang terpusat.
- Ocarina dan OpenCode global tidak berbagi runtime state atau credential, juga tidak memigrasikan credential secara otomatis.

## 3. Isolasi runtime: syarat sebelum UI

### Kontrak

Ocarina wajib memiliki runtime sendiri dan tidak boleh fallback ke:

- `~/.config/opencode`
- `~/.local/share/opencode`
- `~/.cache/opencode`
- `~/.local/state/opencode`
- `~/.opencode`
- `.opencode` milik direktori kerja
- plugin dan session OpenCode yang sudah terpasang

### Desain

Tambahkan resolver runtime terpusat di fork dengan public interface:

```text
OCARINA_RUNTIME_DIR=/path/to/runtime
ocarina --runtime-dir /path/to/runtime
```

Resolver menurunkan seluruh lokasi di bawah runtime root:

```text
<runtime>/config
<runtime>/data
<runtime>/state
<runtime>/cache
<runtime>/logs
<runtime>/tmp
<runtime>/home
```

Launcher development/production juga menetapkan `HOME` dan semua `XDG_*_HOME` ke lokasi Ocarina serta menonaktifkan project config dan autoupdate. Ini adalah defense-in-depth; isolasi tidak boleh hanya bergantung pada launcher.

Implementasi perlu mengganti default global path `opencode` pada `packages/core/src/global.ts` dan pencarian config pada `packages/opencode/src/config/paths.ts`. Project/home config Ocarina hanya boleh diaktifkan nanti lewat setting Ocarina yang eksplisit; default milestone ini adalah **off**.

### Bukti selesai

- Menjalankan `ocarina --runtime-dir <temp>` hanya membuat file di `<temp>`.
- Snapshot hash/timestamp seluruh directory runtime OpenCode global tidak berubah.
- Ocarina tidak melihat session OpenCode dan sebaliknya.
- Direct binary run tetap memakai default runtime Ocarina-specific, bukan path OpenCode.

## 4. Scope interface yang dipertahankan

### Screen dan dialog

| Komponen | Status | Adaptasi Ocarina |
|---|---|---|
| Home | Keep | Daftar **Research sessions**, create/resume session, provider/model status. |
| Chat/session | Keep | Transcript, streaming, submit prompt, interrupt, compact, rename/delete/resume. |
| Provider | Keep | Setup credential provider Ocarina sendiri. |
| Model/variant | Keep | Pemilihan model, recent/favorite, variant. |
| Permission | Keep | Allow once / always / reject; detail tool result yang ringkas. |
| Question dialog | Keep | Pertanyaan klarifikasi dari agent. |
| Command palette | Keep | Entry point utama untuk command non-coding. |
| Prompt history/stash | Keep | Reuse pertanyaan riset. |
| Theme/help/status | Keep minimal | Branding Ocarina dan status runtime. |
| Task/status renderer | Keep dormant | Extension point untuk agent riset di phase berikutnya, belum menjalankan task. |

### Bahasa dan identity

- Nama binary: `ocarina`.
- Judul terminal, home, status, error, help, resume command, dan update copy: **Ocarina**.
- “Session” dapat dipakai secara teknis, tetapi label user-facing adalah **Research session**.
- Placeholder input: `Ask a research question…`.
- Prompt awal mengikuti prinsip Arthur yang sudah tersedia: manual execution dan mengikuti register bahasa user. Tidak boleh mengklaim full Arthur workflow karena context/rendering module yang dirujuk belum tersedia.
- Attribution dan license OpenCode tetap dipertahankan.

## 5. Command surface v0.1

### Aktif

```text
/new
/sessions
/model
/provider
/status
/help
/theme
/clear
/undo
/redo
/quit
```

### Dicadangkan, belum diimplementasikan

```text
/data
/table
/preview
/export
/agents
/integrations
```

Command cadangan harus menampilkan dialog yang jelas: *“Belum tersedia pada interface milestone ini.”* Command tidak boleh no-op atau terlihat seolah fitur analisis sudah siap.

## 6. Coding surface yang dihilangkan atau ditutup

Hapus dari registrasi command, slash completion, palette, shortcut, home hint, menu, dan tool runtime:

- shell/terminal execution;
- read/write/edit/apply-patch code workflow;
- git status/diff/commit;
- external editor;
- worktree/workspace project-copy;
- agent mode `build`/`plan`;
- file browser, symbol autocomplete, repository indexing, LSP/diagnostics;
- diff viewer, file-change view, dan code-specific tool renderer;
- WebUI/debug route yang membuka feature OpenCode yang tidak dipangkas.

Enforcement tidak boleh sekadar menyembunyikan UI:

- tool allowlist efektif hanya berisi tool yang dibutuhkan milestone ini;
- tool unknown harus fail closed;
- shell, git, patch, editor, dan mutasi file harus unregistered atau denied;
- startup assertion memverifikasi daftar command dan tool yang efektif.

MCP, file attachment, plugin marketplace, dan task/subagent execution belum diaktifkan pada milestone ini.

## 7. Extension seam untuk fase selanjutnya

Tambahkan interface internal tipis tanpa dependency OpenTab atau OMO:

```text
IntegrationRegistry
CommandContribution
SidebarContribution
DialogContribution
ToolRendererContribution
TaskProvider
StudyContextProvider
```

Registry kosong harus valid. Nanti OpenTab menambah `/data`, `/table`, `/preview`, `/export`; OMO menambah `/agents`, task provider, dan sidebar status, tanpa mengubah route chat inti.

## 8. Urutan implementasi

### Phase A — Bootstrap fork

1. Clone `opencode-ocarina` ke `app/`.
2. Catat commit upstream/fork pada `ref/upstream-lock.md`.
3. Verifikasi dependency install dan baseline typecheck/test yang relevan.
4. Tambahkan `.gitignore` untuk runtime dan artifact build.

### Phase B — Runtime isolation

1. Implement runtime path resolver dan `OCARINA_RUNTIME_DIR` / `--runtime-dir`.
2. Buat launcher `scripts/ocarina` untuk development dan packaging.
3. Ganti path default runtime menjadi namespace Ocarina.
4. Matikan fallback config OpenCode/project/home, autoupdate, dan plugin auto-discovery.
5. Tambahkan test isolasi directory dan first-run runtime.

### Phase C — Branding pass

1. Buat identity constants satu sumber.
2. Ubah binary/build artifact menjadi `ocarina`.
3. Ganti terminal title, home title, prompt, help, status, error, resume text, dan version output.
4. Tetap tampilkan attribution/legal notices yang diperlukan.

### Phase D — Minimal functional shell

1. Pertahankan provider/model dialogs.
2. Pertahankan session lifecycle dan chat transcript.
3. Pertahankan prompt history/stash, permission, dan question dialog.
4. Uji first-run provider setup, model switch, send prompt, interrupt, resume session.

### Phase E — Strip coding UX dan enforce policy

1. Pangkas command registry, palette, slash completion, keybindings, dan home hints.
2. Hilangkan tool coding dari effective runtime registry.
3. Tambahkan command/tool allowlist assertion saat startup.
4. Tambahkan reserved research commands dengan unavailable-state yang eksplisit.

### Phase F — Extension seams dan polish

1. Tambahkan registry contribution kosong.
2. Tambahkan placeholder status research integrations.
3. Review keyboard-only layout pada terminal 80×24 dan 120×40.
4. Buat development/build/launch documentation.

## 9. Acceptance criteria milestone

1. `ocarina` berjalan dari source fork di `app/`; instalasi OpenCode global tidak diubah.
2. Runtime Ocarina dan OpenCode global terbukti terisolasi dua arah.
3. Provider, model, new/resume/delete research session, chat, interrupt, history, permission, dan question dialog bekerja setelah restart.
4. Semua copy user-facing menggunakan Ocarina, kecuali attribution/legal notices.
5. Tidak ada command/keybinding/menu/slash completion coding yang terlihat.
6. Invocation langsung tool shell/edit/git/patch/worktree gagal tertutup.
7. `/data`, `/table`, `/preview`, `/export`, `/agents`, dan `/integrations` memberi unavailable state yang eksplisit.
8. Ocarina tidak menyalakan OpenTab, OMO plugin, MCP, task agent, maupun autoupdate pada startup.
9. Test session/provider/model OpenCode yang masih relevan tetap hijau, bersama test baru untuk runtime isolation dan command/tool allowlist.

## 10. Non-goals untuk plan ini

- OpenTab import, metadata, crosstab, sig-test, preview, dan export.
- Oh My OpenCode plugin, subagent, hook, task lifecycle, council, atau `/interview`.
- Data attachment dan access ke raw respondent data.
- Study manifest, evidence ledger, reporting, chart, RWA, atau executive summary.
- Full package/module rename dari OpenCode.
- Reuse/migrasi credential atau konfigurasi OpenCode yang terpasang.
- Browser/WebUI redesign, cloud storage, collaboration, dan third-party plugins.

## 11. Reference source

- `ref/arthuros.md`
- `/home/steviejrdn/Documents/ocarina-ref-repo/opencode-ocarina/packages/core/src/global.ts`
- `/home/steviejrdn/Documents/ocarina-ref-repo/opencode-ocarina/packages/opencode/src/config/paths.ts`
- `/home/steviejrdn/Documents/ocarina-ref-repo/opencode-ocarina/packages/tui/src/app.tsx`
- `/home/steviejrdn/Documents/ocarina-ref-repo/opencode-ocarina/packages/tui/src/config/keybind.ts`
