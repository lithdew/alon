import { useCallback, useContext, useMemo, useState } from "react";
import { createContext, PropsWithChildren } from "react";

export const LogContext = createContext<LogContextState>({} as LogContextState);

export interface Log {
    method: string,
    data: any,
}

export interface LogContextState {
    get(scope: string): Log[];
    write(scope: string, ...data: any): void;
    clear(scope: string): void;
}

export function useLogs(): LogContextState {
    return useContext(LogContext);
};

export function LogProvider({ children }: PropsWithChildren<{}>) {
    const [history, setHistory] = useState<{ [key: string]: Log[] }>({ "compiler": [], "alon": [] });

    const { write, clear } = useMemo(() => ({
        write: (scope: string, ...data: any[]) => {
            setHistory(history => {
                let logs = history[scope] ?? [];
                if (logs.length >= 5000) {
                    [, ...logs] = logs;
                }
                logs = [...logs, { method: "info", data: data.length === 1 ? data[0] : data }];
                return { ...history, [scope]: logs };
            });
        },
        clear: (scope: string) => {
            setHistory(history => ({ ...history, [scope]: [] }));
        }
    }), [setHistory]);

    const get = useCallback((scope: string) => history[scope], [history]);

    return (
        <LogContext.Provider value={{
            get,
            write,
            clear,
        }}>
            {children}
        </LogContext.Provider>
    );
}