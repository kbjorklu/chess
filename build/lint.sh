#!/bin/bash
LINT="/c/Program Files (x86)/jsl-0.3.0/jsl.exe"
src=`sed -E -n "s/^.*\"(\w+\.js)\".*$/..\/src\/\1/p" ../src/chess.include.js`
echo "\"use strict\";" > chess.max.js
sed "s/^.use strict..$//g" $src >> chess.max.js
sed -i "/^$/N;/^\n$/D" chess.max.js
sed -i "s/\t/  /g" chess.max.js

"$LINT" -nologo -nofilelisting -conf jsl.conf -process chess.max.js

rm chess.max.js
