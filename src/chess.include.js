"use strict";

/** @param {string} file */
function include(file) {
	document.write('<script type="text/javascript" src="' + file + '"></script>');
}

include("chess.js");
include("bitboard.js");
include("zobrist.js");
include("move.js");
include("position.js");
include("parser.js");
include("ai.js");
include("ui.js");
