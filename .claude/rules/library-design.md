# Library Design

## Match real-world ecosystem output when parsing format output

When a library parses a standard format (SVG from Illustrator/Inkscape/Figma, Markdown from pandoc, CSS from preprocessors), align with what those tools actually emit — even if it disagrees with the bare spec. The tool's output is the real-world input to your library; spec-only behavior creates work for every downstream user, who'll either hit "shouldn't happen" edge cases that constantly do, or have to preprocess input to massage it into spec form.

Examples:

- SVG libraries should silently tolerate the redundant `L startX,startY z` path-closing pattern every major vector editor emits
- JSON libraries accepting trailing commas
- Markdown libraries accepting CommonMark-plus-tables

Inverts when the library's *goal* is spec conformance (validators, linters, compliance tools) — match the spec.

When deliberately preferring convention over spec, document the divergence in code AND in user-facing docs (README limitations section).

## API misuse should throw, not warn

Two channels:

- **Warnings** = *data* problems: the input had something the library couldn't fully interpret but the run keeps going. The caller didn't author the data; they can't fix it by changing their code, only forward the warning.
- **Throws** = *caller* problems: the call site invoked the API with arguments that don't make sense. Silently degrading leaves the caller with no signal their code is wrong.

Test: "could a runtime change in the input fix this, or does the caller have to edit their code?" Latter → throw.

Example — `filterByStyle` previously warned (and returned an empty match set) when the caller passed a value type that didn't match the chosen key (e.g. `{ key: 'stroke-width', value: colord('red') }`). Wrong: the filter object is malformed and no SVG input would ever fix it. Throw immediately.

Counter-example — `Invalid <line> properties: {"x1":"abc",...}` stays a warning. The caller didn't write `"abc"`; an SVG file did. Warn, skip that element, keep going.

When throwing on caller input, use `String(value)` to interpolate user-supplied values, not `JSON.stringify(value)` — JSON.stringify will inline a 10MB object's full payload into the error string.
