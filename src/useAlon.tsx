import { monaco } from "react-monaco-editor";
import { useLogs } from "./Log";
import { useAsync } from "react-use";
import * as zip from "@zip.js/zip.js";
import { useFileSystem } from "./useLLVM";

export const useExampleCode = (editor: monaco.editor.IStandaloneCodeEditor | null, sysrootLoaded: boolean) => {
    const log = useLogs();
    const { fs, sync } = useFileSystem();

    return useAsync(async () => {
        if (!fs || !editor || !sysrootLoaded) return;

        try {
            fs.mkdir("/project");
        } catch {
            return;
        }

        log.write("alon", "It looks like you do not have a project set up yet. Downloading example project code...");

        const response = await fetch("/examples/example.c");
        const code = await response.text();
        fs.writeFile("/project/example.c", code);

        const uri = monaco.Uri.file("/project/example.c");
        let model = monaco.editor.getModel(uri)
        if (model === null) {
            model = monaco.editor.createModel(code, undefined, uri);
        }
        editor.setModel(model);

        log.write("alon", "Example project code downloaded.");
        sync();

        return true;
    }, [fs, editor, sysrootLoaded]);
}

export const useSysroot = () => {
    const log = useLogs();
    const { fs, sync } = useFileSystem();

    const state = useAsync(async () => {
        if (!fs) return;

        const pathExists = (path: string) => {
            try {
                fs.lookupPath(path, {})
                return true;
            } catch {
                return false;
            }
        };

        if (pathExists("/usr")) {
            return;
        }

        log.write("alon", "Downloading sysroot...");

        const sysrootArchiveBlob = await (await fetch("https://cors.bridged.cc/https://api.github.com/repos/lithdew/alon-sysroot/zipball/master", {
            headers: {
                "x-cors-grida-api-key": "7a571699-418f-4f84-83b8-51393c448c40",
            }
        })).blob();

        log.write("alon", "Unpacking sysroot...");

        const sysrootArchiveReader = new zip.ZipReader(new zip.BlobReader(sysrootArchiveBlob));

        const sysrootArchiveEntries = await sysrootArchiveReader.getEntries();
        for (const entry of sysrootArchiveEntries) {
            const path = "/usr/" + entry.filename.slice(entry.filename.indexOf("/") + 1);
            if (entry.directory) {
                fs.mkdir(path);
                continue;
            }

            const bytes = await entry.getData!(new zip.Uint8ArrayWriter());
            fs.writeFile(path, bytes);

            log.write("alon", `Unpacked sysroot file '${path}'.`);
        }

        await sysrootArchiveReader.close();

        log.write("alon", "Sysroot loaded.");
        sync();

        return true;
    }, [fs]);

    return state;
}