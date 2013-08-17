"use strict";

/**
 * Chess namespace, constants and utility functions.
 * @constructor
 */
function Chess() {
}

/**
 * Number of ranks (rows) in a chess board.
 * Notice that we store a rank as 0-7 and display it as 1-8.
 * @const
 * @type {number}
 */
Chess.RANKS = 8;

/**
 * @const
 * @type {number}
 */
Chess.LAST_RANK = Chess.RANKS - 1;

/**
 * Number of files (columns) in a chess board
 * Notice that we store a file as 0-7 and display it as a-h.
 * @const
 * @type {number}
 *
 */
Chess.FILES = 8;

/**
 * @const
 * @type {number}
 */
Chess.LAST_FILE = Chess.FILES - 1;

/**
 * @const
 * @type {string}
 */
Chess.FILE_CHARACTERS = "abcdefgh";

/**
 * @const
 * @type {string}
 */
Chess.RANK_CHARACTERS = "12345678";

/** @enum {number} */
Chess.Piece = {
	PAWN: 0,
	KNIGHT: 1,
	BISHOP: 2,
	ROOK: 3,
	QUEEN: 4,
	KING: 5
};

/** @enum {number} */
Chess.PieceColor = {
	WHITE: 0,
	BLACK: 1
};

/**
 * @const
 * @type {!Array.<string>}
 */
Chess.PIECE_NAMES = [ "pawn", "knight", "bishop", "rook", "queen", "king" ];

/**
 * @const
 * @type {string}
 */
Chess.PIECE_ALGEBRAIC_NAMES = " NBRQK";

/**
 * @const
 * @type {string}
 * @see http://goo.gl/OHlAI
 */
Chess.PIECE_CHARACTERS = "\u2659\u265F\u2658\u265E\u2657\u265D\u2656\u265C\u2655\u265B\u2654\u265A";

/**
 * @param {number} index 0-63
 * @return {number} rank 0-7
 */
Chess.getRank = function(index) {
	return index >>> 3;
};

/**
 * @param {number} index 0-63
 * @return {number} file 0-7
 */
Chess.getFile = function(index) {
	return index & 7;
};

/**
 * @param {number} rank
 * @param {number} file
 * @return {boolean} true if rank >= 0 && rank < 8 && file >= 0 && file < 8
 */
Chess.isInsideBoard = function(rank, file) {
	return !((rank | file) & ~7);
};

/**
 * Least significant file index
 * @see http://goo.gl/9frpl
 * @param {number} rank 0-7
 * @param {number} file 0-7
 * @return {number} 0-63
 */
Chess.getIndex = function(rank, file) {
	return file + rank * Chess.FILES;
};

/**
 * @param {number} rank 0-7
 * @param {number} file 0-7
 * @return {boolean} true if the Chess square at rank, file is light
 */
Chess.isLight = function(rank, file) {
	return !!((rank + file) % 2);
};

/**
 * @param {number} rank 0-7
 * @param {number} file 0-7
 * @return {string} a1-h8
 */
Chess.getAlgebraic = function(rank, file) {
	return Chess.FILE_CHARACTERS[file] + Chess.RANK_CHARACTERS[rank];
};

/**
 * @param {string} algebraic a1-h8
 * @return {number} index 0-63
 */
Chess.getIndexFromAlgebraic = function(algebraic) {
	var file = Chess.FILE_CHARACTERS.indexOf(algebraic[0]);
	var rank = Chess.RANK_CHARACTERS.indexOf(algebraic[1]);
	return Chess.getIndex(rank, file);
};

/**
 * @param {number} index 0-63
 * @return {string} a1-h8
 */
Chess.getAlgebraicFromIndex = function(index) {
	return Chess.getAlgebraic(Chess.getRank(index), Chess.getFile(index));
};

/**
 * @param {!Chess.Piece} piece
 * @param {!Chess.PieceColor} color
 * @return {string} A Unicode character corresponding to the piece and color
 */
Chess.getPieceCharacter = function(piece, color) {
	return Chess.PIECE_CHARACTERS.charAt(piece * 2 + color);
};

/**
 * @param {!Chess.PieceColor} color
 * @return {!Chess.PieceColor}
 */
Chess.getOtherPieceColor = function(color) {
	return /** @type {!Chess.PieceColor} */(color ^ 1);
};
