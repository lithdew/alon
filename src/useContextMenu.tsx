import React, { createContext, PropsWithChildren } from "react";
import { useMemo } from "react";
import { useContext, useState } from "react";
import { useClickAway } from "react-use";

export interface ContextMenuState<T> { x: number, y: number, data: T }

export interface ContextMenuContextState<T> {
    state: ContextMenuState<T> | null,
    open(x: number, y: number, data: T): void;
    close(): void;
}

const ContextMenuContext = createContext<ContextMenuContextState<any>>({} as ContextMenuContextState<any>);

export function useContextMenu<T>(): ContextMenuContextState<T> {
    return useContext(ContextMenuContext);
}

export interface ContextMenuProviderProps {
    contextMenuRef: React.RefObject<HTMLElement | null>;
}

export function ContextMenuProvider<T>({ contextMenuRef, children }: PropsWithChildren<ContextMenuProviderProps>) {
    const [state, setState] = useState<ContextMenuState<T> | null>(null);

    const value = useMemo(() => ({
        state,
        open: (x: number, y: number, data: T) => setState(state => ({ ...state, x, y, data })),
        close: () => setState(null)
    }), [state]);

    useClickAway(contextMenuRef, value.close);

    return (
        <ContextMenuContext.Provider value={value}>
            {children}
        </ContextMenuContext.Provider>
    )
}

export const ContextMenuConsumer = ContextMenuContext.Consumer;