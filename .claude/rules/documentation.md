# Documentation

## Avoid abbreviation jargon in prose

Don't use unexplained acronyms like **AST** in comments, JSDocs, or test names — anyone unfamiliar with the term has to context-switch to look it up, and skimmers miss what's actually meant. The few-character savings aren't worth it.

In this repo, the established term for the svg-parser output is **"parse tree"** (no hyphen) — match the existing usage rather than inventing variants.

This applies to *prose* describing the code. It does NOT apply to identifiers from third-party libraries that happen to contain the abbreviation — e.g. `CssRuleAST` from `@adobe/css-tools` stays as-is because it's an imported type name, not authored prose.

## JSDoc on every exported function, kept concise

Every exported function gets a JSDoc block with a description and `@param` / `@returns` tags. Keep the description to **at most three lines** unless a longer explanation is genuinely necessary (e.g. a non-obvious invariant, a spec-divergence note, a tricky edge case). Prefer a single tight sentence over a paragraph — if the function name and parameter types already convey the behavior, the JSDoc only needs to fill in what they don't.

```typescript
/**
 * Strip leading and trailing whitespace from a string (equivalent to `.trim()`).
 * @param string Input string.
 * @returns The input with all leading/trailing whitespace removed.
 */
export function removeWhitespacePadding(string: string) { /* ... */ }
```

If a longer description is warranted, lead with the one-line summary and put the extra context underneath, so readers who only need the gist can stop after the first line.

## Comment *why* at sites of intentional asymmetry or counterintuitive code

When code deliberately deviates from a cleaner or more symmetric implementation, add an inline comment naming the specific tool, format, convention, or incident the behavior accommodates.

Example — silently dropping zero-length path `Z` closures (but not zero-length `L` commands):

```typescript
case 'Z':
    // Drop zero-length Z closures: every major SVG tool (Illustrator, Inkscape, etc.)
    // exports paths as "... L startX,startY z" with a redundant explicit line back
    // to the start followed by z. Emitting a segment for the z would inflate segment
    // counts on essentially every real-world SVG. Asymmetric with L handling by design.
    if (startPoint === currentPoint) return;
    // ...
```

Without it, a future maintainer sees the asymmetry, assumes it's a bug, "fixes" it for consistency, and breaks every file from every major SVG tool.

Be specific enough to be evaluated against current state — "rollup-plugin-terser is deprecated as of 2023", "Illustrator 2024 writes explicit fill on every element", "IE11 requires this fallback" — not vague ("this is needed").
