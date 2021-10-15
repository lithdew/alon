# alon

Alon is an IDE which allows for developers to rapidly build, iterate, test, and deploy decentralized apps and assets on Solana right from their browser.

By writing a very thin compiler and linker frontend on top of a WebAssembly port of Solana’s compiler suite, and by writing a barebones JavaScript port of Solana’s program virtual machine syscalls, Alon is able to cut down the time it takes to compile, run, and test Solana programs down to a few hundred milliseconds.

The code editor for Alon comes with Treesitter integrated, which allows for Alon to incrementally build and update an entire syntax tree of your Solana programs in under a millisecond.

Integrating Treesitter into Alon's code editor allows for the development of all new kinds of static analysis tools that may help significantly simplify and speed up the development of reliable Solana programs.

## getting started

Start a development server on port 3000:

```console
$ yarn start
```

Build a release version of Alon:

```console
$ yarn build
```