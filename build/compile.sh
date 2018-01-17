#!/bin/bash
COMPILER_JAR="/c/Program Files/closure-compiler/compiler.jar"
src=`sed -E -n "s/^.*\"(\w+\.js)\".*$/--js ..\/src\/\1/p" ../src/chess.include.js`
java -jar "$COMPILER_JAR" \
	--language_in ECMASCRIPT5_STRICT \
	--compilation_level ADVANCED_OPTIMIZATIONS \
	--output_wrapper "(function(){%output%})();" \
	--use_types_for_optimization \
	--summary_detail_level 3 \
	--warning_level VERBOSE \
	--js_output_file ../chess.min.js \
	--externs extern-jquery-1.9.js \
	--externs extern-jquery-ui.js \
	$src \
	--js export.js
cp ../src/chess.css ..
cp ../src/chess.ico ..
sed "s/chess\.include\.js/chess.min.js/" ../src/chess.html > ../chess.html

