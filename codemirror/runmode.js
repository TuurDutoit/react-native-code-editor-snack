// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

/* Just enough of CodeMirror to run runMode under node.js */


function splitLines(string) {
  return string.split(/\r\n?|\n/);
}

// Counts the column offset in a string, taking tabs into account.
// Used mostly to find indentation.
var countColumn = function(
  string,
  end,
  tabSize,
  startIndex,
  startValue
) {
  if (end == null) {
    end = string.search(/[^\s\u00a0]/);
    if (end == -1) end = string.length;
  }
  for (var i = startIndex || 0, n = startValue || 0; ; ) {
    var nextTab = string.indexOf('\t', i);
    if (nextTab < 0 || nextTab >= end) return n + (end - i);
    n += nextTab - i;
    n += tabSize - (n % tabSize);
    i = nextTab + 1;
  }
};

function StringStream(string, tabSize, context) {
  this.pos = this.start = 0;
  this.string = string;
  this.tabSize = tabSize || 8;
  this.lastColumnPos = this.lastColumnValue = 0;
  this.lineStart = 0;
  this.context = context;
}

StringStream.prototype = {
  eol: function() {
    return this.pos >= this.string.length;
  },
  sol: function() {
    return this.pos == this.lineStart;
  },
  peek: function() {
    return this.string.charAt(this.pos) || undefined;
  },
  next: function() {
    if (this.pos < this.string.length) return this.string.charAt(this.pos++);
  },
  eat: function(match) {
    var ch = this.string.charAt(this.pos);
    var ok = false;
    if (typeof match == 'string') ok = ch == match;
    else ok = ch && (match.test ? match.test(ch) : match(ch));
    if (ok) {
      ++this.pos;
      return ch;
    }
  },
  eatWhile: function(match) {
    var start = this.pos;
    while (this.eat(match)) { /* do nothing */ }
    return this.pos > start;
  },
  eatSpace: function() {
    var start = this.pos;
    while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) ++this.pos;
    return this.pos > start;
  },
  skipToEnd: function() {
    this.pos = this.string.length;
  },
  skipTo: function(ch) {
    var found = this.string.indexOf(ch, this.pos);
    if (found > -1) {
      this.pos = found;
      return true;
    }
  },
  backUp: function(n) {
    this.pos -= n;
  },
  column: function() {
    if (this.lastColumnPos < this.start) {
      this.lastColumnValue = countColumn(
        this.string,
        this.start,
        this.tabSize,
        this.lastColumnPos,
        this.lastColumnValue
      );
      this.lastColumnPos = this.start;
    }
    return (
      this.lastColumnValue -
      (this.lineStart
        ? countColumn(this.string, this.lineStart, this.tabSize)
        : 0)
    );
  },
  indentation: function() {
    return (
      countColumn(this.string, null, this.tabSize) -
      (this.lineStart
        ? countColumn(this.string, this.lineStart, this.tabSize)
        : 0)
    );
  },
  match: function(pattern, consume, caseInsensitive) {
    if (typeof pattern == 'string') {
      var cased = function(str) {
        return caseInsensitive ? str.toLowerCase() : str;
      };
      var substr = this.string.substr(this.pos, pattern.length);
      if (cased(substr) == cased(pattern)) {
        if (consume !== false) this.pos += pattern.length;
        return true;
      }
    } else {
      var match = this.string.slice(this.pos).match(pattern);
      if (match && match.index > 0) return null;
      if (match && consume !== false) this.pos += match[0].length;
      return match;
    }
  },
  current: function() {
    return this.string.slice(this.start, this.pos);
  },
  hideFirstChars: function(n, inner) {
    this.lineStart += n;
    try {
      return inner();
    } finally {
      this.lineStart -= n;
    }
  },
  lookAhead: function(n) {
    var line = this.context.line + n;
    return line >= this.context.lines.length ? null : this.context.lines[line];
  },
};

var startState = function(mode, a1, a2) {
  return mode.startState ? mode.startState(a1, a2) : true;
};

function copyObj(obj, target, overwrite) {
  if (!target) target = {};
  for (var prop in obj)
    if (
      obj.hasOwnProperty(prop) &&
      (overwrite !== false || !target.hasOwnProperty(prop))
    )
      target[prop] = obj[prop];
  return target;
}

var runMode = function(string, mode, callback, options) {
  var lines = splitLines(string),
    state = (options && options.state) || startState(mode);
  var context = { lines: lines, line: 0 };
  for (var i = 0, e = lines.length; i < e; ++i, ++context.line) {
    if (i) callback('\n');
    var stream = new StringStream(lines[i], 4, context);
    if (!stream.string && mode.blankLine) mode.blankLine(state);
    while (!stream.eol()) {
      var style = mode.token(stream, state);
      callback(stream.current(), style, i, stream.start, state);
      stream.start = stream.pos;
    }
  }
};

export default runMode;
