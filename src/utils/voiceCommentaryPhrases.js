/**
 * E-Legends Trophy 2K26 — Voice Commentary Phrase Banks
 * Professional broadcast-quality cricket commentary with
 * anti-repetition logic and varied phrasing per outcome.
 */

// ─── Rolling Phrase Buffer ──────────────────────────────────────────────────
const recentlyUsed = {};

/**
 * Pick a phrase from a pool, avoiding recently used ones.
 */
export function pickPhrase(key, pool, avoidCount = 8) {
    if (!pool || pool.length === 0) return '';
    if (pool.length === 1) return pool[0];

    const maxAvoid = Math.max(1, Math.min(pool.length - 1, avoidCount));
    const used = recentlyUsed[key] || [];
    const available = pool
        .map((phrase, idx) => ({ phrase, idx }))
        .filter(({ idx }) => !used.includes(idx));

    const candidates = available.length > 0 ? available : pool.map((phrase, idx) => ({ phrase, idx }));
    const pick = candidates[Math.floor(Math.random() * candidates.length)];

    recentlyUsed[key] = [...used, pick.idx].slice(-maxAvoid);
    return pick.phrase;
}

/**
 * Clean and format player names for clear, natural speech synthesis enunciation.
 * Strips roles like (c), (wk), removes not-out asterisks, expands dotted initials
 * (e.g. "P.K." -> "P K ") so TTS reads letters clearly instead of "dot" or pausing,
 * and converts ALL-CAPS names to natural Title Case.
 */
export function cleanPlayerNameForSpeech(rawName = '') {
    if (!rawName || typeof rawName !== 'string') return '';
    let name = rawName.trim();
    // 1. Remove parenthesized tags like (c), (wk), (c & wk), (sub), (rhb), (lhb), (18)
    name = name.replace(/\s*\((?:c|wk|c\s*&?\s*wk|sub|rhb|lhb|\d+)\)/gi, '');
    name = name.replace(/\s*\[(?:c|wk|c\s*&?\s*wk|sub|rhb|lhb|\d+)\]/gi, '');
    // 2. Remove asterisks (not-out mark), hash symbols
    name = name.replace(/[*#]/g, '').trim();
    // 3. Separate dotted initials with spaces so speech engine spells them out clearly:
    // e.g. "P.K. Perera" -> "P K Perera", "K.L. Rahul" -> "K L Rahul"
    name = name.replace(/([A-Za-z])\.(?=[A-Za-z]|\s|$)/g, '$1 ');
    // 4. Collapse multiple spaces
    name = name.replace(/\s+/g, ' ').trim();
    // 5. If words are uppercase of length >= 3, convert to Titlecase:
    name = name.split(' ').map(part => {
        if (/^[A-Z]{3,}$/.test(part)) {
            return part.charAt(0) + part.slice(1).toLowerCase();
        }
        return part;
    }).join(' ');
    return name;
}

// ─── Ball Outcome Phrases ──────────────────────────────────────────────────

// ─── Natural TTS Broadcast Phrases ───────────────────────────────────────────
// Written for spoken-word delivery, not visual text.
// Rules: No ALL-CAPS words (they sound robotic). No written-out laughter.
// Sentences flow naturally with commas guiding breath pauses.
// Think: Harsha Bhogle, Richie Benaud, Isa Guha on air.
export const VOICE_PHRASES = {

    six: [
        "That's been absolutely smashed. Gone, high and far, into the grandstand. What a hit.",
        "He's picked that up beautifully and launched it into the crowd. Six. A magnificent strike.",
        "He stands tall and deposits that deep into the stands. Pure timing and pure power.",
        "That's cleared the ropes with ease. An enormous hit, and the crowd is absolutely loving it.",
        "Gone. All the way over the boundary rope. What a clean, clean hit.",
        "The bat swing there was effortless. Full face of the blade, and it's sailed over the rope for six.",
        "High, handsome, and into the crowd. Six runs. A sensational maximum.",
        "That's one of the biggest hits you'll see today. Sails clean into the stands."
    ],

    four: [
        "That's raced away to the fence. Beautifully timed, through the gap, four runs.",
        "What a stroke. Driven firmly, and it's beaten the fielders all ends up. A boundary.",
        "Lovely placement. Finds the gap in the ring and trickles all the way to the rope. Four.",
        "Clipped away sweetly and it's four. No stopping that on this outfield.",
        "Threaded right through the gap. A really elegant boundary.",
        "Exquisite timing. Races away to the fence for four.",
        "Struck with real authority. It races to the boundary.",
        "Found the gap beautifully. That will beat the fielders to the rope. Four runs."
    ],

    three: [
        "Three runs. Excellent running between the wickets — they've hustled hard for those three.",
        "Driven into the deep and they sprint back for a brilliant three. Superb running.",
        "Three runs added. Good communication between the batters out there."
    ],

    two: [
        "Two runs. Good hard running between the wickets — they've turned that into a comfortable brace.",
        "A couple of runs. Pushed into the gap and they hustle through for two with ease.",
        "Good placement into the outfield and they complete a comfortable two runs.",
        "Worked away for two. Excellent cricket, rotating the strike and building steadily."
    ],

    one: [
        "One run. Rotates the strike — good cricket to keep the scoreboard ticking over.",
        "Single taken. Smart play, keeping the run rate moving without risking a wicket.",
        "Nudged into the gap and they jog through for a comfortable single.",
        "One run added. Steady accumulation, the partnership is building nicely here.",
        "Placed with soft hands and they scamper through — running hard between the wickets."
    ],

    dot: [
        "Dot ball. Excellent bowling — tight line and length, the batter can't find any room.",
        "No run. Beaten outside off — good shape away from the bat there.",
        "Good discipline from the bowler. Beats the bat with a touch of late movement. Dot ball.",
        "Defended solidly — the batter plays it back down the pitch safely.",
        "A probing delivery on a good length — the batter has to be content to defend.",
        "Tight bowling. Gives absolutely nothing away to the batter. Dot ball.",
        "Well bowled. Bowler hits the deck hard and keeps it scoreless. Dot ball.",
        "Good ball. Beats the inside edge and nestles into the wicketkeeper's gloves.",
        "Driven with authority, but straight into the mid-off ring. No run.",
        "Tapped into the covers. The fielder moves quickly to cut it off. Scoreless.",
        "Right on the money in the corridor of uncertainty. Batter lets it go through.",
        "Speared into the blockhole! Dug out defensively onto the pitch. No run.",
        "Back of a length, angling into the body. Batter hops back and defends softly.",
        "Play and a miss! Whistles past the outside edge. Bowler has hands on head.",
        "Punched off the back foot, but cut off cleanly by the ring fielder. Dot ball.",
        "Good change of pace. Batter deceived by the slower ball and drops it at their feet.",
        "Pushed towards point, fielder is alert on the bounce. No run there.",
        "Full and straight, defended with the full face of the blade.",
        "Left alone outside the off stump. Through to the wicketkeeper cleanly.",
        "Banged in short, batter sways out of the line and lets it travel through.",
        "Defended back to the bowler on the follow-through. Pinned down.",
        "Hard length, cramming the batter for room. Another dot added to the tally.",
        "Cut hard, but finds the point fielder on the bounce. No run.",
        "Beaten by the seam movement! That jagged back in and cut the batter in half."
    ],

    wide: [
        "That's called wide. Strays well outside the tramlines — a free run to the batting side.",
        "Wide ball. The umpire raises both arms — too far down the leg side. A free run.",
        "Wide by the umpire. The bowler will be disappointed with that one."
    ],

    noball: [
        "No ball. The front foot has gone over the line — an extra is awarded, and a free hit is on the way.",
        "No ball signaled. Overstepped by the bowler, and that means a free hit delivery to follow.",
        "The umpire calls no ball. The bowler has overstepped the crease — a free hit is coming up."
    ],

    freehit: [
        "Free hit. The batter cannot be dismissed except by a run out — a real opportunity here.",
        "It's a free hit ball. The batter can swing as hard as they like with no risk of losing a wicket.",
        "Free hit coming up. No fear for the batter — this is a genuine chance for big runs."
    ],

    bye: [
        "Bye. Sneaks past the outside edge and the keeper fumbles — the batters steal a bye.",
        "Bye taken. Smart heads-up running as the ball beats the wicketkeeper."
    ],

    legbye: [
        "Leg bye. Deflected off the pad and rolls into the gap — they scamper through safely.",
        "Leg bye taken. Good presence of mind from the batters, rotating the strike."
    ],

    wicket_bowled: [
        "He's bowled him. The off stump is back. What a delivery — it nipped back sharply off the pitch.",
        "Through the gate. The batter played across the line and the ball went clean through the defence.",
        "Clean bowled. The batter has no answer to that one — an outstanding delivery.",
        "The stumps are down. That pitched on a good length and came back just enough to beat the inside edge.",
        "Uprooted! What an unplayable delivery — crashing straight into the stumps!"
    ],

    wicket_caught: [
        "He's hit that in the air, and it's taken. A good catch. The batter has to make the long walk back.",
        "Skied high into the outfield and safely held. A really important wicket.",
        "Tried to go big, but has holed out to the fielder. That's the end of that innings.",
        "In the air and safely held! The partnership is broken."
    ],

    wicket_caught_behind: [
        "Edged and taken behind! A faint feather through to the wicketkeeper.",
        "Caught behind! The keeper makes no mistake with soft hands.",
        "Thin nick outside off stump and safely pouched with the gloves."
    ],

    wicket_caught_and_bowled: [
        "Caught and bowled! What a breathtaking reflex return catch in the follow-through!",
        "Straight back down the pitch and clung onto! Snatched out of thin air off his own bowling!",
        "Caught and bowled! Phenomenal athletic reaction to pluck that out of the air!"
    ],

    wicket_caught_slip: [
        "Edged and taken in the slips! Flew fast at waist height and safely held in the cordon.",
        "Thick outside edge carried cleanly to the slip cordon! Outstanding concentration and catch.",
        "Slashed outside off stump, grabbed at slip! A classic corridor delivery."
    ],

    wicket_caught_deep: [
        "High in the air towards the boundary rope, and taken cleanly! Holed out in the deep!",
        "Skied high down the ground! The fielder settles underneath it right inside the rope and takes a calm catch.",
        "He went for the big maximum, but didn't get all of it! Safely caught right inside the cushion!"
    ],

    wicket_lbw: [
        "Big appeal, and the umpire's finger goes straight up. Trapped right in front of the stumps.",
        "Given out, leg before wicket. Struck plumb on the back pad in line — no hesitation from the umpire.",
        "Huge shout for LBW, and given! That ball straightened down the line and had middle and leg written all over it.",
        "Dead in front of the stumps! Trapped right in the crease and the finger goes up!"
    ],

    wicket_runout: [
        "Run out. Direct hit. Total chaos in the running, and the batter is caught well short of the crease.",
        "Run out. Sent back too late — the throw was arrow-straight, and the bails are off.",
        "Disaster between the wickets! Hesitation mid-pitch, a quick pickup and throw, and the bails are broken.",
        "A suicidal single attempt! The fielder swoops in and shatters the stumps!"
    ],

    wicket_stumped: [
        "Stumped. Drawn well out of the crease, beaten by the turn, and lightning glovework behind the stumps.",
        "Stumped. Beaten by the flight, and the keeper whips the bails off in a flash.",
        "Dancing down the track, deceived in the air, and the keeper removes the bails before the foot can get back!",
        "Lured down the pitch, no return as the keeper collects cleanly and breaks the stumps in style!"
    ],

    wicket_hitwicket: [
        "Hit wicket. The batter has dislodged the bails with the backswing of the bat. A very unfortunate dismissal.",
        "He has knocked his own stumps down! Hit wicket! Stepped too deep into his crease and clipped the peg!",
        "What a bizarre dismissal! Hit wicket! The bat swung back and took the bail clean off the stumps!"
    ],

    wicket_retired_hurt: [
        "Retired hurt. The batter is walking off, unable to continue after that incident.",
        "An unfortunate sight as the batter is forced off retired hurt. We hope it is nothing too serious."
    ],

    wicket_general: [
        "The wicket has fallen. A big moment in this match.",
        "Dismissed. That is a huge wicket for the bowling side.",
        "Breakthrough! The batter has to take the long walk back to the pavilion."
    ],

    milestone_fifty: [
        "Fifty runs. What a milestone. The crowd are on their feet to applaud a superb half-century.",
        "The fifty is up. A brilliant innings, and well-deserved recognition from this crowd.",
        "Fifty. Raises the bat and soaks in the applause — a crucial innings taking real shape here."
    ],

    milestone_century: [
        "One hundred. Three figures. What a magnificent innings — simply outstanding from start to finish.",
        "The century is reached. A monumental achievement, and the crowd is going absolutely wild."
    ],

    fill_intro: [
        "While we wait for the next delivery, let me give you a snapshot of where this match stands.",
        "Here's a look at the key numbers as we pause between deliveries.",
        "Let's take stock of the situation as the bowler returns to his mark.",
        "As the fielding side resets, here's what the scorecard tells us right now.",
        "The bowler is walking back to his run-up — let me talk you through the current figures."
    ]
};

// ─── Fill Commentary Generators (Dynamic, Stat-Based) ──────────────────────

export function fillRunRate({ teamName, runs, overs, crr, target, runsNeeded, ballsRemaining, isChasing }) {
    const currentOvers = Number(overs || 0);
    const totalBallsBowled = Math.floor(currentOvers) * 6 + Math.round((currentOvers % 1) * 10);

    // At the start of innings (< 15 balls), do NOT speak premature team run rates or micro-scores
    if (totalBallsBowled < 15) {
        if (isChasing && target && runsNeeded > 0) {
            const rrReq = ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : '0.00';
            return pickPhrase('fill_rr_chase_start', [
                `${teamName} need ${runsNeeded} runs to reach the target of ${target} — a required rate of ${rrReq} per over.`,
                `Target ${target}: ${teamName} need ${runsNeeded} runs from ${ballsRemaining} deliveries. Required rate sitting at ${rrReq}.`,
                `The chase is on for ${teamName}. Aiming for ${target} at a required run rate of ${rrReq} runs an over.`
            ]);
        }
        return null;
    }

    const rr = parseFloat(crr || 0).toFixed(2);
    if (isChasing && target && runsNeeded > 0) {
        const rrReq = ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : '0.00';
        return pickPhrase('fill_rr_chase', [
            `${teamName} need ${runsNeeded} more runs off ${ballsRemaining} balls — a required rate of ${rrReq} per over. The pressure is mounting.`,
            `${runsNeeded} to win from ${ballsRemaining} balls. At a required rate of ${rrReq}, ${teamName} need to keep the accelerator pressed.`,
            `The equation for ${teamName}: ${runsNeeded} runs needed, ${ballsRemaining} balls remaining. Required run rate sitting at ${rrReq}.`,
            `With ${ballsRemaining} balls left and ${runsNeeded} still to get, ${teamName} are in a race against the clock here.`
        ]);
    }
    return pickPhrase('fill_rr_bat', [
        `${teamName} are motoring along at a current run rate of ${rr} per over — ${runs} runs from ${overs} overs so far.`,
        `The run rate for ${teamName} stands at ${rr}. They've put ${runs} on the board in ${overs} overs.`,
        `${runs} runs in ${overs} overs for ${teamName} — a run rate of ${rr} per over at the moment.`
    ]);
}

export function fillStriker({ name, runs, balls, fours = 0, sixes = 0 }) {
    if (!name || name === 'Striker' || name === 'Batsman' || runs == null) return null;
    const cleanName = cleanPlayerNameForSpeech(name);
    const sr = balls > 0 ? ((runs / balls) * 100).toFixed(2) : '0.00';
    const bParts = [];
    if (fours > 0) bParts.push(`${fours} four${fours > 1 ? 's' : ''}`);
    if (sixes > 0) bParts.push(`${sixes} six${sixes > 1 ? 'es' : ''}`);
    const boundaryStr = bParts.length > 0 ? `, including ${bParts.join(' and ')}` : '';
    const form = runs > 50 ? 'in majestic form' : runs > 30 ? 'playing a superb innings' : runs > 15 ? 'building a fine knock' : 'finding his feet';
    return pickPhrase('fill_striker', [
        `${cleanName} is on ${runs} runs from ${balls} balls${boundaryStr} — striking at ${sr}. Looking very comfortable out there.`,
        `At the crease, ${cleanName} has contributed ${runs} off ${balls} deliveries${boundaryStr}. A strike rate of ${sr}.`,
        `${cleanName}: ${runs} runs, ${balls} balls faced${boundaryStr}. Strike rate of ${sr} — ${form}.`,
        `The striker ${cleanName} is now on ${runs} off ${balls}. That is a strike rate of ${sr}${boundaryStr ? ` with ${boundaryStr}` : ''} — keeping the innings moving.`,
        `Focus on ${cleanName} at the crease: ${runs} runs, ${balls} balls${boundaryStr}. The scoreboard pressure seems to be sitting well on those shoulders.`,
        `${cleanName} has been ${form} — ${runs} off ${balls} with a strike rate of ${sr}. ${runs >= 25 ? 'A knock of real quality.' : 'Looks composed and assured at the crease.'}`
    ]);
}

export function fillNonStriker({ name, runs, balls }) {
    if (!name || name === 'Non-Striker' || name === 'Batsman' || runs == null) return null;
    const cleanName = cleanPlayerNameForSpeech(name);
    const sr = balls > 0 ? ((runs / balls) * 100).toFixed(2) : '0.00';
    return pickPhrase('fill_nonstriker', [
        `At the non-striker's end, ${cleanName} is on ${runs} off ${balls} balls — a strike rate of ${sr}.`,
        `${cleanName} at the other end has made ${runs} from ${balls} deliveries. Strike rate: ${sr}.`,
        `The partnership is in good hands — ${cleanName} at the non-striker's end has contributed ${runs} from ${balls} balls.`,
        `${cleanName} is watching closely from the non-striker's end with ${runs} runs to the name — a very important presence in the middle.`,
        `Worth noting at the other end: ${cleanName} has chipped in with ${runs} off ${balls} balls — batting intelligently and keeping the fielding side honest.`
    ]);
}

export function fillBowler({ name, overs, runs, wickets, maidens = 0, balls }) {
    if (!name || name === 'Active Bowler' || name === 'Bowler') return null;
    const cleanName = cleanPlayerNameForSpeech(name);
    let decimalOvers = 0;
    if (balls != null && balls > 0) {
        decimalOvers = balls / 6;
    } else if (overs != null && overs > 0) {
        const fullOvers = Math.floor(overs);
        const partBalls = Math.round((overs % 1) * 10);
        decimalOvers = fullOvers + (partBalls / 6);
    }
    const economy = decimalOvers > 0 ? (runs / decimalOvers).toFixed(2) : '0.00';
    const wicketStr = wickets > 0 ? `${wickets} wicket${wickets > 1 ? 's' : ''} for ` : '';
    return pickPhrase('fill_bowler', [
        `${cleanName} is the bowler in action — ${wicketStr}${runs} runs from ${overs} overs. Economy rate: ${economy}.`,
        `The bowling figures for ${cleanName}: ${overs} overs, ${runs} runs, ${wickets} wicket${wickets !== 1 ? 's' : ''}. Economy of ${economy} per over.`,
        `${cleanName} running in — ${runs} runs conceded from ${overs} overs, ${wickets > 0 ? `picking up ${wickets} wicket${wickets > 1 ? 's' : ''}` : 'yet to take a wicket'}. Economy: ${economy}.`,
        `${cleanName} at ${overs} overs: ${wicketStr}${runs} runs — economy of ${economy}. ${wickets > 0 ? 'Finding some real rhythm here.' : 'Building the pressure delivery by delivery.'}`,
        `The captain has kept faith in ${cleanName} — ${overs} overs, ${runs} runs, ${wickets} wicket${wickets !== 1 ? 's' : ''}. An economy of ${economy} tells the story.`,
        `${cleanName} has bowled ${overs} overs in this spell — ${wickets > 1 ? `taking ${wickets} wickets and` : wickets === 1 ? 'a wicket to the name and' : ''} conceding at ${economy} per over. ${Number(economy) < 7.00 ? 'Excellent control.' : 'Some expensive deliveries mixed in.'}`
    ]);
}

export function fillPartnership({ batter1Name, batter2Name, runs, balls }) {
    if (!runs || runs <= 0) return null;
    const rpo = balls > 0 ? ((runs / balls) * 6).toFixed(2) : '0.00';
    const quality = runs > 80 ? 'a match-defining' : runs > 50 ? 'a very fine' : runs > 30 ? 'a solid' : 'a growing';
    return pickPhrase('fill_partnership', [
        `The current partnership between ${batter1Name} and ${batter2Name} stands at ${runs} runs from ${balls} balls — a run rate of ${rpo} per over.`,
        `${batter1Name} and ${batter2Name} have put together ${runs} runs for this wicket — ${balls} balls faced at a clip of ${rpo} per over.`,
        `A partnership of ${runs} runs is developing here between ${batter1Name} and ${batter2Name}. They've faced ${balls} balls together.`,
        `That is ${quality} stand: ${batter1Name} and ${batter2Name} have added ${runs} together at ${rpo} per over. The bowling side needs a breakthrough.`,
        `The partnership reads ${runs} off ${balls} for ${batter1Name} and ${batter2Name} — a run rate of ${rpo} per over. This alliance is proving very difficult to break.`,
        `${batter1Name} and ${batter2Name} appear very comfortable together — ${runs} runs from ${balls} balls at ${rpo} per over. Real authority in this partnership.`
    ]);
}

/**
 * Attractive scene-setting commentary for the start of the 1st innings.
 * Avoids boring score recaps when 0 or very few runs have been scored.
 * Speaks exciting, vivid, broadcast-quality atmospheric descriptions.
 */
export function fillInningsOpeningAtmosphere({ battingTeam, bowlingTeam, overLimit }) {
    return pickPhrase('fill_innings_atmosphere', [
        `What a sensational atmosphere here today! The stands are packed, the banners are waving, and the anticipation for this first innings is electric!`,
        `Welcome to the middle! Fresh pitch, hard new ball, and an electric atmosphere here at the ground!`,
        `A pristine deck beneath our feet, clear skies overhead, and two passionate teams ready to battle it out for championship glory!`,
        `There is nothing quite like the start of a match — the shine on that brand new leather ball, slips waiting expectantly in the cordon, and the openers striding out!`,
        `The field is set with slips in place — the battle between the new ball and the openers is officially underway.`,
        `Beautiful batting conditions today — true bounce on the surface, and the openers will look to settle in before opening their shoulders.`,
        `The opening bowlers will be licking their lips with this hard seam and lively deck, looking for early swing against disciplined stroke play.`,
        `Listen to that roar from the crowd! A brand new match waiting to unfold under these pristine conditions.`,
        `The pitch looks a beauty — good carry through to the keeper, even pace, and a lightning-fast outfield that will reward true timing.`,
        `Opening spells in limited-overs cricket are pure theatre — looking for that early swing while the batsman's forward stride is tested.`,
        `The smell of freshly cut grass, a packed stadium, and two top-class sides going toe-to-toe! This is what big-match cricket is all about!`,
        `Captains and coaches have laid their master plans, but it all comes down to execution here in these vital opening overs.`,
        `Every ball in these opening overs carries weight. Establishing authority early on can completely dictate the tempo of this contest!`
    ]);
}

/**
 * Engaging chase-oriented commentary for the start of the 2nd innings.
 * Prominently highlights the target score, required run rate, and chase dynamics.
 * Never speaks dry micro-scores like "2 for 0".
 */
export function fillInningsChaseSetup({ battingTeam, bowlingTeam, target, overLimit, overs, runs, wickets }) {
    if (!target || target <= 0) {
        return pickPhrase('fill_chase_start_notarget', [
            `Welcome to the second innings chase! ${battingTeam} will be looking to set the pace early in the powerplay.`,
            `The chase is underway. ${bowlingTeam} have the new ball in hand, searching for those crucial early breakthroughs.`
        ]);
    }
    const oversNum = Number(overLimit || 20);
    const totalBalls = oversNum * 6;
    const rrr = oversNum > 0 ? (target / oversNum).toFixed(2) : '0.00';
    return pickPhrase('fill_chase_start', [
        `The target is set: ${target} runs to win from ${oversNum} overs for ${battingTeam}. An exciting pursuit ahead!`,
        `${battingTeam} need ${target} runs for victory. The required run rate is sitting at ${rrr} runs per over from the outset.`,
        `A target of ${target} on the board. ${battingTeam} will look to make the most of these powerplay overs with the field up in the ring.`,
        `The equation for ${battingTeam} is crystal clear: ${target} runs required from ${totalBalls} balls. A steady start will be vital.`,
        `${target} is the target today. If ${bowlingTeam} can strike with early wickets, the scoreboard pressure will really begin to tell.`,
        `In pursuit of ${target}! Crisp batting and smart strike rotation will be the blueprint for ${battingTeam} on this track.`,
        `${bowlingTeam} defending ${target} — their opening bowlers will be desperate to strike early and put ${battingTeam} on the back foot.`,
        `Target ${target} to win! Chasing under scoreboard pressure is always a stern test, and these opening overs will shape the chase.`,
        `A target of ${target} to defend. The field is spread with only two boundary riders out in the powerplay — prime real estate for the openers to exploit!`,
        `Here comes the run chase! ${battingTeam} need ${target} runs to take the honours. Positive intent from ball one will be the captain's call!`
    ]);
}

export function fillMatchSituation({ battingTeam, bowlingTeam, runs, wickets, overs, overLimit, isChasing, target }) {
    const currentOvers = Number(overs || 0);
    const totalBallsBowled = Math.floor(currentOvers) * 6 + Math.round((currentOvers % 1) * 10);
    const oversLeft = Math.max(0, overLimit - overs).toFixed(1);

    // If start of innings (under 2.3 overs / < 15 balls), do NOT speak raw team score (e.g. 0/0 or 2/0)
    if (totalBallsBowled < 15) {
        if (isChasing || target) {
            return fillInningsChaseSetup({ battingTeam, bowlingTeam, target, overLimit, overs, runs, wickets });
        }
        return fillInningsOpeningAtmosphere({ battingTeam, bowlingTeam, overLimit });
    }

    if (isChasing && target) {
        return pickPhrase('fill_situation_chase', [
            `The chase for ${target} continues. ${battingTeam} are ${runs} for ${wickets} in ${overs} overs — ${Math.max(0, target - runs)} runs needed with ${oversLeft} overs left.`,
            `${battingTeam} on ${runs} for ${wickets} after ${overs} overs, chasing down ${target}. ${oversLeft} overs remaining in this pursuit.`,
            `Chasing ${target} to win: ${battingTeam} are ${runs} for ${wickets}. Target equation is ${Math.max(0, target - runs)} runs from here.`
        ]);
    }
    return pickPhrase('fill_situation_bat', [
        `${battingTeam} are progressing well — ${runs} for ${wickets} from ${overs} overs. ${oversLeft} overs of batting still to come.`,
        `The first innings total reads ${runs} for ${wickets} after ${overs} overs. ${oversLeft} overs remaining — a crucial phase of this match.`,
        `${battingTeam}: ${runs}/${wickets} in ${overs} overs. With ${oversLeft} overs left, every ball counts in building that total.`
    ]);
}

export function fillPressure({ wickets, overLimit, overs, runs }) {
    const currentOvers = Number(overs || 0);
    const totalBallsBowled = Math.floor(currentOvers) * 6 + Math.round((currentOvers % 1) * 10);

    // At the start of innings, no score-based pressure phrasing
    if (totalBallsBowled < 15) {
        if (wickets === 0) {
            return pickPhrase('fill_pressure_start_0wkt', [
                `No wickets down in these early exchanges — the opening pair looking to lay a solid foundation.`,
                `All ten wickets intact — the openers assessing the bounce and building their partnership.`
            ]);
        }
        return null;
    }

    if (wickets === 0) {
        return pickPhrase('fill_pressure_0wkt', [
            `No wickets have fallen yet — the opening partnership is intact and the batting side have a real opportunity here.`,
            `Still all ten wickets in hand — a strong platform is being built by the openers.`
        ]);
    }
    if (wickets >= 6) {
        return pickPhrase('fill_pressure_late', [
            `The tail is starting to wag — ${10 - wickets} wickets remain and the lower order must contribute now.`,
            `${wickets} wickets down — the batting side are running short of partners. The pressure is firmly on.`,
            `Deep into the lower order now with ${wickets} down. The recognized batters need to protect the tail.`,
            `The fielding unit can sense a finish here. Wickets ${wickets} down and the pressure is mounting with every ball.`
        ]);
    }
    return pickPhrase('fill_pressure_mid', [
        `${wickets} wicket${wickets > 1 ? 's' : ''} down for ${runs} runs — the batting side still have ${10 - wickets} wickets in hand. Plenty to play for.`,
        `${10 - wickets} wickets in hand with ${Math.max(0, overLimit - overs).toFixed(1)} overs to go — the batting side must push on from here.`,
        `A balanced contest right now: ${wickets} wickets down, but plenty of firepower waiting in the shed.`,
        `The batting side have navigated through some difficult patches, losing ${wickets} wickets so far. This next passage of play is crucial.`
    ]);
}

/**
 * 8. Pitch & Ground Conditions Observations (Quiet moments)
 */
export function fillPitchAndConditions({ overs = 0, totalBalls = 0 }) {
    return pickPhrase('fill_pitch_conditions', [
        "The bounce out in the middle looks very true today. The carry through to the keeper is consistent, and batters can trust the deck when playing through the line.",
        "Notice the sheen on this outfield. The ball is simply skating across the grass whenever it pierces the inner ring.",
        "The breeze has picked up slightly from the pavilion end. That might give the bowlers a touch of extra drift through the air.",
        "A very even covering of grass on this strip. It is neither gripping nor staying low — an honest, competitive cricket wicket.",
        "The groundsman has done a tremendous job with this surface. It is holding together nicely, offering good value for well-timed strokes.",
        "Conditions are ideal for cricket right now. Clear visibility, good ambient light, and the ball should hold its shape and hardness for several overs yet.",
        "As this match progresses, watching how the pitch behaves will be intriguing. It looks firm right now, rewarding batters who play with a straight bat.",
        "There is decent value for shots out there today. The grass is trimmed short and true, rewarding proper placement and crisp timing.",
        "The pitch looks like a genuine sporting surface — something in it for the quicks with the seam, but rewarding batters who commit to their strokes.",
        "A little bit of abrasive wear on the wicket as the overs click by. The spinners will be keeping a close eye on any scuffs developing.",
        "The carry through to the gloves has been excellent from both ends. Fast bowlers getting good shoulder into the surface.",
        "The ball is skidding nicely off the pitch under these conditions. Batters need to ensure their feet are moving early.",
        "Very consistent pace off the deck. No uneven bounce detected so far, which makes for a high-quality tactical contest.",
        "The outfield is lightning fast. If you beat the ring fielders, you are almost guaranteed four runs on this lush turf.",
        "A good covering of grass is keeping the pitch together. It isn't breaking up, giving both batters and bowlers a fair battle."
    ], 10);
}

/**
 * 9. Tactical & Field Placements Nuances (Quiet moments)
 */
export function fillTacticsAndFieldPlacements({ bowler, striker, wickets, isChasing }) {
    return pickPhrase('fill_tactics_field', [
        "Look at the field setting for this batter. The captain has packed the off side with four men inside the circle, challenging him to pierce the ring.",
        "The bowler is clearly working to a specific plan here — tucking the batter up for room and denying any free arm swing through the off side.",
        "Interesting to see the deep backward square leg pushed back to the fence. They are anticipating the pull shot if the length drops short.",
        "The keeper has stood up to the stumps now to prevent the batter from skipping down the pitch. A clever tactical adjustment.",
        "Communication between the bowler and the captain is constant out there. You can see them discussing the angle of attack before every ball.",
        "With that extra protection out at deep mid-wicket, the bowler is actively inviting the batter to hit into the deep pocket.",
        "Notice how the fielders inside the ring are creeping forward a few yards as the bowler reaches his delivery stride. Smothering the single.",
        "The ring field is very tight right now. Every single prevented puts another ounce of pressure on the batting partnership.",
        "They've brought third man in and posted a sweeper on the cover boundary. Shifting the risk to the off side.",
        "Patience is the currency of cricket. The fielding side are happy to bowl dot balls and let frustration do the wicket-taking.",
        "Notice the catcher stationed at extra cover on the drive. The bowler is dangling the carrot just outside off stump.",
        "A very attacking field considering the match situation. Slips waiting in the cordon, hunting the outside edge.",
        "Deep point and deep cover in tandem now on the boundary rope, protecting against the square cut and the lofted drive.",
        "The captain has brought mid-on and mid-off up inside the circle, daring the batter to hit over the top against the new ball.",
        "Very smart field rotation. Shifting fielders to match the batter's wagon wheel tendencies as the innings unfolds.",
        "Mid-wicket is stationed slightly deeper than normal, cutting off the crisp whip off the pads."
    ], 10);
}

/**
 * 10. Technical Masterclass & Mechanics (Quiet moments)
 */
export function fillTechnicalMasterclass({ striker, bowler }) {
    return pickPhrase('fill_technical', [
        "What stands out about modern batting is the head position. Keeping the eyes level until the moment of contact makes all the difference.",
        "The subtle change of pace is such a deadly weapon in this format. Rolling the fingers over the seam without changing the arm speed.",
        "Watch the non-striker backing up. Leaving the crease at the exact moment of delivery gives them that crucial head start for the quick single.",
        "Bowlers often speak about hitting that top of off-stump line. It sounds simple, but maintaining that discipline across an entire spell is remarkably difficult.",
        "The soft hands technique when defending against extra bounce is a joy to behold. Dropping the ball right at your feet to prevent edges carrying.",
        "A quick glance down the pitch after every delivery. The batter is continually reading how the ball behaves off the surface.",
        "Good footwork isn't just about moving forward or back; it's about getting the body weight aligned with the trajectory of the ball.",
        "Notice how the bowler is hiding the ball in his delivery stride, concealing the seam to keep the batter guessing right until release.",
        "The transfer of weight from the back foot onto the front stride is so smooth. When a batter is in rhythm, it looks effortless.",
        "That upright seam presentation is pure classical bowling. Letting the seam grip the turf and create natural deviation.",
        "Modern power hitting relies so heavily on core rotation. Clearing the front leg just enough to create a full bat swing.",
        "Great running between wickets is about trust. The first two steps are explosive, turning a tight single into a comfortable run.",
        "Notice how the wrists remain supple at contact. Absorbing the pace of the ball to guide it safely into the vacant third man area.",
        "The follow-through from the bowler shows total commitment. Driving through the crease and finishing balanced on the landing foot.",
        "Presenting the full face of the willow to the incoming delivery. High elbow, straight bat — textbook cricket.",
        "Watching the bowler's release point — consistent and high, maximizing the natural bounce off this firm surface."
    ], 10);
}

/**
 * 11. Bowling Craft & Plans (Quiet moments)
 */
export function fillBowlingCraftAndPlans({ bowler }) {
    const cleanBowl = bowler ? cleanPlayerNameForSpeech(bowler) : 'The bowler';
    return pickPhrase('fill_bowling_craft', [
        `${cleanBowl} is doing a tremendous job of hitting that hard length — four to six metres from the batting crease, where the batter is stuck between forward and back.`,
        `Notice the subtle variation in seam presentation from ${cleanBowl}. An upright seam looking for natural deviation off the deck, mixed with the occasional cross-seam.`,
        `Good fast bowlers don't just search for wickets with magic balls; they build pressure by hitting the fourth-stump corridor repeatedly.`,
        `Altering the pace into the pitch is so critical on this surface. Taking five or ten kilometres off the delivery without giving away any clue in the arm speed.`,
        `${cleanBowl} is really using the crease well here — angling the ball in from wide of the crease to create doubt in the batter's mind about which way it might move.`,
        `Hitting the pitch with real intent. Not giving the batter any room to free the arms through the off side.`,
        `Notice the discipline in the lines. Everything tightly clustered on off and middle, forcing the batter to create their own angles.`,
        `Working the batter over with a classic setup: two balls holding their line outside off, followed by one angling sharply back into the pads.`,
        `Good rhythm from ${cleanBowl} as he hits his delivery stride. Balanced, upright, and driving hard through the crease.`,
        `A well-disguised slower delivery can be devastating in this phase. The key is maintaining identical arm speed and shoulder rotation.`,
        `Concentrating purely on dot-ball execution. If you don't concede boundaries, the pressure inevitably produces a mistake.`,
        `Testing the batter's discipline outside off stump. Refusing to feed the cut shot and making the batter work for every single run.`
    ], 10);
}

/**
 * 12. Batting Craft & Tempo (Quiet moments)
 */
export function fillBattingCraftAndTempo({ striker, nonStriker, isChasing }) {
    const cleanBat = striker ? cleanPlayerNameForSpeech(striker) : 'The batter';
    return pickPhrase('fill_batting_craft', [
        `The key for ${cleanBat} is finding a way to rotate the strike when boundaries are hard to come by. Dropping the ball with soft hands and scampering through.`,
        `Good white-ball batting is about managing risk. Taking the easy singles on offer, punishing the loose ball, and avoiding high-risk aerial strokes.`,
        `${cleanBat} is playing with very soft hands close to the body, ensuring that any outside edge falls well short of the slip cordon.`,
        `Patience is a virtue in this game. You don't have to hit every delivery to the boundary; keeping the scoreboard ticking over is what breaks a bowling side's spirit.`,
        `Watch how ${cleanBat} is reading the length early. Transferring weight smoothly onto the back foot to punch through the covers.`,
        `A good batting partnership relies on constant communication. A clear, decisive call of yes, no, or wait eliminates any hesitation between the wickets.`,
        `${cleanBat} is using the full depth of the crease here — dropping deep to manufacture length against the fuller deliveries.`,
        `Playing the ball right under the eyes. When you play late on this deck, you give yourself the maximum time to react to any seam movement.`,
        `Positive body language at the crease. Even after a couple of dot balls, the batter looks completely composed and ready for the next challenge.`,
        `Working the ball into the vacant spaces in the outfield. That is elite game awareness, manipulating the field without taking undue risks.`,
        `Picking the gaps with precision rather than brute force. Timing beats muscle on this outfield every single time.`,
        `Constructing an innings is about pacing yourself through the middle overs. Setting the foundation so you can capitalize in the death overs.`
    ], 10);
}

/**
 * 13. Running Between the Wickets & Crease Awareness (Quiet moments)
 */
export function fillRunningAndCreasePressure() {
    return pickPhrase('fill_running_crease', [
        "Running between the wickets is the engine room of a cricket innings. Pushing for that second run puts the outfielders under genuine pressure.",
        "Notice the non-striker backing up with real intent. Getting those two or three yards head start makes all the difference on a tight single.",
        "Loud, crisp calls of yes and no echoing across the middle. Indecision is what creates run-out opportunities.",
        "Taking on the fielder's arm on the boundary. When you run aggressively, you force the fielding side into rushed throws.",
        "Turning ones into twos. That is how champion batting sides break the back of a fielding team's discipline.",
        "Good running keeps the strike rotating, which prevents the bowler from settling into a rhythm against any one batter.",
        "Sliding the bat in over the crease line rather than stepping in. Elite habits that save wickets in tight run-out situations.",
        "The chemistry between these two batters is evident. They understand each other's pace between the wickets completely."
    ], 8);
}

/**
 * 14. Match Tempo & Momentum Dynamics (Quiet moments)
 */
export function fillMatchTempoAndMomentum({ overs, isChasing }) {
    return pickPhrase('fill_match_tempo', [
        "This is a crucial passage of play. The bowling side trying to strangle the scoring rate, while the batters look to construct a match-defining partnership.",
        "Dot ball clusters are the greatest source of tension in cricket. Three or four dots in an over, and suddenly the batting side feel the urge to break the shackles.",
        "Momentum is such a fragile thing in modern cricket. One good over can completely turn the balance of this contest.",
        "The fielding side are vocal and energized right now. Every stop inside the thirty-yard ring is met with loud applause from the team.",
        "Both teams understand the stakes. You can feel the concentration levels peaking with every single delivery bowled.",
        "This match is nicely poised. Neither side has taken complete control, and the next few overs will be pivotal.",
        "The captain is managing his bowling resources very shrewdly. Holding an over of his premier bowler back for a critical breakthrough.",
        "Managing the middle overs is an art form. It's about maintaining an acceptable tempo without exposing the lower order too early.",
        "The scoreboard pressure is beginning to tell. Every single defended in the ring is a small victory for the bowling attack.",
        "When two competitive teams go head-to-head, it's the team that stays coolest under pressure that comes out on top.",
        "The game is moving at a brisk pace. Both sides fully committed to their tactical game plans.",
        "A contest of patience and execution. The bowler trying to probe, the batter refusing to blink."
    ], 10);
}

/**
 * 15. Match Atmosphere & Broadcast Scene (Quiet moments)
 */
export function fillAtmosphereAndLore({ battingTeam, bowlingTeam, overs, wickets }) {
    return pickPhrase('fill_atmosphere', [
        "The tension around this venue is palpable. Every run, every dot ball, every decision feels amplified on an occasion like this.",
        "There is a wonderful hum from the supporters in the stands today. Cricket at its absolute finest.",
        "In competitive tournament cricket, momentum can swing in the space of three deliveries. You simply cannot take your eyes off the action.",
        "The dugout looks completely focused. The coaches and analysts with their clipboards, tracking every single phase of play.",
        "These are the moments players prepare so hard for — big stage, high pressure, and the game hanging in the balance.",
        "The body language from both camps tells a story. One side hungry to accelerate, the other desperate to strangle the scoring rate.",
        "A magnificent sporting contest. The conditions are great, the ground looks spectacular, and the cricket is top-drawer.",
        "Every player out there knows the importance of these middle overs. Games are won and lost right here in this transitional phase.",
        "The intensity is ratcheting up with every passing over. Neither side giving an inch.",
        "Big matches are decided by who holds their nerve in the clutch moments. We are entering that territory right now.",
        "Focused, determined expressions out in the middle. Both sides fully locked into their roles.",
        "The energy echoing around the ground is electric as we approach the next delivery."
    ], 10);
}

/**
 * Generate broadcast-quality ball commentary with rich anti-repetition phrasing
 */
export function generateBallVoiceCommentary(commItem = {}, matchContext = {}) {
    if (!commItem) return '';
    const runs = Number(commItem.runs ?? 0);
    const batsman = ((commItem.batsman || matchContext.strikerName || 'The batsman').trim()).replace(/^(null|undefined)$/i, 'The batsman');
    const bowler = ((commItem.bowler || matchContext.bowlerName || 'The bowler').trim()).replace(/^(null|undefined)$/i, 'The bowler');
    const zone = (commItem.wagonZone || '').trim();
    const zonePhrase = zone && !/^(null|undefined)$/i.test(zone) ? ` towards ${zone}` : '';
    const isWicket = Boolean(commItem.isWicket);
    const dismissalType = (commItem.dismissalType || '').toLowerCase();
    const rawFielder = (commItem.dismissalFielder || '').trim().replace(/^(null|undefined)$/i, '');
    const fielderStr = rawFielder ? `by ${rawFielder}` : 'in the field';
    const isExtra = Boolean(commItem.isExtra);
    const extraType = (commItem.extraType || '').toLowerCase();

    // 1. Wicket (Authentic cricket terms, tailored precisely by dismissal type)
    if (isWicket) {
        // Detailed dismissal type categorization
        const isCaughtAndBowled = dismissalType.includes('caught and bowled') ||
            dismissalType.includes('caught & bowled') ||
            dismissalType.includes('c & b') ||
            dismissalType.includes('c&b') ||
            (dismissalType.startsWith('c ') && dismissalType.includes(`b ${bowler.toLowerCase()}`) && rawFielder.toLowerCase() === bowler.toLowerCase());

        const isCaughtBehind = !isCaughtAndBowled && (
            dismissalType.includes('caught behind') ||
            dismissalType.includes('behind') ||
            dismissalType.includes('keeper') ||
            rawFielder.toLowerCase().includes('keeper') ||
            rawFielder.toLowerCase().includes('wk')
        );

        const isCaughtSlip = !isCaughtAndBowled && !isCaughtBehind && (
            dismissalType.includes('slip') ||
            dismissalType.includes('cordon') ||
            dismissalType.includes('gully') ||
            rawFielder.toLowerCase().includes('slip') ||
            rawFielder.toLowerCase().includes('gully')
        );

        const isCaughtDeep = !isCaughtAndBowled && !isCaughtBehind && !isCaughtSlip && (
            dismissalType.includes('deep') ||
            dismissalType.includes('boundary') ||
            dismissalType.includes('long off') ||
            dismissalType.includes('long on') ||
            dismissalType.includes('cow corner') ||
            zone.toLowerCase().includes('deep') ||
            zone.toLowerCase().includes('boundary')
        );

        const isCaughtRing = !isCaughtAndBowled && !isCaughtBehind && !isCaughtSlip && !isCaughtDeep && (
            dismissalType.includes('ring') ||
            dismissalType.includes('cover') ||
            dismissalType.includes('point') ||
            dismissalType.includes('mid off') ||
            dismissalType.includes('mid on') ||
            dismissalType.includes('mid-wicket') ||
            zone.toLowerCase().includes('cover') ||
            zone.toLowerCase().includes('point')
        );

        const isCaught = !isCaughtAndBowled && (dismissalType.includes('caught') || dismissalType.startsWith('c ') || isCaughtBehind || isCaughtSlip || isCaughtDeep || isCaughtRing);
        const isBowled = !isCaughtAndBowled && (dismissalType.includes('bowled') || dismissalType.startsWith('b ') || dismissalType === 'b');
        const isLbw = dismissalType.includes('lbw') || dismissalType.includes('leg before');
        const isRunOut = dismissalType.includes('run out') || dismissalType.includes('runout');
        const isStumped = dismissalType.includes('stump') || dismissalType.includes('stumped');
        const isHitWicket = dismissalType.includes('hit wicket') || dismissalType.includes('hitwicket');
        const isRetired = dismissalType.includes('retired');

        // ── A. GOLDEN DUCK DISMISSALS (Tailored by dismissal type) ───────────
        if (commItem.isGoldenDuck) {
            if (isBowled) {
                return pickPhrase('v_wkt_gd_bowled', [
                    `Clean bowled first ball! A golden duck for ${batsman}! What an absolute peach from ${bowler} to shatter the stumps!`,
                    `First ball and he is castled! It's a golden duck for ${batsman}! The off stump goes flying — dream start for ${bowler}!`,
                    `Through the gate first delivery! Golden duck! ${batsman} departs without troubling the scorers, cleaned up by ${bowler}!`
                ]);
            }
            if (isLbw) {
                return pickPhrase('v_wkt_gd_lbw', [
                    `Plumb in front first ball! Huge appeal, and up goes the finger — it is a golden duck for ${batsman}! Trapped right in front by ${bowler}!`,
                    `Out first ball, leg before wicket! Golden duck for ${batsman}! Struck right on the pads by ${bowler}, and no doubt about that one!`,
                    `Trapped in front on delivery number one! A golden duck for ${batsman}! ${bowler} strikes with the very first ball!`
                ]);
            }
            if (isCaughtBehind) {
                return pickPhrase('v_wkt_gd_caughtbehind', [
                    `Edged and taken behind first ball! What a disaster for ${batsman} — gone for a golden duck as the keeper snaffles the edge!`,
                    `First ball, feather through to the gloves! A golden duck for ${batsman}! ${bowler} finds the edge on delivery number one!`,
                    `Snicked off first ball! What a start for ${bowler} — caught behind, and ${batsman} departs for a golden duck!`
                ]);
            }
            if (isCaughtAndBowled) {
                return pickPhrase('v_wkt_gd_cb', [
                    `Caught and bowled first ball! A golden duck for ${batsman}! ${bowler} plucks it out of the air in the follow-through!`,
                    `What a reflex catch! Caught and bowled off the first ball — it's a golden duck for ${batsman}!`
                ]);
            }
            if (isCaught) {
                return pickPhrase('v_wkt_gd_caught', [
                    `In the air and taken first ball! What an incredible breakthrough — a golden duck for ${batsman} ${fielderStr}!`,
                    `Gone on the very first ball! ${batsman} holes out ${fielderStr} for a golden duck! Dream start for ${bowler}!`,
                    `First ball, chipped straight to the fielder! A golden duck for ${batsman} ${fielderStr}!`
                ]);
            }
            if (isRunOut) {
                return pickPhrase('v_wkt_gd_runout', [
                    `Run out on his very first ball! What unbelievable heartbreak for ${batsman} — gone for a golden duck without facing a fair chance!`,
                    `Disaster between the wickets on ball one! Direct hit, and ${batsman} is run out for a golden duck!`
                ]);
            }
            if (isStumped) {
                return pickPhrase('v_wkt_gd_stumped', [
                    `Stumped off his very first delivery! Deceived in flight, foot out of the crease — a golden duck for ${batsman}!`,
                    `First ball, lured down the pitch and stumped! What a piece of glovework — golden duck for ${batsman}!`
                ]);
            }
            return pickPhrase('v_wkt_golden_duck', [
                `Gone first ball! It is a golden duck for ${batsman}! What a sensational start from ${bowler}!`,
                `A golden duck! ${batsman} has to walk back without troubling the scorers on delivery number one!`,
                `First ball, and out! That is a golden duck for ${batsman}! Huge blow to the batting side!`
            ]);
        }

        // ── B. DUCK DISMISSALS (Tailored by dismissal type) ───────────────────
        if (commItem.isDuck) {
            if (isBowled) {
                return pickPhrase('v_wkt_duck_bowled', [
                    `Clean bowled for a duck! ${batsman} departs without getting off the mark. ${bowler} shatters the stumps!`,
                    `Through the gate and castled for zero! ${batsman} fails to score, bowled through the gate by ${bowler}!`,
                    `Knocked over for a duck! Stumps flat on the ground — ${batsman} walks back for nought!`
                ]);
            }
            if (isLbw) {
                return pickPhrase('v_wkt_duck_lbw', [
                    `Trapped in front for a duck! Big appeal and the finger goes straight up! ${batsman} is out LBW for zero!`,
                    `Given out LBW for nought! Struck plumb on the back pad in line with the stumps by ${bowler}!`,
                    `Pinned in front and dismissed for a duck! ${batsman} has no answer to that swinging delivery from ${bowler}!`
                ]);
            }
            if (isCaughtBehind) {
                return pickPhrase('v_wkt_duck_behind', [
                    `Edged through to the keeper for a duck! ${batsman} departs without scoring. Big wicket for ${bowler}!`,
                    `Feathered to the gloves and gone for a duck! ${batsman} walks back with a zero next to his name!`
                ]);
            }
            if (isCaughtAndBowled) {
                return pickPhrase('v_wkt_duck_cb', [
                    `Caught and bowled for a duck! ${batsman} chips it right back, and ${bowler} takes a sharp return catch!`,
                    `Out for a duck, caught and bowled! Extraordinary reflexes from ${bowler} to dismiss ${batsman} for nought!`
                ]);
            }
            if (isCaught) {
                return pickPhrase('v_wkt_duck_caught', [
                    `Caught ${fielderStr} for a duck! ${batsman} departs on zero. ${bowler} strikes with authority!`,
                    `Out for a duck! Hit in the air and safely held ${fielderStr}. ${batsman} fails to trouble the scorers!`,
                    `Dismissed for nought! Tried to find the boundary, but taken ${fielderStr} without scoring!`
                ]);
            }
            if (isRunOut) {
                return pickPhrase('v_wkt_duck_runout', [
                    `Run out for a duck! A complete breakdown in communication and ${batsman} is dismissed for zero!`,
                    `Calamity between the wickets! ${batsman} is run out without scoring a single run!`
                ]);
            }
            if (isStumped) {
                return pickPhrase('v_wkt_duck_stumped', [
                    `Drawn out and stumped for a duck! ${batsman} walks back for nought after great glovework behind the stumps!`,
                    `Beaten in the air and stumped on zero! Superb deception from ${bowler}!`
                ]);
            }
            if (isHitWicket) {
                return pickPhrase('v_wkt_duck_hitwicket', [
                    `Hit wicket for a duck! What terrible misfortune for ${batsman}, dislodging his own bails without scoring!`,
                    `Stepped onto his own stumps for zero! Bizarre hit-wicket dismissal for ${batsman}!`
                ]);
            }
            return pickPhrase('v_wkt_duck', [
                `Out for a duck! ${batsman} departs without getting off the mark. ${bowler} strikes with authority!`,
                `A duck for ${batsman}! Pinned down, unable to score, and now dismissed. Big wicket for ${bowler}!`,
                `Dismissed for nought. ${batsman} makes the long walk back for zero. ${bowler} is overjoyed!`
            ]);
        }

        // ── C. STANDARD WICKET DISMISSALS (Tailored precisely by dismissal type) ──
        if (isBowled) {
            return pickPhrase('v_wkt_bowled', [
                `Timber! Clean bowled! The off stump is knocked back. What a delivery from ${bowler} — it just nipped back through the gate.`,
                `Clean bowled! ${bowler} shatters the defences of ${batsman}. Absolute jaffa!`,
                `Through the gate! Castled! ${batsman} played across the line and the bails go flying. ${bowler} is delighted.`,
                `Knocked him over! The stumps are flat on the ground. ${bowler} pitches it up and beats the inside edge.`,
                `Uprooted! What an unplayable delivery from ${bowler} — crashes right into middle and off! ${batsman} had no answer!`,
                `Beaten for pure pace and bowled! The woodwork is shattered, and ${batsman} has to make the long walk back!`,
                `Direct hit on the timber! Searing yorker right at the base of leg stump from ${bowler}!`
            ]);
        }

        if (isCaughtAndBowled) {
            return pickPhrase('v_wkt_caught_and_bowled', [
                `Caught and bowled! What a breathtaking reflex return catch from ${bowler} in the follow-through!`,
                `Straight back down the pitch and clung onto! ${bowler} snatches it out of thin air off their own bowling!`,
                `Caught and bowled! ${batsman} drove it hard, but ${bowler} reacts with lightning hands! Phenomenal catch!`,
                `A sharp return catch taken by ${bowler}! Clutched safely in the follow-through, and ${batsman} departs!`
            ]);
        }

        if (isCaughtBehind) {
            return pickPhrase('v_wkt_caught_behind', [
                `Edged and taken behind! A feather on the outside edge and safely pouched with the gloves. ${bowler} gets the breakthrough!`,
                `Caught behind! Faint nick through to the wicketkeeper, and ${batsman} has to walk. ${bowler} finds the edge!`,
                `There is the edge, and the keeper makes no mistake! A crucial breakthrough behind the stumps for ${bowler}!`,
                `Thin edge through to the keeper! Superb take with the gloves, and ${batsman} is on his way!`,
                `Pushed outside off stump, caught behind! Sharp take by the wicketkeeper to send ${batsman} packing!`
            ]);
        }

        if (isCaughtSlip) {
            return pickPhrase('v_wkt_caught_slip', [
                `Edged and taken in the slips ${fielderStr}! Flew fast at waist height and safely held in the cordon!`,
                `Thick outside edge carried cleanly to the slip cordon! Outstanding concentration and catch ${fielderStr}!`,
                `Slashed outside off stump, grabbed at slip ${fielderStr}! ${bowler} strikes with a classic corridor delivery!`,
                `Taken in the cordon! Low, sharp catch ${fielderStr} as ${batsman} pokes at the outside-off delivery!`
            ]);
        }

        if (isCaughtDeep) {
            return pickPhrase('v_wkt_caught_deep', [
                `High in the air towards the boundary rope, and taken cleanly ${fielderStr}! ${batsman} took on the deep fielder and holed out!`,
                `Skied high down the ground! The fielder settles underneath it right inside the rope and takes a calm catch. Crucial wicket for ${bowler}!`,
                `He went for the big maximum, but didn't get all of it! Safely caught ${fielderStr} right inside the cushion!`,
                `Holed out in the deep! ${batsman} tried to clear the ropes, but picked out ${fielderStr} to perfection!`
            ]);
        }

        if (isCaughtRing) {
            return pickPhrase('v_wkt_caught_ring', [
                `Chipped into the ring and caught ${fielderStr}! Mistimed the stroke completely, and ${bowler} breaks the partnership!`,
                `In the air and taken ${fielderStr}! Soft dismissal as ${batsman} chips it straight into the hands of the ring fielder!`,
                `Drove on the up, and safely held ${fielderStr}! ${batsman} cannot believe it, straight to the inner ring!`,
                `Sharp catch in the ring ${fielderStr}! Reacted quickly to snare that full drive off ${bowler}!`
            ]);
        }

        if (isCaught) {
            return pickPhrase('v_wkt_caught', [
                `In the air, and safely taken ${fielderStr}. ${batsman} has to make the long walk back. ${bowler} gets the wicket.`,
                `Edged, and pouched ${fielderStr}! A crucial breakthrough. ${batsman} departs.`,
                `Skied high into the outfield and safely held ${fielderStr}. That is a very important wicket for the bowling side.`,
                `Gone! ${batsman} has tried to go big, but has holed out ${fielderStr}. ${bowler} takes the wicket.`,
                `Taken ${fielderStr}! Safe hands in the field to bring an end to ${batsman}'s innings!`
            ]);
        }

        if (isLbw) {
            return pickPhrase('v_wkt_lbw', [
                `Plumb in front! Big appeal, and the umpire's finger goes straight up. ${batsman} is trapped right in front by ${bowler}.`,
                `Leg before wicket! Struck plumb on the back pad in line with off stump — no hesitation from the umpire. ${batsman} is out.`,
                `Huge shout for LBW, and given! That ball straightened down the line and had middle and leg written all over it.`,
                `Trapped right in the crease! The finger goes up immediately from the umpire. That was dead in front of the stumps.`,
                `Beaten for pace, struck on the pads in front of the stumps. The umpire raises the finger — that is out LBW!`
            ]);
        }

        if (isRunOut) {
            return pickPhrase('v_wkt_runout', [
                `Direct hit! Run out! Total chaos between the wickets, and ${batsman} is caught well short of the crease.`,
                `Run out! ${batsman} has been sent back too late — the throw was arrow-straight and the bails are off.`,
                `Disaster in the running! Hesitation mid-pitch, a quick pickup and throw ${fielderStr}, and ${batsman} is short of the ground!`,
                `A suicidal single! The fielder swoops in, releases cleanly, and shatters the stumps! Run out!`,
                `Out! Beaten by a direct hit! Both batters ended up at the same end of the pitch — complete mix-up!`
            ]);
        }

        if (isStumped) {
            return pickPhrase('v_wkt_stumped', [
                `Stumped! ${batsman} is drawn well out of the crease by ${bowler}, and the keeper does the rest with lightning hands.`,
                `Stumped! Beaten by the flight from ${bowler}, and the keeper whips the bails off in an instant.`,
                `Dancing down the track, deceived in the air, and the keeper removes the bails before the foot can get back!`,
                `Lured down the pitch by ${bowler}, no return for ${batsman} as the keeper collects and breaks the stumps in style!`
            ]);
        }

        if (isHitWicket) {
            return pickPhrase('v_wkt_hitwicket', [
                `Hit wicket! Unbelievable misfortune! ${batsman} rocks back deep in the crease and dislodges the bails with the bat!`,
                `He has knocked his own stumps down! Hit wicket! Stepped too deep into his crease and clipped the leg peg!`,
                `What a bizarre dismissal! Hit wicket! The backswing catches the bail and sends it spinning to the turf!`,
                `Tragic way to depart! ${batsman} loses his balance and makes contact with his own stumps! Out hit wicket!`
            ]);
        }

        if (isRetired) {
            return pickPhrase('v_wkt_retired', [
                `${batsman} is walking off, retired hurt. Unable to continue, and the medical team will attend to him.`,
                `Retired hurt. ${batsman} has to leave the middle. The batting side will hope he can return to the crease later in the innings.`,
                `An unfortunate development as ${batsman} leaves the field retired hurt after that incident.`
            ]);
        }

        return pickPhrase('v_wkt_gen', [
            `The wicket has fallen! ${batsman} is dismissed by ${bowler}. A significant moment in this match.`,
            `That is a breakthrough! ${bowler} has got ${batsman}, and the fielding side are celebrating.`,
            `Dismissed! ${batsman} has to take the long walk back to the pavilion. ${bowler} gets the vital wicket!`
        ]);
    }


    // 2. Extras
    // extraAdditional = runs beyond the base 1-run penalty (e.g. 4 for a wide that goes to the boundary)
    const extraAdditional = Number(commItem.extraAdditional ?? 0);
    if (isExtra) {
        if (extraType.includes('wide')) {
            if (extraAdditional >= 6) {
                return pickPhrase('v_extra_wide_six', [
                    `Wide — and it clears the boundary! That is six from a wide delivery — ${1 + extraAdditional} extras in all! Incredibly costly from ${bowler}!`,
                    `Wide ball, and the keeper fumbles — it races all the way to the rope for a six! Seven wides credited. Chaos from ${bowler}!`
                ]);
            }
            if (extraAdditional >= 4) {
                return pickPhrase('v_extra_wide_four', [
                    `Wide — and it races away to the boundary! ${1 + extraAdditional} extras from that delivery. An expensive error from ${bowler}.`,
                    `That wide is streaky — beats the keeper's dive and runs off for four! Five runs in all — a very costly wide from ${bowler}.`,
                    `Wide ball, and the keeper can't retrieve it — four overthrows! ${1 + extraAdditional} runs to the batting side from that one delivery.`
                ]);
            }
            if (extraAdditional > 0) {
                return pickPhrase('v_extra_wide_runs', [
                    `Wide, and they run ${extraAdditional} more as the ball trickles away. ${1 + extraAdditional} runs in total from that delivery.`,
                    `Called wide by the umpire — and the batters steal ${extraAdditional} extra run${extraAdditional > 1 ? 's' : ''} off the overthrow. ${1 + extraAdditional} runs added.`
                ]);
            }
            return pickPhrase('v_extra_wide', [
                `Wide ball. Slipped down the wrong line from ${bowler}. An extra run added to the batting side's total.`,
                `Called wide by the umpire. Straying outside the tramline there from ${bowler}.`,
                `Wide. Too far outside off stump, and the umpire has called it. A free run on the board.`
            ]);
        }
        if (extraType.includes('no ball') || extraType.includes('noball')) {
            if (extraAdditional >= 6) {
                return pickPhrase('v_extra_nb_six', [
                    `No ball — and ${batsman} dispatches it for six! A no ball six — ${1 + extraAdditional} runs from that delivery, and a free hit still to come! Absolute carnage!`,
                    `Overstepped, and ${batsman} makes them pay with a maximum! ${1 + extraAdditional} runs off that no ball, plus a free hit on the way!`
                ]);
            }
            if (extraAdditional >= 4) {
                return pickPhrase('v_extra_nb_four', [
                    `No ball — and ${batsman} whips it to the fence! ${1 + extraAdditional} runs, plus a free hit delivery to follow. A very expensive over.`,
                    `Overstepped by ${bowler}, and ${batsman} punishes it for four! ${1 + extraAdditional} runs off that delivery — and a free hit still to come. Costly!`
                ]);
            }
            if (extraAdditional > 0) {
                return pickPhrase('v_extra_nb_runs', [
                    `No ball — and ${batsman} takes ${extraAdditional} off the bat! ${1 + extraAdditional} runs from this delivery, with a free hit still outstanding. Expensive from ${bowler}.`,
                    `Overstepped — and ${extraAdditional} run${extraAdditional > 1 ? 's' : ''} off the bat for ${batsman}. ${1 + extraAdditional} total, and a free hit coming right up!`
                ]);
            }
            return pickPhrase('v_extra_nb', [
                `No ball. The front foot has gone over the line from ${bowler} — an extra is awarded, and a free hit is coming up.`,
                `No ball signaled. Overstepped by ${bowler}, and that means ${batsman} gets a free hit on the very next delivery.`,
                `The umpire calls no ball. ${bowler} has overstepped — a free hit opportunity for ${batsman}.`
            ]);
        }
        if (extraType.includes('leg bye')) {
            if (extraAdditional > 1) {
                return pickPhrase('v_extra_lb_runs', [
                    `Leg bye — and they run ${extraAdditional}! Good presence of mind, turning deflection into ${extraAdditional} leg byes.`,
                    `Off the pads and they run ${extraAdditional} leg byes — excellent alertness between the wickets.`
                ]);
            }
            return pickPhrase('v_extra_lb', [
                `Leg bye. Deflected off the pads and rolls into the gap — they scamper through safely.`,
                `Leg bye. Good presence of mind from the batters — they've rotated the strike quickly.`
            ]);
        }
        if (extraType.includes('bye')) {
            if (extraAdditional > 1) {
                return pickPhrase('v_extra_bye_runs', [
                    `Byes! The keeper misses it and the batters race through for ${extraAdditional} runs. Excellent heads-up cricket.`,
                    `${extraAdditional} byes — slips past the keeper's gloves and they convert it into a fine piece of running.`
                ]);
            }
            return pickPhrase('v_extra_bye', [
                `Bye. Sneaks past the outside edge and the keeper fumbles — ${batsman} steals a quick single.`,
                `A bye added to the total as the ball slips through the keeper's gloves. Heads-up running.`
            ]);
        }
    }

    // 3. Maximum / Six
    if (runs === 6) {
        return pickPhrase('v_six', [
            `That's gone. Clean into the stands${zonePhrase}. ${batsman} has absolutely middled that off ${bowler}. Magnificent.`,
            `He's cleared the ropes${zonePhrase} with ease. ${batsman} reads the length early and sends it soaring. Six runs.`,
            `${batsman} stands tall and dispatches that deep into the grandstand${zonePhrase}. Pure timing. Pure power.`,
            `Gone over the boundary${zonePhrase}. ${batsman} gets under it beautifully and it sails all the way into the crowd.`,
            `That's one of the biggest hits of the day${zonePhrase}. ${batsman} has taken ${bowler} on and come out on top emphatically.`
        ]);
    }

    // 4. Boundary Four
    if (runs === 4) {
        return pickPhrase('v_four', [
            `That's raced to the fence${zonePhrase}. Beautifully timed by ${batsman} — four runs.`,
            `What a stroke from ${batsman}. Struck firmly${zonePhrase} and it's beaten the fielders all ends up. A boundary.`,
            `${batsman} finds the gap${zonePhrase} with real precision. It trickles all the way to the rope. Four.`,
            `Lovely placement${zonePhrase} from ${batsman}. Struck sweetly and it's four. No stopping that on this outfield.`,
            `Threaded right through the gap${zonePhrase}. ${batsman} times it beautifully and it races to the fence.`
        ]);
    }

    // 5. Running runs
    if (runs === 3) {
        return pickPhrase('v_three', [
            `Three runs. Excellent running between the wickets from ${batsman} and his partner — they've pushed the fielders hard.`,
            `Driven into the deep pocket${zonePhrase} and they sprint through for three. Superb running.`
        ]);
    }
    if (runs === 2) {
        return pickPhrase('v_two', [
            `Two runs. Worked neatly into the gap${zonePhrase} by ${batsman}. Good, positive running between the wickets.`,
            `A brace. Struck into the gap${zonePhrase} and they hustle back comfortably for the second run.`,
            `Pushed into space${zonePhrase} and they turn it into two. Excellent cricket.`
        ]);
    }
    if (runs === 1) {
        return pickPhrase('v_one', [
            `Single taken. ${batsman} drops it with soft hands${zonePhrase} and rotates the strike.`,
            `One run. Driven into the outfield${zonePhrase} for a sensible single. The partnership ticking along.`,
            `Pushed into the outfield by ${batsman}, keeping the scoreboard moving. Good cricket.`,
            `Just the single. Tight bowling from ${bowler}, but the batters manage to keep the score rolling.`
        ]);
    }

    // 6. Dot ball — Extensive, realistic broadcast phrasing with wagon zone & player context
    const cleanBat = cleanPlayerNameForSpeech(batsman);
    const cleanBowl = cleanPlayerNameForSpeech(bowler);

    return pickPhrase('v_dot', [
        `Dot ball. Excellent tight bowling from ${cleanBowl}. ${cleanBat} is well pinned down there.`,
        `No run. Good shape from ${cleanBowl} — just beats the outside edge of ${cleanBat}'s bat.`,
        `Solid forward defence from ${cleanBat}. Plays it right back down the pitch safely to ${cleanBowl}.`,
        `Beaten by the late movement from ${cleanBowl}! Whistles past the outside edge into the gloves.`,
        `Disciplined line and length from ${cleanBowl}. Gives nothing away to ${cleanBat}. Dot ball.`,
        `Pushed straight to the fielder${zonePhrase}. Good, sharp fielding — no chance of a run.`,
        `Driven firmly${zonePhrase}, but picked up cleanly inside the ring. Scoreless delivery.`,
        `Tapped gently into the off side${zonePhrase}. ${cleanBat} looks for a single, but gets sent back.`,
        `Good probing length from ${cleanBowl}. ${cleanBat} shoulders arms and lets it go through to the keeper.`,
        `Right in the blockhole! Dug out defensively by ${cleanBat}. Terrific execution from ${cleanBowl}.`,
        `Back of a length, angling in. ${cleanBat} hops on the back foot and drops it onto the pitch.`,
        `Punched towards ${zone || 'cover'}, but can't beat the ring of fielders. Dot ball.`,
        `No run. Beaten for pace there! That zipped through very quickly from ${cleanBowl}.`,
        `Defended with a straight bat. Textbook technique from ${cleanBat} against a very good delivery.`,
        `Angled in on off stump, defended softly into the covers. ${cleanBowl} runs in to collect.`,
        `Swing and a miss! ${cleanBowl} tempts ${cleanBat} into the drive, but it sneaks past the blade.`,
        `Full and straight, clipped off the pads but straight to the fielder${zonePhrase}. Dot ball.`,
        `A lovely piece of bowling from ${cleanBowl}. Changing the pace and keeping ${cleanBat} guessing.`,
        `Cut hard${zonePhrase}, but straight at the fielder. ${cleanBat} frustrated not to find the gap.`,
        `Left alone outside off. Well judged by ${cleanBat} — no need to play at that one.`,
        `Banged in short! ${cleanBat} sways out of the line and lets it sail through to the keeper.`,
        `No run. Superb stop in the ring! Saved a definite single with that diving effort.`,
        `Played with soft hands onto the pitch. ${cleanBowl} runs across on his follow-through to gather.`,
        `Hit hard off the back foot${zonePhrase}, but straight to the man. Dot ball.`,
        `Beaten on the inside edge! That jagged back off the seam and just missed the stumps.`,
        `Good response from ${cleanBowl} — hits the deck on a good length and keeps things tight.`,
        `Defended into the leg side. Quick call of 'no' from the non-striker. Scoreless delivery.`,
        `Probing on off stump line. ${cleanBat} respects the delivery and blocks it into the turf.`
    ], 12);
}

/**
 * Generate sequence of dynamic inter-ball filler commentary items
 */
export function generateInterBallFillers(matchContext = {}) {
    const fillers = [];
    const {
        striker,
        nonStriker,
        bowler,
        partnership,
        battingTeam,
        bowlingTeam,
        runs,
        wickets,
        overs,
        overLimit = 20,
        target,
        isChasing,
        crr,
        activeInnings
    } = matchContext;

    const currentOvers = Number(overs || 0);
    const totalBallsBowled = Math.floor(currentOvers) * 6 + Math.round((currentOvers % 1) * 10);
    const isStartOfInnings = totalBallsBowled < 15; // First ~2.3 overs

    // ─── START OF INNINGS HANDLING ──────────────────────────────────────────
    // USER REQUEST: In start of innings comments do NOT speak about team score.
    // If 2nd innings: talk about target scores and chase dynamics.
    // If 1st innings: speak attractive atmospheric scene-setting things!
    if (isStartOfInnings) {
        if (isChasing || activeInnings === 2) {
            const chaseFill = fillInningsChaseSetup({
                battingTeam,
                bowlingTeam,
                target,
                overLimit,
                overs: currentOvers,
                runs: Number(runs ?? 0),
                wickets: Number(wickets ?? 0)
            });
            if (chaseFill) fillers.push({ type: 'target_setup', text: chaseFill });

            const targetNum = Number(target || 0);
            if (targetNum > 0) {
                const overLimitNum = Number(overLimit || 20);
                const ballsRemaining = Math.max(0, (overLimitNum * 6) - totalBallsBowled);
                const runsNeeded = Math.max(0, targetNum - Number(runs || 0));
                const rrFill = fillRunRate({
                    teamName: battingTeam,
                    runs: Number(runs ?? 0),
                    overs: currentOvers,
                    crr: crr,
                    target: targetNum,
                    runsNeeded,
                    ballsRemaining,
                    isChasing: true
                });
                if (rrFill) fillers.push({ type: 'target_setup', text: rrFill });
            }
        } else {
            const openAtmosphere = fillInningsOpeningAtmosphere({
                battingTeam,
                bowlingTeam,
                overLimit
            });
            if (openAtmosphere) fillers.push({ type: 'opening_atmosphere', text: openAtmosphere });
        }

        // Broaden candidate pool in early quiet moments with professional tactical analysis
        const pitchEarly = fillPitchAndConditions({ overs: currentOvers, totalBalls: totalBallsBowled });
        if (pitchEarly) fillers.push({ type: 'pitch_conditions', text: pitchEarly });

        const tacticsEarly = fillTacticsAndFieldPlacements({
            bowler: bowler?.name,
            striker: striker?.name,
            wickets: Number(wickets ?? 0),
            isChasing: Boolean(isChasing || activeInnings === 2)
        });
        if (tacticsEarly) fillers.push({ type: 'tactics', text: tacticsEarly });

        const techEarly = fillTechnicalMasterclass({
            striker: striker?.name,
            bowler: bowler?.name
        });
        if (techEarly) fillers.push({ type: 'technical', text: techEarly });

        const bowlCraftEarly = fillBowlingCraftAndPlans({ bowler: bowler?.name });
        if (bowlCraftEarly) fillers.push({ type: 'bowling_craft', text: bowlCraftEarly });

        const batCraftEarly = fillBattingCraftAndTempo({
            striker: striker?.name,
            nonStriker: nonStriker?.name,
            isChasing: Boolean(isChasing || activeInnings === 2)
        });
        if (batCraftEarly) fillers.push({ type: 'batting_craft', text: batCraftEarly });

        const runningEarly = fillRunningAndCreasePressure();
        if (runningEarly) fillers.push({ type: 'running_crease', text: runningEarly });

        const tempoEarly = fillMatchTempoAndMomentum({
            overs: currentOvers,
            isChasing: Boolean(isChasing || activeInnings === 2)
        });
        if (tempoEarly) fillers.push({ type: 'match_tempo', text: tempoEarly });

        const atmosEarly = fillAtmosphereAndLore({
            battingTeam,
            bowlingTeam,
            overs: currentOvers,
            wickets: Number(wickets ?? 0)
        });
        if (atmosEarly) fillers.push({ type: 'atmosphere', text: atmosEarly });

        if (PROFESSIONAL_TACTICAL_DUOS && PROFESSIONAL_TACTICAL_DUOS.length > 0) {
            const duo = pickPhrase('tactical_duos_pool', PROFESSIONAL_TACTICAL_DUOS, 15);
            if (duo) {
                fillers.push({
                    type: 'tactical_duo',
                    text: duo.lead,
                    coFollowupText: duo.followup
                });
            }
        }

        return fillers;
    }

    // ─── MID / LATE INNINGS FILLERS (totalBallsBowled >= 15) ─────────────────
    // 1. Striker stats
    if (striker && striker.name && striker.name !== 'Striker' && striker.name !== 'Batsman') {
        const sFill = fillStriker({
            name: striker.name,
            runs: Number(striker.runs ?? 0),
            balls: Number(striker.balls ?? 0),
            fours: Number(striker.boundaries?.fours ?? striker.fours ?? 0),
            sixes: Number(striker.boundaries?.sixes ?? striker.sixes ?? 0)
        });
        if (sFill) fillers.push({ type: 'striker', text: sFill });
    }

    // 2. Bowler stats
    if (bowler && bowler.name && bowler.name !== 'Active Bowler' && bowler.name !== 'Bowler') {
        const bFill = fillBowler({
            name: bowler.name,
            overs: Number(bowler.overs ?? 0),
            runs: Number(bowler.runs ?? 0),
            wickets: Number(bowler.wickets ?? 0),
            maidens: Number(bowler.maidens ?? 0)
        });
        if (bFill) fillers.push({ type: 'bowler', text: bFill });
    }

    // 3. Current partnership
    if (partnership && Number(partnership.runs) > 0) {
        const b1 = partnership.batsman1 || striker?.name || 'The striker';
        const b2 = partnership.batsman2 || nonStriker?.name || 'his partner';
        const pFill = fillPartnership({
            batter1Name: b1,
            batter2Name: b2,
            runs: Number(partnership.runs),
            balls: Number(partnership.balls || 0)
        });
        if (pFill) fillers.push({ type: 'partnership', text: pFill });
    }

    // 4. Match situation & equation (prominently focuses on target in 2nd innings)
    if (battingTeam) {
        const sitFill = fillMatchSituation({
            battingTeam,
            bowlingTeam,
            runs: Number(runs ?? 0),
            wickets: Number(wickets ?? 0),
            overs: currentOvers,
            overLimit: Number(overLimit || 20),
            isChasing: Boolean(isChasing),
            target: Number(target || 0)
        });
        if (sitFill) fillers.push({ type: 'situation', text: sitFill });
    }

    // 5. Run Rate / Required Rate (prominently focuses on target in 2nd innings)
    if (battingTeam && (crr != null || currentOvers > 0)) {
        const overLimitNum = Number(overLimit || 20);
        const ballsRemaining = Math.max(0, (overLimitNum * 6) - (Math.floor(currentOvers) * 6 + Math.round((currentOvers % 1) * 10)));
        const runsNeeded = target ? Math.max(0, target - (runs || 0)) : 0;
        const rrFill = fillRunRate({
            teamName: battingTeam,
            runs: Number(runs ?? 0),
            overs: currentOvers,
            crr: crr || (currentOvers > 0 ? (Number(runs || 0) / currentOvers).toFixed(2) : '0.00'),
            target: Number(target || 0),
            runsNeeded,
            ballsRemaining,
            isChasing: Boolean(isChasing)
        });
        if (rrFill) fillers.push({ type: 'runrate', text: rrFill });
    }

    // 6. Non-striker
    if (nonStriker && nonStriker.name && nonStriker.name !== 'Non-Striker' && nonStriker.name !== 'Batsman') {
        const nsFill = fillNonStriker({
            name: nonStriker.name,
            runs: Number(nonStriker.runs ?? 0),
            balls: Number(nonStriker.balls ?? 0)
        });
        if (nsFill) fillers.push({ type: 'nonstriker', text: nsFill });
    }

    // 7. Pressure
    const pressFill = fillPressure({
        wickets: Number(wickets ?? 0),
        overLimit: Number(overLimit || 20),
        overs: currentOvers,
        runs: Number(runs ?? 0)
    });
    if (pressFill) fillers.push({ type: 'pressure', text: pressFill });

    // 8. Pitch & Playing Surface Nuances
    const pitchFill = fillPitchAndConditions({ overs: currentOvers, totalBalls: totalBallsBowled });
    if (pitchFill) fillers.push({ type: 'pitch_conditions', text: pitchFill });

    // 9. Field Setting & Captaincy Tactics
    const tacticsFill = fillTacticsAndFieldPlacements({
        bowler: bowler?.name,
        striker: striker?.name,
        wickets: Number(wickets ?? 0),
        isChasing: Boolean(isChasing)
    });
    if (tacticsFill) fillers.push({ type: 'tactics', text: tacticsFill });

    // 10. Technical Masterclass & Mechanics
    const techFill = fillTechnicalMasterclass({
        striker: striker?.name,
        bowler: bowler?.name
    });
    if (techFill) fillers.push({ type: 'technical', text: techFill });

    // 11. Bowling Craft & Plans
    const bowlCraft = fillBowlingCraftAndPlans({ bowler: bowler?.name });
    if (bowlCraft) fillers.push({ type: 'bowling_craft', text: bowlCraft });

    // 12. Batting Craft & Tempo
    const batCraft = fillBattingCraftAndTempo({
        striker: striker?.name,
        nonStriker: nonStriker?.name,
        isChasing: Boolean(isChasing)
    });
    if (batCraft) fillers.push({ type: 'batting_craft', text: batCraft });

    // 13. Running Between the Wickets
    const runningFill = fillRunningAndCreasePressure();
    if (runningFill) fillers.push({ type: 'running_crease', text: runningFill });

    // 14. Match Tempo & Momentum
    const tempoFill = fillMatchTempoAndMomentum({
        overs: currentOvers,
        isChasing: Boolean(isChasing)
    });
    if (tempoFill) fillers.push({ type: 'match_tempo', text: tempoFill });

    // 15. Atmosphere & Big Match Dynamics
    const atmosFill = fillAtmosphereAndLore({
        battingTeam,
        bowlingTeam,
        overs: currentOvers,
        wickets: Number(wickets ?? 0)
    });
    if (atmosFill) fillers.push({ type: 'atmosphere', text: atmosFill });

    // 16. Tactical Duo Dialogue (Professional Broadcast Exchange)
    if (PROFESSIONAL_TACTICAL_DUOS && PROFESSIONAL_TACTICAL_DUOS.length > 0) {
        const duo = pickPhrase('tactical_duos_pool', PROFESSIONAL_TACTICAL_DUOS, 15);
        if (duo) {
            fillers.push({
                type: 'tactical_duo',
                text: duo.lead,
                coFollowupText: duo.followup
            });
        }
    }

    return fillers;
}


/**
 * Analyst / Color Commentator Banter & Reactions (Person 2 - "David")
 * Written entirely for spoken TTS delivery:
 * - No written laughter (Haha, Ha ha) — use natural expressive broadcast language instead
 * - No shouted interjections — integrate emotion into the sentence
 * - Commas and dashes guide natural breath pauses
 */
export const ANALYST_REACTIONS = {
    six: [
        { emotion: 'roar', text: "My goodness. That hasn't just cleared the rope — it's gone well into the upper tier. What a colossal strike." },
        { emotion: 'surprise', text: "Extraordinary. You could hear the sound of bat on ball from the far end of the ground. Pure, effortless power." },
        { emotion: 'laughter', text: "Well, just look at the bowler's face. There is absolutely nothing you can do when it's middled like that." },
        { emotion: 'bat_crack', text: "The bat speed on that was remarkable. He picked up the length in a heartbeat and just launched it." },
        { emotion: 'roar', text: "An enormous hit. The crowd in the upper tier are genuinely ducking for cover. Sheer exhibition batting." }
    ],
    four: [
        { emotion: 'bat_crack', text: "Textbook. High elbow, full face of the blade presented, and it races into the fence. That's proper batting." },
        { emotion: 'laughter', text: "The sweeper gave chase, but he was never going to get near that on this outfield. A lovely boundary." },
        { emotion: 'surprise', text: "That is pure velvet. Pierced the ring with surgical precision — a gorgeous stroke, beautifully played." },
        { emotion: 'none', text: "Notice the balance at the point of impact. Head completely still. That is masterclass timing." }
    ],
    wicket_bowled: [
        { emotion: 'sad', text: "What an absolute delivery. Through the gate. The batter had no answer whatsoever to that late nip back." },
        { emotion: 'surprise', text: "The off stump is cartwheeling. You love to see that as a traditionalist. A beautiful, classical delivery." },
        { emotion: 'sad', text: "A slow walk back to the pavilion. He played all around a straight delivery and paid the ultimate price." },
        { emotion: 'surprise', text: "Nothing the batter could do with that. Pitched on a length, jagged back sharply and hit top of off." }
    ],
    wicket_caught: [
        { emotion: 'surprise', text: "What a grab. He held his nerve beautifully under a high ball. That is a really, really important breakthrough." },
        { emotion: 'sad', text: "He'll be kicking himself in the dressing room. A promising start, thrown away with a rush of blood to the head." },
        { emotion: 'laughter', text: "Never in any doubt. The safest pair of hands in the entire squad pouches yet another one." },
        { emotion: 'surprise', text: "Terrific judgment out there. Kept his eyes firmly on the ball and judged the trajectory perfectly." }
    ],
    wicket_caughtbehind: [
        { emotion: 'surprise', text: "A feather of an edge! What a take from the wicketkeeper, diving low to his right." },
        { emotion: 'none', text: "Just that little kiss of the outside edge. The keeper was ready, soft hands and a clean catch." },
        { emotion: 'surprise', text: "Pitched in the corridor of uncertainty, forced the batter to play, and the gloves do the rest." }
    ],
    wicket_caughtandbowled: [
        { emotion: 'surprise', text: "Incredible reflexes in the follow-through! He barely had a split second to react off his own bowling." },
        { emotion: 'surprise', text: "Plucked out of the air like a tracer bullet! Pure athletic instinct from the bowler." }
    ],
    wicket_lbw: [
        { emotion: 'surprise', text: "Plumb. Dead in front of middle and leg. Honestly, no need to look at any replays on that one. Straight as a die." },
        { emotion: 'sad', text: "Caught right on the crease, beaten for both pace and movement. A significant blow for the batting lineup." },
        { emotion: 'none', text: "No bat involved whatsoever. Struck right in front of the stumps, umpire had the easiest decision of the day." }
    ],
    wicket_runout: [
        { emotion: 'sad', text: "No, no, no. Complete breakdown in communication between the batters. Total calamity between the wickets." },
        { emotion: 'laughter', text: "Yes, no, wait, sorry... complete panic. And the bails were off in an instant. A very costly mix-up." },
        { emotion: 'surprise', text: "What an arm from the deep! Direct hit from forty yards out — that is world-class fielding." }
    ],
    wicket_stumped: [
        { emotion: 'surprise', text: "Lightning reflexes from the keeper. Look at those hands. In the absolute blink of an eye, the bails are off." },
        { emotion: 'none', text: "Drawn forward by the drift, completely deceived by the dip. The wicketkeeper did the rest in real style." },
        { emotion: 'surprise', text: "Not an inch of the back foot was behind the popping crease. Masterclass glovework." }
    ],
    wicket_hitwicket: [
        { emotion: 'surprise', text: "You almost never see that! He went back so deep in the crease that his heel just nudged the bail off." },
        { emotion: 'sad', text: "Pure disbelief on the batter's face. To lose your wicket by clipping your own timber is utter heartbreak." }
    ],
    wicket_retired: [
        { emotion: 'sad', text: "Never want to see a player walk off like that. Let's hope it's just a precautionary measure and nothing severe." }
    ],
    wicket_general: [
        { emotion: 'surprise', text: "A massive moment in the match. The fielding side have the breakthrough they desperately wanted." },
        { emotion: 'sad', text: "That breaks a crucial stand. The new batter now has to start all over again against this pumped-up attack." }
    ],
    dot: [
        { emotion: 'none', text: "Terrific discipline from the bowler. Hitting that probing fourth-stump channel ball after ball." },
        { emotion: 'surprise', text: "That beat the outside edge by the thinnest coat of varnish. Beautiful shape away from the right-hander." },
        { emotion: 'none', text: "The dot ball pressure is building really nicely here. You can feel the tension rising in the middle." },
        { emotion: 'none', text: "Notice the seam presentation on that delivery. Completely upright, allowing the surface to do the work." },
        { emotion: 'none', text: "Superb field setting here. The captain has plugged every single boundary pocket." },
        { emotion: 'none', text: "The batter wanted to work that into the gap, but the ring fielder was on their toes immediately." },
        { emotion: 'surprise', text: "A jaffa! Angling in and then just holding its line. The batter did well not to edge that." },
        { emotion: 'none', text: "That's several consecutive balls on the exact same sixpence. Outstanding concentration from the bowler." },
        { emotion: 'none', text: "Dot balls are gold dust in this phase of the game. Every scoreless ball pushes the required rate higher." },
        { emotion: 'none', text: "Good defensive technique from the batter. When the ball is doing that much, you have to respect it." },
        { emotion: 'none', text: "The bowler is really dictating terms right now. Not giving an inch of free width." }
    ],
    wide: [
        { emotion: 'laughter', text: "He was going for the wide yorker, but it spilled well beyond the tramline. A free gift to the batting side." },
        { emotion: 'none', text: "A lapse in execution from the bowler. The captain will not be pleased with that extra run conceded." }
    ],
    noball: [
        { emotion: 'surprise', text: "An overstep. The cardinal sin in limited overs cricket. A free hit is now on its way." },
        { emotion: 'laughter', text: "Look at the batter's eyes light up. A golden licence to swing freely — this is a real opportunity." }
    ]
};

// Lead commentator co-reactions when the analyst leads the call
export const ARTHUR_CO_REACTIONS = {
    six: [
        { emotion: 'roar', text: "Absolutely. He picked that length up in a heartbeat and sent it soaring into the crowd." },
        { emotion: 'surprise', text: "Couldn't agree more. The sound off the bat on that one was quite extraordinary." },
        { emotion: 'laughter', text: "What an absolute missile. And the crowd are genuinely loving every bit of this." },
        { emotion: 'bat_crack', text: "Effortless bat speed. Pure timing. Pure balance. A brilliant striker of the ball." }
    ],
    four: [
        { emotion: 'bat_crack', text: "Class written all over that stroke. Split the fielders with real ease." },
        { emotion: 'none', text: "Sublime timing. No need to run hard for that one at all." },
        { emotion: 'surprise', text: "Exquisite placement. Threaded right through the gap beautifully." }
    ],
    wicket_bowled: [
        { emotion: 'sad', text: "Clean through the gate. What an exceptional delivery that was." },
        { emotion: 'surprise', text: "The off stump knocked right back. Superb, disciplined bowling." }
    ],
    wicket_caught: [
        { emotion: 'surprise', text: "A massive breakthrough. Safely pouched by the fielder." },
        { emotion: 'sad', text: "A crucial, crucial wicket. That breaks a very threatening partnership." }
    ],
    wicket_caughtbehind: [
        { emotion: 'surprise', text: "Snicked off and taken behind! Outstanding glovework from the wicketkeeper." },
        { emotion: 'none', text: "A textbook dismissal for a seam bowler. Outside edge through to the keeper." }
    ],
    wicket_caughtandbowled: [
        { emotion: 'surprise', text: "Magnificent catch off his own bowling! Extraordinary reaction time." }
    ],
    wicket_lbw: [
        { emotion: 'surprise', text: "Plumb in front. The umpire didn't need to think twice before raising that finger." },
        { emotion: 'none', text: "Pitched in line, hit in line, hitting the stumps. Textbook LBW." }
    ],
    wicket_runout: [
        { emotion: 'sad', text: "Disaster between the wickets. A complete mix-up and a very costly dismissal." },
        { emotion: 'surprise', text: "Bullseye throw! The batter was nowhere near making the ground." }
    ],
    wicket_stumped: [
        { emotion: 'surprise', text: "Lightning hands from the keeper. Gone in the absolute blink of an eye." },
        { emotion: 'none', text: "Beaten in flight and turn. Superb wicketkeeping." }
    ],
    wicket_hitwicket: [
        { emotion: 'surprise', text: "Incredible misfortune. He has dislodged his own bails with the bat." }
    ],
    wicket_retired: [
        { emotion: 'sad', text: "A concerning moment as the batter walks off. We wish him a swift recovery." }
    ],
    wicket_general: [
        { emotion: 'surprise', text: "A vital breakthrough for the bowling side. Huge celebration in the huddle." }
    ],
    dot: [
        { emotion: 'none', text: "Spot on. Probing line and length, giving absolutely nothing away." },
        { emotion: 'surprise', text: "Beaten by the seam movement there. The bowler is really on song." },
        { emotion: 'none', text: "Top-class bowling. Forcing the batter to play on the bowler's terms." },
        { emotion: 'none', text: "Defended right back down the track. Nothing doing for the batting side on that one." },
        { emotion: 'none', text: "Sharp fielding in the ring! That saves a single and keeps the pressure dialed up." },
        { emotion: 'surprise', text: "Whistles past the outside edge! Oh, he was inches away from snicking that." },
        { emotion: 'none', text: "Building a lovely spell here. Really testing the batter's patience." },
        { emotion: 'none', text: "Solid stroke, but straight to the man at cover. Scoreless delivery." },
        { emotion: 'none', text: "Another dot ball added to the pressure cooker. Something has to give soon." },
        { emotion: 'none', text: "Pitched up, inviting the drive, but defended respectfully. Quality contest." }
    ],
    wide: [
        { emotion: 'none', text: "Slipped outside the guidelines there. A free gift of an extra run." }
    ],
    noball: [
        { emotion: 'surprise', text: "A costly mistake from the bowler. A free hit is now on its way." }
    ]
};

export const TRANSITION_BRIDGES = {
    boundary: [
        "Hold on —",
        "Wait, here it comes —",
        "And as we speak —",
        "Hang on —"
    ],
    wicket: [
        "Hold on, there's a shout —",
        "Wait —",
        "Oh, hang on a second —",
        "And wait —"
    ],
    standard: [
        "Bowler running in now —",
        "Here's the delivery —",
        "Turning back to the middle —",
        "And in he comes —"
    ]
};

export function getSmoothTransitionBridge(outcomeKey = 'dot') {
    if (outcomeKey === 'six' || outcomeKey === 'four') {
        const pool = TRANSITION_BRIDGES.boundary;
        return pool[Math.floor(Math.random() * pool.length)];
    }
    if (outcomeKey && outcomeKey.startsWith('wicket')) {
        const pool = TRANSITION_BRIDGES.wicket;
        return pool[Math.floor(Math.random() * pool.length)];
    }
    const pool = TRANSITION_BRIDGES.standard;
    return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Generate 2-Person Duo Commentary:
 * Alternates opportunities so Arthur and David take turns leading the call.
 * The other commentator follows up with authentic broadcast banter (~45% of the time).
 */
export function generateDuoBallCommentary(
    commItem = {},
    matchContext = {},
    leadSpeaker = 'Arthur',
    wasInterrupted = false
) {
    if (!commItem) return null;
    const runs = Number(commItem.runs ?? 0);
    const isWicket = Boolean(commItem.isWicket);
    const dismissalType = (commItem.dismissalType || '').toLowerCase();
    const rawFielder = (commItem.dismissalFielder || '').trim().replace(/^(null|undefined)$/i, '');
    const isExtra = Boolean(commItem.isExtra);
    const extraType = (commItem.extraType || '').toLowerCase();

    // 1. Determine ball commentary & lead emotion
    let leadText = generateBallVoiceCommentary(commItem, matchContext);
    let leadEmotion = 'neutral';
    let outcomeKey = 'dot';

    if (isWicket) {
        leadEmotion = 'surprise';
        const isCaughtAndBowled = dismissalType.includes('caught and bowled') ||
            dismissalType.includes('caught & bowled') ||
            dismissalType.includes('c & b') ||
            dismissalType.includes('c&b');
        const isCaughtBehind = !isCaughtAndBowled && (
            dismissalType.includes('caught behind') ||
            dismissalType.includes('behind') ||
            dismissalType.includes('keeper') ||
            rawFielder.toLowerCase().includes('keeper') ||
            rawFielder.toLowerCase().includes('wk')
        );

        if (isCaughtAndBowled) outcomeKey = 'wicket_caughtandbowled';
        else if (isCaughtBehind) outcomeKey = 'wicket_caughtbehind';
        else if (dismissalType.includes('bowled') || dismissalType.startsWith('b ') || dismissalType === 'b') outcomeKey = 'wicket_bowled';
        else if (dismissalType.includes('caught') || dismissalType.startsWith('c ')) outcomeKey = 'wicket_caught';
        else if (dismissalType.includes('lbw') || dismissalType.includes('leg before')) outcomeKey = 'wicket_lbw';
        else if (dismissalType.includes('run out') || dismissalType.includes('runout')) { outcomeKey = 'wicket_runout'; leadEmotion = 'sad'; }
        else if (dismissalType.includes('stump')) outcomeKey = 'wicket_stumped';
        else if (dismissalType.includes('hit wicket') || dismissalType.includes('hitwicket')) { outcomeKey = 'wicket_hitwicket'; leadEmotion = 'surprise'; }
        else if (dismissalType.includes('retired')) { outcomeKey = 'wicket_retired'; leadEmotion = 'sad'; }
        else outcomeKey = 'wicket_general';
    } else if (isExtra) {
        if (extraType.includes('wide')) outcomeKey = 'wide';
        else if (extraType.includes('no ball') || extraType.includes('noball')) { outcomeKey = 'noball'; leadEmotion = 'surprise'; }
    } else if (runs === 6) {
        outcomeKey = 'six';
        leadEmotion = 'roar';
    } else if (runs === 4) {
        outcomeKey = 'four';
        leadEmotion = 'bat_crack';
    } else if (runs === 0) {
        outcomeKey = 'dot';
        leadEmotion = 'neutral';
    } else {
        outcomeKey = 'dot';
    }

    // Smooth broadcaster transition when interrupting ongoing speech
    if (wasInterrupted) {
        const bridge = getSmoothTransitionBridge(outcomeKey);
        leadText = `${bridge} ${leadText}`;
    }

    // 2. Co-Commentator Reaction (taking turns)
    // Arthur leads -> David reacts. David leads -> Arthur reacts.
    let analyst = null;
    const isBigEvent = runs >= 4 || isWicket || outcomeKey === 'noball';
    const analystChance = isBigEvent ? 0.75 : 0.35;

    const isArthurLeading = leadSpeaker === 'Arthur';
    const coSpeaker = isArthurLeading ? 'David' : 'Arthur';
    const reactionPool = isArthurLeading ? ANALYST_REACTIONS[outcomeKey] : ARTHUR_CO_REACTIONS[outcomeKey];

    if (Math.random() < analystChance && reactionPool && reactionPool.length > 0) {
        const reactionKey = `co_${coSpeaker}_${outcomeKey}`;
        const pickedText = pickPhrase(reactionKey, reactionPool.map(r => r.text), Math.min(reactionPool.length - 1, 5));
        const matched = reactionPool.find(r => r.text === pickedText) || reactionPool[0];
        analyst = {
            speaker: coSpeaker,
            role: isArthurLeading ? 'Expert Analyst' : 'Lead Commentator',
            text: matched.text,
            emotion: matched.emotion
        };
    }

    return {
        outcomeKey,
        lead: {
            speaker: leadSpeaker,
            role: isArthurLeading ? 'Lead Commentator' : 'Expert Analyst',
            text: leadText,
            emotion: leadEmotion
        },
        analyst
    };
}

export const DUO_OPENING_REACTIONS = [
    { text: "You can just feel the electric atmosphere building. The pitch report suggested good carry, so the openers must respect that new ball early on.", emotion: 'neutral' },
    { text: "What an occasion! The crowd are up on their feet, and these opening overs will set the benchmark for the entire match.", emotion: 'surprise' },
    { text: "A pristine day for cricket. If the opening bowlers hit their hard lengths, we could be in for some early fireworks.", emotion: 'neutral' },
    { text: "The outfield is a lush carpet, and both teams look primed for an epic contest.", emotion: 'neutral' },
    { text: "The atmosphere is electric and everyone is eager to see how this pitch behaves.", emotion: 'neutral' }
];

export const DUO_CHASE_REACTIONS = [
    { text: "A fascinating chase ahead! The secret in these powerplay overs will be keeping wickets in hand while keeping the required rate in check.", emotion: 'neutral' },
    { text: "Scoreboard pressure is the ultimate test. If the bowling side grab an early wicket or two, this target will feel even larger.", emotion: 'neutral' },
    { text: "Finding the gaps in the ring and running hard will take the sting out of this chase.", emotion: 'neutral' },
    { text: "The batting unit has the firepower, but they can't afford to be reckless against this new cherry.", emotion: 'neutral' },
    { text: "Chasing under scoreboard pressure is where legends are made. Let's see how they handle it.", emotion: 'neutral' }
];

// ─── Professional Tactical Duos (Advanced Broadcast Exchanges for quiet moments) ───
export const PROFESSIONAL_TACTICAL_DUOS = [
    {
        lead: "You can see the captain subtly gesturing to the ring fielders here, David. They are pinching in a couple of yards on the off side.",
        followup: "Spot on, Arthur. They want to cut off that soft-handed push into the covers and force the batter to take an aerial risk."
    },
    {
        lead: "The bowler is really hammering that fourth-stump corridor right now. Giving the batter virtually nothing to free the arms.",
        followup: "Terrific discipline. In modern limited-overs cricket, three or four tight deliveries in a row create immense pressure."
    },
    {
        lead: "Notice how quickly these two batters turn for that second run. Real urgency in their running between the wickets.",
        followup: "It puts so much heat on the boundary riders. When fielders know batters are aggressive runners, fumbles start creeping in."
    },
    {
        lead: "David, look at the seam position on release. Beautiful upright seam, just wobbling slightly in the air.",
        followup: "That wobble seam is such an effective weapon on this surface. You never quite know if it will nip back in or hold its line."
    },
    {
        lead: "The batter did well there to drop the hands quickly. That bounced just a touch more than anticipated.",
        followup: "Soft hands are the hallmark of class. If you tense up and push at that length, you provide catching practice for the cordon."
    },
    {
        lead: "The fielding captain has just moved deep mid-wicket slightly squarer. Anticipating the batter looking to pull.",
        followup: "Proactive captaincy, Arthur. You always want to place fielders where the batter wants to score, not just where the ball went last over."
    },
    {
        lead: "You can feel the rhythm of this bowling spell settling in. Very consistent release point ball after ball.",
        followup: "Consistency of release is everything for a bowler. When your mechanics are locked in, line and length follow naturally."
    },
    {
        lead: "In a run chase like this, David, you cannot afford to let the required rate drift during the middle overs.",
        followup: "Absolutely. Boundaries are a bonus, but rotating strike at five or six an over keeps the mountain manageable."
    },
    {
        lead: "Wicketkeeper standing right up to the stumps now to keep the batter pinned inside the crease.",
        followup: "It completely eliminates the batter's freedom to shuffle forward or create their own half-volleys. Superb tactical move."
    },
    {
        lead: "The batter had a quick look at the infield gaps before taking guard. Constantly calculating where the singles lie.",
        followup: "Modern batting is about manipulation of space. You find the fielder's wrong foot and steal the run."
    },
    {
        lead: "The bowler goes slightly wider on the crease this time, angling the delivery into the right-hander's pads.",
        followup: "Altering the delivery angle without sacrificing pace is such a subtle, high-level skill. Keeps the batter guessing."
    },
    {
        lead: "A lovely demonstration of playing the ball right under the nose. No reaching, no lunging forward.",
        followup: "Letting the ball come to you is essential against quality bowling. You retain full control of the stroke."
    },
    {
        lead: "The fielding side are really up and about between deliveries. High energy in the inner ring.",
        followup: "That vocal encouragement from the slip cordon and keeper keeps the bowler sharp and focused through the over."
    },
    {
        lead: "Notice how deep the batter is standing in the crease, trying to gain that extra split-second against pace.",
        followup: "Gives you that fraction more time to read the bounce, especially when the bowler is hitting a hard deck."
    },
    {
        lead: "There is an open gap through backward point here. The bowling captain is daring the batter to play against the spin.",
        followup: "It's the classic bait, Arthur. Leave one tempting channel open and pack the catcher positions around it."
    },
    {
        lead: "A disciplined over so far. Bowler sticking strictly to the pre-match team briefing.",
        followup: "Execution is where matches are won and lost. You can have the best plan in the world, but hitting the target repeatedly is what counts."
    },
    {
        lead: "David, the ball seems to be holding up just a touch on the pitch as it gets older.",
        followup: "Indeed, Arthur. Batters will need to hold back their swing slightly. Any check-shot played too early could easily loop into the ring."
    },
    {
        lead: "Superb backing up from mid-on there. Prevented an overthrow and showed complete alertness.",
        followup: "The little things on a cricket field that never show up in the scorebook, but save ten to fifteen crucial runs over twenty overs."
    },
    {
        lead: "The bowler takes an extra couple of seconds at the top of the mark to reset their breathing.",
        followup: "Good composure. You never want to rush into your delivery stride when the batter is attempting to dictate the tempo."
    },
    {
        lead: "Watching how these two communicate between the wickets — loud, decisive calls right as the ball beats the fielder.",
        followup: "Yes and no, loud and clear. Indecisive calling is the root cause of every needless run-out in white-ball cricket."
    },
    {
        lead: "The captain has pulled mid-off back just ten yards, taking away the easy lofted boundary.",
        followup: "Protecting the straight hit. They're telling the bowler to keep targeting the stumps and let the field do the work."
    },
    {
        lead: "That was a clever change of pace from the bowler. Slipped the fingers down the side of the seam without breaking stride.",
        followup: "The disguise is what makes it so lethal. Same arm speed, same run-up, but arriving eight to ten kilometres slower."
    },
    {
        lead: "Batter taps down the surface around the popping crease. Taking a mental reset after that play and miss.",
        followup: "A sign of mental maturity. Forget the previous ball instantly, reset your posture, and get ready for the next contest."
    },
    {
        lead: "You can see the bowler checking the wind direction across the ground as they walk back to their mark.",
        followup: "Smart bowlers always use the cross-breeze. Drift through the air can be just as deceptive as movement off the deck."
    },
    {
        lead: "The fielding side have tightened their boundary ring. No easy twos on offer out in the deep.",
        followup: "They're forcing the batters to hit to the longest boundaries if they want to score boundaries. Excellent field mapping."
    },
    {
        lead: "A classic contest between bat and ball right here in the middle. Bowler asking questions, batter providing solid answers.",
        followup: "This is what white-ball cricket is all about. Precision versus power, and right now neither side is blinking."
    },
    {
        lead: "Notice how the bowler drags their length back slightly after seeing the batter advance.",
        followup: "Terrific awareness. If the batter wants to charge down, make them hit from awkwardly close to their own body."
    },
    {
        lead: "The batter makes sure to ground the bat well past the crease line with the toe slide. Good habits under pressure.",
        followup: "Fundamentals! Sliding the bat along the ground instead of planting it saves inches on close third-umpire calls."
    }
];

export const CRICKET_JOKES_AND_LORE = PROFESSIONAL_TACTICAL_DUOS;

/**
 * Occasional inter-ball conversational duo filler
 * Respects natural breathing silence between deliveries.
 * Employs active anti-repetition to prevent speaking same sentence in near times.
 */
export function getOccasionalDuoFiller(matchContext = {}, silenceProbability = 0.65, recentTexts = [], recentTypes = []) {
    if (Math.random() < silenceProbability) {
        return null;
    }

    const fillers = generateInterBallFillers(matchContext);
    if (!fillers || fillers.length === 0) return null;

    // Helper to extract significant core characters for similarity comparison
    const toCore = (str = '') => String(str).toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const recentCores = recentTexts.map(r => toCore(r)).filter(Boolean);

    // 1. Filter out candidate texts that were recently spoken
    const freshCandidates = fillers.filter(item => {
        if (!item || !item.text) return false;
        const itemCore = toCore(item.text);
        if (!itemCore) return false;

        return !recentCores.some(rCore => {
            if (itemCore === rCore) return true;
            // Check meaningful substring overlap (20+ chars)
            if (itemCore.length >= 20 && rCore.includes(itemCore.slice(0, 20))) return true;
            if (rCore.length >= 20 && itemCore.includes(rCore.slice(0, 20))) return true;
            return false;
        });
    });

    // If all candidate texts were recently spoken, stay silent! Never repeat the same sentence!
    if (freshCandidates.length === 0) {
        return null;
    }

    // 2. Prioritize variety by deprioritizing recently spoken types (e.g. don't repeat 'striker' back-to-back)
    const variedPool = freshCandidates.filter(item => !recentTypes.slice(-2).includes(item.type));
    const finalCandidates = variedPool.length > 0 ? variedPool : freshCandidates;

    const chosen = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
    const isArthur = Math.random() < 0.50;

    // Handle tactical duo dialogue specifically (professional commentary exchange)
    if (chosen.type === 'tactical_duo' || chosen.type === 'cricket_joke') {
        const leadIsArthur = Math.random() < 0.60;
        return {
            speaker: leadIsArthur ? 'Arthur' : 'David',
            role: leadIsArthur ? 'Lead Commentator' : 'Expert Analyst',
            text: chosen.text,
            emotion: 'neutral',
            type: 'tactical_duo',
            coFollowup: chosen.coFollowupText ? {
                speaker: leadIsArthur ? 'David' : 'Arthur',
                role: leadIsArthur ? 'Expert Analyst' : 'Lead Commentator',
                text: chosen.coFollowupText,
                emotion: 'neutral'
            } : null
        };
    }

    let prefix = '';
    let coFollowup = null;

    if (chosen.type === 'opening_atmosphere') {
        const atmospherePrefixes = [
            "Take a look at this magnificent setting out in the middle.",
            "You can feel the electricity around the ground today.",
            "What an incredible occasion to be broadcasting today.",
            ""
        ];
        prefix = atmospherePrefixes[Math.floor(Math.random() * atmospherePrefixes.length)];

        if (Math.random() < 0.55) {
            const pool = DUO_OPENING_REACTIONS;
            const candidateReaction = pool[Math.floor(Math.random() * pool.length)];
            const rCore = toCore(candidateReaction?.text);
            if (rCore && !recentCores.includes(rCore) && !rCore.includes(toCore(chosen.text).slice(0, 20))) {
                coFollowup = candidateReaction;
            }
        }
    } else if (chosen.type === 'target_setup') {
        const chasePrefixes = [
            "Looking at the equation for this chase —",
            "The chase is officially on —",
            "Here is the scenario facing the batting side —",
            ""
        ];
        prefix = chasePrefixes[Math.floor(Math.random() * chasePrefixes.length)];

        if (Math.random() < 0.55) {
            const pool = DUO_CHASE_REACTIONS;
            const candidateReaction = pool[Math.floor(Math.random() * pool.length)];
            const rCore = toCore(candidateReaction?.text);
            if (rCore && !recentCores.includes(rCore) && !rCore.includes(toCore(chosen.text).slice(0, 20))) {
                coFollowup = candidateReaction;
            }
        }
    } else if (chosen.type === 'pitch_conditions') {
        const pitchPrefixes = [
            "Looking closely at the surface here —",
            "Conditions out in the middle are fascinating —",
            ""
        ];
        prefix = pitchPrefixes[Math.floor(Math.random() * pitchPrefixes.length)];
    } else if (chosen.type === 'tactics') {
        const tacticsPrefixes = [
            "A word on the tactics here —",
            "Interesting field adjustments out there —",
            ""
        ];
        prefix = tacticsPrefixes[Math.floor(Math.random() * tacticsPrefixes.length)];
    } else if (chosen.type === 'technical') {
        const techPrefixes = [
            "Technically speaking —",
            "From a purely technical perspective —",
            ""
        ];
        prefix = techPrefixes[Math.floor(Math.random() * techPrefixes.length)];
    } else if (chosen.type === 'bowling_craft') {
        const bowlPrefixes = [
            "Observing the bowler's plans here —",
            "Notice the subtle adjustments from the bowler —",
            "From a bowling perspective —",
            ""
        ];
        prefix = bowlPrefixes[Math.floor(Math.random() * bowlPrefixes.length)];
    } else if (chosen.type === 'batting_craft') {
        const batPrefixes = [
            "From the batter's perspective —",
            "Watching the batting approach closely —",
            "The mindset in the middle is crucial here —",
            ""
        ];
        prefix = batPrefixes[Math.floor(Math.random() * batPrefixes.length)];
    } else if (chosen.type === 'running_crease') {
        const runPrefixes = [
            "Look at the intensity between the wickets —",
            "Running between the wickets is so vital —",
            ""
        ];
        prefix = runPrefixes[Math.floor(Math.random() * runPrefixes.length)];
    } else if (chosen.type === 'match_tempo') {
        const tempoPrefixes = [
            "Assessing the tempo of this contest —",
            "The rhythm of the match right now —",
            "Momentum is everything at this juncture —",
            ""
        ];
        prefix = tempoPrefixes[Math.floor(Math.random() * tempoPrefixes.length)];
    } else if (chosen.type === 'atmosphere') {
        const atmosPrefixes = [
            "The atmosphere here is sensational —",
            "Big match cricket right here —",
            ""
        ];
        prefix = atmosPrefixes[Math.floor(Math.random() * atmosPrefixes.length)];
    } else {
        const statPrefixes = [
            "Bowler walking back to the top of his mark now.",
            "Fielders adjusting slightly on the off side.",
            "Captain having a quick word with his bowler.",
            "Looking at the scoreboard now.",
            ""
        ];
        prefix = statPrefixes[Math.floor(Math.random() * statPrefixes.length)];
    }

    const combinedText = prefix ? `${prefix} ${chosen.text}` : chosen.text;

    return {
        speaker: isArthur ? 'Arthur' : 'David',
        role: isArthur ? 'Lead Commentator' : 'Expert Analyst',
        text: combinedText,
        emotion: 'neutral',
        type: chosen.type,
        coFollowup
    };
}

/**
 * Helpers to format batter hand and bowler type for natural broadcast commentary speech
 */
export function formatBattingHandForSpeech(hand = '') {
    if (!hand) return '';
    const clean = String(hand).trim().toLowerCase();
    if (clean === 'lhb' || clean === 'lhs' || clean.includes('left')) return 'left-hander';
    if (clean === 'rhb' || clean === 'rhs' || clean.includes('right')) return 'right-hander';
    return clean;
}

export function formatBowlingTypeForSpeech(style = '') {
    if (!style) return '';
    const clean = String(style).trim();
    const lower = clean.toLowerCase();
    if (lower === 'raf' || lower.includes('right arm fast') || lower.includes('right-arm fast')) {
        if (lower.includes('medium')) return 'right-arm fast-medium';
        return 'right-arm fast pace';
    }
    if (lower === 'laf' || lower.includes('left arm fast') || lower.includes('left-arm fast')) {
        if (lower.includes('medium')) return 'left-arm fast-medium';
        return 'left-arm fast pace';
    }
    if (lower.includes('medium fast') || lower.includes('medium-fast')) return 'medium-pacer';
    if (lower.includes('right-arm medium') || lower.includes('right arm medium')) return 'right-arm medium';
    if (lower.includes('left-arm medium') || lower.includes('left arm medium')) return 'left-arm medium';
    if (lower.includes('chinaman') || lower.includes('unorthodox')) return 'left-arm unorthodox spin';
    if (lower.includes('orthodox') || lower === 'sla' || lower.includes('slow left arm')) return 'left-arm orthodox spin';
    if (lower.includes('off break') || lower.includes('offbreak') || lower.includes('off spin')) return 'off-spin';
    if (lower.includes('leg break') || lower.includes('legbreak') || lower.includes('leg spin')) return 'leg-spin';
    return clean;
}

/**
 * Generate new over / new bowler intro commentary.
 * Triggered when a new bowler begins their spell at the start of an over.
 */
export function generateNewBowlerIntro(bowlerName = '', bowlerType = '', strikerName = '', strikerHand = '', overNumber = null) {
    const cleanName = cleanPlayerNameForSpeech(bowlerName);
    if (!cleanName || cleanName.toLowerCase() === 'bowler') return null;

    const bType = formatBowlingTypeForSpeech(bowlerType);
    const sHand = formatBattingHandForSpeech(strikerHand);
    const sName = cleanPlayerNameForSpeech(strikerName);
    const overStr = overNumber ? ` for over ${overNumber}` : '';

    if (bType && sHand && sName) {
        return pickPhrase('new_bowler_intro_full', [
            `A bowling change now. ${cleanName}, bowling ${bType}, comes on to bowl to the ${sHand}, ${sName}.`,
            `${cleanName} takes the ball${overStr}. It's ${bType} bowling against ${sName}, the ${sHand}.`,
            `Into the attack comes ${cleanName} with some ${bType}. Up against ${sName} on strike.`,
            `The captain turns to ${cleanName} to bowl ${bType}. A big contest coming up against the ${sHand}, ${sName}.`,
            `Bowling change: ${cleanName} is on to bowl ${bType} to ${sName} at the crease.`
        ]);
    }

    if (bType) {
        return pickPhrase('new_bowler_intro_type', [
            `A bowling change now. ${cleanName}, bowling ${bType}, is brought into the attack.`,
            `A fresh spell begins${overStr}. ${cleanName} brings their ${bType} into play from this end.`,
            `Into the attack comes ${cleanName} with some ${bType}. Looking to make an immediate impact here.`,
            `The captain hands the ball to ${cleanName} to bowl ${bType}. A crucial over coming up.`,
            `Here is a change of bowling: ${cleanName} steps up to bowl ${bType}. Let's see what line and length they settle on.`,
            `The captain introduces ${cleanName} into the attack, operating with ${bType}.`
        ]);
    }

    if (sHand && sName) {
        return pickPhrase('new_bowler_intro_hand', [
            `A bowling change now. ${cleanName} comes on to bowl to the ${sHand}, ${sName}.`,
            `${cleanName} takes the ball${overStr}. Up against the ${sHand}, ${sName}.`,
            `Into the attack comes ${cleanName}. Looking to trouble ${sName}, the ${sHand}.`
        ]);
    }

    return pickPhrase('new_bowler_intro', [
        `A bowling change now. ${cleanName} is brought into the attack.`,
        `A fresh spell begins${overStr}. ${cleanName} takes the ball at this end.`,
        `Into the attack now comes ${cleanName}. Looking to make an immediate impact here.`,
        `The captain hands the ball to ${cleanName}. A crucial over coming up.`,
        `${cleanName} is marking out the run-up now. An important spell begins.`
    ]);
}

/**
 * Innings Change / Target Setup Announcement for voice commentary.
 */
export function generateInningsChangeAnnouncement({
    firstInningsRuns = 0,
    firstInningsWickets = 0,
    target = null,
    battingTeam = 'The batting side',
    chasingTeam = 'The chasing side',
    overLimit = 20
} = {}) {
    const targetRuns = target || (Number(firstInningsRuns) + 1);
    const requiredRpo = ((targetRuns / Math.max(1, overLimit))).toFixed(2);

    return {
        lead: pickPhrase('innings_change_lead', [
            `That marks the end of the first innings! ${battingTeam} post ${firstInningsRuns} for ${firstInningsWickets}. ${chasingTeam} will need ${targetRuns} runs to win from their ${overLimit} overs!`,
            `Innings break here at the ground! ${battingTeam} finish their innings on ${firstInningsRuns} for ${firstInningsWickets}. Target set for ${chasingTeam} is ${targetRuns}!`,
            `The first innings draws to a close. A competitive total of ${firstInningsRuns} on the board. ${chasingTeam} require ${targetRuns} to claim victory!`
        ]),
        analyst: pickPhrase('innings_change_analyst', [
            `A fascinating chase coming up. ${chasingTeam} need ${targetRuns} at an asking rate of ${requiredRpo} runs per over. The opening overs will be absolutely crucial.`,
            `Both teams will fancy their chances here. If the bowling side can strike early, this could go right down to the wire. A target of ${targetRuns} is very contestable.`
        ])
    };
}

/**
 * Match Victory Announcement for when a match concludes.
 */
export function generateMatchVictoryAnnouncement(matchContext = {}) {
    const result = (matchContext.result || '').trim().replace(/^(null|undefined)$/i, '');
    const winner = (matchContext.winner || '').trim().replace(/^(null|undefined)$/i, '');

    if (result) {
        return {
            lead: `And that is the match! ${result}! What an absolute thriller of a contest!`,
            analyst: `A magnificent performance under pressure. Both sides gave everything, but the victory is thoroughly deserved.`
        };
    }

    if (winner) {
        return {
            lead: `${winner} have won the match! What a sensational victory, celebrated by every supporter in the ground!`,
            analyst: `Thoroughly deserved. They held their nerve when the game hung in the balance.`
        };
    }

    return {
        lead: `And that is the final ball! The match is concluded! What an extraordinary contest we have witnessed!`,
        analyst: `A truly memorable fixture. High quality cricket showcased by both teams today.`
    };
}

/**
 * Powerplay opening announcement.
 */
export function generatePowerplayAnnouncement(overs = '') {
    const overText = overs ? ` for Overs ${overs}` : '';
    return pickPhrase('v_powerplay_open', [
        `The Powerplay is officially active${overText}! Field restrictions are in place — just two fielders permitted outside the thirty-yard circle. Time for the batting side to take full advantage.`,
        `Powerplay underway${overText}! The field comes in, only two men allowed on the fence. Expect aggressive, attacking cricket in these opening overs.`,
        `Field restrictions active${overText}! The Powerplay has begun. A golden opportunity for the openers to find the ropes and set the tone.`
    ]);
}

/**
 * Powerplay concluded announcement.
 */
export function generatePowerplayEndedAnnouncement(overs = '') {
    const overText = overs ? ` after ${overs} overs` : '';
    return pickPhrase('v_powerplay_end', [
        `The Powerplay has concluded${overText}! Field restrictions are now lifted and the fielding captain can spread men out to the boundary.`,
        `End of the Powerplay${overText}! The ring opens up as the fielders head back to the fence. The middle overs battle begins now.`,
        `That marks the end of the Powerplay restrictions${overText}. Fielders spread out, and the batting side will now need to pick the gaps with precision.`
    ]);
}

/**
 * DLS applied announcement.
 */
export function generateDlsAnnouncement(dls = {}) {
    const target = dls?.revisedTarget || dls?.target;
    const overs = dls?.revisedOvers || dls?.overs;
    if (target && overs) {
        return `Important match update: The Duckworth-Lewis-Stern method has been applied! The revised target is now ${target} runs from ${overs} overs.`;
    }
    return `The Duckworth-Lewis-Stern method has come into effect for this match. A revised target and adjusted overs equation is now set.`;
}

/**
 * Maiden over announcement.
 */
export function generateMaidenOverAnnouncement(bowlerName = '') {
    const bowler = bowlerName && !/^(null|undefined)$/i.test(bowlerName) ? bowlerName : 'The bowler';
    return pickPhrase('v_maiden_over', [
        `That is a maiden over! Six consecutive dot balls from ${bowler}. Sensational bowling discipline, applying pure pressure.`,
        `A maiden over completed! ${bowler} concedes not a single run in that over. Top-class execution.`,
        `Superb bowling! A maiden over from ${bowler}. Giving absolutely nothing away to the batters.`
    ]);
}

/**
 * Free Hit announcement.
 */
export function generateFreeHitAnnouncement() {
    return pickPhrase('v_free_hit_prompt', [
        "Free hit delivery coming up! The batter has absolute licence to swing with no danger of being dismissed!",
        "It is a free hit ball! Maximum freedom for the batter — the bowler must be extraordinarily careful here.",
        "Free hit called! A golden opportunity to find the boundary rope with complete impunity."
    ]);
}

/**
 * Free Hit outcome-specific commentary.
 * Called on the delivery AFTER a no ball, once the outcome is known.
 * @param {number} runs - Runs scored on the free hit delivery
 * @param {string} batsman - Striker's name
 * @param {string} bowler - Bowler's name
 */
export function generateFreeHitOutcomeCommentary(runs = 0, batsman = 'The batter', bowler = 'The bowler') {
    const r = Number(runs ?? 0);
    const b = (batsman || 'The batter').trim().replace(/^(null|undefined)$/i, 'The batter');
    const bl = (bowler || 'The bowler').trim().replace(/^(null|undefined)$/i, 'The bowler');

    if (r >= 6) {
        return pickPhrase('fh_six', [
            `Six on the free hit! ${b} absolutely cashes in with no fear of dismissal — an enormous blow that the crowd will remember!`,
            `Maximum on a free hit! ${b} picks the length up immediately and deposits it deep into the stands. What a shot!`,
            `Free hit six! Pure bliss for ${b} — a maximum with total impunity. ${bl} will want that one back badly.`
        ]);
    }
    if (r === 4) {
        return pickPhrase('fh_four', [
            `Four off the free hit! ${b} takes full advantage — punishes with a crisp boundary. Great decision-making under the golden licence.`,
            `Boundary on the free hit! ${b} times it beautifully and pierces the infield for four. The scoreboard moves sweetly.`,
            `A four off a free hit ball — ${b} doesn't hold back. Strikes firmly and it races away to the rope. Well played indeed.`
        ]);
    }
    if (r === 3) {
        return pickPhrase('fh_three', [
            `Three runs on the free hit — ${b} hits it hard into the gap and they sprint hard for three. Good running on a golden delivery.`,
            `A terrific three off the free hit! ${b} finds the gap beautifully and the batters work hard for those runs.`
        ]);
    }
    if (r === 2) {
        return pickPhrase('fh_two', [
            `Two taken on the free hit. ${b} pushes it into the gap and they pick up a comfortable brace — a sensible approach on a licence delivery.`,
            `A couple of runs on the free hit ball. ${b} keeps it measured, rotates the strike and keeps the pressure ticking over.`
        ]);
    }
    if (r === 1) {
        return pickPhrase('fh_one', [
            `Just a single on the free hit — ${b} nudges it into the gap. A conservative use of the golden licence, but the strike has rotated.`,
            `One run on the free hit. ${b} takes what's available — perhaps a little cautious, but the scoreboard keeps moving.`
        ]);
    }
    // Dot ball on free hit
    return pickPhrase('fh_dot', [
        `Dot ball on the free hit — excellent discipline from ${bl} despite the pressure. Kept it accurate and denied the batter any freedom!`,
        `Good bowling on the free hit! ${bl} delivers a probing length and ${b} can only defend it back down the pitch. What control under pressure!`,
        `No run on the free hit. ${bl} does brilliantly to keep it tight — the batter had the licence but couldn't capitalise. Fantastic execution.`
    ]);
}

/**
 * Dismissed batter statistics read-out.
 * Called after a wicket falls to give the outgoing batter's scorecard line.
 * @param {string} name - Dismissed batter's name
 * @param {number} runs - Runs scored
 * @param {number} balls - Balls faced
 * @param {number} fours - Fours hit
 * @param {number} sixes - Sixes hit
 */
export function generateDismissedBatterStats(name = '', runs = 0, balls = 0, fours = 0, sixes = 0) {
    const cleanName = (name || '').trim().replace(/^(null|undefined)$/i, '');
    if (!cleanName) return null;
    const r = Number(runs ?? 0);
    const b = Number(balls ?? 0);
    const f = Number(fours ?? 0);
    const s = Number(sixes ?? 0);
    if (r === 0) return null; // Golden duck / duck already handled by ball commentary
    const sr = b > 0 ? ((r / b) * 100).toFixed(2) : '0.00';
    const bParts = [];
    if (f > 0) bParts.push(`${f} four${f > 1 ? 's' : ''}`);
    if (s > 0) bParts.push(`${s} six${s > 1 ? 'es' : ''}`);
    const boundaryStr = bParts.length > 0 ? `, hitting ${bParts.join(' and ')}` : '';
    const quality = r >= 50 ? 'a magnificent half-century' : r >= 30 ? 'a fine contribution' : r >= 15 ? 'a promising start' : 'a brief but valiant knock';

    return pickPhrase('dismissed_batter_stats', [
        `${cleanName} departs for ${r} off ${b} ball${b !== 1 ? 's' : ''}${boundaryStr} — a strike rate of ${sr}. ${r >= 30 ? 'A really quality knock, well played.' : 'A promising innings cut short.'}`,
        `That brings an end to ${quality} from ${cleanName}: ${r} runs, ${b} ball${b !== 1 ? 's' : ''}${boundaryStr}. Strike rate of ${sr}.`,
        `${cleanName} walks back having scored ${r} off ${b}${boundaryStr}. A strike rate of ${sr} — ${r >= 40 ? 'what a superb innings, very unlucky to go.' : 'the batting side will be slightly disappointed but there was some good intent.'}`
    ]);
}

/**
 * Generate new batter arrival commentary after a dismissal.
 * Triggered when a new player walks to the crease.
 */
export function generateNewBatterArrival(newBatterName = '', wickets = 0, runs = 0, overs = 0, overLimit = 20, batterHand = '', bowlerType = '') {
    const cleanName = cleanPlayerNameForSpeech(newBatterName);
    if (!cleanName) return null;
    const oversLeft = Math.max(0, overLimit - overs).toFixed(1);
    const position = wickets + 1; // Batting position
    const pressureNote = wickets >= 7 ? 'The lower order is upon us now.' : wickets >= 5 ? 'The middle order must dig deep here.' : wickets >= 3 ? 'The batting side need a solid partnership from here.' : 'Plenty of batting resources still to come.';

    const handText = formatBattingHandForSpeech(batterHand);
    const bTypeText = formatBowlingTypeForSpeech(bowlerType);

    if (handText && bTypeText) {
        return pickPhrase('new_batter_arrival_both', [
            `New batter walking in is ${cleanName}, the ${handText}! Facing ${bTypeText} bowling here at number ${position}. ${pressureNote}`,
            `Here comes ${cleanName} to the middle — a ${handText}! Up against ${bTypeText} with ${10 - wickets} wickets in hand and ${oversLeft} overs left. ${pressureNote}`,
            `Out walks ${cleanName}, the ${handText}. Takes guard against ${bTypeText} bowling. A crucial innings begins right here.`,
            `${cleanName} arrives at the crease, the ${handText}. ${cleanName} will need to assess this ${bTypeText} attack quickly.`
        ]);
    }

    if (handText) {
        return pickPhrase('new_batter_arrival_hand', [
            `New batter walking in is ${cleanName}, the ${handText}! Coming out to the middle at number ${position}. ${pressureNote}`,
            `Here comes ${cleanName} to the middle — a ${handText}! Takes guard with ${10 - wickets} wickets in hand and ${oversLeft} overs remaining. ${pressureNote}`,
            `The new batter, ${cleanName}, the ${handText}, makes the walk out to the middle now. A huge responsibility here.`,
            `Out walks ${cleanName}, a ${handText} — coming in at number ${position}. A crucial innings begins right here.`
        ]);
    }

    return pickPhrase('new_batter_arrival', [
        `New batter walking in is ${cleanName}! Coming out to the middle at number ${position}. ${pressureNote}`,
        `Here comes ${cleanName} to the middle! ${cleanName} takes guard with ${10 - wickets} wickets in hand and ${oversLeft} overs remaining. ${pressureNote}`,
        `The new batter, ${cleanName}, makes the walk out to the middle now. A huge responsibility on ${cleanName}'s shoulders here.`,
        `Out walks ${cleanName} — coming in at number ${position}. A crucial innings begins right here.`,
        `${cleanName} arrives at the crease. ${oversLeft} overs remaining, ${10 - wickets} wickets in hand. ${cleanName} will need to assess conditions quickly and build a solid partnership.`
    ]);
}

/**
 * Generate 50 Runs Half-Century Milestone Announcement.
 */
export function generateFiftyMilestoneAnnouncement(batterName = '', runs = 50, balls = null) {
    const cleanName = (batterName || '').trim().replace(/^(null|undefined)$/i, 'The batter');
    const ballStr = balls ? ` from just ${balls} balls` : '';
    return {
        lead: pickPhrase('fifty_lead', [
            `Fifty runs for ${cleanName}! What a magnificent milestone${ballStr}! The bat goes up to salute the dressing room!`,
            `That is a sensational half-century for ${cleanName}! Reaches fifty${ballStr} with pure class and authority!`,
            `The fifty is up for ${cleanName}! A masterclass in pacing an innings${ballStr}. The entire stadium is on their feet!`
        ]),
        analyst: pickPhrase('fifty_analyst', [
            `Thoroughly deserved applause for ${cleanName}. Has anchored this batting effort with sublime temperament and precision.`,
            `Superb batting under pressure. ${cleanName} looked determined from the very first ball, and that half-century is worth every run.`
        ])
    };
}

/**
 * Generate 100 Runs Century Milestone Announcement.
 */
export function generateCenturyMilestoneAnnouncement(batterName = '', runs = 100, balls = null) {
    const cleanName = (batterName || '').trim().replace(/^(null|undefined)$/i, 'The batter');
    const ballStr = balls ? ` off ${balls} deliveries` : '';
    return {
        lead: pickPhrase('century_lead', [
            `One hundred runs! A sensational century for ${cleanName}${ballStr}! Take a bow! Three figures reached in absolute grandeur!`,
            `He's done it! A magnificent century for ${cleanName}! One hundred glorious runs${ballStr}! What an extraordinary innings!`,
            `A hundred! Magic in the stadium! ${cleanName} reaches three figures${ballStr} — an innings of supreme mastery!`
        ]),
        analyst: pickPhrase('century_analyst', [
            `A truly legendary knock. You do not see batting of this pedigree very often. ${cleanName} has completely dismantled the bowling attack today.`,
            `Standing ovation from everyone in the ground. Pure cricket theatre from ${cleanName} — a century that will be remembered for years.`
        ])
    };
}

/**
 * Generate Team Total Milestones Announcement (50, 100, 150, 200, 250, 300, etc.)
 */
export function generateTeamMilestoneAnnouncement(milestone = 100, teamName = 'The batting side', overs = 0, wickets = 0) {
    const cleanTeam = cleanPlayerNameForSpeech(teamName) || 'The batting side';
    const overStr = overs ? ` in ${overs} overs` : '';
    const wktStr = wickets !== null && wickets !== undefined ? ` for the loss of ${wickets} wickets` : '';

    const milestoneWords = {
        50: 'fifty',
        100: 'hundred',
        150: 'one hundred and fifty',
        200: 'two hundred',
        250: 'two hundred and fifty',
        300: 'three hundred',
        350: 'three hundred and fifty',
        400: 'four hundred'
    };
    const word = milestoneWords[milestone] || `${milestone} runs`;

    return {
        lead: pickPhrase(`team_${milestone}_lead`, [
            `That brings up the ${word} for ${cleanTeam}! ${milestone} runs on the board${overStr}${wktStr}!`,
            `The ${word} is up for ${cleanTeam}! Reached${overStr} with ${10 - wickets} wickets in hand!`,
            `A major milestone for ${cleanTeam} — ${milestone} runs on the scoreboard${overStr}! The dugout applauds!`
        ]),
        analyst: pickPhrase(`team_${milestone}_analyst`, [
            `Superb batting effort from ${cleanTeam}. They have built this total with immense maturity and intent.`,
            `A very proud moment for the batting camp. To reach ${milestone}${overStr} puts them in a commanding position.`,
            `The team total ticks over ${milestone}. The momentum is firmly with the batters right now.`
        ])
    };
}

/**
 * Generate Hat-Trick Announcement (3 wickets in 3 balls).
 */
export function generateHatTrickAnnouncement(bowlerName = '') {
    const cleanName = (bowlerName || '').trim().replace(/^(null|undefined)$/i, 'The bowler');
    return {
        lead: pickPhrase('hat_trick_lead', [
            `Hat-trick! It's a hat-trick for ${cleanName}! Incredible, unbelievable scenes! Three wickets in three consecutive deliveries!`,
            `A hat-trick! ${cleanName} enters the history books! Three in three! Absolute pandemonium on the field!`,
            `Gone! It's a hat-trick! ${cleanName} has done the unthinkable! Three wickets on the bounce!`
        ]),
        analyst: pickPhrase('hat_trick_analyst', [
            `A bowler's ultimate dream! ${cleanName} has ripped the heart out of this batting line-up in the space of three magical deliveries.`,
            `Stunning accuracy, ruthless execution. A hat-trick at this level is cricket folklore. What a spell from ${cleanName}!`
        ])
    };
}

/**
 * Generate Hat-Trick Ball Prompt (bowler on 2 wickets in 2 balls).
 */
export function generateHatTrickBallPrompt(bowlerName = '') {
    const cleanName = (bowlerName || '').trim().replace(/^(null|undefined)$/i, 'The bowler');
    return pickPhrase('hat_trick_ball_prompt', [
        `Listen to the crowd! ${cleanName} is on a hat-trick! Two wickets in two deliveries — fielders clustering around the bat!`,
        `Two in two for ${cleanName}! The hat-trick ball is next! The tension in the stadium is palpable!`,
        `Wickets off consecutive balls! ${cleanName} has a chance at a hat-trick here! Every eye fixed on the middle!`
    ]);
}

/**
 * Generate Bowler Haul Announcement (3-wicket or 5-wicket haul).
 */
export function generateBowlerWicketsMilestone(bowlerName = '', wickets = 3, runs = null) {
    const cleanName = (bowlerName || '').trim().replace(/^(null|undefined)$/i, 'The bowler');
    const runsStr = runs != null ? ` for just ${runs} runs` : '';
    if (wickets >= 5) {
        return pickPhrase('five_wicket_haul', [
            `Five wickets for ${cleanName}! A sensational five-wicket haul${runsStr}! A devastating display of bowling brilliance!`,
            `Five-for! ${cleanName} raises the ball to the crowd! Five wickets in the innings${runsStr} — a masterclass in bowling!`,
            `What a spell! Five wickets for ${cleanName}! Has completely torn through the opposition batting line-up today!`
        ]);
    }
    return pickPhrase('three_wicket_haul', [
        `That's three wickets now for ${cleanName}${runsStr}! A dominant bowling performance, consistently troubling the batters.`,
        `Three wickets in the bag for ${cleanName}! Has been the standout bowler today, breaking key partnerships.`,
        `A third wicket for ${cleanName}! Bowling with tremendous rhythm and discipline throughout this spell.`
    ]);
}

/**
 * Generate End-of-Over Summary Announcement.
 */
export function generateOverEndAnnouncement(overNum = 1, runs = 0, wickets = 0, battingTeamName = 'The batting side') {
    const team = battingTeamName || 'The batting side';
    const num = Number(overNum);
    return pickPhrase('over_end_summary', [
        `End of over ${num}. ${team} are ${runs} for ${wickets}.`,
        `That concludes over ${num}. The score moves to ${runs} for ${wickets} wickets.`,
        `Over ${num} complete. ${team} sitting at ${runs} for ${wickets}.`
    ]);
}


