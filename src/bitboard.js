"use strict";

/**
 * Chess.Bitboard is an unsigned 64 bit integer, each bit representing a boolean value on the corresponding chessboard square.
 * The boolean values represent existence of a piece on the square.
 * The 64 bit unsigned integer is implemented as combination of two 32 bit unsigned integers.
 * @constructor
 * @param {number} low Lower 32 bits of the 64 bit value
 * @param {number} high Upper 32 bits of the 64 bit value
 * TODO: test using three numbers here instead of two: 31 bit integers are faster than 32 bit ones in chrome (https://v8-io12.appspot.com/#35)
 */
Chess.Bitboard = function(low, high) {
	/**
	 * Lower 32 bits of the 64 bit value
	 * @type {number}
	 */
	this.low = low >>> 0;

	/**
	 * Upper 32 bits of the 64 bit value
	 * @type {number}
	 */
	this.high = high >>> 0;
};

/**
 * @see http://goo.gl/pyzBq (Bit Twiddling Hacks)
 * @see http://goo.gl/dnqDn (Bit-peeking bits of JavaScript)
 * @param {number} v 32 bit integer
 * @return {number} 0-32 number of bits set in v
 */
Chess.Bitboard.popcnt32 = function(v) {
	v >>>= 0;
	v -= (v >>> 1) & 0x55555555;
	v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
	return ((v + (v >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24;
};

/**
 * @param {number} v 32 bit integer
 * @return {number} v with its lowest bit cleared
 */
Chess.Bitboard.popLowestBit32 = function (v) {
	v >>>= 0;
	return (v & (v - 1)) >>> 0;
};

/**
 * @param {number} v 32 bit integer, non-zero. Undefined behavior if v is zero.
 * @return {number} 0-31 Position of first set bit
 */
Chess.Bitboard.getLowestBitPosition32 = function(v) {
	v >>>= 0;
	return Chess.Bitboard.popcnt32((v & -v) - 1);
};

/** @return {number} 0-64 number of bits set in this Chess.Bitboard */
Chess.Bitboard.prototype.popcnt = function() {
	return Chess.Bitboard.popcnt32(this.low) + Chess.Bitboard.popcnt32(this.high);
};

/**
 * Clears the lowest set bit.
 * @return {!Chess.Bitboard} this with the lowest bit cleared
 */
Chess.Bitboard.prototype.popLowestBit = function() {
	if (this.low) {
		this.low = Chess.Bitboard.popLowestBit32(this.low);
	} else {
		this.high = Chess.Bitboard.popLowestBit32(this.high);
	}

	return this;
};

/** @return {number} 0-63 position of the first set bit. Undefined behavior if this Chess.Bitboard is empty. */
Chess.Bitboard.prototype.getLowestBitPosition = function() {
	if (this.low) {
		return Chess.Bitboard.getLowestBitPosition32(this.low);
	}

	return 32 + Chess.Bitboard.getLowestBitPosition32(this.high);
};

/**
 * Clears the lowest set bit and returns its position.
 * @return {number} 0-63 position of the first set bit. Undefined behavior if this Chess.Bitboard is empty.
 */
Chess.Bitboard.prototype.extractLowestBitPosition = function() {
	var index = this.getLowestBitPosition();
	this.popLowestBit();
	return index;
};

/** @return {boolean} true if all the bits in this Chess.Bitboard are zero */
Chess.Bitboard.prototype.isEmpty = function() {
	return !this.low && !this.high;
};

/**
 * @param {number} index 0-63
 * @return {boolean} true if the bit at index is 0
 */
Chess.Bitboard.prototype.isClear = function(index) {
	index >>>= 0;

	if (index < 32) {
		return !(this.low & (1 << index));
	}

	return !(this.high & (1 << (index - 32)));
};

/**
 * @param {number} index 0-63
 * @return {boolean} true if the bit at index is 1
 */
Chess.Bitboard.prototype.isSet = function(index) {
	return !this.isClear(index);
};

/**
 * @param {number} index 0-63
 * @return {!Chess.Bitboard} this or 1 << index
 */
Chess.Bitboard.prototype.setBit = function(index) {
	index >>>= 0;

	if (index < 32) {
		this.low = (this.low | (1 << index)) >>> 0;
	} else {
		this.high = (this.high | (1 << (index - 32))) >>> 0;
	}

	return this;
};

/**
 * @param {number} index 0-63
 * @return {!Chess.Bitboard} this and not 1 << index
 */
Chess.Bitboard.prototype.clearBit = function(index) {
	index >>>= 0;

	if (index < 32) {
		this.low = (this.low & ~(1 << index)) >>> 0;
	} else {
		this.high = (this.high & ~(1 << (index - 32))) >>> 0;
	}

	return this;
};

/**
 * @param {!Chess.Bitboard} other
 * @return {!Chess.Bitboard} this and other
 */
Chess.Bitboard.prototype.and = function(other) {
	this.low = (this.low & other.low) >>> 0;
	this.high = (this.high & other.high) >>> 0;

	return this;
};

/**
 * @param {!Chess.Bitboard} other
 * @return {!Chess.Bitboard} this and not other
 */
Chess.Bitboard.prototype.and_not = function(other) {
	this.low = (this.low & ~other.low) >>> 0;
	this.high = (this.high & ~other.high) >>> 0;

	return this;
};

/**
 * @param {!Chess.Bitboard} other
 * @return {!Chess.Bitboard} this or other
 */
Chess.Bitboard.prototype.or = function(other) {
	this.low = (this.low | other.low) >>> 0;
	this.high = (this.high | other.high) >>> 0;

	return this;
};

/**
 * @param {!Chess.Bitboard} other
 * @return {!Chess.Bitboard} this xor other
 */
Chess.Bitboard.prototype.xor = function(other) {
	this.low = (this.low ^ other.low) >>> 0;
	this.high = (this.high ^ other.high) >>> 0;

	return this;
};

/** @return {!Chess.Bitboard} not this */
Chess.Bitboard.prototype.not = function() {
	this.low = (~this.low) >>> 0;
	this.high = (~this.high) >>> 0;

	return this;
};

/**
 * Shifts this Chess.Bitboard left v bits. Undefined behavior if v is not in 0-63.
 * @param {number} v 0-63 number of bits to shift
 * @return {!Chess.Bitboard} this << v
 */
Chess.Bitboard.prototype.shl = function(v) {
	v >>>= 0;

	if (v > 31) {
		this.high = (this.low << (v - 32)) >>> 0;
		this.low = 0 >>> 0;
	} else if (v > 0) {
		this.high = ((this.high << v) | (this.low >>> (32 - v))) >>> 0;
		this.low = (this.low << v) >>> 0;
	}

	return this;
};

/**
 * Shifts this Chess.Bitboard right v bits. Undefined behavior if v is not in 0-63.
 * @param {number} v 0-63 number of bits to shift
 * @return {!Chess.Bitboard} this >>> v
 */
Chess.Bitboard.prototype.shr = function(v) {
	v >>>= 0;

	if (v > 31) {
		this.low = this.high >>> (v - 32);
		this.high = 0 >>> 0;
	} else if (v > 0) {
		this.low = ((this.low >>> v) | (this.high << (32 - v))) >>> 0;
		this.high >>>= v;
	}

	return this;
};

/**
 * Shifts this Chess.Bitboard left v bits, where v can be negative for right shift.
 * @param {number} v number of bits to shift
 * @return {!Chess.Bitboard} this << v
 */
Chess.Bitboard.prototype.shiftLeft = function(v) {
	if (v > 63 || v < -63) {
		this.low = this.high = 0 >>> 0;
	} else if (v > 0) {
		this.shl(v);
	} else if (v < 0) {
		this.shr(-v);
	}

	return this;
};

/**
 * @param {!Chess.Bitboard} other
 * @return {boolean} 'this' equals 'other'
 */
Chess.Bitboard.prototype.isEqual = function(other) {
	return this.low === other.low && this.high === other.high;
};

/** @return {!Chess.Bitboard} copy of this */
Chess.Bitboard.prototype.dup = function() {
	return Chess.Bitboard.make(this.low, this.high);
};

/**
 * @param {number} low Lower 32 bits of the 64 bit value
 * @param {number} high Upper 32 bits of the 64 bit value
 * @return {!Chess.Bitboard}
 */
Chess.Bitboard.make = function(low, high) {
	return new Chess.Bitboard(low, high);
};

/** @return {!Chess.Bitboard} bitboard of all zeros */
Chess.Bitboard.makeZero = function() {
	return Chess.Bitboard.make(0, 0);
};

/** @return {!Chess.Bitboard} bitboard of all ones */
Chess.Bitboard.makeOne = function() {
	return Chess.Bitboard.make(0xFFFFFFFF, 0xFFFFFFFF);
};

/** @return {!Chess.Bitboard} bitboard of ones in light (white) squares, zeros in dark (black) squares */
Chess.Bitboard.makeLightSquares = function() {
	return Chess.Bitboard.make(0x55AA55AA, 0x55AA55AA);
};

/** @return {!Chess.Bitboard} bitboard of ones in dark squares, zeros in light squares */
Chess.Bitboard.makeDarkSquares = function() {
	return Chess.Bitboard.make(0xAA55AA55, 0xAA55AA55);
};

/**
 * @param {number} file
 * @return {!Chess.Bitboard} bitboard of ones in file, zeros elsewhere
 */
Chess.Bitboard.makeFile = function(file) {
	return Chess.Bitboard.make(0x01010101, 0x01010101).shl(file);
};

/** @return {!Array.<!Chess.Bitboard>} bitboard for each file */
Chess.Bitboard.makeFiles = function() {
	var b = [];
	for (var i = 0; i < 8; ++i) {
		b.push(Chess.Bitboard.makeFile(i));
	}
	return b;
};

/**
 * @param {number} rank
 * @return {!Chess.Bitboard} bitboard of ones in rank, zeros elsewhere
 */
Chess.Bitboard.makeRank = function(rank) {
	return Chess.Bitboard.make(0xFF, 0).shl(rank * 8);
};

/** @return {!Array.<!Chess.Bitboard>} bitboard for each rank */
Chess.Bitboard.makeRanks = function() {
	var b = [];
	for (var i = 0; i < 8; ++i) {
		b.push(Chess.Bitboard.makeRank(i));
	}
	return b;
};

/**
 * @param {number} index 0-63
 * @return {!Chess.Bitboard} bitboard of 1 at index, zero elsewhere
 */
Chess.Bitboard.makeIndex = function(index) {
	return Chess.Bitboard.makeZero().setBit(index);
};

/** @return {!Array.<!Chess.Bitboard>} bitboard for each index */
Chess.Bitboard.makeIndices = function() {
	var b = [];
	for (var i = 0; i < 64; ++i) {
		b.push(Chess.Bitboard.makeIndex(i));
	}
	return b;
};

/**
 * 0 diagonal is the main diagonal, positive numbers are superdiagonals, negative numbers subdiagonals.
 * @param {number} diagonal (-7)-7
 * @return {!Chess.Bitboard} bitboard with ones on diagonal, zeros elsewhere
 */
Chess.Bitboard.makeDiagonal = function(diagonal) {
	return Chess.Bitboard.make(0x10204080, 0x01020408).and(Chess.Bitboard.makeOne().shiftLeft(diagonal * 8)).shiftLeft(diagonal);
};

/** @return {!Array.<!Chess.Bitboard>} bitboard for each diagonal */
Chess.Bitboard.makeDiagonals = function() {
	var b = [];
	for (var i = -7; i < 8; ++i) {
		b.push(Chess.Bitboard.makeDiagonal(i));
	}
	return b;
};

/**
 * 0 diagonal is the main antidiagonal, positive numbers are subantidiagonals (below the main antidiagonal on the chessboard), negative numbers superantidiagonals.
 * @param {number} antidiagonal (-7)-7
 * @return {!Chess.Bitboard} bitboard with ones on antidiagonal, zeros elsewhere
 */
Chess.Bitboard.makeAntidiagonal = function(antidiagonal) {
	return Chess.Bitboard.make(0x08040201, 0x80402010).and(Chess.Bitboard.makeOne().shiftLeft(-antidiagonal * 8)).shiftLeft(antidiagonal);
};

/** @return {!Array.<!Chess.Bitboard>} bitboard for each antidiagonal */
Chess.Bitboard.makeAntidiagonals = function() {
	var b = [];
	for (var i = -7; i < 8; ++i) {
		b.push(Chess.Bitboard.makeAntidiagonal(i));
	}
	return b;
};

/**
 * @see http://goo.gl/MRA5s (Knight Pattern)
 * @param {number} index 0-63 chessboard square of the knight
 * @return {!Chess.Bitboard} knight target squares
 */
Chess.Bitboard.makeKnightMovement = function(index) {
	var b = Chess.Bitboard.makeZero().setBit(index);
	var l1 = b.dup().shr(1).and_not(Chess.Bitboard.FILES[7]);
	var l2 = b.dup().shr(2).and_not(Chess.Bitboard.FILES[7]).and_not(Chess.Bitboard.FILES[6]);
	var r1 = b.dup().shl(1).and_not(Chess.Bitboard.FILES[0]);
	var r2 = b.dup().shl(2).and_not(Chess.Bitboard.FILES[0]).and_not(Chess.Bitboard.FILES[1]);
	var v1 = l2.or(r2);
	var v2 = l1.or(r1);
	return v1.dup().shl(8).or(v1.shr(8)).or(v2.dup().shl(16)).or(v2.shr(16));
};

/** @return {!Array.<!Chess.Bitboard>} bitboard for knight movement from each square */
Chess.Bitboard.makeKnightMovements = function() {
	var b = [];
	for (var i = 0; i < 64; ++i) {
		b.push(Chess.Bitboard.makeKnightMovement(i));
	}
	return b;
};

/**
 * @param {number} index 0-63 chessboard square of the king
 * @return {!Chess.Bitboard} king target squares
 */
Chess.Bitboard.makeKingMovement = function(index) {
	var b = Chess.Bitboard.makeZero().setBit(index);
	var c = b.dup().shr(1).and_not(Chess.Bitboard.FILES[7]).or(b.dup().shl(1).and_not(Chess.Bitboard.FILES[0]));
	var u = b.dup().or(c).shr(8);
	var d = b.dup().or(c).shl(8);
	return c.or(u).or(d);
};

/** @return {!Array.<!Chess.Bitboard>} bitboard for king movement from each square */
Chess.Bitboard.makeKingMovements = function() {
	var b = [];
	for (var i = 0; i < 64; ++i) {
		b.push(Chess.Bitboard.makeKingMovement(i));
	}
	return b;
};

/**
 * Chess.Bitboard of all zeros
 * @const
 * @type {!Chess.Bitboard}
 */
Chess.Bitboard.ZERO = Chess.Bitboard.makeZero();

/**
 * Chess.Bitboard of all ones
 * @const
 * @type {!Chess.Bitboard}
 */
Chess.Bitboard.ONE = Chess.Bitboard.makeOne();

/**
 * Chess.Bitboard of ones in light squares, zeros in dark squares
 * @const
 * @type {!Chess.Bitboard}
 */
Chess.Bitboard.LIGHT_SQUARES = Chess.Bitboard.makeLightSquares();

/**
 * Chess.Bitboard of ones in dark squares, zeros in light squares
 * @const
 * @type {!Chess.Bitboard}
 */
Chess.Bitboard.DARK_SQUARES = Chess.Bitboard.makeDarkSquares();

/**
 * Chess.Bitboards ones in corresponding file, zeros elsewhere
 * @const
 * @type {!Array.<!Chess.Bitboard>}
 */
Chess.Bitboard.FILES = Chess.Bitboard.makeFiles();

/**
 * Chess.Bitboards ones in corresponding rank, zeros elsewhere
 * @const
 * @type {!Array.<!Chess.Bitboard>}
 */
Chess.Bitboard.RANKS = Chess.Bitboard.makeRanks();

/**
 * Chess.Bitboards ones in corresponding diagonal, zeros elsewhere. Chess.Bitboard.DIAGONALS[7] = main diagonal, 0-6 = subdiagonals, 8-15 = superdiagonals
 * @const
 * @type {!Array.<!Chess.Bitboard>}
 */
Chess.Bitboard.DIAGONALS = Chess.Bitboard.makeDiagonals();

/**
 * Chess.Bitboards ones in corresponding antidiagonal, zeros elsewhere. Chess.Bitboard.ANTIDIAGONALS[7] = main antidiagonal, 0-6 = superantidiagonals, 8-15 = subantidiagonals
 * @const
 * @type {!Array.<!Chess.Bitboard>}
 */
Chess.Bitboard.ANTIDIAGONALS = Chess.Bitboard.makeAntidiagonals();

/**
 * 64 bitboards, one per chessboard square, for positions where knights can move from the corresponding square.
 * @const
 * @type {!Array.<!Chess.Bitboard>}
 */
Chess.Bitboard.KNIGHT_MOVEMENTS = Chess.Bitboard.makeKnightMovements();

/**
 * 64 bitboards, one per chessboard square, for positions where kings can move from the corresponding square.
 * @const
 * @type {!Array.<!Chess.Bitboard>}
 */
Chess.Bitboard.KING_MOVEMENTS = Chess.Bitboard.makeKingMovements();
