"use strict";

/**
 * AI (artificial intelligence) is a computer player for chess.
 * The implementation is an alpha-beta pruned minimax with a simple evaluation function.
 * AI takes a chess position, evaluates possible moves up to a certain depth, and returns the move it considers best (or null if the game is lost).
 * @constructor
 * TODO: add some sort of randomness; per side so that two computers playing against each other act differently (and don't know how the other is acting).
 * TODO: static exchange evaluation (see)
 * TODO: transposition table
 * TODO: iterative deepening
 * TODO: negamax formulation
 */
Chess.AI = function() {
};

/**
 * @const
 * @type {!Array.<number>}
 * @see http://goo.gl/zxAE9 (Chess piece relative value)
 */
Chess.AI.PIECE_VALUES = [100, 300, 300, 500, 900, 20000];

/**
 * @const
 * @type {!Array.<!Array.<number>>}
 * @see http://goo.gl/X326e (Simplified evaluation function)
 */
Chess.AI.PIECE_SQUARE_TABLES = [
	// pawn
	[
		0, 0, 0, 0, 0, 0, 0, 0,
		50, 50, 50, 50, 50, 50, 50, 50,
		10, 10, 20, 30, 30, 20, 10, 10,
		5, 5, 10, 25, 25, 10, 5, 5,
		0, 0, 0, 20, 20, 0, 0, 0,
		5, -5, -10, 0, 0, -10, -5, 5,
		5, 10, 10, -20, -20, 10, 10, 5,
		0, 0, 0, 0, 0, 0, 0, 0
	],
	// knight
	[
		-50, -40, -30, -30, -30, -30, -40, -50,
		-40, -20, 0, 0, 0, 0, -20, -40,
		-30, 0, 10, 15, 15, 10, 0, -30,
		-30, 5, 15, 20, 20, 15, 5, -30,
		-30, 0, 15, 20, 20, 15, 0, -30,
		-30, 5, 10, 15, 15, 10, 5, -30,
		-40, -20, 0, 5, 5, 0, -20, -40,
		-50, -40, -30, -30, -30, -30, -40, -50
	],
	// bishop
	[
		-20, -10, -10, -10, -10, -10, -10, -20,
		-10, 0, 0, 0, 0, 0, 0, -10,
		-10, 0, 5, 10, 10, 5, 0, -10,
		-10, 5, 5, 10, 10, 5, 5, -10,
		-10, 0, 10, 10, 10, 10, 0, -10,
		-10, 10, 10, 10, 10, 10, 10, -10,
		-10, 5, 0, 0, 0, 0, 5, -10,
		-20, -10, -10, -10, -10, -10, -10, -20
	],
	// rook
	[
		0, 0, 0, 0, 0, 0, 0, 0,
		5, 10, 10, 10, 10, 10, 10, 5,
		-5, 0, 0, 0, 0, 0, 0, -5,
		-5, 0, 0, 0, 0, 0, 0, -5,
		-5, 0, 0, 0, 0, 0, 0, -5,
		-5, 0, 0, 0, 0, 0, 0, -5,
		-5, 0, 0, 0, 0, 0, 0, -5,
		0, 0, 0, 5, 5, 0, 0, 0
	],
	// queen
	[
		-20, -10, -10, -5, -5, -10, -10, -20,
		-10, 0, 0, 0, 0, 0, 0, -10,
		-10, 0, 5, 5, 5, 5, 0, -10,
		-5, 0, 5, 5, 5, 5, 0, -5,
		0, 0, 5, 5, 5, 5, 0, -5,
		-10, 5, 5, 5, 5, 5, 0, -10,
		-10, 0, 5, 0, 0, 0, 0, -10,
		-20, -10, -10, -5, -5, -10, -10, -20
	],
	// king middle game
	[
		-30, -40, -40, -50, -50, -40, -40, -30,
		-30, -40, -40, -50, -50, -40, -40, -30,
		-30, -40, -40, -50, -50, -40, -40, -30,
		-30, -40, -40, -50, -50, -40, -40, -30,
		-20, -30, -30, -40, -40, -30, -30, -20,
		-10, -20, -20, -20, -20, -20, -20, -10,
		 20, 20, 0, 0, 0, 0, 20, 20,
		 20, 30, 10, 0, 0, 10, 30, 20
	]/*,
	// king end game
	[
		-50, -40, -30, -20, -20, -30, -40, -50,
		-30, -20, -10, 0, 0, -10, -20, -30,
		-30, -10, 20, 30, 30, 20, -10, -30,
		-30, -10, 30, 40, 40, 30, -10, -30,
		-30, -10, 30, 40, 40, 30, -10, -30,
		-30, -10, 20, 30, 30, 20, -10, -30,
		-30, -30, 0, 0, 0, 0, -30, -30,
		-50, -30, -30, -30, -30, -30, -30, -50
	]*/
];

/**
 * @const
 * @type {number}
 * @see http://goo.gl/adkwe (Bishop pair)
 */
Chess.AI.BISHOP_PAIR_VALUE = Chess.AI.PIECE_VALUES[Chess.Piece.PAWN] / 2;

/**
 * @param {!Chess.Position} chessPosition
 * @param {!Chess.PieceColor} color
 * @return {number}
 */
Chess.AI.getMaterialValue = function(chessPosition, color) {
	var value = 0;
	for (var piece = Chess.Piece.PAWN; piece < Chess.Piece.KING; ++piece) {
		value += chessPosition.getPieceColorBitboard(piece, color).popcnt() * Chess.AI.PIECE_VALUES[piece];
	}
	if (chessPosition.getPieceColorBitboard(Chess.Piece.BISHOP, color).popcnt() > 1) {
		value += Chess.AI.BISHOP_PAIR_VALUE;
	}
	return value;
};

/**
 * @param {!Chess.Position} chessPosition
 * @return {number}
 */
Chess.AI.evaluateMaterial = function(chessPosition) {
	return Chess.AI.getMaterialValue(chessPosition, Chess.PieceColor.WHITE) - Chess.AI.getMaterialValue(chessPosition, Chess.PieceColor.BLACK);
};

/**
 * @param {!Chess.Position} chessPosition
 * @param {!Chess.PieceColor} color
 * @return {number}
 * TODO: game phase
 */
Chess.AI.getPieceSquareValue = function(chessPosition, color) {
	var value = 0;
	for (var piece = Chess.Piece.PAWN; piece <= Chess.Piece.KING; ++piece) {
		var pieces = chessPosition.getPieceColorBitboard(piece, color).dup();
		while (!pieces.isEmpty()) {
			var index = pieces.extractLowestBitPosition();
			value += Chess.AI.PIECE_SQUARE_TABLES[piece][color ? index : (56 ^ index)];
		}
	}
	return value;
};

/**
 * @param {!Chess.Position} chessPosition
 * @return {number}
 */
Chess.AI.evaluateLocations = function(chessPosition) {
	return Chess.AI.getPieceSquareValue(chessPosition, Chess.PieceColor.WHITE) - Chess.AI.getPieceSquareValue(chessPosition, Chess.PieceColor.BLACK);
};

/**
 * @param {!Chess.PieceColor} color white = attacks by white pieces
 * @param {!Chess.Bitboard} pawns
 * @param {!Chess.Bitboard} empty
 * @return {!Chess.Bitboard}
 */
Chess.AI.makePawnPositionalMask = function(color, pawns, empty) {
	var white = (color === Chess.PieceColor.WHITE);
	var positional = pawns.dup().shiftLeft(white ? 8 : -8).and(empty);
	var doublePush = pawns.dup().and(Chess.Bitboard.RANKS[white ? 1 : 6]).shiftLeft(white ? 16 : -16).and(empty).and(empty.dup().shiftLeft(white ? 8 : -8));
	return positional.or(doublePush);
};

/**
 * @param {!Chess.Position} chessPosition
 * @param {!Chess.PieceColor} color
 * @return {number}
 * TODO: it's easy to give bonuses for attack and defend here by and(us) or and(opponent)
 * TODO: legality
 * TODO: does not count all moves; e.g. two pawns can capture the same square, ditto two rooks, two queens
 */
Chess.AI.getMobilityValue = function(chessPosition, color) {
	var us = chessPosition.getColorBitboard(color);
	var opponent = chessPosition.getColorBitboard(Chess.getOtherPieceColor(color));
	var occupied = chessPosition.getOccupiedBitboard();
	var empty = chessPosition.getEmptyBitboard();
	var mobility = 0;

	mobility += Chess.AI.makePawnPositionalMask(color, chessPosition.getPieceColorBitboard(Chess.Piece.PAWN, color), empty).popcnt();
	mobility += Chess.Position.makePawnAttackMask(color, chessPosition.getPieceColorBitboard(Chess.Piece.PAWN, color)).and(opponent).popcnt();

	var knights = chessPosition.getPieceColorBitboard(Chess.Piece.KNIGHT, color).dup();
	while (!knights.isEmpty()) {
		mobility += Chess.Bitboard.KNIGHT_MOVEMENTS[knights.extractLowestBitPosition()].dup().and_not(us).popcnt();
	}

	mobility += Chess.Bitboard.KING_MOVEMENTS[chessPosition.getKingPosition(color)].dup().and_not(us).popcnt();

	var queens = chessPosition.getPieceColorBitboard(Chess.Piece.QUEEN, color);

	var bq = chessPosition.getPieceColorBitboard(Chess.Piece.BISHOP, color).dup().or(queens);
	mobility += Chess.Position.makeBishopAttackMask(bq, occupied).and_not(us).popcnt();

	var rq = chessPosition.getPieceColorBitboard(Chess.Piece.ROOK, color).dup().or(queens);
	mobility += Chess.Position.makeRookAttackMask(rq, occupied).and_not(us).popcnt();

	return mobility * Chess.AI.PIECE_VALUES[Chess.Piece.PAWN] / 100;
};

/**
 * @param {!Chess.Position} chessPosition
 * @return {number}
 */
Chess.AI.evaluate = function(chessPosition) {
	return Chess.AI.evaluateMaterial(chessPosition) + Chess.AI.evaluateLocations(chessPosition);
};

/**
 * @param {!Chess.Position} chessPosition
 * @return {?Chess.Move}
 */
Chess.AI.prototype.search = function(chessPosition) {
	/**
	 * @param {!Array.<!Chess.Move>} moves
	 * @return {!Array.<!Chess.Move>}
	 */
	function sortMoves(moves) {
		/**
		 * @param {!Chess.Move} move
		 * @return {number}
		 * TODO: killer heuristic, history, etc
		 */
		function scoreMove(move) {
			var score = move.isCapture() ? ((1 + move.getCapturedPiece()) / (1 + move.getPiece())) : 0;
			score = 6 * score + move.getPiece();
			score = 16 * score + move.getKind();
			score = 64 * score + move.getTo();
			score = 64 * score + move.getFrom();
			return score;
		}

		/**
		 * @param {!Chess.Move} a
		 * @param {!Chess.Move} b
		 * @return {number}
		 */
		function compareMoves(a, b) {
			return scoreMove(b) - scoreMove(a);
		}

		moves.sort(compareMoves);
		return moves;
	}

	var evaluations = 0;

	/**
	 * @param {!Chess.Position} chessPosition
	 * @param {number} alpha
	 * @param {number} beta
	 * @return {number}
	 */
	function quiescenceSearch(chessPosition, alpha, beta) {
		if (chessPosition.isDraw()) {
			// always assume the draw will be claimed
			return 0;
		}

		var standPatValue = Chess.AI.evaluate(chessPosition);
		++evaluations;

		var white = (chessPosition.getTurnColor() === Chess.PieceColor.WHITE);

		if (white) {
			if (standPatValue >= beta) {
				return beta;
			}
			alpha = (standPatValue > alpha) ? standPatValue : alpha;
		} else {
			if (standPatValue <= alpha) {
				return alpha;
			}
			beta = (standPatValue < beta) ? standPatValue : beta;
		}

		var moves = sortMoves(chessPosition.getMoves(true, !chessPosition.isKingInCheck()));

		for (var i = 0; i < moves.length; ++i) {
			if (chessPosition.makeMove(moves[i])) {
				var value = quiescenceSearch(chessPosition, alpha, beta);
				chessPosition.unmakeMove();

				if (white) {
					if (value >= beta) {
						return beta;
					}
					alpha = (value > alpha) ? value : alpha; // max player (white)
				} else {
					if (value <= alpha) {
						return alpha;
					}
					beta = (value < beta) ? value : beta; // min player (black)
				}
			}
		}

		return /** @type {number} */(white ? alpha : beta);
	}

	/**
	 * @param {!Chess.Position} chessPosition
	 * @param {number} depth
	 * @param {number} alpha
	 * @param {number} beta
	 * @return {number}
	 */
	function alphaBeta(chessPosition, depth, alpha, beta) {
		if (depth < 1) {
			return quiescenceSearch(chessPosition, alpha, beta);
		}

		var moves = sortMoves(chessPosition.getMoves(true, false));
		var white = (chessPosition.getTurnColor() === Chess.PieceColor.WHITE);
		var legal = false;

		for (var i = 0; i < moves.length; ++i) {
			if (chessPosition.makeMove(moves[i])) {
				legal = true;

				var value = alphaBeta(chessPosition, depth - 1, alpha, beta);
				chessPosition.unmakeMove();

				if (white) {
					alpha = (value > alpha) ? value : alpha; // max player (white)
				} else {
					beta = (value < beta) ? value : beta; // min player (black)
				}

				if (beta <= alpha) {
					break;
				}
			}
		}

		if (!legal) {
			// no legal moves
			if (!chessPosition.isKingInCheck()) {
				// stalemate, draw
				return 0;
			}
			// checkmate, the player in turn loses
			var mate = Chess.AI.PIECE_VALUES[Chess.Piece.KING];// - chessPosition.getMadeMoveCount(); TODO: punish longer games
			return white ? -mate : mate;
		}

		// TODO: avoid the search above before checking this, just check for checkmate
		if (chessPosition.isDraw()) {
			// always assume the draw will be claimed
			return 0;
		}

		return /** @type {number} */(white ? alpha : beta);
	}

	var bestMove = null;
	var alpha = -Infinity;
	var beta = Infinity;
	var moves = sortMoves(chessPosition.getMoves(true));
	for (var i = 0; i < moves.length; ++i) {
		if (chessPosition.makeMove(moves[i])) {
			var value = alphaBeta(chessPosition, 3, alpha, beta);
			chessPosition.unmakeMove();

			if (chessPosition.getTurnColor() === Chess.PieceColor.WHITE) {
				// max player (white)
				if (value > alpha) {
					alpha = value;
					bestMove = moves[i];
				}
			} else {
				// min player (black)
				if (value < beta) {
					beta = value;
					bestMove = moves[i];
				}
			}

			// Notice that alpha is always smaller than beta here, because we only update one one them
			// at the main level, the other stays infinite (+ or -)
		}
	}

	return bestMove;
};
