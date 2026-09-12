/**
 * Professional Broadcast Cricket Commentary Engine
 * Cricinfo / Cricbuzz style dynamic commentary phrasing with anti-repetition logic.
 */

// Memory tracker to guarantee non-repeating consecutive phrases
const lastActionIndices = {
    dot: -1,
    single: -1,
    two: -1,
    three: -1,
    four: -1,
    six: -1,
    wicket: -1,
    wide: -1,
    noball: -1,
    bye: -1,
    legbye: -1,
    penalty: -1
};

const DOT_TEMPLATES = {
    cover: [
        "Crisp push off the front foot straight to {zone}. Fielder is vigilant, shutting down any single.",
        "Leans into a drive towards {zone}; fielded cleanly on the bounce on the ring.",
        "Punched firmly towards {zone}, but the fielder swoops in with laser focus — no run.",
        "Drives on the up towards {zone}, but cannot beat the diving fielder."
    ],
    midoff: [
        "Fuller on off stump, punched straight back towards {zone}. {bowler} slides to cut it off.",
        "Solid defense right back down the deck to {bowler}. Straight out of the coaching manual.",
        "Driven with a straight bat down towards {zone}, cannot pierce the inner cordon.",
        "Stroked firmly to {zone}, mid-off fields comfortably on the ring."
    ],
    midon: [
        "Punched straight back towards {zone}, {bowler} nods in appreciation.",
        "Firm push with the full face of the bat straight to {zone}. No run possible.",
        "Defended off the front foot towards {zone}, tidy fielding keeps the batter in the crease."
    ],
    point: [
        "Steered late towards backward point, but the fielder cuts it off with a sharp dive.",
        "Dabbed with soft hands towards {zone}; backward point is alert to deny the run.",
        "Flashes the blade outside off, punched straight to the man stationed at {zone}."
    ],
    thirdman: [
        "Steered late with soft hands towards {zone}, intercepted promptly inside the ring.",
        "Opened the face delicately towards {zone}, short third man cleans up."
    ],
    legside: [
        "Tucked neatly off the hips towards {zone}, fielder closes in quickly to deny the run.",
        "Turned softly towards {zone} on the ring. Good discipline in the field.",
        "Worked off the pads into the leg side, straight to {zone}. {batsman} calls a loud 'NO!'."
    ],
    general: [
        "Good length probing delivery in the corridor of uncertainty, {batsman} shoulders arms safely.",
        "Beaten all ends up! Lovely shape away outside off, whistling past the defensive edge.",
        "Bouncer! Dug in short and sharp, {batsman} sways out of the firing line watchfully.",
        "Speared in full around off stump, defended solidly off the front foot. Tidy bowling by {bowler}.",
        "Sharp movement off the deck! Cuts {batsman} in half as the ball thuds into the keeper's gloves.",
        "Tight line and length on the off stump channel. {batsman} blocks it under the eyes into the pitch.",
        "Fuller delivery searching for swing, {batsman} respects the good ball and drops it on the turf.",
        "Back of a length angling across the right-hander, left alone watchfully through to the keeper."
    ]
};

const SINGLE_TEMPLATES = {
    offside: [
        "Driven on the up through {zone}, sweeper dashes across to keep it to a single.",
        "Steered neatly behind point towards {zone}, brisk call and they hustle through for one.",
        "Dropped softly into the gap at {zone}, gentle wrists and they scamper an easy single.",
        "Punched into the cover pocket, easy single taken to rotate the strike."
    ],
    straight: [
        "Pushed down to {zone} with a straight bat, rotates the strike effortlessly.",
        "Firm push towards {zone}, mid-on gives chase as the batsmen jog through.",
        "Punched down the ground into the vacancy at {zone} for a comfortable single."
    ],
    legside: [
        "Glanced off the pads towards {zone}, brisk running between the wickets.",
        "Flicked wristily into {zone}, calls for 'ONE' immediately and crosses over.",
        "Tucked away off the hips towards deep {zone}, easy single collected.",
        "Nudged into the vacant square leg pocket, simple rotation of the strike."
    ],
    general: [
        "Played with soft hands into the outfield gap, comfortable single for {batsman}.",
        "Dabbed into space, smart cricket to turn the strike over to the partner.",
        "Worked into the vacant pocket, good communication as they cross over safely."
    ]
};

const TWO_TEMPLATES = [
    "Punched off the back foot through {zone}, sweeper covers ground as they hustle back for two!",
    "Flicked through the vacant pocket in {zone}, sharp turn at the danger end and they complete a brisk brace!",
    "Pierces the inner ring towards deep {zone}, superb communication between the wickets for a pair of runs.",
    "Worked sweetly into the gap in {zone}. Good hard running produces a well-earned two.",
    "Driven into the deep pocket past {zone}, long chase for the fielder — comfortable two runs."
];

const THREE_TEMPLATES = [
    "Magnificently placed into the deep pocket at {zone}! Fielders in hot pursuit, superb relay throw keeps it to three!",
    "Driven with exquisite timing through {zone}, long chase all the way to the rope — lightning running yields three!",
    "Carved into the deep outfield gap at {zone}, wonderful sprint between the creases to collect three smart runs."
];

const FOUR_TEMPLATES = [
    "FOUR! Pure class! Leans gracefully into the drive and strokes it through {zone} — races away to the fence!",
    "FOUR! Crunched! Short and wide, slapped with utter authority through {zone} for a scorching boundary!",
    "FOUR! That is sublime! High elbow, straight bat, and drilled past {zone} like a tracer bullet!",
    "FOUR! Deft touch! Opened the blade at the last split-second and glided it exquisitely through {zone}!",
    "FOUR! Swatted away in style! Dispatches the length ball through {zone}, giving the sweepers no chance!",
    "FOUR! Pulled with vengeance! In the hitting slot and crunched away through {zone} to the boundary rope!",
    "FOUR! Gorgeous shot! Punched on the up through {zone}, beat the infield and into the ropes!",
    "FOUR! Sliced over the infield! Clears backward point cleanly and bounces over the boundary line!"
];

const SIX_TEMPLATES = [
    "SIX! Colossal strike! Sits deep in the crease and launches it into orbit over {zone} for an enormous maximum!",
    "SIX! Out of the screws! Stood tall and deposited deep into the grandstands over {zone}!",
    "SIX! High, handsome and into the crowd! In the slot and punished with an effortless loft over {zone}!",
    "SIX! Picked up off the pads and dispatched! Sails miles over {zone} — what an extraordinary shot!",
    "SIX! Pure carnage! Dances down the track, gets under the length and sends it sailing out of the stadium!",
    "SIX! Clean as a whistle! Flat-batted with sheer power over {zone} for six runs!"
];

const WICKET_TEMPLATES = {
    bowled: [
        "TIMBER! Cleaned him up! Stumps shattered as the delivery sneaks past the defensive blade. What a peach from {bowler}!",
        "BOWLED HIM! Absolute jaffa! Beats the inside edge, crashing directly into off-stump! {batsman} has to walk!",
        "CASTLED! Through the gate! Drift, dip and seam — the bails go flying! Spectacular breakthrough for {bowler}!"
    ],
    caught: [
        "OUT! In the air and taken! {batsman} looks to go big over {zone}, miscues it high and {fielder} pouches a calm catch!",
        "CAUGHT! Edged and taken! Pushes at one outside off, sharp reflex catch by {fielder}! Big wicket for {bowler}!",
        "GONE! Skied straight up into the air! {fielder} settles underneath with ice in the veins and completes a crucial catch!",
        "OUT! Taken in the deep! Tries to clear the ropes at {zone}, but holes out straight down the throat of {fielder}!"
    ],
    lbw: [
        "L.B.W.! Huge appeal and up goes the finger! Trapped plumb in front of middle stump, {bowler} gets the breakthrough!",
        "OUT! Given LBW! Struck on the back pad in line with the stumps. No hesitation from the umpire — {batsman} departs!"
    ],
    runout: [
        "RUN OUT! Direct hit! Total chaos in the running, {fielder} swoops in and shatters the stumps with a deadly throw!",
        "OUT! Run out at the danger end! Sent back late, {fielder} throws to the keeper who whips the bails off in a flash!"
    ],
    stumped: [
        "STUMPED! Beaten by flight and dip! Drawn out of the crease, wicketkeeper does the rest with lightning-quick hands!"
    ],
    retired: [
        "RETIRED OUT! {batsman} walks off the field strategically. Wicket added to the bowling column."
    ],
    hitwicket: [
        "HIT WICKET! Unbelievable misfortune! {batsman} rocks back deep in the crease and dislodges the bails with the bat!"
    ],
    general: [
        "OUT! {batsman} is dismissed ({dismissalType} {fielder})! Huge breakthrough in the match for {bowler}!"
    ]
};

const EXTRA_TEMPLATES = {
    wide: [
        "Wide ball! Slips well outside the tramlines, keeper collects and an extra run is conceded.",
        "Wide! Fired too far outside off stump, batsman leaves it alone and the umpire signals wide.",
        "Wide ball! Strays down leg side past the batsman's pads, bonus run gifted to the batting team."
    ],
    noball: [
        "NO BALL! Overstepped the popping crease! Extra run awarded to the batting side and FREE HIT coming up!",
        "NO BALL! High full toss above waist height! Siren sounds and free hit conceded.",
        "NO BALL! Front foot over the line! Bowler oversteps and gives away a free hit opportunity!"
    ],
    bye: [
        "Bye! Sneaks past the outside edge and keeper fumbles, batsmen spot the opportunity and steal a bye.",
        "Bye taken! Ball beats both bat and keeper, smart heads-up running allows a single."
    ],
    legbye: [
        "Leg bye! Deflected off the front pad into the vacant outfield, batsmen scamper through safely.",
        "Leg bye taken! Thuds onto the thigh pad and rolls away, batsmen rotate the strike."
    ],
    penalty: [
        "PENALTY! +{runs} penalty marks awarded directly to {teamName} as extras!"
    ]
};

function getNextNonRepeatingIndex(key, poolLength) {
    if (poolLength <= 1) return 0;
    const last = lastActionIndices[key] ?? -1;
    let next = (last + 1) % poolLength;
    if (poolLength > 3 && Math.random() > 0.6) {
        next = (next + 1) % poolLength;
    }
    lastActionIndices[key] = next;
    return next;
}

/**
 * Generates smart, varied professional cricket commentary
 */
export function generateSmartCommentary({
    runs = 0,
    isWicket = false,
    dismissalType = '',
    dismissalFielder = '',
    isExtra = false,
    extraType = '',
    extraRuns = 0,
    strikerName = 'Striker',
    bowlerName = 'Bowler',
    wagonZone = '',
    battingTeamName = 'Batting Team',
    ballIndex = 0
}) {
    const zone = wagonZone || 'the outfield';
    const cleanZone = zone.toLowerCase();
    const striker = strikerName || 'Batsman';
    const bowler = bowlerName || 'Bowler';

    // 1. Wickets
    if (isWicket) {
        const dType = (dismissalType || '').toLowerCase();
        let pool = WICKET_TEMPLATES.general;

        if (dType.includes('bowled')) pool = WICKET_TEMPLATES.bowled;
        else if (dType.includes('caught')) pool = WICKET_TEMPLATES.caught;
        else if (dType.includes('lbw')) pool = WICKET_TEMPLATES.lbw;
        else if (dType.includes('run out')) pool = WICKET_TEMPLATES.runout;
        else if (dType.includes('stump')) pool = WICKET_TEMPLATES.stumped;
        else if (dType.includes('retired')) pool = WICKET_TEMPLATES.retired;
        else if (dType.includes('hit wicket')) pool = WICKET_TEMPLATES.hitwicket;

        const idx = getNextNonRepeatingIndex('wicket', pool.length);
        return pool[idx]
            .replace('{batsman}', striker)
            .replace('{bowler}', bowler)
            .replace('{fielder}', dismissalFielder || 'the fielder')
            .replace('{zone}', zone)
            .replace('{dismissalType}', dismissalType || 'out');
    }

    // 2. Extras
    if (isExtra) {
        const eType = (extraType || '').toLowerCase();
        let pool = EXTRA_TEMPLATES.wide;
        let key = 'wide';

        if (eType.includes('penalty')) {
            pool = EXTRA_TEMPLATES.penalty;
            key = 'penalty';
        } else if (eType.includes('no ball')) {
            if (runs > 0) {
                const nbBatTemplates = [
                    "NO BALL! Overstepped the line and {batsman} punishes it, hitting toward {zone} for {runs} runs! Free Hit coming up!",
                    "NO BALL! Free hit signaled! {batsman} connects well and drives through {zone} for {runs} runs!",
                    "NO BALL & BOUNDARY! Overstepped the mark! {batsman} hammers it away through {zone} for {runs} runs, plus 1 penalty run!"
                ];
                const idx = getNextNonRepeatingIndex('noball_hit', nbBatTemplates.length);
                return nbBatTemplates[idx]
                    .replace('{batsman}', striker)
                    .replace('{bowler}', bowler)
                    .replace('{zone}', zone)
                    .replace('{runs}', runs);
            }
            pool = EXTRA_TEMPLATES.noball;
            key = 'noball';
        } else if (eType.includes('leg bye')) {
            pool = EXTRA_TEMPLATES.legbye;
            key = 'legbye';
        } else if (eType.includes('bye')) {
            pool = EXTRA_TEMPLATES.bye;
            key = 'bye';
        }

        const idx = getNextNonRepeatingIndex(key, pool.length);
        return pool[idx]
            .replace('{bowler}', bowler)
            .replace('{batsman}', striker)
            .replace('{runs}', extraRuns || 1)
            .replace('{teamName}', battingTeamName);
    }

    // 3. Sixes
    if (runs >= 6) {
        const idx = getNextNonRepeatingIndex('six', SIX_TEMPLATES.length);
        return SIX_TEMPLATES[idx]
            .replace('{batsman}', striker)
            .replace('{bowler}', bowler)
            .replace('{zone}', zone);
    }

    // 4. Fours
    if (runs === 4 || runs === 5) {
        const idx = getNextNonRepeatingIndex('four', FOUR_TEMPLATES.length);
        return FOUR_TEMPLATES[idx]
            .replace('{batsman}', striker)
            .replace('{bowler}', bowler)
            .replace('{zone}', zone);
    }

    // 5. Threes
    if (runs === 3) {
        const idx = getNextNonRepeatingIndex('three', THREE_TEMPLATES.length);
        return THREE_TEMPLATES[idx]
            .replace('{batsman}', striker)
            .replace('{bowler}', bowler)
            .replace('{zone}', zone);
    }

    // 6. Twos
    if (runs === 2) {
        const idx = getNextNonRepeatingIndex('two', TWO_TEMPLATES.length);
        return TWO_TEMPLATES[idx]
            .replace('{batsman}', striker)
            .replace('{bowler}', bowler)
            .replace('{zone}', zone);
    }

    // 7. Singles
    if (runs === 1) {
        let pool = SINGLE_TEMPLATES.general;
        if (cleanZone.includes('cover') || cleanZone.includes('point') || cleanZone.includes('third')) {
            pool = SINGLE_TEMPLATES.offside;
        } else if (cleanZone.includes('off') || (cleanZone.includes('on') && !cleanZone.includes('mid-on'))) {
            pool = SINGLE_TEMPLATES.straight;
        } else if (cleanZone.includes('leg') || cleanZone.includes('wicket') || cleanZone.includes('midon')) {
            pool = SINGLE_TEMPLATES.legside;
        }
        const idx = getNextNonRepeatingIndex('single', pool.length);
        return pool[idx]
            .replace('{batsman}', striker)
            .replace('{bowler}', bowler)
            .replace('{zone}', zone);
    }

    // 8. Dot Balls (0 runs)
    let pool = DOT_TEMPLATES.general;
    if (cleanZone.includes('cover')) {
        pool = DOT_TEMPLATES.cover;
    } else if (cleanZone.includes('mid-off') || cleanZone.includes('midoff')) {
        pool = DOT_TEMPLATES.midoff;
    } else if (cleanZone.includes('mid-on') || cleanZone.includes('midon')) {
        pool = DOT_TEMPLATES.midon;
    } else if (cleanZone.includes('point')) {
        pool = DOT_TEMPLATES.point;
    } else if (cleanZone.includes('third')) {
        pool = DOT_TEMPLATES.thirdman;
    } else if (cleanZone.includes('leg') || cleanZone.includes('wicket')) {
        pool = DOT_TEMPLATES.legside;
    }

    const idx = getNextNonRepeatingIndex('dot', pool.length);
    return pool[idx]
        .replace('{batsman}', striker)
        .replace('{bowler}', bowler)
        .replace('{zone}', zone);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateSmartCommentary, default: generateSmartCommentary };
}

export default generateSmartCommentary;
