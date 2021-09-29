/* eslint-disable react/no-direct-mutation-state */

import React from "react";
import {
    default as MonacoEditor,
    MonacoDiffEditor,
    MonacoDiffEditorProps,
    MonacoEditorProps,
} from "react-monaco-editor";

export interface ResponsiveEditorBaseProps {
    rerenderTimeoutAfterResizeInMs?: number;
}

export interface ResponsiveMonacoEditorProps extends MonacoEditorProps, ResponsiveEditorBaseProps { }

export interface ResponsiveMonacoDiffEditorProps extends MonacoDiffEditorProps, ResponsiveEditorBaseProps { }

export interface ResponsiveMonacoEditorState {
    size: {
        width: number | null;
        height: number | null;
    };
    needsToRepaint: boolean;
}

const defaultProps: Pick<
    ResponsiveMonacoEditorProps,
    "editorDidMount" | "options" | "rerenderTimeoutAfterResizeInMs"
> = {
    editorDidMount: (editor: any, monacoInstance: any) => {
        editor.focus();
    },
    options: {
        selectOnLineNumbers: true,
    },
    rerenderTimeoutAfterResizeInMs: 100,
};

/**
 * A responsive editor component that will resize when the window resizes
 */
export class ResponsiveMonacoEditor extends React.Component<ResponsiveMonacoEditorProps, ResponsiveMonacoEditorState> {
    public static defaultProps = defaultProps;

    public state: ResponsiveMonacoEditorState = {
        needsToRepaint: false,
        size: {
            height: null,
            width: null,
        },
    };

    protected containerRef: React.RefObject<HTMLDivElement> = React.createRef();

    public componentDidMount() {
        if (!this.sizeIsFixed()) {
            this.setState({
                ...this.state,
                needsToRepaint: false,
                size: {
                    height: this.containerRef.current!.clientHeight || null,
                    width: this.containerRef.current!.clientWidth || null,
                },
            });

            if (window) {
                window.addEventListener("resize", this.onWindowResize);
            }
        }
    }

    public componentWillUnmount() {
        if (!this.sizeIsFixed()) {
            if (window) {
                window.removeEventListener("resize", this.onWindowResize);
            }
        }
    }

    public getSnapshotBeforeUpdate() {
        this.state.needsToRepaint = true;
        return null;
    }

    public shouldComponentUpdate() {
        return !this.sizeIsFixed() || this.state.needsToRepaint;
    }

    public componentDidUpdate() {
        this.state.needsToRepaint = false;
    }

    public render() {
        const { width, height, rerenderTimeoutAfterResizeInMs, ...props } = this.props;

        return (
            <div
                ref={this.containerRef}
                style={{
                    height: "100%",
                    maxHeight: "100%",
                    maxWidth: "100%",
                    overflow: "hidden",
                    position: "relative",
                    width: "100%",
                }}
            >
                <div
                    style={{
                        height: "100%",
                        left: 0,
                        overflow: "hidden",
                        position: "absolute",
                        top: 0,
                        width: "100%",
                    }}
                >
                    <MonacoEditor
                        width={this.sizeIsFixed() ? width : `${this.state.size.width}px`}
                        height={this.sizeIsFixed() ? height : `${this.state.size.height}px`}
                        {...props}
                    />
                </div>
            </div>
        );
    }

    protected sizeIsFixed() {
        return typeof this.props.width !== "undefined" || typeof this.props.width !== "undefined";
    }

    protected onWindowResize = (ev: UIEvent) => {
        const { needsToRepaint, width, height } = this.computeNewSize();
        this.setState({
            ...this.state,
            needsToRepaint,
            size: {
                height,
                width,
            },
        });
        if (needsToRepaint) {
            this.reRenderIfNecessaryAfterTimeout();
        }
    }

    protected computeNewSize() {
        const height = this.containerRef.current!.clientHeight || null;
        const width = this.containerRef.current!.clientWidth || null;
        const needsToRepaint =
            this.state.needsToRepaint || this.state.size.width !== width || this.state.size.height !== height;

        return {
            height,
            needsToRepaint,
            width,
        };
    }

    protected reRenderIfNecessaryAfterTimeout() {
        setTimeout(() => {
            const { needsToRepaint, width, height } = this.computeNewSize();
            if (!needsToRepaint) {
                return;
            }

            this.setState({
                ...this.state,
                needsToRepaint: true,
                size: {
                    height,
                    width,
                },
            });
        }, this.props.rerenderTimeoutAfterResizeInMs);
    }
}

// tslint:disable-next-line:max-classes-per-file
export class ResponsiveMonacoDiffEditor extends React.Component<
    ResponsiveMonacoDiffEditorProps,
    ResponsiveMonacoEditorState
> {
    public static defaultProps = defaultProps;

    public state: ResponsiveMonacoEditorState = {
        needsToRepaint: false,
        size: {
            height: null,
            width: null,
        },
    };

    protected containerRef: React.RefObject<HTMLDivElement> = React.createRef();

    // ok
    public componentDidMount() {
        if (!this.sizeIsFixed()) {
            this.setState({
                ...this.state,
                needsToRepaint: false,
                size: {
                    height: this.containerRef.current!.clientHeight || null,
                    width: this.containerRef.current!.clientWidth || null,
                },
            });

            if (window) {
                window.addEventListener("resize", (ev) => this.onWindowResize);
            }
        }
    }

    public componentWillUnmount() {
        if (!this.sizeIsFixed()) {
            if (window) {
                window.removeEventListener("resize", this.onWindowResize);
            }
        }
    }

    public getSnapshotBeforeUpdate() {
        this.state.needsToRepaint = true;
        return null;
    }

    public shouldComponentUpdate() {
        return !this.sizeIsFixed() || this.state.needsToRepaint;
    }

    public componentDidUpdate() {
        this.state.needsToRepaint = false;
    }

    public render() {
        const { width, height, rerenderTimeoutAfterResizeInMs, ...props } = this.props;

        return (
            <div
                ref={this.containerRef}
                style={{
                    height: "100%",
                    maxHeight: "100%",
                    maxWidth: "100%",
                    overflow: "hidden",
                    position: "relative",
                    width: "100%",
                }}
            >
                <div
                    style={{
                        height: "100%",
                        left: 0,
                        overflow: "hidden",
                        position: "absolute",
                        top: 0,
                        width: "100%",
                    }}
                >
                    <MonacoDiffEditor
                        width={this.sizeIsFixed() ? width : `${this.state.size.width}px`}
                        height={this.sizeIsFixed() ? height : `${this.state.size.height}px`}
                        {...props}
                    />
                </div>
            </div>
        );
    }

    protected sizeIsFixed() {
        return typeof this.props.width !== "undefined" || typeof this.props.width !== "undefined";
    }

    protected onWindowResize = (ev: UIEvent) => {
        const { needsToRepaint, width, height } = this.computeNewSize();
        this.setState({
            ...this.state,
            needsToRepaint,
            size: {
                height,
                width,
            },
        });
        if (needsToRepaint) {
            this.reRenderIfNecessaryAfterTimeout();
        }
    }

    protected computeNewSize() {
        const height = this.containerRef.current!.clientHeight || null;
        const width = this.containerRef.current!.clientWidth || null;
        const needsToRepaint =
            this.state.needsToRepaint || this.state.size.width !== width || this.state.size.height !== height;

        return {
            height,
            needsToRepaint,
            width,
        };
    }

    protected reRenderIfNecessaryAfterTimeout() {
        setTimeout(() => {
            const { needsToRepaint, width, height } = this.computeNewSize();
            if (!needsToRepaint) {
                return;
            }

            this.setState({
                ...this.state,
                needsToRepaint: true,
                size: {
                    height,
                    width,
                },
            });
        }, this.props.rerenderTimeoutAfterResizeInMs);
    }
}