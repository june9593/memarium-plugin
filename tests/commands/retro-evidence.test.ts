import { describe, expect, it } from "vitest";
import { analyzeBash } from "../../src/commands/retro-evidence.js";

describe("bounded Bash mutation evidence", () => {
  it.each([
    "git commit -m fix",
    "git -C '/tmp/work tree' -c user.name=Test commit -am fix",
    "git --git-dir=/tmp/repo/.git --work-tree /tmp/repo commit -m '--dry-run'",
    "git commit -m 'a --help example'",
    "git commit -m message -- --dry-run",
    "cat > 'source file.ts' <<'EOF'\nhello\nEOF",
    "cat <<-EOF >>source.ts\n\thello\n\tEOF",
    "cat source.ts 1>copy.ts",
    "sed -i '' 's/old/new/' source.ts",
    "sed -i.bak 's/old/new/' source.ts",
    "sed --in-place=.bak -e 's/old/new/' source.ts",
    "python3 -c \"from pathlib import Path; Path('x').write_text('updated')\"",
    "python3 -c \"Path('x').write_bytes(b'updated')\"",
    "python -c \"open('x', 'w').write('updated')\"",
    "python3 -c \"with open('x', mode='a', encoding='utf8') as f: f.write('new')\"",
    "python3 -c \"Path('x').open('w')\"",
    "python3 - <<'PY'\nfrom pathlib import Path\nfor p in [Path('a.ts'), Path('b.ts')]:\n    text = p.read_text()\n    text = text.replace('old', 'new')\n    p.write_text(text)\nPY\nnpm test",
    "set -e\npython3 - <<'PY'\nPath('x').write_text('new')\nPY",
    "set -euo pipefail\npython3 -c \"open('x','w')\"",
    "npm test && git commit -m fix",
    "GH_TOKEN=$(gh auth token --user example) git -C /tmp/repo commit -m fix",
  ])("recognizes supported write evidence: %s", (command) => {
    expect(analyzeBash(command, true).mutation).toBe(true);
  });
  it.each([
    "ls -la", "git status --short", "git diff", "git log -1", "npm test", "npm run build", "npx vitest run",
    "git commit --dry-run", "git -C /tmp/repo commit --help", "git help commit", "git --version commit",
    "git -c commit status", "git commit $(printf -- --dry-run)", "echo 'git commit -m fix'", "grep 'write_text(' source.py",
    "# git commit -m fake\nls", "printf '%s' 'sed -i s/x/y/ file'",
    "cat <<'EOF'\ngit commit -m example\npython3 -c \"Path('x').write_text('new')\"\nEOF",
    "cat source.ts >/dev/null", "cat source.ts 2>&1", "cat source.ts >&2", "cat source.ts >/dev/stdout",
    "sed 's/-i/example/' source.ts", "sed -n -e 's/--in-place/example/p' source.ts", "sed -i '' 's/x/y/'",
    "python3 -c \"print(Path('x').read_text())\"",
    "python3 -c \"print('Path(1).write_text(2)')\"",
    "python3 -c \"print(open('x', 'r').read())\"",
    "python3 - <<'PY'\n# Path('x').write_text('new')\nprint('ok')\nPY",
    "python3 - <<'PY'\nexample = '''Path('x').write_text('new')'''\nprint(example)\nPY",
    "python3 - <<'PY'\ndef example():\n    Path('x').write_text('new')\nprint('read only')\nPY",
    "python3 writer.py", "eval 'git commit -m fix'", "bash -c 'cat > x'",
    "set -n; cat > x", "source setup.sh; cat > x", ". setup.sh; cat > x", "trap 'exit 0' DEBUG; cat > x",
    "if false; then cat > x; fi", "for x in one; do cat > x; done", "f() { cat > x; }; echo done",
    "true || cat > x", "false && cat > x; true", "cat > x &", "git commit -m fix && echo done &", "echo example | cat > x",
    "echo $(printf 'git commit')", "printf '%s' `echo 'cat >x'`", "cat > 'unclosed",
    "python3 - <<PY\n$(echo 'Path(1).write_text(2)')\nPY",
  ])("keeps read-only or unsupported forms quiet: %s", (command) => {
    expect(analyzeBash(command, true).mutation).toBe(false);
  });
  it("keeps possible partial writes separate from later conditional writes", () => {
    expect(analyzeBash("python3 -c \"open('x','w')\"\nnpm test", false).mutation).toBe(true);
    expect(analyzeBash("set -e\npython3 -c \"open('x','w')\"\nnpm test", false).mutation).toBe(true);
    expect(analyzeBash("set -euo pipefail\npython3 -c \"open('x','w')\"\nnpm test", false).mutation).toBe(true);
    expect(analyzeBash("npm test && python3 -c \"open('x','w')\"", false).mutation).toBe(false);
    expect(analyzeBash("npm test", false).mutation).toBe(false);
  });
  it.each([
    ['"$VBP" memory-write --input draft.json', "memory-write"],
    ['node "$VBP" memory-propose --input draft.json', "memory-propose"],
    ['"/tmp/plugin root/bin/memarium-plugin.js" memory-write --input draft.json; false', "memory-write"],
  ])("recognizes actual persistence invocations: %s", (command, kind) => {
    expect(analyzeBash(command, false).retro).toEqual([kind]);
  });
  it.each([
    "grep memory-write source.ts", "echo memory-propose", "'$VBP' memory-write --help",
    "cat <<EOF\n$VBP memory-write --input draft.json\nEOF", "echo '{\"written\":1}'",
    "node other-program.js memory-write --input draft.json", "'$VBP' memory-write --input draft.json", "false && $VBP memory-write --input draft.json; true",
  ])("does not confuse persistence examples with invocations: %s", (command) => {
    expect(analyzeBash(command, true).retro).toEqual([]);
  });
});
