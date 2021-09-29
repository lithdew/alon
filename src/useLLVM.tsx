import { useContext } from "react";
import { PropsWithChildren } from "react";
import { createContext } from "react";
import { useAsync, useUpdate } from "react-use";
import LLVM from "./LLVM";
import { useLogs } from "./Log";

export interface LLVMContextState {
    llvm: any | null;
    compiler: any | null;
}

export const LLVMContext = createContext<LLVMContextState>({} as LLVMContextState);

export function LLVMProvider({ children }: PropsWithChildren<{}>) {
    const log = useLogs();

    const state = useAsync(async () => {
        log.write("alon", "Loading LLVM suite...");

        const llvm = await LLVM({ noInitialRun: true });

        const compiler = new llvm.Clang();

        (window as any).llvm = llvm;
        (window as any).compiler = compiler;

        log.write("alon", "LLVM suite is ready.");

        return { llvm, compiler };
    }, []);

    const value = state.loading || !state.value ? { llvm: null, compiler: null } : state.value;

    return (
        <LLVMContext.Provider value={value}>
            {children}
        </LLVMContext.Provider>
    );
}

export const useLLVM = () => {
    return useContext(LLVMContext);
}

export const useFileSystem = () => {
    const update = useUpdate();

    const { llvm } = useLLVM();
    if (!llvm) return { fs: null, sync: update };

    return { fs: llvm.FS as typeof FS, sync: update };
}