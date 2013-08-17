/*
 * Automated tests for the chess logic. UI is not tested.
 */
"use strict";

module("chess.js");

test("utilities", function() {
	strictEqual(Chess.getRank(0), 0);
	strictEqual(Chess.getRank(7), 0);
	strictEqual(Chess.getRank(56), 7);
	strictEqual(Chess.getRank(63), 7);
	strictEqual(Chess.getFile(0), 0);
	strictEqual(Chess.getFile(7), 7);
	strictEqual(Chess.getFile(56), 0);
	strictEqual(Chess.getFile(63), 7);
	strictEqual(Chess.isInsideBoard(0, 0), true);
	strictEqual(Chess.isInsideBoard(7, 7), true);
	strictEqual(Chess.isInsideBoard(-1, -1), false);
	strictEqual(Chess.isInsideBoard(8, 8), false);
	strictEqual(Chess.isInsideBoard(-1, 0), false);
	strictEqual(Chess.isInsideBoard(8, 0), false);
	strictEqual(Chess.isInsideBoard(0, -1), false);
	strictEqual(Chess.isInsideBoard(0, 8), false);
	strictEqual(Chess.getIndex(0, 0), 0);
	strictEqual(Chess.getIndex(0, 7), 7);
	strictEqual(Chess.getIndex(7, 0), 56);
	strictEqual(Chess.getIndex(7, 7), 63);
	strictEqual(Chess.isLight(0, 0), false);
	strictEqual(Chess.isLight(0, 7), true);
	strictEqual(Chess.getAlgebraic(0, 0), "a1");
	strictEqual(Chess.getAlgebraic(7, 7), "h8");
	strictEqual(Chess.getIndexFromAlgebraic("a1"), 0);
	strictEqual(Chess.getIndexFromAlgebraic("h8"), 63);
	strictEqual(Chess.getAlgebraicFromIndex(0), "a1");
	strictEqual(Chess.getAlgebraicFromIndex(63), "h8");
	strictEqual(Chess.getOtherPieceColor(Chess.PieceColor.WHITE), Chess.PieceColor.BLACK);
	strictEqual(Chess.getOtherPieceColor(Chess.PieceColor.BLACK), Chess.PieceColor.WHITE);
});

module("bitboard.js");

test("Bitboard", function() {
	strictEqual(Chess.Bitboard.makeLightSquares().popcnt(), 32);
	strictEqual(Chess.Bitboard.makeDarkSquares().popcnt(), 32);
	strictEqual(Chess.Bitboard.makeLightSquares().xor(Chess.Bitboard.makeDarkSquares()).popcnt(), 64);
	for (var k = 0; k < 8; ++k) {
		strictEqual(Chess.Bitboard.makeFile(k).popcnt(), 8);
		strictEqual(Chess.Bitboard.makeRank(k).popcnt(), 8);
	}
	for (var l = -7; l < 8; ++l) {
		strictEqual(Chess.Bitboard.makeDiagonal(l).popcnt(), 8 - Math.abs(l));
		strictEqual(Chess.Bitboard.makeAntidiagonal(l).popcnt(), 8 - Math.abs(l));
	}
	var is = [0, 1, 7, 8, 31, 32, 55, 56, 62, 63];
	var js = [0, 15, 31, 32, 40, 63];
	for (var ii = 0; ii < is.length; ++ii) {
		var i = is[ii];
		var bbi = Chess.Bitboard.makeIndex(i);
		strictEqual(bbi.popcnt(), 1);
		strictEqual(bbi.isEmpty(), false);
		for (var ji = 0; ji < js.length; ++ji) {
			var j = js[ji];
			var or = Chess.Bitboard.makeIndex(i).or(Chess.Bitboard.makeIndex(j));
			var hi = Chess.Bitboard.makeIndex((i > j) ? i : j);
			deepEqual(or.popLowestBit(), (i === j) ? Chess.Bitboard.ZERO : hi);
			or = Chess.Bitboard.makeIndex(i).or(Chess.Bitboard.makeIndex(j));
			strictEqual(or.isEmpty(), false);
			strictEqual(or.popcnt(), (i === j) ? 1 : 2);
			strictEqual(or.getLowestBitPosition(), (i < j) ? i : j);
			strictEqual(or.isSet(i), true);
			strictEqual(or.isSet(j), true);
			strictEqual(or.isClear(i), false);
			strictEqual(or.isClear(j), false);
			strictEqual(bbi.isSet(j), j === i);
			strictEqual(bbi.isClear(j), j !== i);
			var xor = Chess.Bitboard.makeIndex(i).xor(Chess.Bitboard.makeIndex(j));
			strictEqual(xor.popcnt(), (i === j) ? 0 : 2);
			strictEqual(xor.isEmpty(), i === j);
			var bbj = bbi.dup();
			bbj.setBit(j);
			deepEqual(bbj, or);
			strictEqual(bbj.isEqual(or), true);
			bbj.clearBit(j);
			deepEqual(bbj, (i === j) ? Chess.Bitboard.ZERO : bbi);
		}
	}
	// TODO: test knight and king movement
	// TODO: test shifts
});

module("zobrist.js");

test("Zobrist", function() {
	var zobrist = new Chess.Zobrist(0, 0);
	var dup = zobrist.dup();
	deepEqual(zobrist, dup);
	zobrist.updateTurn();
	notDeepEqual(zobrist, dup);
	zobrist.updateTurn();
	deepEqual(zobrist, dup);
	var lightSquares = Chess.Bitboard.LIGHT_SQUARES;
	strictEqual(lightSquares.popcnt(), 32);
	zobrist.updatePieceColorBitboard(Chess.Piece.QUEEN, Chess.PieceColor.BLACK, lightSquares);
	strictEqual(lightSquares.popcnt(), 32);
	notDeepEqual(zobrist, dup);
});

module("move.js");

test("Move", function() {
	var move = new Chess.Move(32, 33, Chess.Move.Kind.CAPTURE, Chess.Piece.ROOK, Chess.Piece.QUEEN);
	strictEqual(move.getFrom(), 32);
	strictEqual(move.getTo(), 33);
	strictEqual(move.getKind(), Chess.Move.Kind.CAPTURE);
	strictEqual(move.getPiece(), Chess.Piece.ROOK);
	strictEqual(move.isCapture(), true);
	strictEqual(move.getCapturedPiece(), Chess.Piece.QUEEN);
	strictEqual(move.isPromotion(), false);
	strictEqual(move.isCastle(), false);
	strictEqual(move.getCaptureSquare(), 33);
});

module("position.js");
// TODO: getPieceAtOrNull vs findPieceAtOrNull
// TODO: castling
// TODO: capture
// TODO: piece consistency, move consistency
// TODO: promotion

test("Position", function() {
	var position = new Chess.Position;
	strictEqual(position.getPieceBitboard(Chess.Piece.PAWN).popcnt(), 16);
});

test("Perft", function() {
	strictEqual(Chess.Position.perft(3), 8902, "Perft(3)");
	strictEqual(Chess.Position.perft(4), 197281, "Perft(4)");
});

function checkPositionHash(chessPosition) {
	var old = chessPosition.hashKey.dup();
	chessPosition.updateHashKey();
	return chessPosition.hashKey.isEqual(old);
}

test("Hashing", function() {
	var position = new Chess.Position;
	ok(checkPositionHash(position));
	var dup = position.hashKey.dup();
	position.makeMove(position.getMoves(true)[0]);
	ok(checkPositionHash(position));
	notDeepEqual(position.hashKey, dup);
	ok(position.canUndo());
	position.unmakeMove();
	ok(checkPositionHash(position));
	deepEqual(position.hashKey, dup);
});

module("parser.js");

/**
 * @see http://goo.gl/B39TC (Algebraic notation)
 * @see http://goo.gl/ZgMC1 (Peruvian Immortal)
 */
test("Parser", function() {
	strictEqual(Chess.Parser.clean("A4   )(   (B- (C! ( ( D? ) ) E F)) G5"), "A4 G5");

	var chessPosition = Chess.Parser.parseMoves("1. e4 c5 2. Nf3 d6 3. Bb5+ Bd7 4. Bxd7+ Qxd7 5. c4 Nc6 6. Nc3 Nf6 7. 0-0 g6 8. d4 cxd4 9. Nxd4 Bg7 10. Nde2 Qe6!? (a novelty suggested by Irina Krush and considered a turning point for the World Team) 11. Nd5 Qxe4 12. Nc7+ Kd7 13. Nxa8 Qxc4 14. Nb6+ axb6 15. Nc3 Ra8 16. a4 Ne4 17. Nxe4 Qxe4 18. Qb3 f5 19. Bg5 Qb4 20. Qf7 Be5 21. h3 Rxa4 22. Rxa4 Qxa4 23. Qxh7 Bxb2 24. Qxg6 Qe4 25. Qf7 Bd4 26. Qb3 f4 27. Qf7 Be5 28. h4 b5 29. h5 Qc4 30. Qf5+ Qe6 31. Qxe6+ Kxe6 (see diagram) 32. g3 fxg3 33. fxg3 b4 (the World Team did not trust 33...Bxg3 34.h6 Be5 35.h7 Bg7 36.Rf8 b4 37.h8=Q Bxh8 38.Rxh8) 34. Bf4 Bd4+ 35. Kh1! b3 36. g4 Kd5 37. g5 e6 38. h6 Ne7 39. Rd1 e5 40. Be3 Kc4 41. Bxd4 exd4 42. Kg2 b2 43. Kf3 Kc3 44. h7 Ng6 45. Ke4 Kc2 46. Rh1 d3 (46...b1=Q? 47.Rxb1 Kxb1 48.Kxd4 and White will win) 47. Kf5 b1=Q 48. Rxb1 Kxb1 49. Kxg6 d2 50. h8=Q d1=Q 51. Qh7 b5?! 52. Kf6+ Kb2 53. Qh2+ Ka1 54. Qf4 b4? 55. Qxb4 Qf3+ 56. Kg7 d5 57. Qd4+ Kb1 58. g6 Qe4 59. Qg1+ Kb2 60. Qf2+ Kc1 61. Kf6 d4 62. g7 1–0");
	strictEqual(chessPosition.getColorBitboard(Chess.PieceColor.BLACK).popcnt(), 3);
	ok(chessPosition.getColorBitboard(Chess.PieceColor.BLACK).isSet(2));
	ok(chessPosition.getColorBitboard(Chess.PieceColor.BLACK).isSet(Chess.getIndex(3, 3)));
	ok(chessPosition.getColorBitboard(Chess.PieceColor.BLACK).isSet(Chess.getIndex(3, 4)));
	strictEqual(chessPosition.getColorBitboard(Chess.PieceColor.WHITE).popcnt(), 3);
	ok(chessPosition.getColorBitboard(Chess.PieceColor.WHITE).isSet(Chess.getIndex(1, 5)));
	ok(chessPosition.getColorBitboard(Chess.PieceColor.WHITE).isSet(Chess.getIndex(5, 5)));
	ok(chessPosition.getColorBitboard(Chess.PieceColor.WHITE).isSet(Chess.getIndex(6, 6)));

	var chessPosition2 = Chess.Parser.parseMoves("1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5 4. d4 c6 5. Nf3 Bg4 6. Bf4 e6 7. h3 Bxf3 8. Qxf3 Bb4 9. Be2 Nd7 10. a3 0-0-0");
	strictEqual(chessPosition2.getColorBitboard(Chess.PieceColor.BLACK).popcnt(), 14);
	strictEqual(chessPosition2.getColorBitboard(Chess.PieceColor.WHITE).popcnt(), 14);
	strictEqual(chessPosition2.getPieceBitboard(Chess.Piece.PAWN).popcnt(), 14);
});

module("ai.js");

test("AI", function() {
	var ai = new Chess.AI;
	notStrictEqual(ai.search(new Chess.Position), null);
});
