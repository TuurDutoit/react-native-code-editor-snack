import * as React from "react";
import { StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import CodeEditor, { themes, parsers } from "./editor";

const parser = parsers.python();

export default function App() {
  const [code, setCode] = React.useState();

  return (
    <View style={styles.container}>
      <CodeEditor
        code={code}
        parser={parser}
        theme={themes.Monokai}
        onChangeCode={setCode}
        style={styles.editor}
        autofocus
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Constants.statusBarHeight,
    backgroundColor: "#ecf0f1",
    alignItems: "stretch"
  },
  editor: {
    flex: 1
  }
});
