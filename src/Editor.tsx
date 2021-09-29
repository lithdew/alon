import Parser from "web-tree-sitter";
import { monaco } from "react-monaco-editor";

export const markEditorErrors = (tree: Parser.Tree, editor: monaco.editor.IStandaloneCodeEditor) => {
    let markers: monaco.editor.IMarkerData[] = [];
    if (tree.rootNode.hasError()) {
        const cursor = tree.walk();
        let reachedRoot = false;
        while (!reachedRoot) {
            const currentNode = cursor.currentNode();
            if (!currentNode.equals(tree.rootNode)) {
                if (currentNode.isMissing() && currentNode.parent?.text !== "__cplusplus") {
                    let message = `Expected "${currentNode.type}"`;
                    if (currentNode.parent) {
                        if (currentNode.parent.type === currentNode.parent.text) {
                            message += ` after "${currentNode.parent.text.trim()}"`;
                        } else {
                            message += ` after ${currentNode.parent.type.replace("_", " ")} "${currentNode.parent.text.trim()}"`;
                        }
                        markers.push({
                            severity: monaco.MarkerSeverity.Error,
                            startLineNumber: currentNode.parent.startPosition.row + 1,
                            startColumn: currentNode.parent.startPosition.column + 1,
                            endLineNumber: currentNode.endPosition.row + 1,
                            endColumn: currentNode.endPosition.column + 1,
                            message: message,
                        });
                    } else {
                        message += ".";
                        markers.push({
                            severity: monaco.MarkerSeverity.Error,
                            startLineNumber: currentNode.startPosition.row + 1,
                            startColumn: currentNode.startPosition.column + 1,
                            endLineNumber: currentNode.endPosition.row + 1,
                            endColumn: currentNode.endPosition.column + 1,
                            message: message,
                        });
                    }
                } else if (currentNode.type === "ERROR") {
                    if (currentNode.namedChildCount === 0) {
                        if (!currentNode.nextNamedSibling && !currentNode.previousNamedSibling) {
                            let message = `Unexpected "${currentNode.text}".`;

                            markers.push({
                                severity: monaco.MarkerSeverity.Error,
                                startLineNumber: currentNode.startPosition.row + 1,
                                startColumn: currentNode.startPosition.column + 1,
                                endLineNumber: currentNode.endPosition.row + 1,
                                endColumn: currentNode.endPosition.column + 1,
                                message,
                            });
                        } else {
                            if (currentNode.nextNamedSibling) {
                                let message = `Unexpected "${currentNode.text}"`;
                                if (currentNode.nextNamedSibling.type === currentNode.nextNamedSibling.text) {
                                    message += ` before "${currentNode.nextNamedSibling.text.trim()}".`;
                                } else {
                                    message += ` before ${currentNode.nextNamedSibling.type.replace("_", " ")} "${currentNode.nextNamedSibling.text.trim()}".`;
                                }

                                markers.push({
                                    severity: monaco.MarkerSeverity.Error,
                                    startLineNumber: currentNode.startPosition.row + 1,
                                    startColumn: currentNode.startPosition.column + 1,
                                    endLineNumber: currentNode.nextNamedSibling.endPosition.row + 1,
                                    endColumn: currentNode.nextNamedSibling.endPosition.column + 1,
                                    message,
                                });
                            }

                            if (currentNode.previousNamedSibling) {
                                let message = `Unexpected "${currentNode.text}"`;
                                if (currentNode.previousNamedSibling.type === currentNode.previousNamedSibling.text) {
                                    message += ` after "${currentNode.previousNamedSibling.text.trim()}".`;
                                } else {
                                    message += ` after ${currentNode.previousNamedSibling.type.replace("_", " ")} "${currentNode.previousNamedSibling.text.trim()}".`;
                                }

                                markers.push({
                                    severity: monaco.MarkerSeverity.Error,
                                    startLineNumber: currentNode.previousNamedSibling.startPosition.row + 1,
                                    startColumn: currentNode.previousNamedSibling.startPosition.column + 1,
                                    endLineNumber: currentNode.previousNamedSibling.endPosition.row + 1,
                                    endColumn: currentNode.previousNamedSibling.endPosition.column + 1,
                                    message,
                                });
                            }
                        }
                    } else {
                        let startLineNumber = currentNode.startPosition.row + 1;
                        let startColumn = currentNode.startPosition.column + 1;
                        let endLineNumber = currentNode.endPosition.row + 1;
                        let endColumn = currentNode.endPosition.column + 1;

                        let message: string = "";
                        if (currentNode.firstNamedChild!.previousSibling) {
                            message = `Unexpected "${currentNode.firstNamedChild!.previousSibling.text}" before ${currentNode.firstNamedChild!.type.replace("_", " ")} "${currentNode.firstNamedChild!.text.trim()}".`;
                        } else if (currentNode.lastNamedChild!.nextSibling) {
                            message = `Unexpected "${currentNode.lastNamedChild!.nextSibling.text}" after ${currentNode.lastNamedChild!.type.replace("_", " ")} "${currentNode.lastNamedChild!.text.trim()}".`;
                        } else {
                            message = `Unexpected "${currentNode.firstNamedChild!.text}".`;
                        }
                        markers.push({
                            severity: monaco.MarkerSeverity.Error,
                            startLineNumber,
                            startColumn,
                            endLineNumber,
                            endColumn,
                            message,
                        });
                    }
                }
            }

            if (cursor.gotoFirstChild()) {
                continue;
            }
            if (cursor.gotoNextSibling()) {
                continue;
            }
            while (true) {
                if (!cursor.gotoParent()) {
                    reachedRoot = true;
                    break;
                }
                if (cursor.gotoNextSibling()) {
                    break;
                }
            }
        }
    }
    monaco.editor.setModelMarkers(editor.getModel()!, "c", markers);
}