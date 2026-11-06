#!/bin/sh
# Model-checks IBS.tla with TLC for every configuration in expected.txt and compares each outcome with the
# expected one. Needs Java 11+ and tla2tools.jar (TLA+ tools v1.8.0): put it in formal/.tools/ or set TLA2TOOLS.
#   https://github.com/tlaplus/tlaplus/releases/tag/v1.8.0
# Exit code 0 when every outcome matches. TLC output for each configuration goes to $OUT (default /tmp/ibs-tlc).
set -u
cd "$(dirname "$0")"
JAR=${TLA2TOOLS:-.tools/tla2tools.jar}
OUT=${OUT:-/tmp/ibs-tlc}
[ -f "$JAR" ] || { echo "tla2tools.jar not found at $JAR (see the header of this script)"; exit 2; }
mkdir -p "$OUT"
status=0
while read -r cfg expect; do
  case "$cfg" in ''|'#'*) continue ;; esac
  log="$OUT/${cfg%.cfg}.log"
  java -XX:+UseParallelGC -cp "$JAR" tlc2.TLC -workers auto -noGenerateSpecTE -metadir "$OUT/${cfg%.cfg}.states" \
       -config "cfg/$cfg" IBS.tla > "$log" 2>&1
  if grep -q "Model checking completed. No error has been found." "$log"; then got=pass
  else got=$(sed -n 's/^Error: \(Invariant\|Action property\|Temporal property\) \([A-Za-z0-9_]*\) is violated.*/\2/p' "$log" | head -1)
       [ -n "$got" ] || got="error (see $log)"
  fi
  states=$(sed -n 's/.* \([0-9,]*\) distinct states found.*/\1/p' "$log" | tail -1)
  if [ "$got" = "$expect" ]; then mark=ok; else mark=MISMATCH; status=1; fi
  printf '%-18s expected %-30s got %-30s %s distinct states  %s\n' "$cfg" "$expect" "$got" "${states:-?}" "$mark"
done < expected.txt
exit $status
