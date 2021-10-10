import { ChevronDownIcon, ChevronRightIcon, DocumentTextIcon } from "@heroicons/react/outline"
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createContext, useContext } from "react";
import { useMemo } from "react";
import { HTMLAttributes, PropsWithChildren } from "react";
import { monaco } from "react-monaco-editor";
import { useSet } from "react-use";
import { ContextMenuConsumer, ContextMenuProvider, useContextMenu } from "./useContextMenu";
import { useFileSystem } from "./useLLVM";
import { saveAs } from "file-saver";
import * as zip from "@zip.js/zip.js";

const TreeContext = createContext<TreeContextState<any>>({} as TreeContextState<any>);

export interface TreeProviderProps<T> {
    data: T[],
    getName(node: T): string,
    getChildren(node: T): T[] | undefined,
    onClicked(node: T): void,
}

export type DragTarget = { node?: any, refCount: number };

export interface TreeContextState<T> extends TreeProviderProps<T> {
    isExpanded(node: T): boolean;
    toggleExpanded(node: T): void;

    renaming: T | null;
    startRenaming(node: T): void;
    stopRenaming(): void;

    dragTarget: { node?: any, refCount: number }
    setDragTarget(action: DragTarget | ((prev: DragTarget) => DragTarget)): void;
}

interface NodeContextMenu {
    isFolder: boolean,
    isDraggable: boolean,
    click(): void;
    download(event: React.MouseEvent): void;
    rename(event: React.MouseEvent): void;
    delete(event: React.MouseEvent): void;
    createNewFile(event: React.MouseEvent, extension: string): void;
}

export function TreeProvider<T>({ data, getName, getChildren, onClicked, children }: PropsWithChildren<TreeProviderProps<T>>) {
    const [, { has: isExpanded, toggle: toggleExpanded }] = useSet(new Set());
    const [renaming, setRenaming] = useState<T | null>(null);

    const startRenaming = useCallback((node: T) => setRenaming(node), []);
    const stopRenaming = useCallback(() => setRenaming(null), []);

    const [dragTarget, setDragTarget] = useState<DragTarget>({ refCount: 0 });

    return (
        <TreeContext.Provider value={{
            data,

            isExpanded,
            toggleExpanded,

            renaming,
            startRenaming,
            stopRenaming,

            dragTarget,
            setDragTarget,

            onClicked,
            getName,
            getChildren,

        }}>
            {children}
        </TreeContext.Provider>
    )
}

function Node<T>({ node, depth, ...props }: PropsWithChildren<{ node: T, depth: number }>) {
    const tree = useContext(TreeContext);
    const { fs, sync } = useFileSystem();

    const { open: openContextMenu, close: closeContextMenu } = useContextMenu<NodeContextMenu>();

    const nodeName = tree.getName(node);
    const nodeChildren = tree.getChildren(node);

    const nodePath = fs ? fs.getPath(node) : null;

    const nodeIsDraggable = useMemo(() => {
        if (!nodePath) return false;
        return nodePath.startsWith("/project/");
    }, [nodePath]);

    const nodeIsDragTarget = useMemo(() => {
        if (!nodePath) return false;
        return nodePath.startsWith("/project");
    }, [nodePath]);

    // Make all nodes at depth 0 expanded by default.
    const nodeIsExpanded = depth !== 0 ? tree.isExpanded(node) : !tree.isExpanded(node);

    const nodeIsBeingRenamed = node === tree.renaming;
    const nodeIsDraggedOver = node === tree.dragTarget.node;

    const nodeColor = nodeChildren ? "text-gray-500" : "text-gray-700";

    const editInputRef = useRef<HTMLInputElement>(null);

    const pathExists = useCallback((path: string): boolean => {
        if (!fs) return false;
        try {
            fs.lookupPath(path, {});
            return true;
        } catch {
            return false;
        }
    }, [fs]);

    const handleClicked = useCallback(() => {
        if (nodeChildren) {
            tree.toggleExpanded(node);
            return closeContextMenu();
        }
        tree.onClicked(node);
        return closeContextMenu();
    }, [tree, node, nodeChildren, closeContextMenu]);

    const [input, setInput] = useState<string>(nodeName);

    const handleFileDownload = useCallback(async (event: React.MouseEvent) => {
        if (!fs || !nodePath) return;

        closeContextMenu();
        event.preventDefault();

        if (nodeChildren) {
            const writer = new zip.ZipWriter(new zip.BlobWriter("application/zip"));

            const recursiveWrite = async (node: any) => {
                const path = fs.getPath(node).slice(nodePath.length + 1);
                if (node.isFolder) {
                    await writer.add(path, new zip.TextReader(""), { directory: true });
                    for (const child of Object.values(node.contents)) {
                        await recursiveWrite(child);
                    }
                } else {
                    await writer.add(path, new zip.Uint8ArrayReader(node.contents));
                }
            };

            await recursiveWrite(node);

            saveAs(await writer.close(), nodeName);
        } else {
            saveAs(new Blob([(node as any).contents]), nodeName);
        }
    }, [fs, node, nodeName, nodePath, nodeChildren, closeContextMenu]);

    const handleFileRename = useCallback((event: React.MouseEvent) => {
        closeContextMenu();
        event.preventDefault();

        setInput(nodeName);
        tree.startRenaming(node);
    }, [tree, node, closeContextMenu, nodeName, setInput]);

    const handleFileDelete = useCallback((event: React.MouseEvent) => {
        closeContextMenu();
        event.preventDefault();

        if (!fs) return;

        const recursiveDelete = (node: any) => {
            const path = fs.getPath(node);
            const model = monaco.editor.getModels().find(model => model.uri.path === path);
            if (model) {
                model.dispose();
            }

            if (node.isFolder) {
                Object.values(node.contents).forEach(recursiveDelete);
                fs.rmdir(path);
            } else {
                fs.unlink(path);
            }
        };

        recursiveDelete(node);
        sync();
    }, [fs, node, sync, closeContextMenu]);

    const handleCreateNewFile = useCallback((event: React.MouseEvent, extension: string) => {
        closeContextMenu();
        event.preventDefault();

        if (!fs) return;

        const createEmptyFile = () => {
            const folder = (node as any).isFolder ? node : (node as any).parent;
            const folderPath = fs.getPath(folder);
            if (extension.length === 0) {
                let path = `${folderPath}/untitled${extension}`;
                let counter = 0;
                while (pathExists(path)) {
                    path = `${folderPath}/untitled_${counter + 1}${extension}`
                    counter += 1;
                }
                fs.mkdir(path);
                sync();
                return path;
            } else {
                let path = `${folderPath}/untitled${extension}`;
                let counter = 0;
                while (pathExists(path)) {
                    path = `${folderPath}/untitled_${counter + 1}${extension}`
                    counter += 1;
                }
                fs.writeFile(path, "");
                sync();
                return path;
            }
        };

        const result = fs.lookupPath(createEmptyFile(), {});
        tree.startRenaming(result.node);
    }, [tree, fs, node, sync, pathExists, closeContextMenu]);

    const handleEditName = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInput(event.target.value);
    }

    const handleEditNameKeyDown = (event: React.KeyboardEvent) => {
        if (editInputRef.current && (event.key === "Enter" || event.key === "Escape")) {
            event.preventDefault();
            editInputRef.current.blur();
        }
    };

    useEffect(() => {
        if (nodeIsBeingRenamed && editInputRef.current && document.activeElement !== editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [nodeIsBeingRenamed]);

    const handleBlur = (event: React.FocusEvent) => {
        if (!nodeIsBeingRenamed || !input || !fs) {
            return;
        }

        const oldPath: string = fs.getPath(node);
        const newPath: string = oldPath.slice(0, oldPath.lastIndexOf("/") + 1) + input;

        if (oldPath === newPath) {
            return tree.stopRenaming();
        }

        if (pathExists(newPath)) {
            return event.preventDefault();
        }

        tree.stopRenaming();

        fs.rename(oldPath, newPath);
        sync();

        const model = monaco.editor.getModels().find(model => model.uri.path === oldPath);
        if (model) {
            const value = model.getValue();
            model.dispose();

            monaco.editor.createModel(value, undefined, monaco.Uri.file(newPath));
            tree.onClicked(node);
        }
    };

    const handleDragStart = (event: React.DragEvent) => {
        if (!nodePath) return;
        event.dataTransfer.setData("text/plain", nodePath);
    };

    const handleDragEnter = (event: React.DragEvent) => {
        if (!nodeIsDragTarget || !nodeChildren) return;
        tree.setDragTarget(target => ({ node, refCount: target.refCount + 1 }));
        event.preventDefault();
        event.stopPropagation();
    };

    const handleDragLeave = (event: React.DragEvent) => {
        tree.setDragTarget(target => ({ node: target.refCount - 1 === 0 ? undefined : target.node, refCount: target.refCount - 1 }));
        event.preventDefault();
    };

    const handleDragOver = (event: React.DragEvent) => {
        event.preventDefault();
    };

    const handleDropped = (event: React.DragEvent) => {
        if (!fs || !nodeIsDragTarget || !nodeChildren) return;

        const sourcePath = event.dataTransfer.getData("text/plain");
        if (sourcePath.length === 0) return;

        const slashIndex = sourcePath.lastIndexOf("/");
        if (slashIndex < 0) {
            return;
        }

        event.preventDefault();

        const sourceFileName = sourcePath.slice(slashIndex);
        const destinationPath = `${fs.getPath(node)}${sourceFileName}`;

        fs.rename(sourcePath, destinationPath);
        sync();

        const model = monaco.editor.getModels().find(model => model.uri.path === sourcePath);
        if (model) {
            const value = model.getValue();
            model.dispose();

            monaco.editor.createModel(value, undefined, monaco.Uri.file(destinationPath));

            const result = fs.lookupPath(destinationPath, {});
            tree.onClicked(result.node);
        }

        tree.setDragTarget({ node: undefined, refCount: 0 });
    };

    const handleContextMenu = (event: React.MouseEvent) => {
        openContextMenu(event.pageX, event.pageY, {
            isFolder: !!nodeChildren,
            isDraggable: nodeIsDraggable,
            click: handleClicked,
            download: handleFileDownload,
            rename: handleFileRename,
            delete: handleFileDelete,
            createNewFile: handleCreateNewFile,
        });
        event.preventDefault();
    };

    return (
        <div>
            <div
                draggable={nodeIsDraggable}
                className={`pl-1 bg-white flex uppercase font-black tracking-widest hover:bg-gray-200 ${nodeIsDraggedOver ? "bg-blue-100" : ""}`}
                onDragStart={(event) => handleDragStart(event)}
                onDragEnter={(event) => handleDragEnter(event)}
                onDragLeave={(event) => handleDragLeave(event)}
                onDragOver={(event) => handleDragOver(event)}
                onDrop={(event) => handleDropped(event)}
                {...props}
            >
                <button
                    className={`flex flex-auto flex-shrink overflow-hidden rounded-3xl ${nodeColor} items-center gap-2 w-full`}
                    style={{ paddingLeft: `${0.25 * 4 * depth}rem` }}

                    onContextMenu={handleContextMenu}
                    onClick={handleClicked}
                >
                    {!nodeChildren ? <DocumentTextIcon className="stroke-current w-3 h-3" /> : nodeIsExpanded ? <ChevronDownIcon className="stroke-current w-3 h-3" /> : <ChevronRightIcon className="stroke-current w-3 h-3" />}
                    <span className={`p-1 w-full text-left ${nodeIsBeingRenamed ? "hidden" : ""}`}>{nodeName}</span>
                    <input
                        type="text"
                        ref={editInputRef}
                        spellCheck={false}
                        className={`py-1 pl-1 w-full focus:outline-white focus:bg-gray-200 ${nodeIsBeingRenamed ? "" : "hidden"}`}
                        value={input}
                        onChange={handleEditName}
                        onKeyDown={handleEditNameKeyDown}
                        onBlur={handleBlur}
                    />

                </button>
            </div>

            {
                nodeIsExpanded &&
                <div>
                    {
                        nodeChildren?.map(child =>
                            <Node<T>
                                key={child.id}
                                node={child}
                                depth={depth + 1}
                                {...props}
                            />
                        )
                    }
                </div>
            }


        </div>
    )
}

function Tree<T>({ ...props }: HTMLAttributes<HTMLDivElement>) {
    const tree = useContext(TreeContext);

    const contextMenuRef = useRef(null);

    return (
        <ContextMenuProvider contextMenuRef={contextMenuRef}>
            <div {...props}>
                {tree.data.map(node => <Node<T> key={node.id} node={node} depth={0} />)}
            </div>

            <ContextMenuConsumer>
                {({ state: contextMenu }) =>
                    <div ref={contextMenuRef} className={`fixed z-10 bg-white flex py-2 flex-col gap-1 text-xs shadow-lg ${contextMenu ? "" : "hidden"}`} style={{ top: contextMenu?.y, left: contextMenu?.x }}>
                        <div className="flex flex-col border-b">
                            <button className={`pl-6 pr-4 py-1 w-full text-left  ${!contextMenu?.data.isDraggable ? "cursor-default bg-gray-100 text-gray-400" : "hover:bg-gray-100"}`} disabled={!contextMenu?.data.isDraggable} onClick={(event) => contextMenu?.data.createNewFile(event, "")}>New Folder</button>
                        </div>
                        <div className="flex flex-col border-b">
                            <button className={`pl-6 pr-4 py-1 w-full text-left  ${!contextMenu?.data.isDraggable ? "cursor-default bg-gray-100 text-gray-400" : "hover:bg-gray-100"}`} disabled={!contextMenu?.data.isDraggable} onClick={(event) => contextMenu?.data.createNewFile(event, ".c")}>New Source File (*.c)</button>
                            <button className={`pl-6 pr-4 py-1 w-full text-left  ${!contextMenu?.data.isDraggable ? "cursor-default bg-gray-100 text-gray-400" : "hover:bg-gray-100"}`} disabled={!contextMenu?.data.isDraggable} onClick={(event) => contextMenu?.data.createNewFile(event, ".h")}>New Header File (*.h)</button>
                        </div>
                        <div className="flex flex-col border-b">
                            <button className="pl-6 pr-4 py-1 w-full text-left hover:bg-gray-100" onClick={() => contextMenu?.data.click()}>Open</button>
                            <button className={`pl-6 pr-4 py-1 w-full text-left hover:bg-gray-100`} onClick={(event) => contextMenu?.data.download(event)}>Download</button>
                        </div>
                        <div className="flex flex-col">
                            <button className={`pl-6 pr-4 py-1 w-full text-left  ${!contextMenu?.data.isDraggable ? "cursor-default bg-gray-100 text-gray-400" : "hover:bg-gray-100"}`} disabled={!contextMenu?.data.isDraggable} onClick={(event) => contextMenu?.data.rename(event)}>Rename</button>
                            <button className={`pl-6 pr-4 py-1 w-full text-left  ${!contextMenu?.data.isDraggable ? "cursor-default bg-gray-100 text-gray-400" : "hover:bg-gray-100"}`} disabled={!contextMenu?.data.isDraggable} onClick={(event) => contextMenu?.data.delete(event)}>Delete</button>
                        </div>
                    </div>
                }
            </ContextMenuConsumer>
        </ContextMenuProvider >
    )
};

export default Tree;