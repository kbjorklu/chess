"use strict";

/**
 * Chess.Zobrist is a 64 bit Zobrist hash value.
 * Updates to the value can be easily reverted by making the same update again.
 * The idea is to maintain a hash of the chess position, so that detecting repeating states and caching information about seen states is faster.
 * The 64 bit value is implemented as two 32 bit integers, similarly to Bitboard.js.
 * @constructor
 * @param {number} low lower 32 bits of the 64 bit value
 * @param {number} high upper 32 bits of the 64 bit value
 * @see http://goo.gl/WNBQp (Zobrist hashing)
 */
Chess.Zobrist = function(low, high) {
	/** @type {number} */
	this.low = low >>> 0;

	/** @type {number} */
	this.high = high >>> 0;
};

/** @enum {number} */
Chess.Zobrist.Count = {
	TURN: 1 * 2,
	PIECE_COLOR_SQUARE: 6 * 2 * 64 * 2,
	CASTLING_RIGHTS: 16 * 2,
	EN_PASSANT_FILE: 8 * 2
};

/** @enum {number} */
Chess.Zobrist.Position = {
	TURN: 0,
	PIECE_COLOR_SQUARE: Chess.Zobrist.Count.TURN,
	CASTLING_RIGHTS: Chess.Zobrist.Count.TURN + Chess.Zobrist.Count.PIECE_COLOR_SQUARE,
	EN_PASSANT_FILE: Chess.Zobrist.Count.TURN + Chess.Zobrist.Count.PIECE_COLOR_SQUARE + Chess.Zobrist.Count.CASTLING_RIGHTS
};

/**
 * @param {number} count
 * @return {!Array.<number>}
 */
Chess.Zobrist.createRandomValues = function(count) {
	var a = [];
	for (var i = 0; i < count; ++i) {
		a.push((1 + Math.random() * 0xFFFFFFFF) >>> 0);
	}
	return a;
};

/**
 * @const
 * @type {!Array.<number>}
 */
Chess.Zobrist.RANDOM_VALUES = Chess.Zobrist.createRandomValues(Chess.Zobrist.Position.EN_PASSANT_FILE + Chess.Zobrist.Count.EN_PASSANT_FILE);

/**
 * @return {!Chess.Zobrist}
 */
Chess.Zobrist.prototype.dup = function() {
	return new Chess.Zobrist(this.low, this.high);
};

/**
 * @return {number} 32 bit key
 */
Chess.Zobrist.prototype.getHashKey = function() {
	return (this.low ^ this.high) >>> 0;
};

/**
 * @param {!Chess.Zobrist} zobrist
 * @return {boolean}
 */
Chess.Zobrist.prototype.isEqual = function(zobrist) {
	return (this.low === zobrist.low && this.high === zobrist.high);
};

/**
 * Xors Chess.Zobrist.RANDOM_VALUES[position .. position + RANDOM_VALUES_PER_ITEM] into this Zobrist hash key.
 * @param {number} position
 * @return {!Chess.Zobrist} this
 */
Chess.Zobrist.prototype.update = function(position) {
	this.low = (this.low ^ Chess.Zobrist.RANDOM_VALUES[position]) >>> 0;
	this.high = (this.high ^ Chess.Zobrist.RANDOM_VALUES[position + 1]) >>> 0;
	return this;
};

/**
 * @return {!Chess.Zobrist} this
 */
Chess.Zobrist.prototype.updateTurn = function() {
	return this.update(Chess.Zobrist.Position.TURN);
};

/**
 * @param {!Chess.Piece} piece
 * @param {!Chess.PieceColor} color
 * @param {number} index 0-63
 * @return {!Chess.Zobrist} this
 */
Chess.Zobrist.prototype.updatePieceColorSquare = function(piece, color, index) {
	return this.update(Chess.Zobrist.Position.PIECE_COLOR_SQUARE + piece + color * 6 + index * 6 * 2);
};

/**
 * @param {!Chess.Piece} piece
 * @param {!Chess.PieceColor} color
 * @param {!Chess.Bitboard} bitboard
 * @return {!Chess.Zobrist} this
 */
Chess.Zobrist.prototype.updatePieceColorBitboard = function(piece, color, bitboard) {
	var bb = bitboard.dup();
	while (!bb.isEmpty()) {
		this.updatePieceColorSquare(piece, color, bb.extractLowestBitPosition());
	}
	return this;
};

/**
 * @param {number} castlingRights 0-15
 * @return {!Chess.Zobrist} this
 */
Chess.Zobrist.prototype.updateCastlingRights = function(castlingRights) {
	return this.update(Chess.Zobrist.Position.CASTLING_RIGHTS + castlingRights);
};

/**
 * @param {number} enPassantFile 0-7
 * @return {!Chess.Zobrist} this
 */
Chess.Zobrist.prototype.updateEnPassantFile = function(enPassantFile) {
	return this.update(Chess.Zobrist.Position.EN_PASSANT_FILE + enPassantFile);
};

/**
 * @param {number} enPassantSquare 0-63
 * @return {!Chess.Zobrist} this
 */
Chess.Zobrist.prototype.updateEnPassantSquare = function(enPassantSquare) {
	if (enPassantSquare >= 0) {
		return this.updateEnPassantFile(Chess.getFile(enPassantSquare));
	}
	return this;
};
