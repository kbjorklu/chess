"use strict";

/**
 * Parser for chess moves in algebraic notation, e.g. "1. e4 c5 (comment here) 2. Nf3 d6".
 * The idea is to parse a list of moves starting from the initial state, yielding a valid chess position.
 * @constructor
 * @see http://goo.gl/B39TC (Algebraic notation)
 */
Chess.Parser = function() {
};

/**
 * Cleans uninteresting parts of a move string
 * @param {string} text
 * @return {string}
 * @see http://goo.gl/uAijB (Dashes and hyphens)
 */
Chess.Parser.clean = function(text) {
	text = text.replace(/[\r\n\t]/gm, " "); // normalize whitespace to spaces
	text = text.replace(/[\u002D\u05BE\u1806\u2010\u2011\u2012\u2013\u2014\u2015\u207B\u208B\u2212\u2E3A\u2E3B\uFE58\uFE63\uFF0D]/g, "-"); // normalize dashes
	while (true) { // remove comments, i.e. (nested) parentheses and characters between them
		var replaced = text.replace(/\([^()]*\)/g, "");
		if (replaced === text) {
			break;
		}
		text = replaced;
	}
	text = text.replace(/[^ a-z0-9.=:\u00BD-]/gi, " "); // only keep interesting characters
	text = text.replace(/  +/g, " "); // normalize whitespace to one space
	return text;
};

/**
 * @param {!Chess.Position} chessPosition
 * @param {string} text
 * @return {?Array.<!Chess.Move>}
 */
Chess.Parser.parseOneMove = function(chessPosition, text) {
	var legalMoves = chessPosition.getMoves();

	var castling = text.match(/0-0(?:-0)?|O-O(?:-O)?/i);
	if (castling) {
		var kind = (castling[0].length === 3) ? Chess.Move.Kind.KING_CASTLE : Chess.Move.Kind.QUEEN_CASTLE;
		return legalMoves.filter(/** @param {!Chess.Move} move */function(move) { return move.getKind() === kind; });
	}

	var move = text.match(/([NBRQK])?([a-h])?([1-8])?-?([x:])?([a-h])([1-8])?(?:[=(]([NBRQ]))?/);
	if (move) {
		var piece = move[1];
		var fromFile = move[2];
		var fromRank = move[3];
		var capture = move[4];
		var toFile = move[5];
		var toRank = move[6];
		var promotedPiece = move[7];
		return legalMoves.filter(/** @param {!Chess.Move} move */function(move) {
			if (piece !== undefined && Chess.PIECE_ALGEBRAIC_NAMES[move.getPiece()] !== piece) {
				return false;
			}

			if (piece === undefined && move.getPiece() !== Chess.Piece.PAWN) {
				return false;
			}

			if (fromFile !== undefined && Chess.FILE_CHARACTERS[Chess.getFile(move.getFrom())] !== fromFile) {
				return false;
			}

			if (fromRank !== undefined && Chess.RANK_CHARACTERS[Chess.getRank(move.getFrom())] !== fromRank) {
				return false;
			}

			if (capture !== undefined && !move.isCapture()) {
				return false;
			}

			if (toFile !== undefined && Chess.FILE_CHARACTERS[Chess.getFile(move.getTo())] !== toFile) {
				return false;
			}

			if (toRank !== undefined && Chess.RANK_CHARACTERS[Chess.getRank(move.getTo())] !== toRank) {
				return false;
			}

			if (promotedPiece !== undefined && Chess.PIECE_ALGEBRAIC_NAMES[move.getPromotedPiece()] !== promotedPiece) {
				return false;
			}

			return true;
		});
	}

	return null;
};

/**
 * @param {string} text
 * @return {!Chess.Position}
 * @throws {Error}
 */
Chess.Parser.parseMoves = function(text) {
	var chessPosition = new Chess.Position;

	Chess.Parser.clean(text).split(" ").every(/** @param {string} moveText */function(moveText) {
		var moveNumber = moveText.match(/\d+\./);
		if (moveNumber) {
			return true;
		}

		var gameOver = moveText.match(/1-0|0-1|\u00BD-\u00BD/);
		if (gameOver) {
			return false;
		}

		var moves = Chess.Parser.parseOneMove(chessPosition, moveText);
		if (!moves || moves.length !== 1) {
			throw new Error("Parse error in '" + moveText + "'");
		}
		chessPosition.makeMove(moves[0]);

		return true;
	});

	return chessPosition;
};
