import { XIcon } from "@heroicons/react/solid";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { monaco } from "react-monaco-editor";
import { useUpdate } from "react-use";
import { ContextMenuConsumer, ContextMenuContextState, ContextMenuProvider } from "./useContextMenu";

interface TabContextMenu {
    model: monaco.editor.ITextModel;
    multipleTabsOpen: boolean;
    closeTab(event: React.MouseEvent): void;
    closeOtherTabs(event: React.MouseEvent): void;
}

const Tabs = ({ editor }: { editor: monaco.editor.IStandaloneCodeEditor | null }) => {
    const contextMenuRef = useRef(null);

    const [currentModelUrl, setCurrentModelUrl] = useState<monaco.Uri | null>(null);
    const [models, setModels] = useState<monaco.editor.ITextModel[]>(monaco.editor.getModels());
    const update = useUpdate();

    useEffect(() => {
        if (!editor) {
            return;
        }

        const model = editor.getModel();
        if (model) {
            setCurrentModelUrl(model.uri);
        }

        const changeModelHandler = editor.onDidChangeModel(event => {
            setCurrentModelUrl(event.newModelUrl);
        });

        const createModelHandler = monaco.editor.onDidCreateModel(model => {
            setCurrentModelUrl(model.uri);
            setModels(models => [...models, model]);
        });

        const disposeModelHandler = monaco.editor.onWillDisposeModel(disposed => {
            setModels(models => models.filter(model => model.id !== disposed.id));
            update();
        });

        return () => {
            setCurrentModelUrl(null);
            setModels(models => [...models.filter(model => monaco.editor.getModels().includes(model)), ...monaco.editor.getModels().filter(model => !models.includes(model))]);

            changeModelHandler.dispose();
            createModelHandler.dispose();
            disposeModelHandler.dispose();
        }
    }, [editor, update]);

    const handleClick = useCallback((model: monaco.editor.ITextModel) => {
        if (editor) {
            editor.setModel(model);
        }
    }, [editor]);

    const closeTab = useCallback((event: React.MouseEvent, contextMenu: ContextMenuContextState<TabContextMenu>, maybeModel?: monaco.editor.ITextModel) => {
        if (!maybeModel) maybeModel = contextMenu.state?.data.model;
        if (!maybeModel) return;

        const model = maybeModel;

        event.stopPropagation();

        if (editor && currentModelUrl?.toString() === model.uri.toString()) {
            const models = monaco.editor.getModels();
            const index = models.findIndex(other => other.id === model.id);

            const next = (() => {
                if (index + 1 < models.length) {
                    return models[index + 1];
                }
                if (index - 1 >= 0) {
                    return models[index - 1];
                }
                return null;
            })();

            editor.setModel(next);
        }

        model.dispose();
        contextMenu.close();
    }, [editor, currentModelUrl]);

    const closeOtherTabs = useCallback((event: React.MouseEvent, contextMenu: ContextMenuContextState<TabContextMenu>, model?: monaco.editor.ITextModel) => {
        model = model || contextMenu.state?.data.model;
        if (!model) {
            return;
        }

        event.stopPropagation();

        if (editor) {
            const models = monaco.editor.getModels();
            for (const otherModel of models) {
                if (otherModel.id !== model.id) {
                    otherModel.dispose();
                }
            }

            editor.setModel(model);
        }

        contextMenu.close();
    }, [editor]);

    const [dragTarget, setDragTarget] = useState<{ modelUri?: string, refCount: number }>({ refCount: 0 });

    const handleTabDragStart = (event: React.DragEvent, modelUri: string) => {
        event.dataTransfer.setData("text/plain", modelUri);
    };

    const handleTabDragEnter = (event: React.DragEvent, modelUri: string) => {
        setDragTarget(target => ({ modelUri, refCount: target.refCount + 1 }));
        event.preventDefault();
        event.stopPropagation();
    };

    const handleTabDragLeave = (event: React.DragEvent, _modelUri: string) => {
        setDragTarget(target => ({ modelUri: target.refCount - 1 === 0 ? undefined : target.modelUri, refCount: target.refCount - 1 }));
        event.preventDefault();
    };

    const handleTabDragOver = (event: React.DragEvent, _modelUri: string) => {
        event.preventDefault();
    };

    const handleTabDropped = (event: React.DragEvent, endModelUri: string) => {
        event.preventDefault();

        const startModelUri = event.dataTransfer.getData("text/plain");
        if (startModelUri.length === 0) return;

        setModels(models => {
            const start = models.findIndex(model => model.uri.toString() === startModelUri);
            if (start < 0) return models;

            const end = models.findIndex(model => model.uri.toString() === endModelUri);
            if (end < 0) return models;

            let updated = [...models];
            [updated[start], updated[end]] = [updated[end], updated[start]];
            return updated;
        });

        setDragTarget({ modelUri: undefined, refCount: 0 });
    };

    const handleContextMenu = (event: React.MouseEvent, contextMenu: ContextMenuContextState<any>, model: monaco.editor.ITextModel) => {
        contextMenu.open(event.pageX, event.pageY, {
            model,
            multipleTabsOpen: models.length > 1,
            closeTab,
            closeOtherTabs,
        })
        event.preventDefault();
    };

    return (
        <ContextMenuProvider<TabContextMenu> contextMenuRef={contextMenuRef}>
            <ContextMenuConsumer>
                {
                    (contextMenu: ContextMenuContextState<TabContextMenu>) => <>
                        <div className="relative h-10">
                            <div className="absolute top-0 left-0 right-0 bottom-0 text-sm bg-gray-100 flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
                                {
                                    models.map(model => {
                                        const uri = model.uri.toString();
                                        return (
                                            <button
                                                draggable
                                                onDragStart={(event) => handleTabDragStart(event, uri)}
                                                onDragEnter={(event) => handleTabDragEnter(event, uri)}
                                                onDragLeave={(event) => handleTabDragLeave(event, uri)}
                                                onDragOver={(event) => handleTabDragOver(event, uri)}
                                                onDrop={(event) => handleTabDropped(event, uri)}
                                                key={model.id}
                                                className={`border-r px-2 py-1 flex gap-2 items-center ${uri === currentModelUrl?.toString() ? "bg-white" : ""} ${dragTarget.modelUri === uri ? "bg-blue-100" : ""}`}
                                                onMouseDown={() => handleClick(model)}
                                                onContextMenu={(event) => handleContextMenu(event, contextMenu, model)}
                                            >
                                                <span className="whitespace-nowrap">{model.uri.path}</span>
                                                <XIcon
                                                    className="w-4 h-4 rounded-md p-0.5 hover:bg-gray-300"
                                                    onClick={(event) => closeTab(event, contextMenu, model)}
                                                />
                                            </button>
                                        )
                                    })
                                }
                            </div>
                        </div>
                        {contextMenu.state &&
                            (<div ref={contextMenuRef} className={`fixed z-10 bg-white flex py-2 flex-col gap-1 text-xs shadow-lg`} style={{ top: contextMenu.state.y, left: contextMenu.state.x }}>
                                <div className="flex flex-col">
                                    <button className="pl-6 pr-4 py-1 w-full text-left hover:bg-gray-100" onClick={(event) => closeTab(event, contextMenu)}>Close</button>
                                    <button className={`pl-6 pr-4 py-1 w-full text-left ${!contextMenu.state.data.multipleTabsOpen ? "cursor-default bg-gray-100 text-gray-400" : "hover:bg-gray-100"}`} disabled={!contextMenu.state.data.multipleTabsOpen} onClick={(event) => closeOtherTabs(event, contextMenu)}>Close Others</button>
                                </div>
                            </div>)
                        }
                    </>}
            </ContextMenuConsumer>
        </ContextMenuProvider>
    );
}

export default Tabs;