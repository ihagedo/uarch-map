# uarch-map

An architecture map of the Apple M1 Firestorm core, assembled from published reverse engineering
(Dougall Johnson, Maynard Handley), Apple patents, and a few articles and papers.

Every value on the map comes from a claim, and every claim cites a place in its source: a page, a
section, a patent. A parameter with no claim is drawn as a hole, and claims that disagree are marked
as disputed rather than one silently winning.

The claims live in `kb/claims/inbox/`, one file per source. `docs/CLAIM_GUIDE.md` covers the claim
format and how values are chosen.

## Build

```
python3 tools/kb/merge.py firestorm    # kb/firestorm.json, kb/reports/firestorm.md
python3 site/build.py firestorm        # build/site/index.html
```

Needs Python 3 with PyYAML and jsonschema. The page is plain HTML, CSS and JS, laid out from
`site/layout/firestorm.yaml`.
