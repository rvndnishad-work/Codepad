import type { SandpackFiles } from "@codesandbox/sandpack-react";

/**
 * Virtual `node_modules` shims for Node core modules.
 *
 * WHY THIS EXISTS
 * ---------------
 * We bundle in-browser with Sandpack's evergreen v2 bundler
 * (`https://sandpack-bundler.codesandbox.io`, set in Playground.tsx — the
 * version-pinned v1 default couldn't parse ES2020). v1 shipped
 * `node-libs-browser`; v2 ships no Node polyfills at all.
 *
 * Worse, v2's `ModuleRegistry.loadModuleDependencies()` eagerly resolves every
 * declared dependency of every *installed* package, independent of what the
 * user actually imports. So `npm i axios` alone — with no `import axios`
 * anywhere — pulls in `follow-redirects`, whose `require("http")` cannot
 * resolve, and the whole preview dies with:
 *
 *     Cannot find module 'http' from '/node_modules/follow-redirects/index.js'
 *
 * That eager pass only ever calls `Module.addDependency()`, which resolves and
 * nothing more — it never executes the module. So simply making these names
 * *resolvable* is enough to stop installs from exploding.
 *
 * We go one step past bare stubs: builtins that have a genuine browser
 * equivalent get a real (compact) implementation, so packages that actually
 * reach for `path`/`events`/`process` at runtime keep working. Everything that
 * cannot work in a browser resolves to a proxy that throws a readable,
 * actionable message — but only if it is really called.
 *
 * All files are `hidden`, so they stay out of the file tree, the ZIP export and
 * the entry-file heuristics. FilesBridge strips `/node_modules/` before
 * anything is persisted, so they never reach saved snippets.
 */

const PKG = (name: string) =>
  JSON.stringify({ name, version: "0.0.0", main: "index.js" }, null, 2) + "\n";

/** Shared preamble: CJS export plus ESM-interop default. */
const EXPORT_HELPER = [
  "function __exp(mod, value) {",
  "  mod.exports = value;",
  "  try {",
  '    Object.defineProperty(value, "__esModule", { value: true });',
  "    if (value.default === undefined) value.default = value;",
  "  } catch (e) {}",
  "  return value;",
  "}",
].join("\n");

/**
 * Modules with no meaningful browser behaviour. Property access is always safe
 * (so feature detection and destructuring never blow up at import time); only
 * an actual call throws, and it explains why.
 */
function stubSource(name: string): string {
  return [
    '"use strict";',
    "var NAME = " + JSON.stringify(name) + ";",
    "function boom(prop) {",
    "  return function () {",
    "    throw new Error(",
    '      "This playground runs in the browser, where Node\'s \\"" + NAME + "\\" module is not available" +',
    '        (prop ? " (tried to call " + NAME + "." + prop + ")" : "") +',
    '        ". A package you installed depends on it. Use a browser-friendly " +',
    '        "alternative, or run this code in a Node playground."',
    "    );",
    "  };",
    "}",
    "var proxy;",
    "var handler = {",
    "  get: function (target, prop) {",
    '    if (prop === "__esModule") return true;',
    '    if (prop === "default") return proxy;',
    '    if (typeof prop === "symbol") return undefined;',
    "    if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];",
    "    return boom(String(prop));",
    "  },",
    '  apply: function () { return boom("")(); },',
    '  construct: function () { return boom("")(); }',
    "};",
    "proxy = new Proxy(function () {}, handler);",
    "module.exports = proxy;",
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* Real implementations for builtins that do have browser semantics.   */
/* These sources avoid backticks and ${ so they embed safely.          */
/* ------------------------------------------------------------------ */

const PROCESS_SRC = `"use strict";
${EXPORT_HELPER}
function noop() {}
var START = Date.now();
function now() { return typeof performance !== "undefined" ? performance.now() : Date.now(); }
function hrtime(prev) {
  var t = now() * 1e-3;
  var sec = Math.floor(t);
  var nano = Math.floor((t % 1) * 1e9);
  if (prev) {
    sec = sec - prev[0];
    nano = nano - prev[1];
    if (nano < 0) { sec--; nano += 1e9; }
  }
  return [sec, nano];
}
hrtime.bigint = function () { return BigInt(Math.round(now() * 1e6)); };
var proc = {
  env: { NODE_ENV: "development" },
  argv: ["node", "/index.js"],
  argv0: "node",
  execPath: "/usr/bin/node",
  platform: "browser",
  arch: "javascript",
  browser: true,
  title: "browser",
  pid: 1,
  ppid: 0,
  version: "v18.0.0",
  versions: { node: "18.0.0", v8: "10.0.0" },
  release: { name: "node" },
  nextTick: function (fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    var run = function () { fn.apply(null, args); };
    if (typeof queueMicrotask === "function") queueMicrotask(run);
    else Promise.resolve().then(run);
  },
  cwd: function () { return "/"; },
  chdir: noop,
  exit: noop,
  abort: noop,
  umask: function () { return 0; },
  uptime: function () { return (Date.now() - START) / 1000; },
  hrtime: hrtime,
  memoryUsage: function () {
    return { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 };
  },
  on: noop, once: noop, off: noop,
  addListener: noop, removeListener: noop, removeAllListeners: noop,
  setMaxListeners: noop, listeners: function () { return []; },
  emit: function () { return false; },
  emitWarning: noop,
  stdout: { write: function (s) { console.log(String(s).replace(/\\n$/, "")); return true; }, isTTY: false },
  stderr: { write: function (s) { console.error(String(s).replace(/\\n$/, "")); return true; }, isTTY: false },
  stdin: { read: function () { return null; }, on: noop, resume: noop, pause: noop, isTTY: false }
};
__exp(module, proc);
`;

const EVENTS_SRC = `"use strict";
${EXPORT_HELPER}
function EventEmitter() { this._e = Object.create(null); this._max = 10; }
EventEmitter.prototype._list = function (t) {
  if (!this._e) this._e = Object.create(null);
  if (!this._e[t]) this._e[t] = [];
  return this._e[t];
};
EventEmitter.prototype.on = function (t, fn) { this._list(t).push(fn); return this; };
EventEmitter.prototype.addListener = EventEmitter.prototype.on;
EventEmitter.prototype.prependListener = function (t, fn) { this._list(t).unshift(fn); return this; };
EventEmitter.prototype.once = function (t, fn) {
  var self = this;
  function wrap() { self.off(t, wrap); fn.apply(self, arguments); }
  wrap.listener = fn;
  return this.on(t, wrap);
};
EventEmitter.prototype.off = function (t, fn) {
  var l = this._list(t);
  for (var i = l.length - 1; i >= 0; i--) {
    if (l[i] === fn || l[i].listener === fn) l.splice(i, 1);
  }
  return this;
};
EventEmitter.prototype.removeListener = EventEmitter.prototype.off;
EventEmitter.prototype.removeAllListeners = function (t) {
  if (t === undefined) { this._e = Object.create(null); return this; }
  this._e[t] = [];
  return this;
};
EventEmitter.prototype.emit = function (t) {
  var l = this._list(t).slice();
  var args = Array.prototype.slice.call(arguments, 1);
  if (!l.length && t === "error") {
    throw (args[0] instanceof Error ? args[0] : new Error("Unhandled error event"));
  }
  for (var i = 0; i < l.length; i++) l[i].apply(this, args);
  return l.length > 0;
};
EventEmitter.prototype.listeners = function (t) { return this._list(t).slice(); };
EventEmitter.prototype.rawListeners = EventEmitter.prototype.listeners;
EventEmitter.prototype.listenerCount = function (t) { return this._list(t).length; };
EventEmitter.prototype.eventNames = function () { return Object.keys(this._e || {}); };
EventEmitter.prototype.setMaxListeners = function (n) { this._max = n; return this; };
EventEmitter.prototype.getMaxListeners = function () { return this._max; };
EventEmitter.EventEmitter = EventEmitter;
EventEmitter.defaultMaxListeners = 10;
EventEmitter.once = function (emitter, name) {
  return new Promise(function (resolve, reject) {
    emitter.once(name, function () { resolve(Array.prototype.slice.call(arguments)); });
    if (name !== "error" && emitter.once) emitter.once("error", reject);
  });
};
__exp(module, EventEmitter);
`;

const PATH_SRC = `"use strict";
${EXPORT_HELPER}
function normalizeParts(parts, allowAboveRoot) {
  var res = [];
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (!p || p === ".") continue;
    if (p === "..") {
      if (res.length && res[res.length - 1] !== "..") res.pop();
      else if (allowAboveRoot) res.push("..");
    } else res.push(p);
  }
  return res;
}
var path = {
  sep: "/",
  delimiter: ":",
  isAbsolute: function (p) { return String(p).charAt(0) === "/"; },
  normalize: function (p) {
    p = String(p);
    var abs = path.isAbsolute(p);
    var trail = p.length > 1 && p.charAt(p.length - 1) === "/";
    var out = normalizeParts(p.split("/"), !abs).join("/");
    if (!out && !abs) out = ".";
    if (out && trail) out += "/";
    return (abs ? "/" : "") + out;
  },
  join: function () {
    var segs = Array.prototype.filter.call(arguments, function (s) { return s && typeof s === "string"; });
    if (!segs.length) return ".";
    return path.normalize(segs.join("/"));
  },
  resolve: function () {
    var resolved = "";
    var abs = false;
    for (var i = arguments.length - 1; i >= 0 && !abs; i--) {
      var p = arguments[i];
      if (!p || typeof p !== "string") continue;
      resolved = p + "/" + resolved;
      abs = path.isAbsolute(p);
    }
    var out = normalizeParts(resolved.split("/"), false).join("/");
    return "/" + out;
  },
  relative: function (from, to) {
    var f = path.resolve(from).split("/").filter(Boolean);
    var t = path.resolve(to).split("/").filter(Boolean);
    var i = 0;
    while (i < f.length && i < t.length && f[i] === t[i]) i++;
    var up = [];
    for (var j = i; j < f.length; j++) up.push("..");
    return up.concat(t.slice(i)).join("/");
  },
  dirname: function (p) {
    p = String(p);
    var abs = path.isAbsolute(p);
    var parts = p.split("/").filter(Boolean);
    parts.pop();
    if (!parts.length) return abs ? "/" : ".";
    return (abs ? "/" : "") + parts.join("/");
  },
  basename: function (p, ext) {
    var base = String(p).split("/").filter(Boolean).pop() || "";
    if (ext && base.slice(-ext.length) === ext && base !== ext) base = base.slice(0, -ext.length);
    return base;
  },
  extname: function (p) {
    var base = path.basename(p);
    var i = base.lastIndexOf(".");
    return i <= 0 ? "" : base.slice(i);
  },
  parse: function (p) {
    var base = path.basename(p);
    var ext = path.extname(p);
    return {
      root: path.isAbsolute(p) ? "/" : "",
      dir: path.dirname(p),
      base: base,
      ext: ext,
      name: ext ? base.slice(0, -ext.length) : base
    };
  },
  format: function (o) {
    var base = o.base || ((o.name || "") + (o.ext || ""));
    if (!o.dir) return base;
    return o.dir === o.root ? o.dir + base : o.dir + "/" + base;
  },
  toNamespacedPath: function (p) { return p; }
};
path.posix = path;
path.win32 = path;
__exp(module, path);
`;

const QUERYSTRING_SRC = `"use strict";
${EXPORT_HELPER}
var qs = {
  parse: function (str) {
    var out = {};
    var sp = new URLSearchParams(String(str || "").replace(/^[?]/, ""));
    sp.forEach(function (v, k) {
      if (out[k] === undefined) out[k] = v;
      else if (Array.isArray(out[k])) out[k].push(v);
      else out[k] = [out[k], v];
    });
    return out;
  },
  stringify: function (obj) {
    var sp = new URLSearchParams();
    Object.keys(obj || {}).forEach(function (k) {
      var v = obj[k];
      if (Array.isArray(v)) v.forEach(function (x) { sp.append(k, x); });
      else sp.append(k, v == null ? "" : v);
    });
    return sp.toString();
  },
  escape: encodeURIComponent,
  unescape: decodeURIComponent
};
qs.decode = qs.parse;
qs.encode = qs.stringify;
__exp(module, qs);
`;

const URL_SRC = `"use strict";
${EXPORT_HELPER}
var mod = {
  URL: URL,
  URLSearchParams: URLSearchParams,
  parse: function (input) {
    var u = new URL(String(input), "http://localhost");
    return {
      href: u.href, protocol: u.protocol, host: u.host, hostname: u.hostname,
      port: u.port, pathname: u.pathname, search: u.search, hash: u.hash,
      query: u.search.replace(/^[?]/, ""), path: u.pathname + u.search,
      auth: u.username ? u.username + (u.password ? ":" + u.password : "") : null,
      slashes: true
    };
  },
  format: function (o) {
    if (typeof o === "string") return o;
    if (o instanceof URL) return o.href;
    var proto = String(o.protocol || "http:").replace(/:?$/, ":");
    return proto + "//" + (o.host || o.hostname || "") + (o.pathname || "") + (o.search || "") + (o.hash || "");
  },
  resolve: function (from, to) { return new URL(String(to), new URL(String(from), "http://localhost")).href; },
  fileURLToPath: function (u) { return new URL(String(u)).pathname; },
  pathToFileURL: function (p) { return new URL("file://" + String(p)); },
  domainToASCII: function (d) { return String(d); },
  domainToUnicode: function (d) { return String(d); }
};
__exp(module, mod);
`;

const OS_SRC = `"use strict";
${EXPORT_HELPER}
var os = {
  EOL: "\\n",
  platform: function () { return "browser"; },
  arch: function () { return "javascript"; },
  type: function () { return "Browser"; },
  release: function () { return typeof navigator !== "undefined" ? navigator.userAgent : ""; },
  homedir: function () { return "/"; },
  tmpdir: function () { return "/tmp"; },
  hostname: function () { return typeof location !== "undefined" ? location.hostname : "localhost"; },
  endianness: function () { return "LE"; },
  cpus: function () {
    var n = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 1;
    var out = [];
    for (var i = 0; i < n; i++) {
      out.push({ model: "Browser", speed: 0, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } });
    }
    return out;
  },
  totalmem: function () { return 0; },
  freemem: function () { return 0; },
  uptime: function () { return 0; },
  loadavg: function () { return [0, 0, 0]; },
  networkInterfaces: function () { return {}; },
  userInfo: function () { return { username: "browser", homedir: "/", shell: null, uid: -1, gid: -1 }; },
  devNull: "/dev/null",
  constants: {}
};
__exp(module, os);
`;

const ASSERT_SRC = `"use strict";
${EXPORT_HELPER}
function AssertionError(message) {
  var e = new Error(message);
  e.name = "AssertionError";
  return e;
}
function ok(value, message) {
  if (!value) throw AssertionError(message || "Assertion failed");
}
function deepEq(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") {
    return a !== a && b !== b;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  var ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (var i = 0; i < ka.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(b, ka[i])) return false;
    if (!deepEq(a[ka[i]], b[ka[i]])) return false;
  }
  return true;
}
var assert = ok;
assert.ok = ok;
assert.AssertionError = AssertionError;
assert.equal = function (a, b, m) { if (a != b) throw AssertionError(m || a + " != " + b); };
assert.notEqual = function (a, b, m) { if (a == b) throw AssertionError(m || a + " == " + b); };
assert.strictEqual = function (a, b, m) { if (a !== b) throw AssertionError(m || a + " !== " + b); };
assert.notStrictEqual = function (a, b, m) { if (a === b) throw AssertionError(m || a + " === " + b); };
assert.deepEqual = function (a, b, m) { if (!deepEq(a, b)) throw AssertionError(m || "not deep equal"); };
assert.deepStrictEqual = assert.deepEqual;
assert.notDeepEqual = function (a, b, m) { if (deepEq(a, b)) throw AssertionError(m || "deep equal"); };
assert.notDeepStrictEqual = assert.notDeepEqual;
assert.fail = function (m) { throw AssertionError(m || "Failed"); };
assert.throws = function (fn, _e, m) {
  try { fn(); } catch (e) { return; }
  throw AssertionError(m || "Missing expected exception");
};
assert.doesNotThrow = function (fn) { fn(); };
assert.match = function (s, re, m) { if (!re.test(s)) throw AssertionError(m || "no match"); };
assert.ifError = function (e) { if (e) throw e; };
assert.strict = assert;
__exp(module, assert);
`;

const UTIL_SRC = `"use strict";
${EXPORT_HELPER}
function inspect(o) {
  if (typeof o === "string") return o;
  try { return JSON.stringify(o); } catch (e) { return String(o); }
}
function format(f) {
  var args = Array.prototype.slice.call(arguments, 1);
  if (typeof f !== "string") return [f].concat(args).map(inspect).join(" ");
  var i = 0;
  var out = f.replace(/%[sdifjoO%]/g, function (m) {
    if (m === "%%") return "%";
    if (i >= args.length) return m;
    var a = args[i++];
    if (m === "%s") return String(a);
    if (m === "%d" || m === "%f") return Number(a);
    if (m === "%i") return parseInt(a, 10);
    if (m === "%j") { try { return JSON.stringify(a); } catch (e) { return "[Circular]"; } }
    return inspect(a);
  });
  for (; i < args.length; i++) out += " " + inspect(args[i]);
  return out;
}
var util = {
  format: format,
  inspect: inspect,
  inherits: function (ctor, superCtor) {
    ctor.super_ = superCtor;
    Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
  },
  promisify: function (fn) {
    return function () {
      var args = Array.prototype.slice.call(arguments);
      var self = this;
      return new Promise(function (resolve, reject) {
        args.push(function (err, value) { if (err) reject(err); else resolve(value); });
        fn.apply(self, args);
      });
    };
  },
  callbackify: function (fn) {
    return function () {
      var args = Array.prototype.slice.call(arguments);
      var cb = args.pop();
      fn.apply(this, args).then(function (v) { cb(null, v); }, function (e) { cb(e); });
    };
  },
  deprecate: function (fn) { return fn; },
  isArray: Array.isArray,
  isDate: function (v) { return v instanceof Date; },
  isRegExp: function (v) { return v instanceof RegExp; },
  isError: function (v) { return v instanceof Error; },
  isFunction: function (v) { return typeof v === "function"; },
  isString: function (v) { return typeof v === "string"; },
  isNumber: function (v) { return typeof v === "number"; },
  isBoolean: function (v) { return typeof v === "boolean"; },
  isNull: function (v) { return v === null; },
  isUndefined: function (v) { return v === undefined; },
  isNullOrUndefined: function (v) { return v == null; },
  isObject: function (v) { return v !== null && typeof v === "object"; },
  isPrimitive: function (v) { return v === null || (typeof v !== "object" && typeof v !== "function"); },
  isBuffer: function () { return false; },
  types: {
    isDate: function (v) { return v instanceof Date; },
    isRegExp: function (v) { return v instanceof RegExp; },
    isPromise: function (v) { return !!v && typeof v.then === "function"; },
    isMap: function (v) { return v instanceof Map; },
    isSet: function (v) { return v instanceof Set; }
  },
  TextEncoder: typeof TextEncoder !== "undefined" ? TextEncoder : undefined,
  TextDecoder: typeof TextDecoder !== "undefined" ? TextDecoder : undefined
};
__exp(module, util);
`;

const CRYPTO_SRC = `"use strict";
${EXPORT_HELPER}
var webcrypto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
function unsupported(name) {
  return function () {
    throw new Error(
      "crypto." + name + "() is not available in a browser playground. " +
      "Use the Web Crypto API (crypto.subtle) instead, or run this in a Node playground."
    );
  };
}
var mod = {
  webcrypto: webcrypto,
  subtle: webcrypto && webcrypto.subtle,
  getRandomValues: function (arr) { return webcrypto.getRandomValues(arr); },
  randomUUID: function () {
    if (webcrypto && webcrypto.randomUUID) return webcrypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  },
  randomBytes: function (size, cb) {
    var arr = new Uint8Array(size);
    if (webcrypto) webcrypto.getRandomValues(arr);
    if (cb) { cb(null, arr); return undefined; }
    return arr;
  },
  randomInt: function (min, max) {
    if (max === undefined) { max = min; min = 0; }
    return min + Math.floor(Math.random() * (max - min));
  },
  timingSafeEqual: function (a, b) {
    if (a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  },
  createHash: unsupported("createHash"),
  createHmac: unsupported("createHmac"),
  createCipheriv: unsupported("createCipheriv"),
  createDecipheriv: unsupported("createDecipheriv"),
  pbkdf2: unsupported("pbkdf2"),
  constants: {}
};
__exp(module, mod);
`;

const STRING_DECODER_SRC = `"use strict";
${EXPORT_HELPER}
function StringDecoder(encoding) {
  this.encoding = String(encoding || "utf8").replace(/[-_]/g, "").toLowerCase();
  this._dec = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") : null;
}
StringDecoder.prototype.write = function (buf) {
  if (buf == null) return "";
  if (typeof buf === "string") return buf;
  return this._dec ? this._dec.decode(buf, { stream: true }) : String(buf);
};
StringDecoder.prototype.end = function (buf) {
  var out = buf ? this.write(buf) : "";
  return out + (this._dec ? this._dec.decode() : "");
};
__exp(module, { StringDecoder: StringDecoder });
`;

const TIMERS_SRC = `"use strict";
${EXPORT_HELPER}
var mod = {
  setTimeout: function () { return setTimeout.apply(null, arguments); },
  clearTimeout: function () { return clearTimeout.apply(null, arguments); },
  setInterval: function () { return setInterval.apply(null, arguments); },
  clearInterval: function () { return clearInterval.apply(null, arguments); },
  setImmediate: function (fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    return setTimeout(function () { fn.apply(null, args); }, 0);
  },
  clearImmediate: function (id) { return clearTimeout(id); }
};
__exp(module, mod);
`;

const CONSTANTS_SRC = `"use strict";
${EXPORT_HELPER}
__exp(module, {});
`;

/** Builtins we give real browser behaviour to. */
const IMPLEMENTED: Record<string, string> = {
  process: PROCESS_SRC,
  events: EVENTS_SRC,
  path: PATH_SRC,
  querystring: QUERYSTRING_SRC,
  url: URL_SRC,
  os: OS_SRC,
  assert: ASSERT_SRC,
  util: UTIL_SRC,
  crypto: CRYPTO_SRC,
  string_decoder: STRING_DECODER_SRC,
  timers: TIMERS_SRC,
  constants: CONSTANTS_SRC,
};

/**
 * Builtins that cannot work in a browser. These exist purely so the bundler's
 * eager dependency walk resolves; calling into one throws a readable error.
 *
 * Slash-suffixed entries (`fs/promises`) land at `/node_modules/fs/promises/`,
 * which is exactly where the resolver looks for them.
 */
const STUBBED = [
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "dgram",
  "diagnostics_channel",
  "dns",
  "dns/promises",
  "domain",
  "fs",
  "fs/promises",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "perf_hooks",
  "punycode",
  "readline",
  "repl",
  "stream",
  "stream/promises",
  "stream/web",
  "timers/promises",
  "tls",
  "trace_events",
  "tty",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib",
];

/**
 * Aliases of a module we already implement. `require("assert/strict")` should
 * behave like `assert`, not throw, and `sys` is the historical name for `util`.
 */
const REEXPORTS: Record<string, string> = {
  "assert/strict": "assert",
  sys: "util",
};

/** Every builtin name we provide: implemented, re-exported or stubbed. */
export const SHIMMED_NODE_BUILTINS: string[] = [
  ...Object.keys(IMPLEMENTED),
  ...Object.keys(REEXPORTS),
  ...STUBBED,
];

/** True for any path belonging to an injected shim package. */
export function isNodeShimPath(path: string): boolean {
  return path.startsWith("/node_modules/");
}

/**
 * Build the virtual `node_modules` file map.
 *
 * `installedDeps` — the project's current dependency names. A builtin whose
 * name the user actually installed from npm (`buffer`, `events`, `url`,
 * `process`, `assert`, `path`… all exist as real packages) is skipped, so the
 * real package always wins over our shim.
 */
const shimCache = new Map<string, SandpackFiles>();

export function buildNodeBuiltinShims(
  installedDeps: Record<string, string> | string[] = {}
): SandpackFiles {
  const names = Array.isArray(installedDeps)
    ? installedDeps
    : Object.keys(installedDeps);

  // The map depends only on which names are skipped, so cache per skip-set and
  // hand back the same object. Callers spread it into `files` on every render;
  // a stable identity keeps that cheap and avoids gratuitous re-bundles.
  const cacheKey = [...new Set(names)].sort().join(" ");
  const cached = shimCache.get(cacheKey);
  if (cached) return cached;

  const taken = new Set(names);
  const files: SandpackFiles = {};

  const add = (name: string, source: string) => {
    // Skip when the user installed a real package under this name, and skip
    // `fs/promises` style entries whose base package the user owns.
    if (taken.has(name) || taken.has(name.split("/")[0])) return;
    files[`/node_modules/${name}/package.json`] = { code: PKG(name), hidden: true };
    files[`/node_modules/${name}/index.js`] = { code: source, hidden: true };
  };

  for (const [name, source] of Object.entries(IMPLEMENTED)) add(name, source);
  for (const [name, target] of Object.entries(REEXPORTS)) {
    // Depth of the shim dir below /node_modules decides how far back up to walk.
    const up = "../".repeat(name.split("/").length);
    add(name, `"use strict";\nmodule.exports = require("${up}${target}/index.js");\n`);
  }
  for (const name of STUBBED) add(name, stubSource(name));

  shimCache.set(cacheKey, files);
  return files;
}
