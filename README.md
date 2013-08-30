# JavaScript Chess

This program is a JavaScript implementation of the board game [Chess](http://en.wikipedia.org/wiki/Chess), with a computer player opponent. All move types are supported, including en passant, castling and promotion.

Try it out [here](http://www.iki.fi/kbjorklu/chess/). Usage is shown below the chessboard. At least Internet Explorer (8 or later), Chrome and Firefox should work.

# Code Structure

Source files are placed in the `src` directory. Minification and linting files are placed in the `build` directory. Source file contents:

* `chess.js`: Constants, utilities and the Chess namespace.
* `bitboard.js`: 64-bit bit twiddling tools.
* `zobrist.js`: Game state hash calculator. Currently only used for the threefold repetition rule, but will be used in the transposition table implementation.
* `move.js`: Piece movement representation.
* `position.js`: Chess game state and mutation.
* `parser.js`: Parser for various Chess notations.
* `ai.js`: Artificial intelligence, i.e. computer opponent. Basic alpha-beta pruned minimax with a simple evaluation function.
* `ui.js`: User interface code.
* `chess.include.js`: Includes all of the above files.
* `chess.css`: User interface style.
* `chess.ico`: Icon.
* `chess.html`: Main game file.
* `test.js`: Automated tests.
* `test.html`: Automated test runner.

# Building

To compile the minified version using `compile.sh` in the `build` directory, you need [bash](http://git-scm.com/download/win) and the [Closure compiler](https://developers.google.com/closure/compiler/). You may need to adjust the `.jar` location in `compile.sh`. Compiled files are placed in the top-level directory.

To lint using `lint.sh` in the build directory, you need bash and [JavaScript Lint](http://www.javascriptlint.com/). You may need to adjust lint's path in `lint.sh`.

To run the tests, open `test.html` in the `src` directory.

# TODO

* Static exchange evaluation
* Transposition table
* Iterative deepening
* Negamax formulation
* AI randomness
* Take game phase into account in evaluation
* Take mobility into account in evaluation
* Killer heuristic
* Late-check castling legality
* Tie-detection
* Move pieces without drag and drop
* Underpromotion
* Show captured pieces in the UI
* Don't hardcode board target div to UI
* UI for loading game state from parsable Chess notation(s)
* More tests

# License

The Chess implementation is distributed under the [MIT](https://github.com/kbjorklu/chess/blob/master/LICENSE) license. See accompanying LICENSE file for details.

Third-party components are distributed/used under their respective license:

* jQuery: [MIT](https://github.com/jquery/jquery/blob/master/MIT-LICENSE.txt) (used via jQuery CDN)
* jQuery UI: [MIT](https://github.com/jquery/jquery-ui/blob/master/MIT-LICENSE.txt) (used via jQuery CDN)
* jQuery UI Touch Punch: [MIT](https://github.com/furf/jquery-ui-touch-punch/blob/master/jquery.ui.touch-punch.min.js) (used via CloudFlare CDN)
* Augment.js: [MIT](https://github.com/olivernn/augment.js/blob/master/LICENSE) (used via CloudFlare CDN)
* QUnit: [MIT](https://github.com/jquery/qunit/blob/master/MIT-LICENSE.txt) (used via jQuery CDN)
* The jQuery extern file in the build directory: [Apache 2](http://www.apache.org/licenses/LICENSE-2.0)
