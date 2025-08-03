package tree_sitter_monkeyc_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_monkeyc "github.com/liinyun/tree-sitter-monkeyc.git/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_monkeyc.Language())
	if language == nil {
		t.Errorf("Error loading Monkeyc grammar")
	}
}
