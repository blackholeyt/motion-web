"""Extracts translations from the iOS app's string catalog.

Usage: python3 scripts/import-ios-strings.py <path to Localizable.xcstrings>
Writes src/i18n/de-ios.json and src/i18n/en-ios-plurals.json.
Format specifiers (%@, %lld, %1$@ …) become {0}, {1} … in keys and values.
Plural variations are stored as "<key>#one" next to "<key>" (other).
"""
import json
import re
import sys

SPEC = re.compile(r"%(?:(\d+)\$)?(?:lld|ld|d|@|f|\.\d+f|lf)")


def convert(text):
    counter = iter(range(100))

    def repl(match):
        position = match.group(1)
        return "{%d}" % (int(position) - 1 if position else next(counter))

    return SPEC.sub(repl, text).replace("%%", "%")


def collect(entry, language, target, key, plurals_only=False):
    localization = entry.get("localizations", {}).get(language, {})
    unit = localization.get("stringUnit", {})
    if not plurals_only and isinstance(unit.get("value"), str) and unit.get("value"):
        target[key] = convert(unit["value"])
    plural = localization.get("variations", {}).get("plural", {})
    other = plural.get("other", {}).get("stringUnit", {}).get("value")
    one = plural.get("one", {}).get("stringUnit", {}).get("value")
    if other:
        if not plurals_only:
            target[key] = convert(other)
        if one:
            target[key + "#one"] = convert(one)


catalog = json.load(open(sys.argv[1], encoding="utf-8"))["strings"]
german, english = {}, {}
for raw, entry in catalog.items():
    key = convert(raw)
    collect(entry, "de", german, key)
    collect(entry, "en", english, key, plurals_only=True)
for path, data in (("src/i18n/de-ios.json", german), ("src/i18n/en-ios-plurals.json", english)):
    json.dump(dict(sorted(data.items())), open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(len(german), "German entries,", len(english), "English plural entries")
