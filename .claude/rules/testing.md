# Testing

## Assert exact values, not loose ranges

When testing against a specific fixture (not a general contract that varies across inputs), prefer exact assertions over loose ones:

- `expect(x.length).to.equal(5)` over `expect(x.length).to.be.greaterThan(0)`
- `expect(result).to.deep.equal({...})` over checking individual fields piecemeal
- `expect(arr).to.deep.equal(['a', 'b'])` over `expect(arr).to.include('a')`

Loose assertions hide regressions. A filter that returned nothing instead of the expected 3 items would silently pass `.greaterThan(-1)` or a conditional that only runs when `length > 0`.

Loose assertions are justified only when testing a contract across many possible inputs where the exact count isn't the point (e.g., "this invariant holds for every element in a list").

## Deep-equal round-trips for serialization tests

When verifying that an object is JSON-serializable, don't just check that `JSON.stringify` doesn't throw — deep-equal the round-tripped value:

```js
expect(() => JSON.stringify(x)).not.to.throw();
expect(JSON.parse(JSON.stringify(x))).to.deep.equal(x);
```

Catches class instances, functions, `undefined` values, Map/Set fields, cyclic references, and every other non-serializable slip-up in one assertion. Individual field checks on the round-tripped object miss these.

## Inline small single-use fixtures; keep larger shared fixtures as files

For test fixtures small enough to read at a glance (~5 lines) and used by a single test, prefer an inline template string over a separate fixture file. The fixture and its assertions should be co-located so a reader doesn't have to tab out to understand what the test asserts against.

Fixtures that are larger, shared across multiple tests, or benefit from being visually inspected in an editor (rendered SVGs, formatted JSON, etc.) stay as separate files in a `fixtures/` or `svgs/` directory.

## `c8 ignore` defensive branches: use start/stop and name the upstream contract

When a defensive branch is genuinely unreachable per an upstream contract (a typed library's input invariants, a guard further up the same function, etc.), wrap it in a `c8 ignore start/stop` block with a comment that:

1. Starts with `defensive:` (or similar tag).
2. Names the *specific* upstream contract that makes it unreachable — the library, the type, the prior check.
3. Says what would have to change for the branch to fire.

```typescript
/* c8 ignore start -- defensive: svg-parser only ever produces string or number for width/height
   attribute values (per @types/svg-parser, properties is Record<string, string | number>), and the
   preceding isNumber check above already routes the number case. This branch only triggers if a
   future svg-parser version starts emitting other types, which would be a contract change. */
if ((width && typeof width !== 'string') || (height && typeof height !== 'string')) {
    return 'px';
}
/* c8 ignore stop */
```

Always `start/stop`, never the single-line `c8 ignore next` form — the pair is robust to refactors that move/insert lines, and the bracketing makes the ignored region visible at a glance.

Reserve this for branches that are truly unreachable. If a branch can fire in normal use, write a test for it instead.
