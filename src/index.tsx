import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import Modal from "react-modal";

const fetch: any = window.fetch;

window.fetch = function () {
  if (arguments[0].endsWith("tree-sitter.wasm")) {
    arguments[0] = process.env.PUBLIC_URL + "/tree-sitter.wasm";
  } else if (arguments[0].endsWith("tree-sitter-c.wasm")) {
    arguments[0] = process.env.PUBLIC_URL + "/tree-sitter-c.wasm";
  } else if (arguments[0].endsWith("clang-solana-bpf.wasm")) {
    arguments[0] = process.env.PUBLIC_URL + "/clang-solana-bpf.wasm";
  } else if (arguments[0].endsWith("/examples/example_memo.c")) {
    arguments[0] = process.env.PUBLIC_URL + "/examples/example_memo.c";
  } else if (arguments[0].endsWith("/examples/example_sdk.c")) {
    arguments[0] = process.env.PUBLIC_URL + "/examples/example_sdk.c";
  } else if (arguments[0].endsWith("/examples/example_lottery.c")) {
    arguments[0] = process.env.PUBLIC_URL + "/examples/example_lottery.c";
  } else if (arguments[0].endsWith("/examples/example_lottery.h")) {
    arguments[0] = process.env.PUBLIC_URL + "/examples/example_lottery.h";
  }
  return fetch.apply(window, arguments);
};

Modal.setAppElement(document.getElementById('root')!);

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
