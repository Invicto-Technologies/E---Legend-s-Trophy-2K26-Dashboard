export const TeamDetails = ({ team = {}, isBatting = false }) => {
    // Provide default empty objects for potentially undefined properties
    const players = team.players || {};
    const bowlers = team.bowlers || {};
    const fallOfWickets = team.fallOfWickets || {};
    const extraTypes = team.extraTypes || {};
    const striker = team.ballFaceBatsman || {};
    const faceBowler = team.bowler || {};
    const battingPlayers = Object.values(players).filter(player => player.status !== 'yet to bat');
    const yetToBatPlayers = Object.values(players).filter(player => player.status === 'yet to bat');
    const partnerships = team.partnerships || {};
    const currentPartnership = team.currentPartnership || {};

    // Partnership History Component
    const PartnershipHistory = ({ partnerships = {}, teamName }) => {
        const partnershipArray = Object.values(partnerships).sort((a, b) =>
            (a.startWickets || 0) - (b.startWickets || 0)
        );

        if (partnershipArray.length === 0) {
            return null;
        }

        return (
            <div className="partnership-history">
                <h5>Partnership History - {teamName}</h5>
                <div className="partnerships-table">
                    <div className="partnership-header">
                        <span className="player-stats">Player Runs (Balls)</span>
                        <span className="partnership-runs">Total</span>
                        <span className="partnership-balls">Balls</span>
                        <span className="partnership-sr">SR</span>
                        <span className="partnership-score">Score</span>
                    </div>
                    {partnershipArray.map((partnership, index) => (
                        <div key={index} className="partnership-row">
                            <span className="player-stats">
                                <div className="player-stat">
                                    {partnership.batsman1?.name}: {partnership.batsman1Runs} ({partnership.batsman1Balls})
                                    <span className="player-sr">SR: {partnership.batsman1StrikeRate}</span>
                                </div>
                                <div className="player-stat">
                                    {partnership.batsman2?.name}: {partnership.batsman2Runs} ({partnership.batsman2Balls})
                                    <span className="player-sr">SR: {partnership.batsman2StrikeRate}</span>
                                </div>
                            </span>
                            <span className="partnership-runs">{partnership.runs}</span>
                            <span className="partnership-balls">{partnership.balls}</span>
                            <span className="partnership-sr">{partnership.strikeRate}</span>
                            <span className="partnership-score">
                                {partnership.startWickets}/{partnership.startScore} -
                                {partnership.endWickets}/{partnership.endScore}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className={`team-details ${isBatting ? 'batting-team' : ''}`}>
            <h3>{team.name || 'Team'} {isBatting && <span className="batting-label">(Batting)</span>}</h3>

            {/* Batting Stats */}
            {isBatting &&
                <div className="stats-section">
                    <h4>Batting Statistics</h4>
                    <div className="stats-table">
                        <div className="stats-header">
                            <span>Player</span>
                            <span>Runs</span>
                            <span>Balls</span>
                            <span>SR</span>
                            <span>4s</span>
                            <span>6s</span>
                            <span>Status</span>
                        </div>

                        {battingPlayers.map(player => (
                            <div key={player.id} className="stats-row">
                                <span>{player.name || '-'}{player.name === striker.name && isBatting && " *"}</span>
                                <span>{player.runs || 0}</span>
                                <span>{player.balls || 0}</span>
                                <span>{player.strikeRate || 0}</span>
                                <span>{player.boundaries?.fours || 0}</span>
                                <span>{player.boundaries?.sixes || 0}</span>
                                <span>
                                    {player.status || '-'}
                                    {player.dismissal && ` - ${player.dismissal}`}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Yet to Bat Players */}
                    {yetToBatPlayers.length > 0 && (
                        <div className="yet-to-bat">
                            <h5>Yet to bat</h5>
                            <div className="yet-to-bat-list">
                                {yetToBatPlayers.map(player => (
                                    <span key={player.id} className="yet-to-bat-player">{player.name}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Extras */}
                    {Object.keys(extraTypes).length > 0 && (
                        <div className="extras-info">
                            <h5>Extras - {team.totalExtraAmount}</h5>
                            <div className="extras-list">
                                {Object.entries(extraTypes).map(([type, value]) => (
                                    <span key={type} className="extra-item">
                                        {value}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Fall of Wickets */}
                    {Object.keys(fallOfWickets).length > 0 && (
                        <div className="extras-info">
                            <h5>Fall of Wickets</h5>
                            <div className="wickets-list">
                                {Object.entries(fallOfWickets).map(([key, wicket]) => (
                                    <div key={key} className="wicket-item">
                                        <span className="wicket-score">{wicket.score || '-'}</span>
                                        <span className="wicket-name">{wicket.name || '-'}</span>
                                        <span className="wicket-over">({wicket.over || '-'} ov)</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Current Partnership Display */}
                    {isBatting && currentPartnership.batsman1 && (
                        <div className="current-partnership">
                            <h5>Current Partnership</h5>
                            <div className="current-partnership-details">
                                <div className="partnership-stats">
                                    <div className="individual-stats">
                                        <div className="player-stat">
                                            <span className="player-name">{currentPartnership.batsman1.name}:</span>
                                            <span className="player-runs">{currentPartnership.batsman1Runs || 0}</span>
                                            <span className="player-balls">({currentPartnership.batsman1Balls || 0})</span>
                                        </div>
                                        <div className="player-stat">
                                            <span className="player-name">- {currentPartnership.batsman2.name}:</span>
                                            <span className="player-runs">{currentPartnership.batsman2Runs || 0}</span>
                                            <span className="player-balls">({currentPartnership.batsman2Balls || 0})</span>
                                        </div>
                                    </div>
                                    <div className="total-stats">
                                        <span className="total-runs">
                                            {((team.totalRuns || 0) - (currentPartnership.startScore || 0))} runs
                                        </span>
                                        <span className="total-balls">
                                            {((team.totalBalls || 0) - (currentPartnership.startBalls || 0))} balls
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {isBatting &&
                        <div className="stats-section">
                            {/* Partnership History */}
                            <PartnershipHistory
                                partnerships={partnerships}
                                teamName={team.name}
                            />
                        </div>
                    }
                </div>
            }

            {/* Bowling Stats */}
            {!isBatting &&
                <div className="stats-section">
                    <h4>Bowling Statistics</h4>
                    <div className="stats-table">
                        <div className="stats-header">
                            <span>Bowler</span>
                            <span>Overs</span>
                            <span>Runs</span>
                            <span>Wickets</span>
                            <span>Econ</span>
                        </div>
                        {Object.values(bowlers).map(bowler => (
                            <div key={bowler.id} className="stats-row">
                                <span>{bowler.name || '-'}{bowler.name === faceBowler.name && !isBatting && " *"}</span>
                                <span>{bowler.overs || 0}</span>
                                <span>{bowler.runs || 0}</span>
                                <span>{bowler.wickets || 0}</span>
                                <span>{bowler.economy || 0}</span>
                            </div>
                        ))}
                    </div>
                </div>
            }
        </div>
    );
};