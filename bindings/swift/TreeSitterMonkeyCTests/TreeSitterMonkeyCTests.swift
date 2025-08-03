import XCTest
import SwiftTreeSitter
import TreeSitterMonkeyc

final class TreeSitterMonkeycTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_monkeyc())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Monkeyc grammar")
    }
}
