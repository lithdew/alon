
import { DirOpts, FSBackend, FSConstructorOptions, ReadFileOpts, WriteFileOpts } from "@isomorphic-git/lightning-fs";
import { Stats } from "fs";

function Err(name: string) {
    return class extends Error {
        code: string;
        constructor(...args: any[]) {
            super(...args);
            this.code = name;
            if (this.message) {
                this.message = name + ": " + this.message;
            } else {
                this.message = name;
            }
        }
    };
}

const EEXIST = Err("EEXIST");
const ENOENT = Err("ENOENT");
const ENOTDIR = Err("ENOTDIR");
const ENOTEMPTY = Err("ENOTEMPTY");

export default class EmscriptenFS implements FSBackend {
    constructor(public emscripten: any) { }

    init(name: string, opt?: FSConstructorOptions): void { }

    saveSuperblock(): void { }

    /** Activates Cache */
    activate(): Promise<void> {
        return Promise.resolve();
    }
    /** Deactivates Cache */
    deactivate(): Promise<void> {
        return Promise.resolve();
    }
    /** Reads File Content from Disk */
    readFile(filePath: string, opts: ReadFileOpts): Promise<Uint8Array> {
        try {
            return this.emscripten.readFile(filePath, opts);
        } catch (err) {
            // @ts-ignore
            switch (err.errno) {
                case 44:
                    throw new ENOENT(filePath);
                default:
                    throw err;
            }
        }
    }
    /** Writes File Content to Disk */
    writeFile(filePath: string, data: Uint8Array, opts: WriteFileOpts): Promise<void> {
        try {
            return this.emscripten.writeFile(filePath, data, opts);
        } catch (err) {
            // @ts-ignore
            switch (err.errno) {
                case 44:
                    throw new ENOENT(filePath);
                default:
                    throw err;
            }
        }
    }
    /** Remove File from Disk */
    unlink(filePath: string): Promise<void> {
        try {

            return this.emscripten.unlink(filePath);
        } catch (err) {
            // @ts-ignore
            switch (err.errno) {
                case 44:
                    throw new ENOENT(filePath);
                default:
                    throw err;
            }
        }
    }
    /** Lists all files and sub-directory in given directory Path */
    readdir(filePath: string): string[] {
        try {
            const files = this.emscripten.readdir(filePath) as string[];
            if (files.length > 0) {
                return files.slice(2);
            }
            return [];
        } catch (err) {

            // @ts-ignore
            switch (err.errno) {
                case 44:
                    throw new ENOENT(filePath);
                case 54:
                    throw new ENOTDIR(filePath);
                default:
                    throw err;
            }
        }
    }
    /** Creates Directory in Disk for given Path */
    mkdir(filePath: string, opts: DirOpts): void {
        const { mode = 0o777 } = opts;
        try {
            return this.emscripten.mkdir(filePath, mode);
        } catch (err) {

            // @ts-ignore
            switch (err.errno) {
                case 44:
                    throw new ENOENT(filePath);
                case 20:
                    throw new EEXIST(filePath);
                default:
                    throw err;
            }
        }
    }
    /** Remove Directory from Disk */
    rmdir(filePath: string): void {
        try {
            return this.emscripten.rmdir(filePath);
        } catch (err) {
            // @ts-ignore
            switch (err.errno) {
                case 44:
                    throw new ENOENT(filePath);
                case 54:
                    throw new ENOTDIR(filePath);
                case 55:
                    throw new ENOTEMPTY(filePath);
                default:
                    throw err;
            }
        }
    }
    /** Rename File Name in Disk */
    rename(oldFilepath: string, newFilepath: string): void {
        try {
            return this.emscripten.rename(oldFilepath, newFilepath);
        } catch (err) {
            // @ts-ignore
            switch (err.errno) {
                case 44:
                    throw new ENOENT(oldFilepath);
                default:
                    throw err;
            }
        }
    }
    /** Unix File Stat from Disk */
    stat(filePath: string): Stats {
        try {
            const stat = this.emscripten.stat(filePath);
            return {
                ...stat,
                atimeMs: stat.atime.valueOf(),
                ctimeMs: stat.ctime.valueOf(),
                mtimeMs: stat.mtime.valueOf(),
            };
        } catch (err) {
            // @ts-ignore
            switch (err.errno) {
                case 44:
                    throw new ENOENT(filePath);
                default:
                    throw err;
            }
        }
    }
    /** Unix File Stat from Disk */
    lstat(filePath: string): Stats {
        try {
            const stat = this.emscripten.lstat(filePath);
            return {
                ...stat,
                atimeMs: stat.atime.valueOf(),
                ctimeMs: stat.ctime.valueOf(),
                mtimeMs: stat.mtime.valueOf(),
            };
        } catch (err) {
            // @ts-ignore
            switch (err.errno) {
                case 44:
                    throw new ENOENT(filePath);
                default:
                    throw err;
            }
        }

    }
    /** Read Content of file targeted by a Symbolic Link */
    readlink(filePath: string): string {
        try {

            return this.emscripten.readlink(filePath);
        } catch (err) {
            // @ts-ignore
            switch (err.errno) {
                case 44:
                    throw new ENOENT(filePath);
                default:
                    throw err;
            }
        }
    }
    /** Create Symbolic Link to a target file */
    symlink(target: string, filePath: string): void {
        try {
            return this.emscripten.symlink(target, filePath);
        } catch (err) {
            // @ts-ignore
            switch (err.errno) {
                case 44:
                    throw new ENOENT(filePath);
                default:
                    throw err;
            }
        }
    }
}