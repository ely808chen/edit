/**
 * The town, 64 x 40 tiles. Edit freely: every row must stay 64 characters, and every
 * house (h) needs a walkable tile directly below it for its door.
 *
 * Legend
 *   .  grass            =  road              ~  water
 *   s  sand (beach)     #  building footprint h  house
 *   T  tree             p  plaza (paved)     g  park lawn
 *   f  fountain         d  sports ground     a  covered arcade
 *   k  stone steps      b  old stone bridge  B  road bridge
 *   r  railway
 */
export const TOWN_ROWS: readonly string[] = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT~~~TTTTTTTTTTTTTTTTT',
  'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrTTTTTTT####TTTTT',
  '........########............................~~~.TTTTTTT####TTTTT',
  '.T.T.T..########...T.T..T.T.T.T.T.T.T.T.T.T.~~~.TTTTppppppppppTT',
  '============================================BBB==TT.ppppppppppTT',
  'hhh.hhh=ppppppppp=.####........=....ppppppp=~~~.=TT.ppppppppppTT',
  '.......=ppppppppp=.####.#######=####pppp##p=~~~.=TTTppppppppppTT',
  'hhh.hhh=hhh.hhh.h=.####.#######=####pppp##p=~~~.=TTTTTTTkkTTTTTT',
  '.......=.........=.####.aaaaaaaaaaaappppppp=~~~.=TTTTTTTkkTTTTTT',
  'hhh.hhh=hhh.hhh.h=.####.#######=####ppppppp=~~~.=TTTTTTTkkTTTTTT',
  '.......=.........=pppppp#######=####ppppppp=~~~.=TTTTTTTkkTTTTTT',
  '.......=.........=pppppp.......=....ppppppp=~~~.=.......kk......',
  '============================================bbb=================',
  '#######=ggggggggggpggggggggggg.=####.......=~~~.=.T...........T.',
  '#######=gTgggTggggpggggTgggTggT=####.hh.hh.=~~~.=..###########..',
  '#######=gggTggggggpgggTggTgggg.=ppppppp....=~~~.=..###########..',
  'ppppppp=ggggggTgggpgggggggggTg.=ppppppp....=~~~.=T.###########..',
  'ddddddd=gggggggggppppggggggggg.=hhh.hhh.hhh=~~~.=..###########..',
  'ddddddd=ppppppppppffpppppppppp.=...........=~~~.=T.###########..',
  'ddddddd=gggTgggggpffpggggggggg.=.#######...=~~~.=..###########..',
  'ddddddd=gggggggggppppgggggTgggT=.#######.hh=~~~.=ppppppppppppppp',
  'ddddddd=ggTgggTggggpgggggggggg.=.#######...=~~~.=ppppppppppppppp',
  'ddddddd=gggggggggggpggggTgggTg.=.#######.hh=~~~.=T............T.',
  'ddddddd=ggggTggggggpgggggggggg.=ppppppppp..=~~~.=hhh.hhh.hhh.hhh',
  'ddddddd=gTgggggTgggpggTgggTgggT=ppppppppp..=~~~.=...............',
  '.......=gggggggggggpgggggggggg.=...........=~~~.=...............',
  '============================================BBB=================',
  'hhh.hhh=hhh.hhh.hhh.hhh.hhh.hhh=hhh.hhh.hhh=~~~.=hhh.hhh.hhh.hhh',
  '.......=.......................=...........=~~~.=...............',
  'hhh.hhh=hhh.hhh.hhh.hhh.hhh.hhh=hhh.hhh.hhh=~~~.=hhh.hhh.hhh.hhh',
  '.......=.......................=...........=~~~.=...............',
  'hhh.hhh=hhh.hhh.hhh.hhh.hhh.hhh=hhh.hhh.hhh=~~~.=hhh.hhh.hhh.hhh',
  '.......=.......................=...........=~~~.=...............',
  '============================================BBB=================',
  'ssssssssssssssssssssssssssssssssssssssssssss~~~sssssssssssssssss',
  'ssssssssssssssssssssssssssssssssssssssssssss~~~sssssssssssssssss',
  'ssssssssssssssssssssssssssssssssssssssssssss~~~sssssssssssssssss',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
];
