"use strict";

/**
 * Chess.Position contains current piece positions, player turn, etc; the game state.
 * It can generate a list of possible moves in the current game state, and apply moves to change state.
 * @constructor
 */
Chess.Position = function() {
	/**
	 * @type {!Chess.Zobrist}
	 */
	this.hashKey = new Chess.Zobrist(0, 0);

	/**
	 * Bitboards for each piece type, and for any white and black pieces.
	 * TODO: replace with a Uin32Array or a straight array of numbers? (then implement 64 bit bitboard operations on top of that)
	 * TODO: store kings as two indices? (there can only be one king per color)
	 * @type {!Array.<!Chess.Bitboard>}
	 */
	this.bitboards = [
		Chess.Bitboard.RANKS[1].dup().or(Chess.Bitboard.RANKS[6]), // pawns
		Chess.Bitboard.makeIndex(1).or(Chess.Bitboard.makeIndex(6)).or(Chess.Bitboard.makeIndex(57)).or(Chess.Bitboard.makeIndex(62)), // knights
		Chess.Bitboard.makeIndex(2).or(Chess.Bitboard.makeIndex(5)).or(Chess.Bitboard.makeIndex(58)).or(Chess.Bitboard.makeIndex(61)), // bishops
		Chess.Bitboard.makeIndex(0).or(Chess.Bitboard.makeIndex(7)).or(Chess.Bitboard.makeIndex(56)).or(Chess.Bitboard.makeIndex(63)), // rooks
		Chess.Bitboard.makeIndex(3).or(Chess.Bitboard.makeIndex(59)), // queens
		Chess.Bitboard.makeIndex(4).or(Chess.Bitboard.makeIndex(60)), // kings
		Chess.Bitboard.RANKS[0].dup().or(Chess.Bitboard.RANKS[1]), // white pieces
		Chess.Bitboard.RANKS[6].dup().or(Chess.Bitboard.RANKS[7]) // black pieces
	];

	/**
	 * 64 entry lookup table, holds a piece or null for each board square
	 * @type {!Array.<?Chess.Piece>}
	 */
	this.pieces = [];

	/**
	 * @type {!Chess.PieceColor}
	 */
	this.turn = Chess.PieceColor.WHITE;

	/**
	 * 1st bit: white can castle kingside
	 * 2nd bit: black can castle kingside
	 * 3rd bit: white can castle queenside
	 * 4th bit: black can castle queenside
	 * @type {number} 0-15
	 */
	this.castlingRights = 15;

	/**
	 * @type {number} 0-63
	 */
	this.enPassantSquare = -1;

	/**
	 * @type {number}
	 * @see http://goo.gl/xGY6o (Fifty-move rule)
	 */
	this.halfmoveClock = 0;

	/**
	 * @type {!Array.<!Chess.Move>}
	 */
	this.madeMoves = [];

	/**
	 * @type {!Array.<number>}
	 */
	this.irreversibleHistory = [];

	this.fillPiecesFromBitboards();
	this.updateHashKey();

	/**
	 * @type {!Array.<!Chess.Zobrist>}
	 */
	 this.hashHistory = [];

	// TODO: checking pieces?
	// TODO: separate occupied squares bitboard?
	// TODO: store kings as indices instead of bitboards?
};

/**
 * Chess.Bitboard for squares with white pieces in them
 * @const
 * @type {number}
 */
Chess.Position.ANY_WHITE = Chess.Piece.KING + 1;

/**
 * Chess.Bitboard for squares with black pieces in them
 * @const
 * @type {number}
 */
Chess.Position.ANY_BLACK = Chess.Position.ANY_WHITE + 1;

/**
 * Initial rook indices
 * @const
 * @type {!Array.<number>}
 */
Chess.Position.ROOK_INDICES = [7, 63, 0, 56];

/**
 * Bitmasks for avoiding sliding piece wrapping.
 * @const
 * @type {!Array.<!Chess.Bitboard>}
 */
Chess.Position.SLIDING_MASKS = [Chess.Bitboard.makeFile(Chess.LAST_FILE).not(), Chess.Bitboard.ONE, Chess.Bitboard.makeFile(0).not()];

/** @enum {number} */
Chess.Position.Status = {
	NORMAL: 0,
	CHECKMATE: 1,
	STALEMATE_DRAW: 2,
	FIFTY_MOVE_RULE_DRAW: 3,
	THREEFOLD_REPETITION_RULE_DRAW: 4,
	INSUFFICIENT_MATERIAL_DRAW: 5
};

/**
 * Perft: performance test
 * @param {number} depth how many half-moves to make
 * @param {Chess.Position=} chessPosition start position
 * @return {number} how many leaf nodes does the game tree have at the depth
 */
Chess.Position.perft = function(depth, chessPosition) {
	if (!depth) {
		return 1;
	}

	if (!chessPosition) {
		chessPosition = new Chess.Position;
	}

	/** @type {number} */ 
	var nodes = 0;

	chessPosition.getMoves(true).forEach(/** @param {!Chess.Move} move */ function(move) {
		if (chessPosition.makeMove(move)) {
			nodes += Chess.Position.perft(depth - 1, chessPosition);
			chessPosition.unmakeMove();
		}
	});

	return nodes;
};

/**
 * @param {boolean=} pseudoLegal true: also return moves that may not be possible (leave king in check)
 * @param {boolean=} onlyCaptures
 * @return {!Array.<!Chess.Move>} Possible moves in this chess position
 */
Chess.Position.prototype.getMoves = function(pseudoLegal, onlyCaptures) {
	var moves = this.generateMoves(!!onlyCaptures);
	return pseudoLegal ? moves : moves.filter(Chess.Position.prototype.isMoveLegal, this);
};

/**
 * @param {!Chess.PieceColor} color Chess.PieceColor.WHITE or Chess.PieceColor.BLACK
 * @return {!Chess.Bitboard} Squares occupied by any piece of the specified color
 */
Chess.Position.prototype.getColorBitboard = function(color) {
	return this.bitboards[Chess.Position.ANY_WHITE + color];
};

/**
 * @param {!Chess.Piece} piece
 * @return {!Chess.Bitboard} Bits set where specified piece exists
 */
Chess.Position.prototype.getPieceBitboard = function(piece) {
	return this.bitboards[piece];
};

/**
 * @param {!Chess.Piece} piece
 * @param {!Chess.PieceColor} color
 * @return {!Chess.Bitboard} Bits set where specified piece with the specified color exists
 */
Chess.Position.prototype.getPieceColorBitboard = function(piece, color) {
	return this.bitboards[piece].dup().and(this.getColorBitboard(color));
};

/**
 * @param {!Chess.PieceColor} color
 * @return {number} 0-63
 */
Chess.Position.prototype.getKingPosition = function(color) {
	return this.getPieceColorBitboard(Chess.Piece.KING, color).getLowestBitPosition();
};

/** @return {!Chess.Bitboard} Squares occupied by any piece */
Chess.Position.prototype.getOccupiedBitboard = function() {
	return this.bitboards[Chess.Position.ANY_WHITE].dup().or(this.bitboards[Chess.Position.ANY_BLACK]);
};

/** @return {!Chess.Bitboard} Empty squares */
Chess.Position.prototype.getEmptyBitboard = function() {
	return this.getOccupiedBitboard().not();
};

/** @return {!Chess.PieceColor} */
Chess.Position.prototype.getTurnColor = function() {
	return this.turn;
};

/**
 * @param {number} index 0-63
 * @return {?Chess.Piece}
 */
Chess.Position.prototype.findPieceAtOrNull = function(index) {
	for (var piece = Chess.Piece.PAWN; piece <= Chess.Piece.KING; ++piece) {
		if (this.getPieceBitboard(piece).isSet(index)) {
			return piece;
		}
	}

	return null;
};

/**
 * @param {number} index 0-63
 * @return {?Chess.Piece}
 */
Chess.Position.prototype.getPieceAtOrNull = function(index) {
	return this.pieces[index];
};

/** Fills the piece lookup table from bitboards */
Chess.Position.prototype.fillPiecesFromBitboards = function() {
	this.pieces.length = 0;
	for (var index = 0; index < 64; ++index) {
		this.pieces.push(this.findPieceAtOrNull(index));
	}
};

/** Updates the hash key from turn, bitboards, castling rights and en passant square. Halfmove clock is not part of the hash */
Chess.Position.prototype.updateHashKey = function() {
	this.hashKey = new Chess.Zobrist(0, 0);

	if (this.getTurnColor()) {
		this.hashKey.updateTurn();
	}

	for (var color = Chess.PieceColor.WHITE; color <= Chess.PieceColor.BLACK; ++color) {
		for (var piece = Chess.Piece.PAWN; piece <= Chess.Piece.KING; ++piece) {
			this.hashKey.updatePieceColorBitboard(piece, color, this.getPieceColorBitboard(piece, color));
		}
	}

	this.hashKey.updateCastlingRights(this.castlingRights);
	this.hashKey.updateEnPassantSquare(this.enPassantSquare);
};

/**
 * @return {boolean}
 */
Chess.Position.prototype.isKingInCheck = function() {
	return this.isAttacked(Chess.getOtherPieceColor(this.getTurnColor()), this.getKingPosition(this.getTurnColor()));
};

/**
 * @param {!Chess.PieceColor} color white = attacks by white pieces
 * @param {!Chess.Bitboard} pawns
 * @return {!Chess.Bitboard}
 * N.B. no en passant attacks
 */
Chess.Position.makePawnAttackMask = function(color, pawns) {
	var white = (color === Chess.PieceColor.WHITE);
	var attacks1 = pawns.dup().and_not(Chess.Bitboard.FILES[0]).shiftLeft(white ? 7 : -9);
	var attacks2 = pawns.dup().and_not(Chess.Bitboard.FILES[Chess.LAST_FILE]).shiftLeft(white ? 9 : -7);
	return attacks1.or(attacks2);
};

/**
 * @param {!Chess.Bitboard} fromBB
 * @param {!Chess.Bitboard} occupied
 * @param {number} rankDirection
 * @param {number} fileDirection
 * @return {!Chess.Bitboard}
 * TODO: Kogge-Stone: http://chessprogramming.wikispaces.com/Kogge-Stone+Algorithm
 */
Chess.Position.makeSlidingAttackMask = function(fromBB, occupied, rankDirection, fileDirection) {
	var bb = Chess.Bitboard.makeZero();
	var direction = rankDirection * Chess.FILES + fileDirection;
	var mask = Chess.Position.SLIDING_MASKS[1 + fileDirection];

	for (fromBB.shiftLeft(direction); !fromBB.and(mask).isEmpty(); fromBB.and_not(occupied).shiftLeft(direction)) {
		bb.or(fromBB);
	}

	return bb;
};

/**
 * @param {!Chess.Bitboard} fromBB
 * @param {!Chess.Bitboard} occupied
 * @return {!Chess.Bitboard}
 */
Chess.Position.makeBishopAttackMask = function(fromBB, occupied) {
	return Chess.Position.makeSlidingAttackMask(fromBB.dup(), occupied, 1, 1).or(
		Chess.Position.makeSlidingAttackMask(fromBB.dup(), occupied, 1, -1)).or(
		Chess.Position.makeSlidingAttackMask(fromBB.dup(), occupied, -1, 1)).or(
		Chess.Position.makeSlidingAttackMask(fromBB.dup(), occupied, -1, -1));
};

/**
 * @param {!Chess.Bitboard} fromBB
 * @param {!Chess.Bitboard} occupied
 * @return {!Chess.Bitboard}
 */
Chess.Position.makeRookAttackMask = function(fromBB, occupied) {
	return Chess.Position.makeSlidingAttackMask(fromBB.dup(), occupied, 0, 1).or(
		Chess.Position.makeSlidingAttackMask(fromBB.dup(), occupied, 0, -1)).or(
		Chess.Position.makeSlidingAttackMask(fromBB.dup(), occupied, 1, 0)).or(
		Chess.Position.makeSlidingAttackMask(fromBB.dup(), occupied, -1, 0));
};

/**
 * @param {!Chess.PieceColor} color attacked by color
 * @param {number} index
 * @return {boolean}
 * @see http://goo.gl/UYzOw (Square Attacked By)
 */
Chess.Position.prototype.isAttacked = function(color, index) {
	var pawns = this.getPieceColorBitboard(Chess.Piece.PAWN, color);
	if (Chess.Position.makePawnAttackMask(color, pawns).isSet(index)) {
		return true;
	}

	var knights = this.getPieceColorBitboard(Chess.Piece.KNIGHT, color);
	if (!Chess.Bitboard.KNIGHT_MOVEMENTS[index].dup().and(knights).isEmpty()) {
		return true;
	}

	var king = this.getPieceColorBitboard(Chess.Piece.KING, color);
	if (!Chess.Bitboard.KING_MOVEMENTS[index].dup().and(king).isEmpty()) {
		return true;
	}

	var occupied = this.getOccupiedBitboard();
	var queens = this.getPieceColorBitboard(Chess.Piece.QUEEN, color);

	var bq = this.getPieceColorBitboard(Chess.Piece.BISHOP, color).dup().or(queens);
	if (Chess.Position.makeBishopAttackMask(bq, occupied).isSet(index)) {
		return true;
	}

	var rq = this.getPieceColorBitboard(Chess.Piece.ROOK, color).dup().or(queens);
	if (Chess.Position.makeRookAttackMask(rq, occupied).isSet(index)) {
		return true;
	}

	return false;
};

/**
 * @param {!Chess.PieceColor} color
 * @param {boolean} kingSide true = castle kingside, false = castle queenside
 * @return {number} 0-3 index to castling rights
 */
Chess.Position.getCastlingIndex = function(color, kingSide) {
	return color + (kingSide ? 0 : 2);
};

/**
 * @param {!Chess.PieceColor} color
 * @param {boolean} kingSide true = castle kingside, false = castle queenside
 * @return {number} home square of the castling rook
 */
Chess.Position.getCastlingRookSquare = function(color, kingSide) {
	return Chess.Position.ROOK_INDICES[Chess.Position.getCastlingIndex(color, kingSide)];
};

/**
 * @param {!Chess.PieceColor} color
 * @param {boolean} kingSide true = castle kingside, false = castle queenside
 * @return {boolean}
 */
Chess.Position.prototype.hasCastlingRight = function(color, kingSide) {
	return 0 !== (this.castlingRights & (1 << Chess.Position.getCastlingIndex(color, kingSide)));
};

/**
 * @param {!Chess.PieceColor} color
 * @param {boolean} kingSide true = castle kingside, false = castle queenside
 */
Chess.Position.prototype.clearCastlingRight = function(color, kingSide) {
	this.hashKey.updateCastlingRights(this.castlingRights);
	this.castlingRights &= ~(1 << Chess.Position.getCastlingIndex(color, kingSide));
	this.hashKey.updateCastlingRights(this.castlingRights);
};

/**
 * @param {!Chess.PieceColor} color
 * @param {boolean} kingSide true = castle kingside, false = castle queenside
 * @param {boolean} onlyLegal true = check that king's route is not attacked
 * @return {boolean}
 * TODO: allow pseudo-legal castle moves, i.e. don't check attacked until makeMove
 */
Chess.Position.prototype.canCastle = function(color, kingSide, onlyLegal) {
	if (!this.hasCastlingRight(color, kingSide)) {
		return false;
	}

	var direction = kingSide ? 1 : -1;
	var kingPosition = (color === Chess.PieceColor.WHITE) ? 4 : 60;
	var occupied = this.getOccupiedBitboard();

	if (occupied.isSet(kingPosition + direction) || occupied.isSet(kingPosition + 2 * direction)) {
		return false;
	}

	if (!kingSide && occupied.isSet(kingPosition + 3 * direction)) {
		return false;
	}

	if (onlyLegal && !this.isCastlingLegal(color, kingSide)) {
		return false;
	}

	return true;
};

/**
 * @param {!Chess.PieceColor} color
 * @param {boolean} kingSide true = castle kingside, false = castle queenside
 * @return {boolean}
 */
Chess.Position.prototype.isCastlingLegal = function(color, kingSide) {
	var otherColor = Chess.getOtherPieceColor(color);
	var direction = kingSide ? 1 : -1;
	var kingPosition = (color === Chess.PieceColor.WHITE) ? 4 : 60;

	return !this.isAttacked(otherColor, kingPosition) && !this.isAttacked(otherColor, kingPosition + direction) && !this.isAttacked(otherColor, kingPosition + 2 * direction);
};

/** @return {boolean} */
Chess.Position.prototype.canEnPassant = function() {
	return this.getEnPassantSquare() >= 0;
};

/** @return {number} */
Chess.Position.prototype.getEnPassantSquare = function() {
	return this.enPassantSquare;
};

/** @return {boolean} */
Chess.Position.prototype.isFiftyMoveRuleDraw = function() {
	return this.halfmoveClock >= 100;
};

/** @return {boolean} */
Chess.Position.prototype.isThreefoldRepetitionRuleDraw = function() {
	var currentHashKey = this.hashKey;
	return this.hashHistory.reduce(
		/**
		 * @param {number} previousValue
		 * @param {!Chess.Zobrist} currentValue
		 * @param {number} index (unused; please the Closure Compiler)
		 * @param {Array} array (unused; please the Closure Compiler)
		 * @return {number}
		 */
		function(previousValue, currentValue, index, array) { return previousValue + (currentValue.isEqual(currentHashKey) ? 1 : 0); }, 0) >= 3;
};

/**
 * @return {boolean}
 * TODO: find a good source for how this is supposed to work
 */
Chess.Position.prototype.isInsufficientMaterialDraw = function() {
	if (!this.getPieceBitboard(Chess.Piece.PAWN).isEmpty()) {
		return false;
	}

	if (!this.getPieceBitboard(Chess.Piece.ROOK).isEmpty()) {
		return false;
	}

	if (!this.getPieceBitboard(Chess.Piece.QUEEN).isEmpty()) {
		return false;
	}

	// only kings, knights and bishops on the board
	var whiteCount = this.getColorBitboard(Chess.PieceColor.WHITE).popcnt();
	var blackCount = this.getColorBitboard(Chess.PieceColor.BLACK).popcnt();

	if (whiteCount + blackCount < 4) {
		// king vs king, king&bishop vs king, king&knight vs king
		return true;
	}

	if (!this.getPieceBitboard(Chess.Piece.KNIGHT).isEmpty()) {
		return false;
	}

	// only kings and bishops on the board
	var bishops = this.getPieceBitboard(Chess.Piece.BISHOP);
	if (bishops.dup().and(Chess.Bitboard.LIGHT_SQUARES).isEqual(bishops) || bishops.dup().and(Chess.Bitboard.DARK_SQUARES).isEqual(bishops)) {
		return true;
	}

	return false;
};

/** @return {boolean} */
Chess.Position.prototype.isDraw = function() {
	return this.isFiftyMoveRuleDraw() || this.isThreefoldRepetitionRuleDraw() || this.isInsufficientMaterialDraw();
};

/** @return {!Chess.Position.Status} */
Chess.Position.prototype.getStatus = function() {
	if (!this.getMoves().length) {
		return this.isKingInCheck() ? Chess.Position.Status.CHECKMATE : Chess.Position.Status.STALEMATE_DRAW;
	}

	if (this.isFiftyMoveRuleDraw()) {
		return Chess.Position.Status.FIFTY_MOVE_RULE_DRAW;
	}

	if (this.isThreefoldRepetitionRuleDraw()) {
		return Chess.Position.Status.THREEFOLD_REPETITION_RULE_DRAW;
	}

	if (this.isInsufficientMaterialDraw()) {
		return Chess.Position.Status.INSUFFICIENT_MATERIAL_DRAW;
	}

	return Chess.Position.Status.NORMAL;
};

/**
 * @param {boolean} onlyCaptures
 * @return {!Array.<!Chess.Move>} pseudo-legal moves in this chess position
 * TODO: special-case move generation when king is check
 */
Chess.Position.prototype.generateMoves = function(onlyCaptures) {
	var moves = [];

	var turnColor = this.getTurnColor();
	var opponentBB = this.getColorBitboard(Chess.getOtherPieceColor(turnColor));
	var occupied = this.getOccupiedBitboard();
	var chessPosition = this;

	// Pawn moves: double pushes, positional moves, captures, promotions, en passant
	/**
	 * @param {!Chess.Bitboard} toMask
	 * @param {number} movement
	 * @param {!Chess.Move.Kind} kind
	 */
	function addPawnMoves(toMask, movement, kind) {
		while (!toMask.isEmpty()) {
			var index = toMask.extractLowestBitPosition();
			moves.push(new Chess.Move(index - movement, index, kind, Chess.Piece.PAWN, chessPosition.getPieceAtOrNull(index)));
		}
	}

	/**
	 * @param {!Chess.Bitboard} toMask
	 * @param {number} movement
	 * @param {boolean} capture
	 */
	function addPawnPromotions(toMask, movement, capture) {
		addPawnMoves(toMask.dup(), movement, capture ? Chess.Move.Kind.QUEEN_PROMOTION_CAPTURE : Chess.Move.Kind.QUEEN_PROMOTION);
		addPawnMoves(toMask.dup(), movement, capture ? Chess.Move.Kind.ROOK_PROMOTION_CAPTURE : Chess.Move.Kind.ROOK_PROMOTION);
		addPawnMoves(toMask.dup(), movement, capture ? Chess.Move.Kind.BISHOP_PROMOTION_CAPTURE : Chess.Move.Kind.BISHOP_PROMOTION);
		addPawnMoves(toMask.dup(), movement, capture ? Chess.Move.Kind.KNIGHT_PROMOTION_CAPTURE : Chess.Move.Kind.KNIGHT_PROMOTION);
	}

	var fileDirection = 1 - 2 * turnColor;
	var rankDirection = Chess.FILES * fileDirection;
	var turnPawns = this.getPieceColorBitboard(Chess.Piece.PAWN, turnColor);
	var lastRow = Chess.Bitboard.RANKS[turnColor ? 0 : Chess.LAST_RANK];

	if (!onlyCaptures) {
		// Double pawn pushes: pawns that are at their initial position, with nothing in the next two rows
		var doublePawnPushed = turnPawns.dup().and(Chess.Bitboard.RANKS[turnColor ? 6 : 1]).shiftLeft(2 * rankDirection).and_not(occupied).and_not(occupied.dup().shiftLeft(rankDirection));
		addPawnMoves(doublePawnPushed, 2 * rankDirection, Chess.Move.Kind.DOUBLE_PAWN_PUSH);

		// Positional pawn moves: advance one square to an empty square; not to the last row
		// Pawn promotion: to the last row
		var positionalPawnMoved = turnPawns.dup().shiftLeft(rankDirection).and_not(occupied);
		addPawnMoves(positionalPawnMoved.dup().and_not(lastRow), rankDirection, Chess.Move.Kind.POSITIONAL);
		addPawnPromotions(positionalPawnMoved.dup().and(lastRow), rankDirection, false);
	}

	// Pawn captures: advance diagonally to the next row to a square occupied by an opponent piece; not to the last row. Also, don't wrap the board from left/right.
	// Pawn promotion w/ capture: to the last row
	var leftFile = Chess.Bitboard.FILES[turnColor ? Chess.LAST_FILE : 0];
	var leftCaptureMovement = rankDirection - fileDirection;
	var pawnLeftCaptured = turnPawns.dup().and_not(leftFile).shiftLeft(leftCaptureMovement).and(opponentBB);
	addPawnMoves(pawnLeftCaptured.dup().and_not(lastRow), leftCaptureMovement, Chess.Move.Kind.CAPTURE);
	addPawnPromotions(pawnLeftCaptured.dup().and(lastRow), leftCaptureMovement, true);

	var rightFile = Chess.Bitboard.FILES[turnColor ? 0 : Chess.LAST_FILE];
	var rightCaptureMovement = rankDirection + fileDirection;
	var pawnRightCaptured = turnPawns.dup().and_not(rightFile).shiftLeft(rightCaptureMovement).and(opponentBB);
	addPawnMoves(pawnRightCaptured.dup().and_not(lastRow), rightCaptureMovement, Chess.Move.Kind.CAPTURE);
	addPawnPromotions(pawnRightCaptured.dup().and(lastRow), rightCaptureMovement, true);

	// Pawn en passant captures: opponent has just double pawn pushed in the last move next to our pawn, we move diagonally behind the opponent pawn, capturing it
	if (this.canEnPassant()) {
		var pawnLeftEnPassant = Chess.Bitboard.makeIndex(this.getEnPassantSquare() + fileDirection).and(turnPawns).and_not(leftFile).shiftLeft(leftCaptureMovement);
		addPawnMoves(pawnLeftEnPassant, leftCaptureMovement, Chess.Move.Kind.EN_PASSANT_CAPTURE);
		var pawnRightEnPassant = Chess.Bitboard.makeIndex(this.getEnPassantSquare() - fileDirection).and(turnPawns).and_not(rightFile).shiftLeft(rightCaptureMovement);
		addPawnMoves(pawnRightEnPassant, rightCaptureMovement, Chess.Move.Kind.EN_PASSANT_CAPTURE);
	}

	// Positional and capture moves for knight, bishop, rook, queen, king
	/**
	 * @param {number} from 0-63
	 * @param {!Chess.Bitboard} toMask
	 * @param {!Chess.Piece} piece
	 */
	function addNormalMoves(from, toMask, piece) {
		while (!toMask.isEmpty()) {
			var to = toMask.extractLowestBitPosition();
			moves.push(new Chess.Move(from, to, opponentBB.isSet(to) ? Chess.Move.Kind.CAPTURE : Chess.Move.Kind.POSITIONAL, piece, chessPosition.getPieceAtOrNull(to)));
		}
	}

	var mask = this.getColorBitboard(turnColor).dup().not();
	if (onlyCaptures) {
		mask.and(opponentBB);
	}

	var turnKnights = this.getPieceColorBitboard(Chess.Piece.KNIGHT, turnColor).dup();
	while (!turnKnights.isEmpty()) {
		var knightPosition = turnKnights.extractLowestBitPosition();
		addNormalMoves(knightPosition, Chess.Bitboard.KNIGHT_MOVEMENTS[knightPosition].dup().and(mask), Chess.Piece.KNIGHT);
	}

	var turnQueens = this.getPieceColorBitboard(Chess.Piece.QUEEN, turnColor).dup();
	while (!turnQueens.isEmpty()) {
		var queenPosition = turnQueens.extractLowestBitPosition();
		addNormalMoves(queenPosition, Chess.Position.makeBishopAttackMask(Chess.Bitboard.makeIndex(queenPosition), occupied).or(
			Chess.Position.makeRookAttackMask(Chess.Bitboard.makeIndex(queenPosition), occupied)).and(mask), Chess.Piece.QUEEN);
	}

	var turnBishops = this.getPieceColorBitboard(Chess.Piece.BISHOP, turnColor).dup();
	while (!turnBishops.isEmpty()) {
		var bishopPosition = turnBishops.extractLowestBitPosition();
		addNormalMoves(bishopPosition, Chess.Position.makeBishopAttackMask(Chess.Bitboard.makeIndex(bishopPosition), occupied).and(mask), Chess.Piece.BISHOP);
	}

	var turnRooks = this.getPieceColorBitboard(Chess.Piece.ROOK, turnColor).dup();
	while (!turnRooks.isEmpty()) {
		var rookPosition = turnRooks.extractLowestBitPosition();
		addNormalMoves(rookPosition, Chess.Position.makeRookAttackMask(Chess.Bitboard.makeIndex(rookPosition), occupied).and(mask), Chess.Piece.ROOK);
	}

	var kingPosition = this.getKingPosition(turnColor);
	addNormalMoves(kingPosition, Chess.Bitboard.KING_MOVEMENTS[kingPosition].dup().and(mask), Chess.Piece.KING);

	if (!onlyCaptures) {
		// King & queen side castle
		if (this.canCastle(turnColor, true, true)) {
			moves.push(new Chess.Move(kingPosition, kingPosition + 2, Chess.Move.Kind.KING_CASTLE, Chess.Piece.KING, null));
		}

		if (this.canCastle(turnColor, false, true)) {
			moves.push(new Chess.Move(kingPosition, kingPosition - 2, Chess.Move.Kind.QUEEN_CASTLE, Chess.Piece.KING, null));
		}
	}

	return moves;
};

/**
 * @param {!Chess.Piece} piece
 * @param {!Chess.PieceColor} color of the captured piece
 * @param {number} index
 */
Chess.Position.prototype.capturePiece = function(piece, color, index) {
	this.getPieceBitboard(piece).clearBit(index);
	this.getColorBitboard(color).clearBit(index);
	this.pieces[index] = null;
	this.hashKey.updatePieceColorSquare(piece, color, index);
};

/**
 * @param {!Chess.Piece} piece
 * @param {!Chess.PieceColor} color of the captured piece
 * @param {number} index
 */
Chess.Position.prototype.unCapturePiece = function(piece, color, index) {
	this.getPieceBitboard(piece).setBit(index);
	this.getColorBitboard(color).setBit(index);
	this.pieces[index] = /** @type {!Chess.Piece} */(piece);
	this.hashKey.updatePieceColorSquare(piece, color, index);
};

/**
 * @param {!Chess.Piece} piece
 * @param {!Chess.PieceColor} color
 * @param {number} from 0-63
 * @param {number} to 0-63
 */
Chess.Position.prototype.movePiece = function(piece, color, from, to) {
	var fromToBB = Chess.Bitboard.makeIndex(from).or(Chess.Bitboard.makeIndex(to));
	this.getPieceBitboard(piece).xor(fromToBB);
	this.getColorBitboard(color).xor(fromToBB);
	this.pieces[from] = null;
	this.pieces[to] = /** @type {!Chess.Piece} */(piece);
	this.hashKey.updatePieceColorSquare(piece, color, from);
	this.hashKey.updatePieceColorSquare(piece, color, to);
};

/**
 * @param {!Chess.PieceColor} color
 * @param {boolean} kingSide true = castle kingside, false = castle queenside
 * N.B. only moves the rook, not the king
 */
Chess.Position.prototype.castleRook = function(color, kingSide) {
	var from = Chess.Position.getCastlingRookSquare(color, kingSide);
	var to = from + (kingSide ? -2 : 3);
	this.movePiece(Chess.Piece.ROOK, color, from, to);
};

/**
 * @param {!Chess.PieceColor} color
 * @param {boolean} kingSide true = castle kingside, false = castle queenside
 * N.B. only moves the rook, not the king
 */
Chess.Position.prototype.unCastleRook = function(color, kingSide) {
	var to = Chess.Position.getCastlingRookSquare(color, kingSide);
	var from = to + (kingSide ? -2 : 3);
	this.movePiece(Chess.Piece.ROOK, color, from, to);
};

/**
 * @param {!Chess.Piece} pieceOld
 * @param {!Chess.Piece} pieceNew
 * @param {!Chess.PieceColor} color
 * @param {number} index 0-63
 * @see http://goo.gl/jkRj9 (Update by Move)
 */
Chess.Position.prototype.promotePiece = function(pieceOld, pieceNew, color, index) {
	this.getPieceBitboard(pieceOld).clearBit(index);
	this.getPieceBitboard(pieceNew).setBit(index);
	this.pieces[index] = /** @type {!Chess.Piece} */(pieceNew);
	this.hashKey.updatePieceColorSquare(pieceOld, color, index);
	this.hashKey.updatePieceColorSquare(pieceNew, color, index);
};

/**
 * Changes the chess pieces according to move
 * @param {!Chess.Move} move to make
 */
Chess.Position.prototype.updatePieces = function(move) {
	if (move.isCapture()) {
		this.capturePiece(move.getCapturedPiece(), Chess.getOtherPieceColor(this.getTurnColor()), move.getCaptureSquare());
	}

	if (move.isCastle()) {
		this.castleRook(this.getTurnColor(), move.getKind() === Chess.Move.Kind.KING_CASTLE);
	}

	this.movePiece(move.getPiece(), this.getTurnColor(), move.getFrom(), move.getTo());

	if (move.isPromotion()) {
		this.promotePiece(Chess.Piece.PAWN, move.getPromotedPiece(), this.getTurnColor(), move.getTo());
	}
};

/**
 * Reverts the chess pieces to the positions before making move
 * @param {!Chess.Move} move to unmake
 */
Chess.Position.prototype.revertPieces = function(move) {
	if (move.isPromotion()) {
		this.promotePiece(move.getPromotedPiece(), Chess.Piece.PAWN, this.getTurnColor(), move.getTo());
	}

	this.movePiece(move.getPiece(), this.getTurnColor(), move.getTo(), move.getFrom());

	if (move.isCastle()) {
		this.unCastleRook(this.getTurnColor(), move.getKind() === Chess.Move.Kind.KING_CASTLE);
	}

	if (move.isCapture()) {
		this.unCapturePiece(move.getCapturedPiece(), Chess.getOtherPieceColor(this.getTurnColor()), move.getCaptureSquare());
	}
};

/**
 * Checks a pseudo-legal move's legality
 * @param {!Chess.Move} move to test
 * @return {boolean}
 */
Chess.Position.prototype.isMoveLegal = function(move) {
	this.updatePieces(move);
	var kingInCheck = this.isKingInCheck();
	this.revertPieces(move);
	return !kingInCheck;
};

/**
 * Changes the pieces according to the move, and adds the move to the move history list
 * @param {!Chess.Move} move to make
 * @return {boolean} true if the move was made
 */
Chess.Position.prototype.makeMove = function(move) {
	this.hashHistory.push(this.hashKey.dup());
	this.updatePieces(move);

	if (this.isKingInCheck()) {
		this.revertPieces(move);
		this.hashHistory.pop();
		return false;
	}

	this.madeMoves.push(move);
	this.irreversibleHistory.push(this.enPassantSquare);
	this.irreversibleHistory.push(this.castlingRights);
	this.irreversibleHistory.push(this.halfmoveClock);

	this.hashKey.updateEnPassantSquare(this.enPassantSquare);
	if (move.getKind() === Chess.Move.Kind.DOUBLE_PAWN_PUSH) {
		this.enPassantSquare = move.getTo();
	} else {
		this.enPassantSquare = -1;
	}
	this.hashKey.updateEnPassantSquare(this.enPassantSquare);

	var turnColor = this.getTurnColor();

	if (move.getPiece() === Chess.Piece.KING) {
		this.clearCastlingRight(turnColor, true);
		this.clearCastlingRight(turnColor, false);
	} else if (move.getPiece() === Chess.Piece.ROOK) {
		if (move.getFrom() === Chess.Position.getCastlingRookSquare(turnColor, true)) {
			this.clearCastlingRight(turnColor, true);
		} else if (move.getFrom() === Chess.Position.getCastlingRookSquare(turnColor, false)) {
			this.clearCastlingRight(turnColor, false);
		}
	}

	var otherColor = Chess.getOtherPieceColor(turnColor);

	if (move.getCapturedPiece() === Chess.Piece.ROOK) {
		if (move.getCaptureSquare() === Chess.Position.getCastlingRookSquare(otherColor, true)) {
			this.clearCastlingRight(otherColor, true);
		} else if (move.getCaptureSquare() === Chess.Position.getCastlingRookSquare(otherColor, false)) {
			this.clearCastlingRight(otherColor, false);
		}
	}

	if (move.isCapture() || move.getPiece() === Chess.Piece.PAWN) {
		this.halfmoveClock = 0;
	} else {
		++this.halfmoveClock;
	}

	this.turn = otherColor;
	this.hashKey.updateTurn();

	return true;
};

/**
 * @return {number} number of moves made
 */
Chess.Position.prototype.getMadeMoveCount = function() {
	return this.madeMoves.length;
};

/**
 * @return {boolean} if a move has been made
 */
Chess.Position.prototype.canUndo = function() {
	return !!this.getMadeMoveCount();
};

/**
 * @return {?Chess.Move} the latest move or null if the board was at the initial state
 */
Chess.Position.prototype.getLastMove = function() {
	if (!this.canUndo()) {
		return null;
	}

	return this.madeMoves[this.madeMoves.length - 1];
};

/**
 * Unmakes the latest move made 
 * @return {?Chess.Move} the unmade move or null if the board was at the initial state
 */
Chess.Position.prototype.unmakeMove = function() {
	if (!this.canUndo()) {
		return null;
	}

	var move = /** @type {!Chess.Move} */(this.madeMoves.pop());
	this.turn = Chess.getOtherPieceColor(this.getTurnColor());
	this.hashKey.updateTurn();
	this.revertPieces(move);
	this.halfMoveClock = /** @type {number} */(this.irreversibleHistory.pop());
	this.hashKey.updateCastlingRights(this.castlingRights);
	this.castlingRights = /** @type {number} */(this.irreversibleHistory.pop());
	this.hashKey.updateCastlingRights(this.castlingRights);
	this.hashKey.updateEnPassantSquare(this.enPassantSquare);
	this.enPassantSquare = /** @type {number} */(this.irreversibleHistory.pop());
	this.hashKey.updateEnPassantSquare(this.enPassantSquare);
	this.hashHistory.pop();

	return move;
};
