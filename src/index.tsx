import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const fetch: any = window.fetch;

window.fetch = function () {
  if (arguments[0].endsWith("tree-sitter.wasm")) {
    arguments[0] = process.env.PUBLIC_URL + "/tree-sitter.wasm";
  } else if (arguments[0].endsWith("tree-sitter-c.wasm")) {
    arguments[0] = process.env.PUBLIC_URL + "/tree-sitter-c.wasm";
  } else if (arguments[0].endsWith("clang-solana-bpf.wasm")) {
    arguments[0] = process.env.PUBLIC_URL + "/clang-solana-bpf.wasm";
  } else if (arguments[0].endsWith("/examples/example.c")) {
    arguments[0] = process.env.PUBLIC_URL + "/examples/examples.c";
  }
  return fetch.apply(window, arguments);
};

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
