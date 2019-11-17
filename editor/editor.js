import * as React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput
} from "react-native";
import defaultText from "./defaultText";

const ThemeContext = React.createContext();
const now = Date.now;

export default function CodeEditor({
  code = defaultText,
  theme,
  parser,
  onChangeCode,
  style,
  ...props
}) {
  const startTime = now();
  const doc = React.useMemo(() => parser.init(), []);
  const lines = parser.parse(doc, code);
  const Input = Platform.OS === "web" ? WebInput : NativeInput;

  const middleTime = now();
  const res = (
    <ThemeContext.Provider value={theme}>
      <Input
        onChangeText={onChangeCode}
        style={[styles.editor, theme.editor, style]}
        {...props}
      >
        {lines.map(renderLine)}
      </Input>
    </ThemeContext.Provider>
  );

  const endTime = now();
  console.log(
    `${middleTime - startTime}ms (parse) + ${endTime -
      middleTime}ms (render) = ${endTime - startTime}ms`
  );
  return res;
}

function WebInput({ onChangeText, ...props }) {
  const onInput = React.useCallback(
    event => {
      event.preventDefault();
      onChangeText(event.currentTarget.textContent);
    },
    [onChangeText]
  );

  return <Text contentEditable onInput={onInput} {...props} />;
}

function NativeInput({ children, ...props }) {
  return (
    <KeyboardAvoidingView style={styles.editorContainer} behavior="padding">
      <ScrollView>
        <TextInput
          multiline
          autoCapitalize="none"
          autoCompleteType="off"
          autoCorrect={false}
          {...props}
        >
          {children}
        </TextInput>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const renderLine = line => <Line line={line} key={line.uuid} />;

const Line = React.memo(function Line({ line }) {
  return <Text>{line.tokens.map(renderToken)}</Text>;
});

const renderToken = (token, index) => <Token token={token} key={index} />;

function Token({ token }) {
  const theme = React.useContext(ThemeContext);
  const styles = React.useMemo(() => getStyles(theme, token.tags), [
    theme,
    token.tags
  ]);

  return <Text style={styles}>{token.text}</Text>;
}

function getStyles(theme, tags) {
  return [theme.token, ...tags.map(tag => theme[tag])];
}

const styles = StyleSheet.create({
  editor: {
    textAlignVertical: "top"
  },
  editorContainer: {
    flex: 1
  }
});
