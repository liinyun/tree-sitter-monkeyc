// swift-tools-version:5.3

import Foundation
import PackageDescription

var sources = ["src/parser.c"]
if FileManager.default.fileExists(atPath: "src/scanner.c") {
    sources.append("src/scanner.c")
}

let package = Package(
    name: "TreeSitterMonkeyc",
    products: [
        .library(name: "TreeSitterMonkeyc", targets: ["TreeSitterMonkeyc"]),
    ],
    dependencies: [
        .package(name: "SwiftTreeSitter", url: "https://github.com/tree-sitter/swift-tree-sitter", from: "0.9.0"),
    ],
    targets: [
        .target(
            name: "TreeSitterMonkeyc",
            dependencies: [],
            path: ".",
            sources: sources,
            resources: [
                .copy("queries")
            ],
            publicHeadersPath: "bindings/swift",
            cSettings: [.headerSearchPath("src")]
        ),
        .testTarget(
            name: "TreeSitterMonkeycTests",
            dependencies: [
                "SwiftTreeSitter",
                "TreeSitterMonkeyc",
            ],
            path: "bindings/swift/TreeSitterMonkeycTests"
        )
    ],
    cLanguageStandard: .c11
)
