import React, { useEffect, useState } from 'react';
import '../styles/MatchReportModal.css';
import { useTournamentContext} from '../context/TournamentContext';
import { createPlayer } from '../services/tournamentService';
import type { Match } from '../context/TournamentContext';
import UniversalModal from './UniversalModal';

interface MatchReportModalProps {
  isOpen: boolean;
  match: Match;
  onCancel: () => void;
  onSave: (data: {
    matchId: number;
    homeScore: number;
    awayScore: number;
    events: {
      home: MatchEvent[];
      away: MatchEvent[];
    };
  }) => void;
}

interface MatchEvent {
  playerId: number;
  type: 'GOAL' | 'ASSIST';
  amount: number;
}

interface PlayerEntry {
  playerId: number | null;
  name: string;
  goals: number;
  assists: number;
}

export default function MatchReportModal({ isOpen, match, onCancel, onSave }: MatchReportModalProps) {
  const { tournament } = useTournamentContext();
  const MAX_STAT = 99;

  const KNOCKOUT_ROUND_LABELS: Record<string, string> = {
    ROUND_OF_64: 'Round of 64',
    ROUND_OF_32: 'Round of 32',
    ROUND_OF_16: 'Round of 16',
    QUARTER_FINALS: 'Quarter-final',
    SEMI_FINALS: 'Semi-final',
    FINAL: 'Final'
  }

  // UniversalModal
  const [showUniversalModal, setShowUniversalModal] = useState(false);
  const [universalModalMode, setUniversalModalMode] = useState<'info'>('info');
  const [universalModalTitle, setUniversalModalTitle] = useState<string>('');
  const [universalModalMessage, setUniversalModalMessage] = useState<string>('');

  // Get full team details
  const homeTeam = tournament?.teams.find(team => team.id === match.homeTeam.id);
  const awayTeam = tournament?.teams.find(team => team.id === match.awayTeam.id);

  const [homeScore, setHomeScore] = useState<number>(match.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState<number>(match.awayScore ?? 0);

  const homePlayers = homeTeam?.players || [];
  const awayPlayers = awayTeam?.players || [];  

  // Player entries (rows)
  const [homeEntries, setHomeEntries] = useState<PlayerEntry[]>([{ playerId: null, name: '', goals: 0, assists: 0 }]);
  const [awayEntries, setAwayEntries] = useState<PlayerEntry[]>([{ playerId: null, name: '', goals: 0, assists: 0 }]);

  // Derive teams scores from player entries
  const derivedHomeScore = homeEntries.reduce((sum, playerEntry) => sum + (playerEntry.goals || 0), 0);
  const derivedAwayScore = awayEntries.reduce((sum, playerEntry) => sum + (playerEntry.goals || 0), 0);

  useEffect(() => {
    if (!isOpen) 
      return;

    loadPlayerEntries();

  }, [isOpen, match.id]);

  function loadPlayerEntries() {
    
    // Set empty player entries if no match events already exist
    if (!match.events || match.events.length === 0 || !homeTeam?.id || !awayTeam?.id) {
      setHomeEntries([{ playerId: null, name: '', goals: 0, assists: 0 }]);
      setAwayEntries([{ playerId: null, name: '', goals: 0, assists: 0 }]);
      return;
    }

    // Map player IDs to their entries
    const homePlayerEntries = new Map<number, PlayerEntry>();
    const awayPlayerEntries = new Map<number, PlayerEntry>();

    match.events.forEach(event => {
      // Determine which team the event belongs to
      const existingPlayerEntries = event.player.teamId === homeTeam?.id ? homePlayerEntries : awayPlayerEntries;

      // Retrieve existing player entry for this player, or create a new zeroed entry if absent
      const playerEntry = existingPlayerEntries.get(event.playerId) || {
        playerId: event.playerId,
        name: event.player.name,
        goals: 0,
        assists: 0
      };

      if (event.type === 'GOAL') 
        playerEntry.goals += event.amount;
      else if (event.type === 'ASSIST') 
        playerEntry.assists += event.amount;

      existingPlayerEntries.set(event.playerId, playerEntry);
    });

    setHomeEntries(
      homePlayerEntries.size
        ? Array.from(homePlayerEntries.values())                // Turn map into array if it has entries
        : [{ playerId: null, name: '', goals: 0, assists: 0 }]  // Else, return array with a single empty player entry as fallback
    );

    setAwayEntries(
      awayPlayerEntries.size
        ? Array.from(awayPlayerEntries.values())
        : [{ playerId: null, name: '', goals: 0, assists: 0 }]
    );
  }

  function syncPlayerNameToId(side: 'home' | 'away', index: number, playerName: string) {
    const playersList = side === 'home' ? homePlayers : awayPlayers;
    const playerEntry = playersList.find(player => player.name.toLowerCase() === playerName.trim().toLowerCase());
    
    updatePlayerEntry(side, index, {
      name: playerName,
      playerId: playerEntry ? playerEntry.id : null
    });
  }

  function addPlayerEntry(side: 'home' | 'away') {
    const setEntries = side === 'home' ? setHomeEntries : setAwayEntries;
    setEntries(entries => [...entries, { playerId: null, name: '', goals: 0, assists: 0 }]);
  }

  function removePlayerEntry(side: 'home' | 'away', index: number) {
    const setEntries = side === 'home' ? setHomeEntries : setAwayEntries;

    // Clear player input values if only one entry exists, else remove entire row
    setEntries(entries => {
      if (entries.length === 1) 
        return [{ playerId: null, name: '', goals: 0, assists: 0 }];
      
      return entries.filter((_, i) => i !== index);
    });
  }

  function updatePlayerEntry(side: 'home' | 'away', index: number, patch: Partial<PlayerEntry>) {
    const setEntries = side === 'home' ? setHomeEntries : setAwayEntries;
    
    setEntries(playerEntries => {
      const playerEntriesCopy = [...playerEntries];
      playerEntriesCopy[index] = { ...playerEntriesCopy[index], ...patch };

      return playerEntriesCopy;
    });
  }
  
  async function handleSave() {
    const invalidInputsError = validateInputs();
    
    if (invalidInputsError) {
      drawInvalidInputsModal(invalidInputsError);
      return;
    }

    // Create new players if needed then rebuild events
    const finalHome = await createNonExistingPlayers(homeEntries, homeTeam?.id || 0);
    const finalAway = await createNonExistingPlayers(awayEntries, awayTeam?.id || 0);

    onSave({
      matchId: match.id,
      homeScore: finalHome.reduce((goalSum, playerEntry) => goalSum + playerEntry.goals, 0) || homeScore,
      awayScore: finalAway.reduce((goalSum, playerEntry) => goalSum + playerEntry.goals, 0) || awayScore,
      events: {
        home: generateMatchEvents(finalHome),
        away: generateMatchEvents(finalAway)
      }
    });
  }

  function drawInvalidInputsModal(message: string) {
    setShowUniversalModal(true);
    setUniversalModalMode('info');
    setUniversalModalTitle('Error!'); // TODO: ⚠️❌🚫?
    setUniversalModalMessage(message);
  }

  function validateInputs(): string | null {
    // Team scores
    const scoreError = validateTeamScores();
    if (scoreError) 
      return scoreError;

    // Home players
    const homeError = validatePlayerEntries(homeEntries, 'Home');
    if (homeError) 
      return homeError;

    // Away players
    const awayError = validatePlayerEntries(awayEntries, 'Away');
    if (awayError) 
      return awayError;

    return null;
  }  

  function validateTeamScores(): string | null {
    if (homeScore > MAX_STAT || awayScore > MAX_STAT)
      return `Scores must be less than ${MAX_STAT + 1}!`;

    return null;
  }

  function validatePlayerEntries(playerEntries: PlayerEntry[], sideLabel: string): string | null {
    let teamGoals = 0;
    let teamAssists = 0;

    for (const player of playerEntries) {
      const hasStats = player.goals > 0 || player.assists > 0;

      if (hasStats && !player.name.trim())
        return `Goals/assists must be linked to a player!`;

      if (player.goals > MAX_STAT || player.assists > MAX_STAT)
        return `Player stats must be less than ${MAX_STAT + 1}!`;

      teamGoals += player.goals;
      teamAssists += player.assists;
    }

    if (teamAssists > teamGoals)
      return `${sideLabel} assists exceed goals!`;

    return null;
  }

  async function createNonExistingPlayers(playerEntries: PlayerEntry[], teamId: number) {
    if (!tournament) 
      return playerEntries;

    const newPlayers: PlayerEntry[] = [];

    for (const playerEntry of playerEntries) {
      const hasStats = playerEntry.goals > 0 || playerEntry.assists > 0;

      if (hasStats && !playerEntry.playerId && playerEntry.name.trim()) {
        const newPlayer = await createPlayer(tournament.id, teamId, playerEntry.name.trim());
        newPlayers.push({ ...playerEntry, playerId: newPlayer.id, name: newPlayer.name });
      } 
      else 
        newPlayers.push(playerEntry);

    }
    return newPlayers;
  }

  function generateMatchEvents(playerEntries: PlayerEntry[]): MatchEvent[] {
    const events: MatchEvent[] = [];
    
    playerEntries.forEach(entry => {
      if (entry.playerId && entry.goals > 0)
        events.push({ playerId: entry.playerId, type: 'GOAL', amount: entry.goals });
      
      if (entry.playerId && entry.assists > 0) 
        events.push({ playerId: entry.playerId, type: 'ASSIST', amount: entry.assists });
      
    });

    return events;
  }

  function formatLegNumberString(knockoutTieId?: number, legNumber?: number, knockoutRound?: string): string {
    if (!knockoutTieId || knockoutRound === "FINAL" || !legNumber || legNumber < 1 || legNumber > 2) 
      return '';

    let legText = ' - ';

    if (legNumber === 1) 
      legText += '1st leg';
    else if (legNumber === 2) 
      legText += '2nd leg';

    return legText;
  }

  if (!isOpen) 
    return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="match-report-modal-content" onClick={event => event.stopPropagation()}>
        
        {/* Title */}
        <header className="match-report-header">
          <h2>Match Report</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </header>

        {/* Subtitle (knockout round and leg, if applicable) */}
        {(match.stage === 'KNOCKOUT_STAGE') && (
          <h3 className="match-report-subtitle">
            {KNOCKOUT_ROUND_LABELS[match.knockoutRound as string] + formatLegNumberString(match.knockoutTieId, match.legNumber, match.knockoutRound)} 
          </h3>
        )}

        {/* Home and away team scores */}
        <section className="score-summary">
          <span className="home-team">{match.homeTeam.name}</span>
          <div className="score">
            <input
              type="number"
              min={0}
              max={99}
              // className="goals-input" // TODO: remove or change to?
              className="home-score-input"
              value={derivedHomeScore || homeScore}
              onChange={event => setHomeScore(Number(event.target.value))}
              onFocus={event => event.target.select()}    // Selects input value on focus
              title="Home score"
            />

            <span> - </span>

            <input
              type="number"
              min={0}
              max={99}
              // className="goals-input" // TODO: remove or change to?
              className="away-score-input"
              value={derivedAwayScore || awayScore}
              onChange={event => setAwayScore(Number(event.target.value))}
              onFocus={event => event.target.select()} 
              title="Away score"
            />
          </div>
          <span className="away-team">{match.awayTeam.name}</span>
        </section>

        <div className="match-events">
          <div className="team-container">
            <h4>{match.homeTeam.name}</h4>

            <div className="player-entry">
              <span className="column-label">Player</span>
              <span className="column-label">Goals</span>
              <span className="column-label">Assists</span>
              <span></span>
            </div>

            <datalist id={`home-players-${match.id}`}>
              {homePlayers.map(player => <option key={player.id} value={player.name} />)}
            </datalist>
            {homeEntries.map((playerEntry, index) => (
              <div className="player-entry" key={`home-${index}`}>
                
                {/* Name */}
                <input
                  title='Player name'
                  list={`home-players-${match.id}`}
                  className="player-name-input"
                  placeholder="Name"
                  value={playerEntry.name}
                  onChange={event => syncPlayerNameToId('home', index, event.target.value)}
                  onFocus={event => event.target.select()}
                />

                {/* Goals */}
                <input
                  title="Goals"
                  type="number"
                  min={0}
                  max={99}
                  className="goals-input"
                  value={playerEntry.goals}
                  onChange={event => updatePlayerEntry('home', index, { goals: Number(event.target.value) })}
                  onFocus={event => event.target.select()}
                />

                {/* Assists */}
                <input
                  title="Assists"
                  type="number"
                  min={0}
                  max={99}
                  className="assists-input"
                  value={playerEntry.assists}
                  onChange={event => updatePlayerEntry('home', index, { assists: Number(event.target.value) })}
                  onFocus={event => event.target.select()}
                />

                {/* Remove button */}
                <button
                  type="button"
                  className="remove-player-entry-btn"
                  onClick={() => removePlayerEntry('home', index)}
                  disabled={!playerEntry.name && !playerEntry.goals && !playerEntry.assists && homeEntries.length === 1}    // Disabled if no data entered or only one empty row remains
                  title="Remove player entry"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="add-player-entry-btn" onClick={() => addPlayerEntry('home')}>
              + Add Player
            </button>
          </div>

          <div className="team-container">
            <h4>{match.awayTeam.name}</h4>

            <div className="player-entry">
              <span className="column-label">Player</span>
              <span className="column-label">Goals</span>
              <span className="column-label">Assists</span>
              <span></span>
            </div>

            <datalist id={`away-players-${match.id}`}>
              {awayPlayers.map(player => <option key={player.id} value={player.name} />)}
            </datalist>
            {awayEntries.map((playerEntry, index) => (
              <div className="player-entry" key={`away-${index}`}>
                
                {/* Name */}
                <input
                  title='Player name'
                  list={`away-players-${match.id}`}
                  className="player-name-input"
                  placeholder="Name"
                  value={playerEntry.name}
                  onChange={event => syncPlayerNameToId('away', index, event.target.value)}
                  onFocus={event => event.target.select()}
                />

                {/* Goals */}
                <input
                  title="Goals"
                  type="number"
                  min={0}
                  max={99}
                  className="goals-input"
                  value={playerEntry.goals}
                  onChange={event => updatePlayerEntry('away', index, { goals: Number(event.target.value) })}
                  onFocus={event => event.target.select()}
                />

                {/* Assists */}
                <input
                  title="Assists"
                  type="number"
                  min={0}
                  max={99}
                  className="assists-input"
                  value={playerEntry.assists}
                  onChange={event => updatePlayerEntry('away', index, { assists: Number(event.target.value) })}
                  onFocus={event => event.target.select()} 
                />

                {/* Remove button */}
                <button
                  title="Remove player entry"
                  type="button"
                  className="remove-player-entry-btn"
                  onClick={() => removePlayerEntry('away', index)}
                  disabled={!playerEntry.name && !playerEntry.goals && !playerEntry.assists && awayEntries.length === 1}    // Disabled if no data entered or only one empty row remains
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="add-player-entry-btn" onClick={() => addPlayerEntry('away')}>
              + Add Player
            </button>
          </div>
        </div>

        <footer className="match-report-footer">
          <button className="secondary" onClick={onCancel}>Cancel</button>
          <button className="primary" onClick={handleSave}>Save Report</button>
        </footer>
      </div>
      
      {showUniversalModal && (
        <UniversalModal
          isOpen={showUniversalModal}
          mode={universalModalMode}
          title={universalModalTitle}
          message={universalModalMessage}
          onConfirm={() => setShowUniversalModal(false)}
          onCancel={() => setShowUniversalModal(false)}
        />
      )}
    </div>
  );
}