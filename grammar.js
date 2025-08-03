/**
 * @file MonkeyC grammar for tree-sitter
 * @author linyun <liinyun.weng@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "monkeyc",

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => "hello"
  }
});
