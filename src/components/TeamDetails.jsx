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
                                    {player.dismissal && ` (${player.dismissal})`}
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