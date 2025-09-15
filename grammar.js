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

  precedences: ($) => [
    [
      $.parenthesized_expression,
      "member",
      "call",
      $.update_expression,
      "unary_void",
      "binary_exp",
      "binary_times",
      "binary_plus",
      "binary_shift",
      "binary_compare",
      "binary_relation",
      "binary_equality",
      "binary_has",
      "bitwise_and",
      "bitwise_xor",
      "bitwise_or",
      "logical_and",
      "logical_or",
      "ternary",
    ],
    ["assign", $.primary_expression],
    ["call", "new", $.expression],
    ["declaration", "literal"],
    [$.primary_expression, $.statement_block, "object"],
    [$.import_statement, $.import],
  ],

  word: ($) => $.identifier,

  supertypes: ($) => [
    $.statement,
    $.declaration,
    $.expression,
    $.primary_expression,
  ],

  conflicts: ($) => [
    // [$.primary_expression, $.pattern],
    // [$.statement_block, $.dictionary],
    // [$.generic_type, $.primary_expression],
    // [$.member_expression, $.type],
    [$.new_expression, $.primary_expression],
    [$.array, $.primary_expression],
    [$.typed_identifier, $.primary_expression],
    [$.annotation, $.primary_expression]
    // [$.call_expression, $.type],

    // [$.variable_declarator, $.pattern],
    // [$._initializer, $.binary_expression],
    // [$._initializer, $.update_expression],
  ],

  // inline: ($) => [
  //   $._call_signature,
  //   // $._expressions,
  // ],

  rules: {
    program: ($) => repeat($.statement),

    statement: ($) =>
      choice(
        $.import_statement,
        $.using_statement,
        $.expression_statement,
        // $.primary_expression,
        $.declaration,
        $.statement_block,
        $.type_alias_statement,

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
        $.empty_statement,
      ),

    declaration: ($) =>
      choice(
        $.function_declaration,
        // $.generator_function_declaration,
        $.class_declaration,
        $.module_declaration,
        $.variable_declaration,
      ),

    identifier: (_) => {
      const alpha =
        /[^\x00-\x1F\s\p{Zs}0-9:;`"'@#.,|^&<=>+\-*/\\%?!~()\[\]{}\uFEFF\u2060\u200B\u2028\u2029]|\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/u;

      const alphanumeric =
        /[^\x00-\x1F\s\p{Zs}:;`"'@#.,|^&<=>+\-*/\\%?!~()\[\]{}\uFEFF\u2060\u200B\u2028\u2029]|\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/u;
      return token(seq(alpha, repeat(alphanumeric)));
    },

    // comment: (_) => token(seq("//", /[^\r\n\u2028\u2029]*/)),

    comment: _ => token(choice(
      seq('//', /[^\r\n\u2028\u2029]*/),
      seq(
        '/*',
        /[^*]*\*+([^/*][^*]*\*+)*/,
        '/',
      ),
    )),


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

    using_statement: ($) =>
      seq("using", $.dotted_name, optional(seq("as", $.identifier)), ";"),

    // this can only be used in import_statement and using_statement
    // it is designed just for these occasions, so I don't give it too much expressiveness nor precedence
    dotted_name: ($) => prec(1, sep1($.identifier, ".")),
    // without reserved, it would not parse a.b in If statement
    member_expression: ($) =>
      prec.left(
        "member",
        seq(
          field("object", $.primary_expression),
          ".",
          field("property", $._property_name),
        ),
      ),

    // TODO: I don't understand why can't I use attribute like what python does
    //
    // member_expression and attribute has the same left and right part. So I comment attribute, I don't know why I use the two same thing. Maybe the unfamiliarity of the tree-sitter rules
    // attribute: ($) =>
    //   prec(
    //     "member",
    //     seq(
    //       field("object", $.primary_expression),
    //       ".",
    //       field("property", $.identifier),
    //     ),
    //   ),

    //
    // Statements
    //

    expression_statement: ($) => seq($.expression, $.empty_statement),

    type_alias_statement: $ => prec(1, seq(
      'typedef',
      field('left', $.type),
      'as',
      field('right', $.type),
    )),


    variable_declaration: ($) =>
      seq(
        optional($.modifiers),
        choice("var", "const"),
        $.variable_declarator,
        ";",
      ),

    variable_declarator: ($) =>
      seq(
        field("name", $.identifier),
        optional(
          choice(
            seq("=", field("value", $.expression)),
            seq("as", field("type", $.type)),
            seq("=", field("value", $.expression), "as", field("type", $.type)),
            seq("as", field("type", $.type), "=", field("value", $.expression)),
          ),
        ),
      ),

    // statement_block in monkeyc don't need to append ";"
    statement_block: ($) => seq("{", repeat($.statement), "}"),

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
        field("condition", seq($.expression, ";")),
        field("increment", $.expression),
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
        ),
      ),

    // I don't find many people use this statement, so I will make it simple
    // I force everyone to write catch_clause and finally_clause after try
    try_statement: ($) =>
      seq(
        "try",
        field("body", $.statement_block),
        repeat1(field("handler", $.catch_clause)),
        field("finalizer", $.finally_clause),
      ),
    catch_clause: ($) =>
      seq(
        "catch",
        optional(seq("(", field("parameter", $.expression), ")")),
        // seq("(", field("parameter", $.expression), ")"),
        field("body", $.statement_block),
      ),

    finally_clause: ($) => seq("finally", field("body", $.statement_block)),

    // these 4 will be used as $statement in for and other place
    break_statement: ($) => seq("break", ";"),
    continue_statement: ($) => seq("continue", ";"),
    return_statement: ($) =>
      seq(
        "return",
        optional(
          choice(
            field("value", $.expression),
            seq(field("value", $.expression), "as", field("type", $.type)),
          ),
        ),
        ";",
      ),
    throw_statement: ($) => seq("throw", $.expression, ";"),

    empty_statement: (_) => ";",

    //
    // Statement components
    //

    switch_body: ($) =>
      // seq(
      //   "{",
      //   field("cases", repeat($.switch_case)),
      //   optional(field("default", $.switch_default)),
      //   "}",
      // ),
      seq("{", repeat(choice($.switch_case, $.switch_default)), "}"),
    // seq("{", repeat($.switch_case), optional($.switch_default), "}"),

    switch_case: ($) =>
      prec.left(
        seq(
          "case",
          field("value", $.expression),
          ":",
          field("body", repeat($.statement)),
        ),
      ),

    switch_default: ($) =>
      prec.right(seq("default", ":", field("body", repeat($.statement)))),

    parenthesized_expression: ($) => seq("(", $.expression, optional(seq("as", $.type)), ")"),

    //
    // Pattern
    //

    parameter: ($) => choice($.identifier, $.typed_parameter),

    typed_parameter: ($) =>
      prec(-1, seq($.identifier, "as", field("type", $.type))),
    type: ($) =>
      choice(
        prec(1, $.identifier),
        $.type_null,
        $.union_type,
        // $.constrained_type,
        $.member_type,
        $.generic_type,
        $.array_type,
        $.method_function,
      ),
    union_type: ($) => prec.left(seq($.type, "or", $.type)),
    // constrained_type: ($) => prec.right(seq($.type, "as", $.type)),
    // constrained_type: ($) => prec.right(seq($.type, "as", $.type)),
    member_type: ($) => prec.left(seq($.type, ".", $.type)),

    array_type: ($) =>
      seq(field("element", $.type), field("dimensions", $.dimensions)),

    dimensions: ($) => prec.right(repeat1(seq("[", $.expression, "]"))),

    // this is to be called
    array_access: ($) =>
      prec.left(
        seq(
          field("array", $.primary_expression),
          "[",
          field("index", $.expression),
          "]",
          optional($.typed_parameter),
        ),
      ),

    generic_type: ($) =>
      prec(
        10,
        seq(
          choice(alias($.identifier, $.type_identifier), $.member_type),
          $.type_arguments,
        ),
      ),
    type_arguments: ($) => prec.right(seq("<", $.type, ">", optional("?"))),
    annotation: ($) => seq("(", $.symbol, ")"),

    // annotation_keywords: ($) =>
    //   choice(
    //     ":debug",
    //     ":test",
    //     ":background",
    //     ":glance",
    //     ":release",
    //     ":typecheck",
    //     ":initialized",
    //     ":extendedCode",
    //   ),

    symbol: ($) => {
      const alpha =
        /[^\x00-\x1F\s\p{Zs}0-9:;`"'@#.,|^&<=>+\-*/\\%?!~()\[\]{}\uFEFF\u2060\u200B\u2028\u2029]|\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/u;

      const alphanumeric =
        /[^\x00-\x1F\s\p{Zs}:;`"'@#.,|^&<=>+\-*/\\%?!~()\[\]{}\uFEFF\u2060\u200B\u2028\u2029]|\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/u;
      return token(seq(":", alpha, repeat(alphanumeric)));
    },
    type_null: ($) => {
      const alpha =
        /[^\x00-\x1F\s\p{Zs}0-9:;`"'@#.,|^&<=>+\-*/\\%?!~()\[\]{}\uFEFF\u2060\u200B\u2028\u2029]|\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/u;

      const alphanumeric =
        /[^\x00-\x1F\s\p{Zs}:;`"'@#.,|^&<=>+\-*/\\%?!~()\[\]{}\uFEFF\u2060\u200B\u2028\u2029]|\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/u;
      return token(seq(alpha, repeat(alphanumeric), "?"));
    },

    // token(seq(":", $.identifier)),

    //
    // Expressions      expressions doesn't have ";" appended
    //

    expression: ($) =>
      choice(
        $.primary_expression,
        $.assignment_expression,
        $.augmented_assignment_expression,
        $.unary_expression,
        $.binary_expression,
        $.ternary_expression,
        $.update_expression,
      ),

    primary_expression: ($) =>
      choice(
        $.identifier,
        $.typed_identifier,
        $.type_null,
        // $.attribute,
        $.member_expression,
        $.new_expression,
        $.array_access,
        $.parenthesized_expression,
        $.this,
        $.super,
        $.number,
        // $.integer,
        // $.float,
        $.string,
        $.true,
        $.false,
        $.null,
        $.array,
        $.typed_array,
        $.array_class,
        $.dictionary,
        $.symbol,
        $.call_expression,
      ),
    array_unit: ($) => seq($.expression, optional(seq("as", $.type))),
    // array: ($) => seq("[", commaSep(optional($.expression)), optional(seq("as", $.identifier)), "]"),
    typed_identifier: ($) => prec.left(seq($.identifier, "as", $.type)),
    array: ($) =>
      seq("[", commaSep(optional(choice($.array_unit, $.array))), "]"),
    return_type: ($) => choice($.identifier, seq($.identifier, "?")),
    return_typed_parameter: ($) =>
      prec(-1, seq($.identifier, "as", field("type", $.return_type))),

    typed_array: ($) =>
      prec.left(1, seq($.array, seq("as", field("type", $.type)))),
    array_class: ($) => seq("Array", "<", choice($.type, $.array_class), ">"),
    // array_class: ($) => seq("Array", "<", $.identifier, ">"),

    dictionary: ($) => seq("{", commaSep1($.pair), optional(","), "}"),

    pair: ($) =>
      seq(field("key", $.expression), "=>", field("value", $.expression)),

    module_declaration: ($) => seq(optional($.annotation), "module", $.identifier, $.statement_block),

    class_declaration: ($) =>
      prec(
        "declaration",
        seq(
          optional($.annotation),
          optional($.modifiers),
          "class",
          field("name", $.identifier),
          optional($.class_heritage),
          field("body", $.class_body),
        ),
      ),
    modifiers: ($) =>
      repeat1(
        choice("public", "protected", "private", "static", "final", "default"),
      ),

    class_heritage: ($) => seq("extends", $.expression),

    function_declaration: ($) =>
      prec.left(
        "declaration",
        seq(
          "function",
          field("name", $.identifier),
          field("parameters", $.formal_parameters),
          optional(seq("as", $.type)),
          field("body", $.statement_block),
        ),
      ),
    // Override
    // _call_signature: ($) => field("parameters", $.formal_parameters),

    call_expression: ($) =>
      prec(
        "call",
        seq(
          field("function", $.primary_expression),
          field("arguments", $.arguments),
        ),
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

    // both js and python uses pattern for left part.
    // difference is that they uses _lhs_expression or _lhs_hand_side
    // I don't know if it is needed, so I just extract the pattern
    // from those choice expressions it means an identifier or dotted_names
    assignment_expression: ($) =>
      prec.right(
        "assign",
        seq(
          field("left", $.pattern),
          choice(
            seq("=", field("right", $.expression)),
            seq("=", field("right", $.expression), "as", field("type", $.type)),
          ),
        ),
      ),

    // the reason I use $.attribute instead of $.dotted_names here is
    // to emphasize the affiliation between $.identifier
    // and prec of dotted_names is too low. The left part of dotted_names lacks expressiveness power
    pattern: ($) => choice($.identifier, $.member_expression, $.array_access),

    // _augmented_assignment_lhs: ($) =>
    //   choice($.identifier, $.parenthesized_expression,$.member_expression,),

    augmented_assignment_expression: ($) =>
      prec.right(
        "assign",
        seq(
          field("left", $.pattern),
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
              "&&=",
              "||=",
            ),
          ),
          field("right", $.expression),
        ),
      ),

    _initializer: ($) => seq("=", field("value", $.expression)),

    // 25
    // 21
    binary_expression: ($) =>
      choice(
        ...[
          ["&&", "logical_and"],
          ["and", "logical_and"],
          ["||", "logical_or"],
          ["or", "logical_or"],
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
          ["instanceof", "binary_relation"],
          ["has", "binary_has"],
        ].map(([operator, precedence]) =>
          prec.left(
            precedence,
            seq(
              field("left", $.expression),
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
          field("operator", choice("!", "~", "-", "+", "instanceof", "as")),
          field("argument", $.expression),
        ),
      ),

    // monkeyc does have this, but I'm not sure if there are difference
    // between these two.
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

    ternary_expression: ($) =>
      prec.right(
        seq(
          field("condition", $.expression),
          optional(seq("as", $.type)),
          "?",
          field("consequence", $.expression),
          ":",
          field("alternative", $.expression),
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
      ),

    // Workaround to https://github.com/tree-sitter/tree-sitter/issues/1156
    // We give names to the token() constructs containing a regexp
    // so as to obtain a node in the CST.
    //
    unescaped_double_string_fragment: (_) =>
      token.immediate(prec(1, /[^"\\\r\n]+/)),

    escape_sequence: (_) => token.immediate(/\\['"ntr\\u]/),

    number: (_) => {
      const hexLiteral = seq(choice("0x", "0X"), /[\da-fA-F](_?[\da-fA-F])*/);

      const decimalDigits = /\d+/;

      const signedInteger = seq(optional(choice("-", "+")), decimalDigits);
      const exponentPart = seq(choice("e", "E"), signedInteger);
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

      return token(seq(choice(hexLiteral, decimalLiteral), optional("l")));
    },

    integer: (_) =>
      token(
        choice(
          seq(choice("0x", "0X"), repeat1(/_?[A-Fa-f0-9]+/), optional(/[Ll]/)),
          seq(choice("0o", "0O"), repeat1(/_?[0-7]+/), optional(/[Ll]/)),
          seq(choice("0b", "0B"), repeat1(/_?[0-1]+/), optional(/[Ll]/)),
          seq(
            repeat1(/[0-9]+_?/),
            choice(
              optional(/[Ll]/), // long numbers
              optional(/[jJ]/), // complex numbers
            ),
          ),
        ),
      ),

    float: (_) => {
      const digits = repeat1(/[0-9]+_?/);
      const exponent = seq(/[eE][\+-]?/, digits);

      return token(
        seq(
          choice(
            seq(digits, ".", optional(digits), optional(exponent)),
            seq(optional(digits), ".", digits, optional(exponent)),
            seq(digits, exponent),
          ),
          optional(/[jJ]/),
        ),
      );
    },

    this: (_) => "this",
    super: (_) => "super",
    true: (_) => "true",
    false: (_) => "false",
    null: (_) => "null",

    //
    // Expression components
    //

    arguments: ($) => seq("(", commaSep(optional($.expression)), ")"),

    class_body: ($) =>
      seq(
        "{",
        repeat(
          seq(field("member", choice($.method_definition, $.field_definition))),
        ),
        "}",
      ),

    field_definition: ($) =>
      seq(
        optional($.modifiers),
        choice("var", "const"),
        field("property", $._property_name),
        optional(
          choice(
            seq("=", field("value", $.expression)),
            seq("as", field("type", $.type)),
            seq("=", field("value", $.expression), "as", field("type", $.type)),
            seq("as", field("type", $.type), "=", field("value", $.expression)),
          ),
        ),
        ";",
      ),

    formal_parameters: ($) => seq("(", optional(commaSep1($.parameter)), ")"),

    method_definition: ($) =>
      seq(
        optional($.annotation),
        optional($.modifiers),
        "function",
        field("name", $._property_name),
        field("parameters", $.formal_parameters),
        optional(seq("as", field("return_type", $.type))),
        field("body", $.statement_block),
      ),
    method_function: ($) =>
      prec.left(
        seq("Method", $.formal_parameters, optional(seq("as", $.type))),
      ),

    // the only reason I extract it is just to reuse it.
    // I don't know if it would occupy more resource
    // TODO: test resource cause for this or learn the functionality
    _property_name: ($) => alias($.identifier, $.property_identifier),

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
