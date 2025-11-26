import React from 'react';
import '../styles/Table.css';

interface TeamStats {
  id: number;
  name: string;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position?: number;
}

interface TableProps {
  name: string;
  teams: TeamStats[];
  topTeamsAdvancing?: number;
  tournamentType: 'LEAGUE' | 'GROUP_AND_KNOCKOUT' | 'KNOCKOUT';
}

export default function Table({ name, teams, topTeamsAdvancing, tournamentType }: TableProps) {

  const sortedTeams = [...teams].sort((teamA, teamB) => {
    if (teamB.points !== teamA.points)
      return teamB.points - teamA.points;

    if (teamB.goalDifference !== teamA.goalDifference)
      return teamB.goalDifference - teamA.goalDifference;

    return teamB.goalsFor - teamA.goalsFor;
  });

  return ( 
    <div className="table-container">
      {/* <h2 className="table-name">{name}</h2> */}

      <table className="standings-table">
        <thead>
          <tr>
            <th className="position-column header"></th>

            {tournamentType === 'GROUP_AND_KNOCKOUT' ? (
              <th className="team-column">Group {name}</th>
            ) : (
              <th className="team-column">Teams</th>
            )}
            
            <th className="stat-column">P</th>
            <th className="stat-column">W</th>
            <th className="stat-column">D</th>
            <th className="stat-column">L</th>
            <th className="stat-column">GF</th>
            <th className="stat-column">GA</th>
            <th className="stat-column">GD</th>
            <th className="stat-column">Pts.</th>
          </tr>
        </thead>

        <tbody>
          {sortedTeams.map((team, index) => {
            const position = index + 1;
            const isQualified = topTeamsAdvancing && position <= topTeamsAdvancing;

            return (
              <tr
                key={team.id}
                className={`team-row ${isQualified ? 'qualified' : ''}`}
              >
                <td className="position-column">{position}</td>
                <td className="team-cell">{team.name}</td>
                <td className="stat-cell">{team.gamesPlayed}</td>
                <td className="stat-cell">{team.wins}</td>
                <td className="stat-cell">{team.draws}</td>
                <td className="stat-cell">{team.losses}</td>
                <td className="stat-cell">{team.goalsFor}</td>
                <td className="stat-cell">{team.goalsAgainst}</td>
                <td className="stat-cell">{team.goalDifference}</td>
                <td className="stat-cell">{team.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}