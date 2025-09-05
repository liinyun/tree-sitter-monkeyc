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

  supertypes: ($) => [
    $.statement,
    $.declaration,
    $.expression,
    $.primary_expression,
    $.pattern,
  ],

  rules: {
    program: ($) => repeat($.statement),

    statement: ($) =>
      choice(
        $.import_statement,
        $.using_statement,
        // I don't think this useful
        // $.expression_statement,
        $.declaration,
        $.statement_block,

        $.if_statement,
        $.switch_statement,
        $.for_statement,
        $.while_statement,
        $.do_statement,
        $.try_statement,

        $.break_statement,
        $.continue_statement,
        $.return_statement,
        $.throw_statement,
      ),

    declaration: ($) =>
      choice(
        $.function_declaration,
        // $.generator_function_declaration,
        $.class_declaration,
        $.variable_declaration,
      ),

    identifier: (_) => {
      const alpha =
        /[^\x00-\x1F\s\p{Zs}0-9:;`"'@#.,|^&<=>+\-*/\\%?!~()\[\]{}\uFEFF\u2060\u200B\u2028\u2029]|\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/u;

      const alphanumeric =
        /[^\x00-\x1F\s\p{Zs}:;`"'@#.,|^&<=>+\-*/\\%?!~()\[\]{}\uFEFF\u2060\u200B\u2028\u2029]|\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/u;
      return token(seq(alpha, repeat(alphanumeric)));
    },

    comment: (_) => token(seq("//", /[^\r\n\u2028\u2029]*/)),

    //
    // Import statement
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

    /*
    NOTE: underscore is to make the output node simple.
  
    _import_list: ($) => seq(commaSep1(field("name", $.dotted_name))),
    */

    // don't need to use dotted_name for different name, because the name with "." is illegal
    using_statement: ($) =>
      seq("using", $.dotted_name, optional(seq("as", $.identifier)), ";"),

    // this is for name with dot
    dotted_name: ($) => prec(1, sep1($.identifier, ".")),

    //
    // Statements
    //

    variable_declaration: ($) =>
      seq(choice("var", "const"), $.variable_declarator, ";"),

    variable_declarator: ($) =>
      seq(field("name", $.identifier), optional($._initializer)),

    // statement_block in monkeyc don't need to append ";"
    statement_block: ($) => prec.right(seq("{", repeat($.statement), "}")),

    else_clause: ($) => seq("else", $.statement),

    if_statement: ($) =>
      prec.right(
        seq(
          "if",
          field("condition", $.parenthesized_expression),
          field("consequence", $.statement),
          optional(field("alternative", $.else_clause)),
        ),
      ),

    switch_statement: ($) =>
      seq(
        "switch",
        field("value", $.parenthesized_expression),
        field("body", $.switch_body),
      ),

    for_statement: ($) =>
      seq(
        "for",
        "(",
        field("initializer", $.variable_declaration),
        field("condition", seq($.expressions, ";")),
        field("increment", $.expressions),
        ")",
        field("body", $.statement),
      ),

    while_statement: ($) =>
      seq(
        "while",
        field("condition", $.parenthesized_expression),
        field("body", $.statement),
      ),

    do_statement: ($) =>
      prec.right(
        seq(
          "do",
          field("body", $.statement),
          "while",
          field("condition", $.parenthesized_expression),
          ";",
        ),
      ),

    // I don't find many people use this statement, so I will make it simple
    // I force everyone to write catch_clause and finally_clause after try
    try_statement: ($) =>
      seq(
        "try",
        field("body", $.statement_block),
        field("handler", $.catch_clause),
        field("finalizer", $.finally_clause),
      ),

    // these 4 will be used as $statement in for and other place
    break_statement: ($) => seq("break", ";"),
    continue_statement: ($) => seq("continue", ";"),
    return_statement: ($) =>
      seq("return", optional($.expressions), $._semicolon),
    throw_statement: ($) => seq("throw", $.expressions, ";"),

    //
    // Statement components
    //

    switch_body: ($) =>
      seq("{", repeat(choice($.switch_case, $.switch_default)), "}"),

    switch_case: ($) =>
      seq(
        "case",
        field("value", $.expressions),
        ":",
        field("body", repeat($.statement)),
      ),

    switch_default: ($) =>
      seq("default", ":", field("body", repeat($.statement))),

    catch_clause: ($) =>
      seq(
        "catch",
        optional(seq("(", field("parameter", $.identifier), ")")),
        field("body", $.statement_block),
      ),

    finally_clause: ($) => seq("finally", field("body", $.statement_block)),

    parenthesized_expression: ($) => seq("(", $.expressions, ")"),
    //
    // Expressions      expressions doesn't have ";" appended
    //

    expression: ($) =>
      choice(
        $.primary_expression,
        $._jsx_element,
        $.assignment_expression,
        $.augmented_assignment_expression,
        $.unary_expression,
        $.binary_expression,
        $.ternary_expression,
        $.update_expression,
        $.new_expression,
      ),

    primary_expression: ($) =>
      choice(
        $.member_expression,
        $.parenthesized_expression,
        $._identifier,
        alias($._reserved_identifier, $.identifier),
        $.this,
        $.super,
        $.number,
        $.string,
        $.true,
        $.false,
        $.null,
        $.array,
        $.meta_property,
        $.call_expression,
      ),
    // it works just like symbols
    assignment_pattern: ($) =>
      seq(field("left", $.pattern), "=", field("right", $.expression)),

    array: ($) =>
      seq("[", commaSep(optional(choice($.expression, $.spread_element))), "]"),

    // TODO: I don't understand this pattern much, actually, it's the $._lhs_expression part I don't understand
    array_pattern: ($) =>
      seq(
        "[",
        commaSep(optional(choice($.pattern, $.assignment_pattern))),
        "]",
      ),

    // An entity can be named, numeric (decimal), or numeric (hexadecimal). The
    // longest entity name is 29 characters long, and the HTML spec says that
    // no more will ever be added.
    html_character_reference: (_) =>
      /&(#([xX][0-9a-fA-F]{1,6}|[0-9]{1,5})|[A-Za-z]{1,30});/,

    class_declaration: ($) =>
      prec(
        "declaration",
        seq(
          "class",
          field("name", $.identifier),
          optional($.class_heritage),
          field("body", $.class_body),
        ),
      ),

    class_heritage: ($) => seq("extends", $.expression),

    function_declaration: ($) =>
      prec.right(
        "declaration",
        seq(
          "function",
          field("name", $.identifier),
          $._call_signature,
          field("body", $.statement_block),
        ),
      ),

    // Override
    _call_signature: ($) => field("parameters", $.formal_parameters),

    call_expression: ($) =>
      prec(
        "call",
        seq(field("function", $.identifier), field("arguments", $.arguments)),
      ),

    // NOTE: I do not fully get it through, but this does useful in monkeyc
    new_expression: ($) =>
      prec.right(
        "new",
        seq(
          "new",
          field("constructor", choice($.primary_expression, $.new_expression)),
          field("arguments", optional(prec.dynamic(1, $.arguments))),
        ),
      ),

    // I don't understand why choice
    member_expression: ($) =>
      prec(
        "member",
        seq(
          field("object", choice($.expression, $.primary_expression)),
          ".",
          field(
            "property",
            choice(
              $.private_property_identifier,
              alias($.identifier, $.property_identifier),
            ),
          ),
        ),
      ),

    _lhs_expression: ($) =>
      choice(
        $.member_expression,
        $._identifier,
        alias($._reserved_identifier, $.identifier),
        // $._destructuring_pattern,
      ),

    assignment_expression: ($) =>
      prec.right(
        "assign",
        seq(
          field("left", choice($.parenthesized_expression, $._lhs_expression)),
          "=",
          field("right", $.expression),
        ),
      ),

    _augmented_assignment_lhs: ($) =>
      choice(
        $.member_expression,
        alias($._reserved_identifier, $.identifier),
        $.identifier,
        $.parenthesized_expression,
      ),

    augmented_assignment_expression: ($) =>
      prec.right(
        "assign",
        seq(
          field("left", $._augmented_assignment_lhs),
          field(
            "operator",
            choice(
              "+=",
              "-=",
              "*=",
              "/=",
              "%=",
              "^=",
              "&=",
              "|=",
              ">>=",
              "<<=",
            ),
          ),
          field("right", $.expression),
        ),
      ),

    _initializer: ($) => seq("=", field("value", $.expression)),

    // _destructuring_pattern: ($) => $.array_pattern,

    spread_element: ($) => seq("...", $.expression),

    ternary_expression: ($) =>
      prec.right(
        "ternary",
        seq(
          field("condition", $.expression),
          alias($._ternary_qmark, "?"),
          field("consequence", $.expression),
          ":",
          field("alternative", $.expression),
        ),
      ),

    // 25
    // 18
    binary_expression: ($) =>
      choice(
        ...[
          ["&&", "logical_and"],
          ["||", "logical_or"],
          [">>", "binary_shift"],
          ["<<", "binary_shift"],
          ["&", "bitwise_and"],
          ["^", "bitwise_xor"],
          ["|", "bitwise_or"],
          ["+", "binary_plus"],
          ["-", "binary_plus"],
          ["*", "binary_times"],
          ["/", "binary_times"],
          ["%", "binary_times"],
          ["<", "binary_relation"],
          ["<=", "binary_relation"],
          ["==", "binary_equality"],
          ["!=", "binary_equality"],
          [">=", "binary_relation"],
          [">", "binary_relation"],
        ].map(([operator, precedence, associativity]) =>
          (associativity === "right" ? prec.right : prec.left)(
            precedence,
            seq(
              field(
                "left",
                operator === "in"
                  ? choice($.expression, $.private_property_identifier)
                  : $.expression,
              ),
              field("operator", operator),
              field("right", $.expression),
            ),
          ),
        ),
      ),

    unary_expression: ($) =>
      prec.left(
        "unary_void",
        seq(
          field(
            "operator",
            choice("!", "~", "-", "+", "typeof", "void", "delete"),
          ),
          field("argument", $.expression),
        ),
      ),

    update_expression: ($) =>
      prec.left(
        choice(
          seq(
            field("argument", $.expression),
            field("operator", choice("++", "--")),
          ),
          seq(
            field("operator", choice("++", "--")),
            field("argument", $.expression),
          ),
        ),
      ),

    //
    // Primitives
    //

    string: ($) =>
      choice(
        seq(
          '"',
          repeat(
            choice(
              alias($.unescaped_double_string_fragment, $.string_fragment),
              $.escape_sequence,
            ),
          ),
          '"',
        ),
        seq(
          "'",
          repeat(
            choice(
              alias($.unescaped_single_string_fragment, $.string_fragment),
              $.escape_sequence,
            ),
          ),
          "'",
        ),
      ),

    // Workaround to https://github.com/tree-sitter/tree-sitter/issues/1156
    // We give names to the token() constructs containing a regexp
    // so as to obtain a node in the CST.
    //
    unescaped_double_string_fragment: (_) =>
      token.immediate(prec(1, /[^"\\\r\n]+/)),

    // same here
    unescaped_single_string_fragment: (_) =>
      token.immediate(prec(1, /[^'\\\r\n]+/)),

    escape_sequence: (_) =>
      token.immediate(
        seq(
          "\\",
          choice(
            /[^xu0-7]/,
            /[0-7]{1,3}/,
            /x[0-9a-fA-F]{2}/,
            /u[0-9a-fA-F]{4}/,
            /u\{[0-9a-fA-F]+\}/,
            /[\r?][\n\u2028\u2029]/,
          ),
        ),
      ),

    number: (_) => {
      const hexLiteral = seq(choice("0x", "0X"), /[\da-fA-F](_?[\da-fA-F])*/);

      const decimalDigits = /\d(_?\d)*/;
      const signedInteger = seq(optional(choice("-", "+")), decimalDigits);
      const exponentPart = seq(choice("e", "E"), signedInteger);

      const binaryLiteral = seq(choice("0b", "0B"), /[0-1](_?[0-1])*/);

      const octalLiteral = seq(choice("0o", "0O"), /[0-7](_?[0-7])*/);

      const bigintLiteral = seq(
        choice(hexLiteral, binaryLiteral, octalLiteral, decimalDigits),
        "n",
      );

      const decimalIntegerLiteral = choice(
        "0",
        seq(
          optional("0"),
          /[1-9]/,
          optional(seq(optional("_"), decimalDigits)),
        ),
      );

      const decimalLiteral = choice(
        seq(
          decimalIntegerLiteral,
          ".",
          optional(decimalDigits),
          optional(exponentPart),
        ),
        seq(".", decimalDigits, optional(exponentPart)),
        seq(decimalIntegerLiteral, exponentPart),
        decimalDigits,
      );

      return token(
        choice(
          hexLiteral,
          decimalLiteral,
          binaryLiteral,
          octalLiteral,
          bigintLiteral,
        ),
      );
    },

    // 'undefined' is syntactically a regular identifier in JavaScript.
    // However, its main use is as the read-only global variable whose
    // value is [undefined], for which there's no literal representation
    // unlike 'null'. We gave it its own rule so it's easy to
    // highlight in text editors and other applications.

    private_property_identifier: (_) => {
      const alpha =
        /[^\x00-\x1F\s\p{Zs}0-9:;`"'@#.,|^&<=>+\-*/\\%?!~()\[\]{}\uFEFF\u2060\u200B\u2028\u2029]|\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/u;

      const alphanumeric =
        /[^\x00-\x1F\s\p{Zs}:;`"'@#.,|^&<=>+\-*/\\%?!~()\[\]{}\uFEFF\u2060\u200B\u2028\u2029]|\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/u;
      return token(seq("#", alpha, repeat(alphanumeric)));
    },

    meta_property: (_) =>
      choice(seq("new", ".", "target"), seq("import", ".", "meta")),

    this: (_) => "this",
    super: (_) => "super",
    true: (_) => "true",
    false: (_) => "false",
    null: (_) => "null",
    undefined: (_) => "undefined",

    //
    // Expression components
    //

    arguments: ($) => seq("(", commaSep(optional($.identifier)), ")"),

    class_body: ($) =>
      seq(
        "{",
        repeat(
          choice(
            seq(field("member", $.method_definition), optional(";")),
            seq(field("member", $.field_definition), $._semicolon),
            field("member", $.class_static_block),
            ";",
          ),
        ),
        "}",
      ),

    field_definition: ($) =>
      seq(
        optional("static"),
        field("property", $._property_name),
        optional($._initializer),
      ),

    formal_parameters: ($) => seq("(", optional(commaSep1($.identifier)), ")"),

    class_static_block: ($) =>
      seq(
        "static",
        optional($._automatic_semicolon),
        field("body", $.statement_block),
      ),

    // This negative dynamic precedence ensures that during error recovery,
    // unfinished constructs are generally treated as literal expressions,
    // not patterns.
    pattern: ($) => prec.dynamic(-1, choice($._lhs_expression, $.rest_pattern)),

    rest_pattern: ($) => prec.right(seq("...", $._lhs_expression)),

    method_definition: ($) =>
      seq(
        optional(
          choice(
            "static",
            alias(token(seq("static", /\s+/, "get", /\s*\n/)), "static get"),
          ),
        ),
        optional(choice("get", "set", "*")),
        field("name", $._property_name),
        field("parameters", $.formal_parameters),
        field("body", $.statement_block),
      ),

    pair: ($) =>
      seq(field("key", $._property_name), ":", field("value", $.expression)),

    pair_pattern: ($) =>
      seq(
        field("key", $._property_name),
        ":",
        field("value", choice($.pattern, $.assignment_pattern)),
      ),

    _property_name: ($) =>
      choice(
        alias(
          choice($.identifier, $._reserved_identifier),
          $.property_identifier,
        ),
        $.private_property_identifier,
        $.string,
        $.number,
        $.computed_property_name,
      ),

    computed_property_name: ($) => seq("[", $.expression, "]"),

    _reserved_identifier: (_) =>
      choice("get", "set", "async", "static", "export", "let"),

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
 * Creates a rule to optionally match one or more of the rules separated by a comma
 *
 * @param {Rule} rule
 *
 * @returns {ChoiceRule}
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
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
