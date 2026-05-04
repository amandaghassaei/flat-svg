# Naming Conventions

## Single underscore for private members (overrides global rule)

This project uses a **single** `_` prefix for private properties and methods, **not** the `__` prefix specified in the global naming-conventions rule. This applies to:

- Private instance properties: `this._foo`
- Private instance methods: `this._doFoo()`
- Private static methods: `FlatSVG._doFoo()`

The global rule reserves `_` for *protected* members; this project does not distinguish protected from private and uses `_` for both. When working in this repo, follow this convention regardless of the global default.
