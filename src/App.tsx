import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import * as web3 from "@solana/web3.js";

import {
  getLedgerWallet,
  getPhantomWallet,
  getSlopeWallet,
  getSolflareWallet,
} from "@solana/wallet-adapter-wallets";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  WalletModalProvider,
} from "@solana/wallet-adapter-react-ui";

import Console from "./Console";
import { ResponsiveMonacoEditor } from "./Monaco";
import WalletButton from "./WalletButton";
import { useAccountInfo, useSlotInfo, useTokenAccounts, useTokenList } from "./useWeb3";
import Tree, { TreeProvider } from "./Tree";
import { monaco } from "react-monaco-editor";
import Parser from "web-tree-sitter";
import Tabs from "./Tabs";
import { markEditorErrors } from "./Editor";

import { useLanguageParser } from "./useTreeSitter";
import { LLVMProvider, useFileSystem, useLLVM } from "./useLLVM";
import { useExampleCode, useSysroot } from "./useAlon";
import { LogProvider, useLogs } from "./Log";
import { RefreshIcon, SaveIcon, TrashIcon } from "@heroicons/react/outline";

import SHA from "jssha";
import * as sha3 from "js-sha3";

const App = () => {
  const wallets = useMemo(
    () => [
      getPhantomWallet(),
      getSlopeWallet(),
      getSolflareWallet(),
      getLedgerWallet(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={web3.clusterApiUrl("mainnet-beta")}>
      <WalletProvider wallets={wallets}>
        <WalletModalProvider>
          <LogProvider>
            <LLVMProvider>
              <Main />
            </LLVMProvider>
          </LogProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

const SlotInfo = () => {
  const slotInfo = useSlotInfo();

  return (
    <dl>
      <div className="grid grid-cols-2 gap-4 text-xs">
        <dt className="font-medium text-gray-500">Slot Number</dt>
        <dd className="text-gray-900 justify-self-end">{slotInfo?.slot.toLocaleString() ?? '-'}</dd>
      </div>
      <div className="grid grid-cols-2 gap-4 text-xs">
        <dt className="font-medium text-gray-500">Root Number</dt>
        <dd className="text-gray-900 justify-self-end">{slotInfo?.root.toLocaleString() ?? '-'}</dd>
      </div>
      <div className="grid grid-cols-2 gap-4 text-xs">
        <dt className="font-medium text-gray-500">Parent Number</dt>
        <dd className="text-gray-900 justify-self-end">{slotInfo?.parent.toLocaleString() ?? '-'}</dd>
      </div>
    </dl>
  );
}

const Main = () => {
  const accountInfo = useAccountInfo();
  const { tokenAccounts, refreshTokenAccounts } = useTokenAccounts();

  const tokenList = useTokenList();

  const balance = useMemo<string | null>(() => {
    if (!accountInfo) return null;
    const numDecimals = 9 - Math.max(0, accountInfo.lamports.toString().indexOf('.'));
    return (accountInfo.lamports / web3.LAMPORTS_PER_SOL).toFixed(numDecimals)
  }, [accountInfo]);

  const tokenAccountContent = useMemo(() => {
    if (!tokenList) return [];

    const sorted = tokenAccounts.sort((a, b) => {
      return Number.parseFloat(b.account.data.parsed.info.tokenAmount.uiAmountString) - Number.parseFloat(a.account.data.parsed.info.tokenAmount.uiAmountString);
    });

    return sorted.map((tokenAccount) => {
      const key = tokenAccount.pubkey.toBase58();
      const mintKey = tokenAccount.account.data.parsed.info.mint;
      const amount = tokenAccount.account.data.parsed.info.tokenAmount.uiAmountString;
      const info = tokenList.find((tokenInfo) => tokenInfo.address === mintKey);

      return { key, mintKey, amount, info };
    });
  }, [tokenAccounts, tokenList]);

  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const handleEditorMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    setEditor(editor);
  }, [setEditor]);

  const sysrootLoadState = useSysroot();
  const sysrootLoaded = !sysrootLoadState.loading && sysrootLoadState.value === true;

  useExampleCode(editor, sysrootLoaded);

  const parser = useLanguageParser("tree-sitter-c.wasm");
  const [tree, setTree] = useState<Parser.Tree | null>(null);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const changeModelHandler = editor.onDidChangeModel(event => {
      // editor.updateOptions({ readOnly: event.newModelUrl?.path.startsWith("/usr") || !event.newModelUrl?.path.endsWith(".c") });
      setTree(null);
    });
    return () => {
      changeModelHandler.dispose();
    }
  }, [editor]);

  const { fs, sync } = useFileSystem();

  const handleChangeCode = useCallback((newCode: string, event: monaco.editor.IModelContentChangedEvent) => {
    if (!fs || !editor || !parser) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    fs.writeFile(model.uri.path, newCode);

    if (!tree) {
      const newTree = parser.parse(newCode);
      markEditorErrors(newTree, editor);
      setTree(newTree);
      return;
    }

    if (event.changes.length > 0) {
      for (const change of event.changes) {
        const startIndex = change.rangeOffset;
        const oldEndIndex = change.rangeOffset + change.rangeLength;
        const newEndIndex = change.rangeOffset + change.text.length;
        const startPosition = editor.getModel()!.getPositionAt(startIndex);
        const oldEndPosition = editor.getModel()!.getPositionAt(oldEndIndex);
        const newEndPosition = editor.getModel()!.getPositionAt(newEndIndex);
        tree.edit({
          startIndex,
          oldEndIndex,
          newEndIndex,
          startPosition: { row: startPosition.lineNumber, column: startPosition.column },
          oldEndPosition: { row: oldEndPosition.lineNumber, column: oldEndPosition.column },
          newEndPosition: { row: newEndPosition.lineNumber, column: newEndPosition.column },
        });
      }

      const newTree = parser.parse(newCode, tree);
      markEditorErrors(newTree, editor);
      setTree(newTree);
    }
  }, [fs, editor, parser, tree]);

  const [files, setFiles] = useState<any[]>([]);

  const getFileName = useCallback(node => node.name, []);
  const getFileChildren = useCallback(node => {
    if (!node.isFolder) return undefined;

    return Object.values(node.contents).sort((a: any, b: any): number => {
      if (a.isFolder === b.isFolder) {
        return (a.name as string).localeCompare(b);
      }
      return a.isFolder ? -1 : 1;
    });
  }, []);
  const handleFileClicked = useCallback(node => {
    if (!editor || !fs) return;

    const uri = monaco.Uri.file(fs.getPath(node));

    let model = monaco.editor.getModel(uri)
    if (model === null) {
      const contents = !node.contents ? "" : new TextDecoder().decode(node.contents);
      model = monaco.editor.createModel(contents, undefined, uri);
    }

    editor.setModel(model);
  }, [editor, fs]);

  useEffect(() => {
    let isMounted = true;
    if (!fs || !sysrootLoaded) {
      if (isMounted) setFiles([]);
      return;
    }
    if (isMounted) setFiles(["/project", "/usr/include/solana"].map(path => fs.lookupPath(path, {}).node));
    return () => {
      isMounted = false;
    }
  }, [fs, sysrootLoaded]);

  const log = useLogs();
  const { llvm, compiler } = useLLVM();

  const handleClickCompile = useCallback(async () => {
    if (!editor || !llvm || !fs || !compiler || !sysrootLoaded) {
      return;
    }

    const sourceFileNames = Object.values((fs.lookupPath("/project", {}).node as any).contents)
      .map((node: any) => fs.getPath(node))
      .filter((path: string) => path.endsWith(".c"));

    const compilerArgs = [
      "-Werror",
      "-O2",
      "-fno-builtin",
      "-std=c17",
      "-isystem/usr/include/clang",
      "-isystem/usr/include/solana",
      "-mrelocation-model",
      "pic",
      "-pic-level",
      "2",
      "-emit-obj",
      "-I/project/",
      "-triple",
      "bpfel-unknown-unknown-bpfel+solana",
      "-o",
      "/project/program.o",
    ]

    for (const sourceFileName of sourceFileNames) {
      compilerArgs.push(sourceFileName);
    }

    const compilerArgsList = new llvm.StringList();
    compilerArgs.forEach(arg => compilerArgsList.push_back(arg));

    log.write("compiler", "Compiling with arguments:")
    log.write("compiler", compilerArgs);

    const compileResult = await compiler.compile(compilerArgsList);
    if (!compileResult.success) {
      log.write("compiler", "Error while compiling:");
      log.write("compiler", compileResult.diags);
      return;
    }

    log.write("compiler", `Successfully compiled 'program.o'.`);

    try {
      fs.unlink("/project/program.so");
    } catch { }

    const linkerArgs = [
      "-z",
      "notext",
      "-shared",
      "--Bdynamic",
      "/usr/share/bpf.ld",
      "--entry",
      "entrypoint",
      "/usr/lib/libcompiler_builtins.rlib",
      "-o",
      "/project/program.so",
      "/project/program.o",
    ];

    const linkerArgsList = new llvm.StringList();
    linkerArgs.forEach(arg => linkerArgsList.push_back(arg));

    log.write("compiler", "Linking with arguments:");
    log.write("compiler", linkerArgs);

    const linkResult = await compiler.linkBpf(linkerArgsList);
    if (!linkResult.success) {
      log.write("compiler", "Error while linking:");
      log.write("compiler", linkResult.err);
      return;
    }
    log.write("compiler", `Successfully linked 'program.so'.`);

    sync();
  }, [log, editor, fs, sync, llvm, compiler, sysrootLoaded]);

  const handleClickRunTests = useCallback(async () => {
    if (!editor || !llvm || !fs || !compiler || !sysrootLoaded) {
      return;
    }

    try {
      fs.unlink("/project/test.o");
    } catch { }

    const sourceFileNames = Object.values((fs.lookupPath("/project", {}).node as any).contents)
      .map((node: any) => fs.getPath(node))
      .filter((path: string) => path.endsWith(".c"));

    const compilerArgs = [
      "-Werror",
      "-O2",
      "-fno-builtin",
      "-std=c17",
      "-isystem/usr/include/clang",
      "-isystem/usr/include/solana",
      "-mrelocation-model",
      "pic",
      "-pic-level",
      "2",
      "-emit-obj",
      "-I/project/",
      "-triple",
      "wasm32-unknown-unknown",
      "-DALON_TEST",
      "-o",
      "/project/test.o",
    ]

    for (const sourceFileName of sourceFileNames) {
      compilerArgs.push(sourceFileName);
    }

    const compilerArgsList = new llvm.StringList();
    compilerArgs.forEach(arg => compilerArgsList.push_back(arg));

    log.write("compiler", "Compiling tests with arguments:")
    log.write("compiler", compilerArgs);

    const compileResult = await compiler.compile(compilerArgsList);
    if (!compileResult.success) {
      log.write("compiler", "Error while compiling tests:");
      log.write("compiler", compileResult.diags);
      return;
    }

    try {
      fs.unlink("/project/test.wasm");
    } catch { }

    log.write("compiler", `Successfully compiled 'test.o'.`);

    const linkerArgs = [
      "--no-entry",
      "--import-memory",
      "--export-all",
      "--allow-undefined",
      "-o",
      "/project/test.wasm",
      "/project/test.o",
    ];

    const linkerArgsList = new llvm.StringList();
    linkerArgs.forEach(arg => linkerArgsList.push_back(arg));

    log.write("compiler", "Linking tests with arguments:");
    log.write("compiler", linkerArgs);

    const linkResult = await compiler.linkWasm(linkerArgsList);
    if (!linkResult.success) {
      log.write("compiler", "Error while linking tests:");
      log.write("compiler", linkResult.err);
      return;
    }
    log.write("compiler", `Successfully linked 'test.wasm'.`);

    const bytes = fs.readFile("/project/test.wasm");

    const memory = new WebAssembly.Memory({ initial: 2 });
    const buffer = new Uint8Array(memory.buffer);

    const slice = (ptr: number, len: number) => {
      return buffer.slice(ptr, ptr + Number(len));
    }

    const blake3 = await import("blake3/browser");

    const { instance } = await WebAssembly.instantiate(bytes, {
      env: {
        memory,
        sol_panic_(file: number, len: number, line: number, column: number) {
          throw new Error(`Panic in ${new TextDecoder().decode(slice(file, len))} at ${line}:${column}`);
        },
        sol_log_(ptr: number, len: number) {
          log.write("compiler", `Program log: ${slice(ptr, len)}`);
        },
        sol_log_64_(a: number, b: number, c: number, d: number, e: number) {
          log.write("compiler", `Program log: ${a}, ${b}, ${c}, ${d}, ${e}`);
        },
        sol_log_compute_units_() {
          log.write("compiler", `Program consumption: __ units remaining`);
        },
        sol_log_pubkey(ptr: number) {
          log.write("compiler", `Program log: ${new web3.PublicKey(slice(ptr, 32)).toBase58()}`);
        },
        sol_create_program_address(seeds: number, seeds_len: number, program_id: number, program_address: number) {
          let payload = Buffer.of();
          for (let i = 0; i < seeds_len; i++) {
            const view = new DataView(buffer.buffer, seeds + i * 16, 16);
            payload = Buffer.concat([payload, Buffer.from(slice(view.getUint32(0, true), view.getUint32(8, true)))]);
          }
          payload = Buffer.concat([payload, Buffer.from(slice(program_id, 32)), Buffer.from("ProgramDerivedAddress")]);

          const hasher = new SHA("SHA-256", "UINT8ARRAY");
          hasher.update(payload);

          const hash = hasher.getHash("UINT8ARRAY");
          if (web3.PublicKey.isOnCurve(hash)) {
            return BigInt(1);
          }

          buffer.set(hash, program_address);

          return BigInt(0);
        },
        sol_try_find_program_address(seeds: number, seeds_len: number, program_id: number, program_address: number, bump_seed: number) {
          for (let nonce = 255; nonce > 0; nonce--) {
            let payload = Buffer.of();
            for (let i = 0; i < seeds_len; i++) {
              const view = new DataView(buffer.buffer, seeds + i * 16, 16);
              payload = Buffer.concat([payload, Buffer.from(slice(view.getUint32(0, true), view.getUint32(8, true)))]);
            }
            payload = Buffer.concat([payload, Buffer.of(nonce), Buffer.from(slice(program_id, 32)), Buffer.from("ProgramDerivedAddress")]);

            const hasher = new SHA("SHA-256", "UINT8ARRAY");
            hasher.update(payload);

            const hash = hasher.getHash("UINT8ARRAY");
            if (!web3.PublicKey.isOnCurve(hash)) {
              buffer.set(hash, program_address);
              buffer.set([nonce], bump_seed);
              return BigInt(0);
            }
          }
          return BigInt(1);
        },
        sol_sha256: (bytes: number, bytes_len: number, result_ptr: number) => {
          const hasher = new SHA("SHA-256", "UINT8ARRAY");
          for (let i = 0; i < bytes_len; i++) {
            // A slice is assumed to be 16 bytes.
            // Offset 0 is a 4-byte LE number depicting the slice's pointer.
            // 8 is a 4-byte LE number depicting the slice's length.
            const view = new DataView(buffer.buffer, bytes + i * 16, 16);
            hasher.update(slice(view.getUint32(0, true), view.getUint32(8, true)));
          }

          buffer.set(hasher.getHash("UINT8ARRAY"), result_ptr);
          return BigInt(0);
        },
        sol_keccak256: (bytes: number, bytes_len: number, result_ptr: number) => {
          const hasher = sha3.keccak256.create();
          for (let i = 0; i < bytes_len; i++) {
            // A slice is assumed to be 16 bytes.
            // Offset 0 is a 4-byte LE number depicting the slice's pointer.
            // 8 is a 4-byte LE number depicting the slice's length.
            const view = new DataView(buffer.buffer, bytes + i * 16, 16);
            hasher.update(slice(view.getUint32(0, true), view.getUint32(8, true)));
          }

          buffer.set(hasher.digest(), result_ptr);
          return BigInt(0);
        },
        sol_blake3: (bytes: number, bytes_len: number, result_ptr: number) => {
          const hasher = blake3.createHash();
          for (let i = 0; i < bytes_len; i++) {
            // A slice is assumed to be 16 bytes.
            // Offset 0 is a 4-byte LE number depicting the slice's pointer.
            // 8 is a 4-byte LE number depicting the slice's length.
            const view = new DataView(buffer.buffer, bytes + i * 16, 16);
            hasher.update(slice(view.getUint32(0, true), view.getUint32(8, true)));
          }

          buffer.set(hasher.digest(), result_ptr);
          return BigInt(0);
        },
      }
    });


    const tests = Object.entries(instance.exports).filter(([key,]) => key.startsWith("test_"));

    let count = 0;
    for (const [testName, testFunction] of tests) {
      const formattedTestName = testName.substring("test_".length).replace("__", "::");

      try {
        // @ts-ignore
        testFunction();
        log.write("compiler", `\u001b[32m[${count}/${tests.length}] ${formattedTestName} ✓ success!\u001b[0m\n`);
      } catch (err) {
        // @ts-ignore
        log.write("compiler", `\u001b[31m[${count}/${tests.length}] ${formattedTestName} ✗ failed\u001b[0m\n\n${err.stack}`);
      }

      count += 1;
    }

    sync();
  }, [log, editor, fs, sync, llvm, compiler, sysrootLoaded]);

  const handleTrashLogsClicked = useCallback((scope: string) => {
    log.clear(scope);
  }, [log]);

  const handleSaveLogsClicked = useCallback((scope: string) => {
    const logs = log.get(scope) ?? [];
    if (logs.length === 0) return;
    saveAs(new Blob([JSON.stringify(logs)]), `${scope}_logs.txt`);
  }, [log]);

  return (
    <div className="font-mono antialiased grid grid-flow-row auto-rows-min-auto w-full h-full max-h-full">
      <div className=" bg-gray-200 border-b">
        <div className="flex">
          <button className={`bg-gray-100 px-2 py-1 text-xs border-r text-center flex whitespace-nowrap gap-2 ${sysrootLoaded ? "hover:bg-gray-300" : "animate-pulse bg-gray-200 cursor-default"}`} disabled={!sysrootLoaded} onClick={handleClickCompile}>
            Compile
            <span className="text-gray-600">(F1)</span>
          </button>

          <button className={`bg-gray-100 px-2 py-1 text-xs border-r text-center flex whitespace-nowrap gap-2 ${sysrootLoaded ? "hover:bg-gray-300" : "animate-pulse bg-gray-200 cursor-default"}`} disabled={!sysrootLoaded} onClick={handleClickRunTests}>
            Run Tests
            <span className="text-gray-600">(F2)</span>
          </button>
        </div>
      </div>
      <div className="w-full h-full grid grid-flow-col auto-cols-min-auto">
        <div className="border-r p-4 flex flex-col gap-4" style={{ width: "24rem" }}>
          <p className="text-2xl leading-7 font-bold">Alon</p>

          <SlotInfo />

          <WalletButton className="w-full" />

          <div>
            <div className="font-lg leading-6 mb-1 flex justify-between">
              Tokens
              <button>
                <RefreshIcon className="w-5 h-5 p-0.5 bg-gray-100 hover:bg-gray-300 rounded-lg" onClick={refreshTokenAccounts} />
              </button>
            </div>

            <dl className="h-36 bg-gray-100 border grid auto-rows-min gap-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
              <div className="grid grid-cols-2 gap-1 px-2 py-1 text-xs bg-white whitespace-nowrap">
                <dt className="font-medium text-gray-500">Solana</dt>
                <dd className="text-gray-900">{balance ?? "-"} SOL</dd>
              </div>
              {tokenAccountContent.map(tokenAccount => {
                return (
                  <div key={tokenAccount.key} className="grid grid-cols-2 gap-1 px-2 py-1 text-xs whitespace-nowrap bg-white">
                    <dt className="font-medium">
                      <a href={`https://explorer.solana.com/address/${tokenAccount.mintKey}`} target="_blank" rel="noreferrer" className="block overflow-hidden overflow-ellipsis text-gray-500 hover:underline">{tokenAccount.info?.name ?? "Unknown"}</a>
                    </dt>
                    <dd className="">
                      <a href={`https://explorer.solana.com/address/${tokenAccount.key}`} target="_blank" rel="noreferrer" className="block overflow-hidden overflow-ellipsis text-gray-900 hover:underline">{tokenAccount.amount} {tokenAccount.info?.symbol ?? ""}</a>
                    </dd>
                  </div>
                )
              })}
            </dl>
          </div>

          <div className="flex flex-col h-full">
            <div className="flex-grow-0 font-lg leading-6 mb-1">
              Files
            </div>

            <div className={`relative flex-grow border text-xs overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 ${sysrootLoaded ? "" : "animate-pulse"}`}>
              <TreeProvider data={files} getName={getFileName} getChildren={getFileChildren} onClicked={handleFileClicked}>
                <Tree<any> className="absolute top-0 left-0 bottom-0 right-0" />
              </TreeProvider>
            </div>
          </div>
        </div>
        <div className={`w-full h-full flex flex-col ${sysrootLoaded ? "" : "animate-pulse"}`}>
          <Tabs editor={editor} />
          <div className={`w-full h-full bg-gray-100 ${sysrootLoaded ? "" : "animate-pulse"}`}>
            <ResponsiveMonacoEditor
              options={{
                fontSize: 12,
                padding: {
                  top: 16,
                },
                model: null,
              }}
              editorDidMount={handleEditorMount}
              onChange={handleChangeCode}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1 border-l" style={{ width: "36rem" }}>
          <div className="border-b flex-grow flex flex-col">
            <div className="px-2 py-1 text-sm font-medium flex justify-between items-center">
              Compiler Logs
              <div className="flex gap-1">
                <button>
                  <SaveIcon className="w-5 h-5 p-0.5 bg-gray-100 hover:bg-gray-300 rounded-lg" onClick={() => handleSaveLogsClicked("compiler")} />
                </button>
                <button>
                  <TrashIcon className="w-5 h-5 p-0.5 bg-gray-100 hover:bg-gray-300 rounded-lg" onClick={() => handleTrashLogsClicked("compiler")} />
                </button>

              </div>
            </div>
            <Console scope="compiler" />
          </div>
          <div className="border-b flex-grow flex flex-col">
            <div className="px-2 py-1 text-sm font-medium flex justify-between items-center">
              Alon Logs
              <div className="flex gap-1">
                <button>
                  <SaveIcon className="w-5 h-5 p-0.5 bg-gray-100 hover:bg-gray-300 rounded-lg" onClick={() => handleSaveLogsClicked("alon")} />
                </button>
                <button>
                  <TrashIcon className="w-5 h-5 p-0.5 bg-gray-100 hover:bg-gray-300 rounded-lg" onClick={() => handleTrashLogsClicked("alon")} />
                </button>
              </div>
            </div>
            <Console scope="alon" />
          </div>
        </div>
      </div>
    </div >
  );
};

export default App;
