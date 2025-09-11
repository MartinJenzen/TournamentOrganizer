import React, { useEffect, useMemo, useState } from 'react';
import { Tournament, Match, useTournamentContext } from '../context/TournamentContext';
import { saveMatchReport } from '../services/tournamentService';
import '../styles/TournamentPage.css';
import Table from '../components/Table';
import MatchReportModal from '../components/MatchReportModal';

export default function TournamentPage() {
  const { tournament, setTournament } = useTournamentContext();
  const [teams, setTeams] = useState<Tournament['teams']>(tournament?.teams || []);
  const [groups, setGroups] = useState<Record<string, Tournament['teams']>>(() => {
    return (tournament?.groups || []).reduce<Record<string, Tournament['teams']>>((map, group) => {
      map[group.name] = group.teams;
      return map;
    }, {});
  });

  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [topPlayersFilter, setTopPlayersFilter] = useState<'goals' | 'assists'>('goals');
  const [fixtureFilter, setFixtureFilter] = useState<string>('all');
  const [showMatchReportModal, setShowMatchReportModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const allPlayers = useMemo(() => {
    if (!tournament)
      return [];

    const players: Array<{
      id: number;
      name: string;
      teamName: string;
      goals: number;
      assists: number;
    }> = [];

    tournament.teams.forEach(team => {
      team.players.forEach(player => {
        players.push({
          id: player.id,
          name: player.name,
          teamName: team.name,
          goals: player.goals,
          assists: player.assists
        });
      });
    });

    return players;
  }, [tournament]);

  useEffect(() => {
    if (!tournament) 
      return;

    setTeams(tournament.teams);
    setGroups(
      (tournament.groups || []).reduce<Record<string, Tournament['teams']>>((reducedGroups, group) => {
        reducedGroups[group.name] = group.teams;
        return reducedGroups;
      }, {})
    );
  }, [tournament]);

  function getTopPlayers(type: 'goals' | 'assists', limit: number = 10) {
    return allPlayers
    .filter(player => player[type] > 0)
    .sort((a, b) => b[type] - a[type])
    .slice(0, limit);
  }

  function getFilteredMatches() {
    if (!tournament?.matches)
      return [];
    
    if (fixtureFilter === 'all') 
      return tournament.matches;

    if (fixtureFilter.startsWith('match-day-')) {
      const matchDay = parseInt(fixtureFilter.replace('match-day-', ''));
      return tournament.matches.filter(match => match.matchDay === matchDay);
    }

    if (fixtureFilter.startsWith('group-')) {
      const groupName = fixtureFilter.replace('group-', '');
      const group = tournament.groups?.find(g => g.name === groupName);

      if (!group)
        return [];

      const groupTeamIds = group.teams.map(team => team.id);
      return tournament.matches.filter(match => 
        groupTeamIds.includes(match.homeTeam.id) &&
        groupTeamIds.includes(match.awayTeam.id)
      );
    }

    return tournament.matches;
  }

  function getUniqueMatchDays() {
    if (!tournament?.matches) 
      return [];

    const matchDays = Array.from(new Set(tournament.matches.map(match => match.matchDay)));
    
    return matchDays.sort((a, b) => a - b);
  }

  function openMatchReportModal(match: Match) {
    if (!match)
      return;

    setSelectedMatch(match);
    setShowMatchReportModal(true);
  }

  async function handleSaveMatchReport(matchReport: any) {
    try {
      if (!tournament || !matchReport.matchId) {
        console.error("Tournament or match ID is missing");
        return;
      }

      const updatedTournament = await saveMatchReport(tournament.id, matchReport);
      setTournament(updatedTournament);
    } 
    catch (error) {
      console.error("Error saving match:", error);
      alert("Failed to save match report. Please try again.");
    }
    finally {
      setShowMatchReportModal(false);
      setSelectedMatch(null);
    }
  }

  if (!tournament)
    return <div>Loading tournament...</div>

  return (
    <div className="tournament-page">
      <h1>Tournament: <em>{tournament?.name}</em></h1>

      <div className="tournament-content">
        <div className="tables-container">
          
          {/* Group & Knockout */}
          {tournament?.type === 'GROUP_AND_KNOCKOUT' && (
            <div className="groups">
              <h2>Groups:</h2>
              <select 
                className="group-select"
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value)}
              >
                <option value="all">All Groups</option>
                {Object.keys(groups).map((groupName) => (
                  <option key={groupName} value={`group-${groupName}`}>
                    Group {groupName}
                  </option>
                ))}
              </select>

              {groupFilter === 'all' 
                ? Object.entries(groups).map(([groupName, groupTeams]) => (
                    <Table
                      key={groupName}
                      name={`${groupName}`}
                      teams={groupTeams}
                      topTeamsAdvancing={tournament.topTeamsAdvancing}
                      tournamentType={'GROUP_AND_KNOCKOUT'}
                    />
                  ))
                : Object.entries(groups)
                    .filter(([groupName]) => groupFilter === `group-${groupName}`)
                    .map(([groupName, groupTeams]) => (
                      <Table
                        key={groupName}
                        name={`${groupName}`}
                        teams={groupTeams}
                        topTeamsAdvancing={tournament.topTeamsAdvancing}
                        tournamentType={'GROUP_AND_KNOCKOUT'}
                      />
                    ))
              }
            </div>
          )}

          {/* League */}
          {tournament?.type === 'LEAGUE' && (
            <div className="league-container">
              <h2>Table:</h2>
              <Table
                key="league"
                name="League"
                teams={teams}
                tournamentType='LEAGUE'
              />
            </div>
          )}

          {/* Cup */}
          {tournament?.type === 'CUP' && (
            <div className="cup-container">
              {/* TODO */}
            </div>
          )}
        </div>

        {/* Top Players (goals/assists) */}
        <div className="top-players-container">
          <h2>Top Players:</h2>
          <select 
            className="top-players-select"
            value={topPlayersFilter}
            onChange={(event) => setTopPlayersFilter(event.target.value as 'goals' | 'assists')}
          >
            <option value="goals">Goals</option>
            <option value="assists">Assists</option>
          </select>

          <div className="top-players-list">
            {getTopPlayers(topPlayersFilter).length > 0 ? (
              getTopPlayers(topPlayersFilter).map((player, index) => (
                <div key={player.id} className="top-player">
                  <span className="player-rank">{index + 1}.</span>
                  <span className="player-name">{player.name}</span>
                  <span className="player-stat">
                    {player[topPlayersFilter]}
                  </span>
                </div>
              ))
            ) : (
              <p>No {topPlayersFilter} recorded yet.</p>
            )}
          </div>
        </div>

        {/* Fixtures */}
        <div className="fixtures-container">
          <h2>Fixtures:</h2>
          <select 
            className="fixtures-select"
            value={fixtureFilter}
            onChange={(event) => setFixtureFilter(event.target.value)}
          >
            <option value="all">All Matches</option>
            
            {/* Match Day options */}
            {getUniqueMatchDays().map(matchDay => (
              <option key={`match-day-${matchDay}`} value={`match-day-${matchDay}`}>
                Match Day {matchDay}
              </option>
            ))}
            
            {/* Group options (only for GROUP_AND_KNOCKOUT tournaments) */}
            {tournament?.type === 'GROUP_AND_KNOCKOUT' && tournament.groups?.map(group => (
              <option key={`group-${group.name}`} value={`group-${group.name}`}>
                Group {group.name}
              </option>
            ))}
          </select>

          {getFilteredMatches().length > 0 ? (
            <div className="fixtures-list">
              
              {Object.entries(
                getFilteredMatches().reduce((groups, match) => {    // Reduce matches into groups by match day
                  const matchDay = match.matchDay;
                  
                  if (!groups[matchDay]) 
                    groups[matchDay] = [];
              
                  groups[matchDay].push(match);
                  return groups;
                }, {} as Record<number, typeof tournament.matches>)
              ).map(([matchDay, matches]) => (    // Iterate over each matchDay and its matches
                
                <div className="match-day" key={matchDay}>
                  <h3>Match Day {matchDay}</h3>
                  <ul>
                    {matches.map((match) => (
                      <li key={match.id}>
                        
                        <div className="home-team">
                          <span>{match.homeTeam.name}</span>
                        </div>

                        <button className="match-button" onClick={() => openMatchReportModal(match)}>
                        
                        <span className="match-score">
                          <span className="home-score">{match.played ? match.homeScore : ''}</span>
                          <span className="dash">{match.played ? ' - ' : '✏️'}  </span>
                          <span className="away-score">{match.played ? match.awayScore : ''}</span>
                        </span>
                        </button>

                        <div className="away-team">
                          <span>{match.awayTeam.name}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p>No fixtures available.</p>
          )}
        </div>
      </div>

      {selectedMatch && (
        <MatchReportModal
          isOpen={showMatchReportModal}
          match={selectedMatch}
          onCancel={() => {
            setShowMatchReportModal(false);
            setSelectedMatch(null);
          }}
          onSave={(matchReport) => {
            handleSaveMatchReport(matchReport);
          }}
        />
      )}

    </div>
        

  );
} 