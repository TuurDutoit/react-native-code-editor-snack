import runMode from "./runmode";
import uuid from "uuidv4";
import { diffLines } from "diff";

function copy(obj) {
  const res = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    res[key] = typeof obj[key] === "object" ? copy(obj[key]) : obj[key];
  }

  return res;
}

function last(arr) {
  return arr[arr.length - 1];
}

function split(code) {
  const lines = code
    .split("\n")
    .map((l, i, a) => (i === a.length - 1 ? l : l + "\n"));

  if (code.endsWith("\n")) {
    return lines.slice(0, -1);
  }

  return lines;
}

function parse(doc, newCode, parser) {
  const parsed = [];
  let index = 0;
  let state = parser.startState();
  const diff = diffLines(doc.code, newCode);

  for (const item of diff) {
    if (item.added) {
      for (const lineCode of split(item.value)) {
        const startState = copy(state);
        const tokens = parseLine(lineCode, state, parser);
        parsed.push({
          uuid: uuid(),
          text: lineCode,
          tokens,
          startState,
          endState: copy(state)
        });
      }

      index -= item.count;
    } else if (!item.removed) {
      parsed.push(...doc.parsed.slice(index, index + item.count));
      state = last(parsed).endState;
    }

    index += item.count;
  }

  return parsed;
}

function parseLine(code, state, parser) {
  const tokens = [];

  runMode(
    code,
    parser,
    function(text, style, i, start, _state) {
      if (!style && text === "\n") {
        style = "newline";
      }

      tokens.push({
        text,
        tags: style ? style.split() : []
      });
    },
    {
      state
    }
  );

  return tokens;
}

export default function fromMode(spec) {
  return function createParser(editorOptions, mime) {
    const mimeOptions = spec.mimes[mime];
    const parser = spec.createParser(editorOptions || {}, mimeOptions || {});

    return {
      init: () => ({
        code: "",
        parsed: []
      }),
      parse: (doc, newCode) => {
        if (newCode === doc.code) {
          return doc.parsed;
        }

        doc.parsed = parse(doc, newCode, parser);
        doc.code = newCode;

        return doc.parsed;
      }
    };
  };
}
