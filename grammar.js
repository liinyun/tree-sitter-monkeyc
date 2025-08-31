/**
 * @file MonkeyC grammar for tree-sitter
 * @author linyun <liinyun.weng@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "monkeyc",

  extras: ($) => [$.comment, /[\s\p{Zs}\uFEFF\u2028\u2029\u2060\u200B]/u],
  word: ($) => $.identifier,

  supertypes: ($) => [$.statement],

  rules: {
    program: ($) => repeat($.statement),

    statement: ($) => choice($.import_statement, $.using_statement),

    identifier: (_) => {
      const alpha =
        /[^\x00-\x1F\s\p{Zs}0-9:;`"'@#.,|^&<=>+\-*/\\%?!~()\[\]{}\uFEFF\u2060\u200B\u2028\u2029]|\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/u;

      const alphanumeric =
        /[^\x00-\x1F\s\p{Zs}:;`"'@#.,|^&<=>+\-*/\\%?!~()\[\]{}\uFEFF\u2060\u200B\u2028\u2029]|\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/u;
      return token(seq(alpha, repeat(alphanumeric)));
    },

    comment: (_) =>
      token(
        choice(
          seq("//", /[^\r\n\u2028\u2029]*/),
          seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/"),
        ),
      ),

    //
    // Import declarations
    //

    // to name the node of literal "import" within rules like import_statement
    import: (_) => token("import"),
    using: (_) => token("using"),

    /*
    NOTE: the reason I use $._semicolon is that in monkeyc, it seems right 
    when I write return and result in different lines like js 

    ``` this is the normal return
    return result
    ``` 
    ``` but this seems right too
    return
    result
    ```
    */
    // import_statement: ($) => seq("import", $._import_list, optional(";")),
    // I simplify $._import_list to $.dotted_name because import_statement in monkeyc is
    // simplier than in python and js
    // monkeyc requires ";" after a statement, so I don't make it optional in import_statement
    import_statement: ($) => seq("import", $.dotted_name, ";"),

    // don't need to use dotted_name for different name, because the name with "." is illegal
    using_statement: ($) =>
      seq("using", $.dotted_name, optional(seq("as", $.identifier)), ";"),

    /*
    NOTE: underscore is to make the output node simple.
  
    _import_list: ($) => seq(commaSep1(field("name", $.dotted_name))),
    */

    // this is for name with dot
    dotted_name: ($) => prec(1, sep1($.identifier, ".")),

    // _semicolon: ($) => choice($._automatic_semicolon, ";"),
  },
});

/**
 * Creates a rule to match one or more of the rules separated by a comma
 *
 * @param {RuleOrLiteral} rule
 *
 * @returns {SeqRule}
 */
function commaSep1(rule) {
  return sep1(rule, ",");
}

/**
 * Creates a rule to match one or more occurrences of `rule` separated by `sep`
 *
 * @param {RuleOrLiteral} rule
 *
 * @param {RuleOrLiteral} separator
 *
 * @returns {SeqRule}
 */
function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}
