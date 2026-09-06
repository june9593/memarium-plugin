/** Bounded evidence for an advisory nudge, NOT a shell interpreter or a proof of
 * arbitrary side effects. Inspected commands are never executed. */
export type RetroCommand = "memory-write" | "memory-propose";
export interface BashEvidence { mutation: boolean; retro: RetroCommand[] }
interface Word { value: string; dynamic: boolean; quoted: boolean; variable: boolean }
interface Redirect { op: string; target: Word; fd?: number; body?: string }
interface Command {
  words: Word[];
  redirects: Redirect[];
  before: string;
  after: string;
}

const NONE = (): BashEvidence => ({ mutation: false, retro: [] });
const CONTROL = new Set(["if", "then", "else", "elif", "fi", "for", "while", "until", "do", "done", "case", "esac", "function", "select", "eval", "source", ".", "trap"]);
const base = (s: string) => s.replace(/\\/g, "/").split("/").pop() ?? s;

/** Keep quoted words and heredoc ownership; do not rescan their data as shell. */
function scanShell(source: string): Command[] | null {
  let i = 0;
  let before = "start";
  let command: Command = { words: [], redirects: [], before, after: "end" };
  const commands: Command[] = [];
  const here: Redirect[] = [];
  const finish = (after: string) => {
    if (command.words.length || command.redirects.length) {
      command.after = after;
      commands.push(command);
    }
    before = after;
    command = { words: [], redirects: [], before, after: "end" };
  };
  function substitution(): string | null {
    const start = i;
    if (source[i] === "`") {
      i++;
      while (i < source.length && source[i] !== "`") {
        if (source[i] === "\\") i++;
        i++;
      }
      if (i === source.length) return null;
      return source.slice(start, ++i);
    }
    i += 2; // $( — opaque, including nested substitutions
    let depth = 1;
    let quote = "";
    while (i < source.length) {
      const c = source[i++]!;
      if (c === "\\") { i++; continue; }
      if (quote) { if (c === quote) quote = ""; continue; }
      if (c === "'" || c === '"') { quote = c; continue; }
      if (c === "(") depth++;
      if (c === ")" && --depth === 0) return source.slice(start, i);
    }
    return null;
  }
  function word(): Word | null {
    let value = "", quote = "", quoted = false, dynamic = false, variable = false, started = false;
    while (i < source.length) {
      const c = source[i]!;
      if (!quote && /[\s;|&<>(){}]/.test(c)) break;
      if (c === "\\" && quote !== "'") {
        started = true;
        if (i + 1 >= source.length) return null;
        const next = source[i + 1]!;
        if (next !== "\n") value += quote === '"' && !/[$`"\\]/.test(next) ? "\\" + next : next;
        i += 2; continue;
      }
      if ((c === "'" || c === '"') && (!quote || quote === c)) {
        quote = quote ? "" : c; quoted = true; started = true; i++; continue;
      }
      if (quote !== "'" && (c === "`" || source.startsWith("$(", i))) {
        const part = substitution();
        if (part === null) return null;
        value += part; dynamic = true; started = true; continue;
      }
      if (c === "$" && quote !== "'") variable = true;
      value += c; started = true; i++;
    }
    return quote || !started ? null : { value, dynamic, quoted, variable };
  }
  while (i < source.length) {
    const c = source[i]!;
    if (c === " " || c === "\t" || c === "\r") { i++; continue; }
    if (c === "\\" && source[i + 1] === "\n") { i += 2; continue; }
    if (c === "#") { while (i < source.length && source[i] !== "\n") i++; continue; }
    if (c === "\n") {
      const continued = ["&&", "||", "|", "|&"].includes(before) && command.words.length === 0;
      if (!continued) finish(";");
      i++;
      for (const redirect of here.splice(0)) {
        const lines: string[] = [];
        let closed = false;
        while (i < source.length) {
          const end = source.indexOf("\n", i);
          const line = source.slice(i, end < 0 ? source.length : end);
          i = end < 0 ? source.length : end + 1;
          const normalized = redirect.op === "<<-" ? line.replace(/^\t+/, "") : line;
          if (normalized === redirect.target.value) { closed = true; break; }
          lines.push(normalized);
        }
        if (!closed) return null;
        redirect.body = lines.join("\n");
      }
      continue;
    }
    if (/[(){}]/.test(c)) return null; // functions, groups, process substitution
    if (c === ";" || c === "&" || c === "|") {
      const op = ["&&", "||", "|&"].includes(source.slice(i, i + 2)) ? source.slice(i, i + 2) : c;
      if (op === ";" && source[i + 1] === ";") return null;
      finish(op); i += op.length; continue;
    }
    const redir = source.slice(i).match(/^(\d*)(<<-|<<|>>|>&|<&|>|<)/);
    if (redir) {
      i += redir[0].length;
      while (source[i] === " " || source[i] === "\t") i++;
      const target = word();
      if (!target) return null;
      const r: Redirect = { op: redir[2]!, target, ...(redir[1] ? { fd: Number(redir[1]) } : {}) };
      command.redirects.push(r);
      if (r.op.startsWith("<<")) here.push(r);
      continue;
    }
    const w = word();
    if (!w) return null;
    command.words.push(w);
  }
  if (here.length) return null;
  finish("end");
  return commands;
}

function executable(command: Command): Word[] {
  const words = [...command.words];
  while (words[0] && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0].value)) words.shift();
  return words;
}

function gitCommit(args: string[]): boolean {
  let i = 0;
  const valued = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--config-env"]);
  const flags = new Set(["--no-pager", "--paginate", "-p", "--literal-pathspecs", "--no-optional-locks"]);
  while (args[i]?.startsWith("-")) {
    const a = args[i++]!;
    if (valued.has(a)) { if (!args[i]) return false; i++; }
    else if (!flags.has(a) && !/^--(?:git-dir|work-tree|namespace|config-env)=/.test(a)) return false;
  }
  if (args[i++] !== "commit") return false;
  const values = new Set(["-m", "--message", "-F", "--file", "-C", "-c", "--reuse-message", "--reedit-message", "--author", "--date", "--template", "-t", "--trailer", "--pathspec-from-file"]);
  for (; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--") break;
    if (["--dry-run", "--help", "-h"].includes(a)) return false;
    if (values.has(a) || /^-[a-z]*m$/.test(a)) i++;
  }
  return true;
}

function sedEdit(args: string[]): boolean {
  let inPlace = false, expression = false, files = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--") { files ||= i + 1 < args.length; break; }
    if (a === "--help" || a === "--version") return false;
    if (a === "-i" || a.startsWith("-i") || a === "--in-place" || a.startsWith("--in-place=")) {
      inPlace = true;
      if (a === "-i" && args[i + 1] === "") i++; // BSD empty backup suffix
    } else if (["-e", "--expression", "-f", "--file"].includes(a)) { expression = true; i++; }
    else if (/^(?:-e.|-f.|--expression=|--file=)/.test(a)) expression = true;
    else if (a.startsWith("-")) { if (!["-n", "-E", "-r", "-s", "-u"].includes(a)) return false; }
    else if (!expression) expression = true;
    else files = true;
  }
  return inPlace && expression && files;
}

/** Mask Python data/comments, retaining literal values only for open(mode=...). */
function pythonWrites(source: string): boolean {
  let code = "";
  const literals = new Map<string, string>();
  for (let i = 0; i < source.length;) {
    const c = source[i]!;
    if (c === "#") { while (i < source.length && source[i] !== "\n") i++; continue; }
    if (c !== "'" && c !== '"') { code += c; i++; continue; }
    const delimiter = source.startsWith(c.repeat(3), i) ? c.repeat(3) : c;
    i += delimiter.length;
    let value = "", closed = false;
    while (i < source.length) {
      if (source.startsWith(delimiter, i)) { i += delimiter.length; closed = true; break; }
      if (source[i] === "\\" && i + 1 < source.length) { value += source.slice(i, i + 2); i += 2; }
      else value += source[i++];
    }
    if (!closed) return false;
    const key = `\u0001${literals.size}\u0002`;
    literals.set(key, value);
    code += key + "\n".repeat(value.split("\n").length - 1);
  }
  let skippedIndent: number | null = null;
  code = code.split("\n").map((line) => {
    if (!line.trim()) return "";
    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    if (skippedIndent !== null && indent > skippedIndent) return "";
    skippedIndent = null;
    if (/^\s*(?:(?:async\s+)?def|class|if|elif|else|while|try|except|finally|match|case)\b/.test(line)) {
      skippedIndent = indent; return "";
    }
    return /\blambda\b/.test(line) ? "" : line;
  }).join("\n");
  if (/\.\s*(?:write_text|write_bytes)\s*\(/.test(code)) return true;
  for (const match of code.matchAll(/\bopen\s*\(/g)) {
    const start = match.index! + match[0].length;
    let depth = 1, arg = "";
    const args: string[] = [];
    for (let i = start; i < code.length && i - start < 8192; i++) {
      const c = code[i]!;
      if (c === "(") depth++;
      if (c === ")") depth--;
      if (depth === 0) { args.push(arg.trim()); break; }
      if (c === "," && depth === 1) { args.push(arg.trim()); arg = ""; }
      else arg += c;
    }
    const named = args.find((a) => /^mode\s*=/.test(a))?.replace(/^mode\s*=\s*/, "");
    let previous = match.index! - 1;
    while (previous >= 0 && /\s/.test(code[previous]!)) previous--;
    const method = code[previous] === ".";
    const mode = literals.get(named ?? args[method ? 0 : 1] ?? "");
    if (mode && /^[rwax](?:[bt]?\+?|\+[bt]?)$/.test(mode) && (mode[0] !== "r" || mode.includes("+"))) return true;
  }
  return false;
}

function commandEvidence(command: Command): BashEvidence {
  const words = executable(command);
  if (!words.length || words[0]!.dynamic) return NONE();
  const values = words.map((w) => w.value);
  const name = base(values[0]!);
  const args = values.slice(1);
  const noOutput = /^(?:\/dev\/(?:null|stdout|stderr|fd\/\d+)|\/proc\/self\/fd\/\d+)$/;
  if (["git", "sed"].includes(name) && words.some((w) => w.dynamic)) return NONE();
  if (name === "git") return { mutation: gitCommit(args), retro: [] };
  if (name === "cat") return { mutation: command.redirects.some((r) => [">", ">>"].includes(r.op) && (r.fd === undefined || r.fd === 1) && !r.target.dynamic && !noOutput.test(r.target.value)), retro: [] };
  if (name === "sed") return { mutation: sedEdit(args), retro: [] };
  if (/^python(?:3(?:\.\d+)?)?$/.test(name)) {
    let program: string | undefined;
    let i = 1;
    while (["-u", "-B", "-I", "-E", "-s", "-S"].includes(values[i] ?? "")) i++;
    if (values[i] === "-c" && !words[i + 1]?.dynamic) program = values[i + 1];
    else if (i === values.length || values[i] === "-") {
      const input = command.redirects.filter((r) => r.op.startsWith("<<") && (r.fd === undefined || r.fd === 0)).at(-1);
      if (input?.target.quoted || !/[$`]/.test(input?.body ?? "")) program = input?.body;
    }
    return { mutation: program !== undefined && pythonWrites(program), retro: [] };
  }
  let executableIndex = name === "node" || name === "nodejs" ? 1 : 0;
  while (executableIndex && ["--no-warnings", "--enable-source-maps", "--"].includes(values[executableIndex] ?? "")) executableIndex++;
  const plugin = values[executableIndex] ?? "";
  const pluginName = base(plugin);
  if (["memarium-plugin.js", "memarium-plugin"].includes(pluginName) || (["$VBP", "${VBP}"].includes(plugin) && words[executableIndex]?.variable)) {
    const kind = values[executableIndex + 1];
    if ((kind === "memory-write" || kind === "memory-propose") && !values.slice(executableIndex + 2).some((a) => a === "--help" || a === "-h")) {
      return { mutation: false, retro: [kind] };
    }
  }
  return NONE();
}

function setupOnly(values: string[]): boolean {
  if (values[0] !== "set" || values.length === 1) return false;
  for (let i = 1; i < values.length; i++) {
    const option = values[i]!;
    if (/^[-+][eufx]+$/.test(option)) continue;
    if (!/^[-+][eufx]*o$/.test(option) || !["pipefail", "errexit", "nounset", "xtrace", "noglob"].includes(values[++i] ?? "")) return false;
  }
  return true;
}

export function analyzeBash(source: string, successful: boolean): BashEvidence {
  if (source.length > 128 * 1024) return NONE();
  const commands = scanShell(source);
  if (!commands || commands.length > 512) return NONE();
  if (commands.some((c) => {
    const values = executable(c).map((w) => w.value);
    return CONTROL.has(values[0] ?? "") || (values[0] === "set" && !setupOnly(values));
  })) return NONE();
  const detached = new Set<number>();
  for (let i = 0; i < commands.length; i++) {
    if (commands[i]!.after !== "&") continue;
    for (let j = i; j >= 0; j--) {
      detached.add(j);
      if (!["&&", "||", "|", "|&"].includes(commands[j]!.before)) break;
    }
  }
  let finalAndStart = commands.length - 1;
  while (finalAndStart > 0 && commands[finalAndStart]!.before === "&&") finalAndStart--;
  const finalForeground = ["end", ";"].includes(commands.at(-1)?.after ?? "");
  const result = NONE();
  let firstOperation = true, exited = false;
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i]!;
    const values = executable(command).map((w) => w.value);
    if (!values.length || setupOnly(values)) continue;
    if (exited) break;
    if (["exit", "return", "exec"].includes(values[0]!)) { exited = true; continue; }
    const piped = detached.has(i) || ["|", "|&"].includes(command.before) || ["|", "|&"].includes(command.after);
    // A successful FINAL && chain ran all its operands. An earlier chain can
    // have been skipped/failed and masked by a later command, so don't guess.
    const finalAnd = command.before === "&&" && successful && finalForeground && i > finalAndStart;
    const reachable = !piped && command.before !== "||" && (command.before !== "&&" || finalAnd) && (successful || firstOperation);
    if (reachable) {
      const evidence = commandEvidence(command);
      result.mutation ||= evidence.mutation;
      for (const kind of evidence.retro) if (!result.retro.includes(kind)) result.retro.push(kind);
    }
    firstOperation = false;
  }
  return result;
}
