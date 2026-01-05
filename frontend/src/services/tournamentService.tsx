import { api } from './api';
import { TournamentConfig } from '../context/TournamentContext';

export async function createTournament(details: TournamentConfig) {
  const { data: tournament } = await api.post('/tournaments', details);
  return tournament;
}

export async function fetchTournamentData(tournamentId: number) {
  const { data: tournament } = await api.get(`/tournaments/${tournamentId}`);
  return tournament;
}

export async function fetchUserTournaments() {
  const { data: tournaments } = await api.get('/tournaments/user-tournaments');
  return tournaments;
}

export async function deleteTournaments(tournamentIds: number[]) {
  await api.delete('/tournaments', {
    params: { ids: tournamentIds.join(', ') }
  });
}

// TODO: clean up
export async function saveMatchReport(tournamentId: number, matchReport: {
  matchId: number;
  homeScore: number;
  awayScore: number;
  events: {
    home: { playerId: number; type: 'GOAL' | 'ASSIST'; amount: number }[];
    away: { playerId: number; type: 'GOAL' | 'ASSIST'; amount: number }[];
  };
  tournamentStage: string;
}) {
  const flatEvents = [...matchReport.events.home, ...matchReport.events.away];
  const { data: updatedTournament } = await api.patch(`/tournaments/${tournamentId}/matches/${matchReport.matchId}/report`,
    {
      homeScore: matchReport.homeScore,
      awayScore: matchReport.awayScore,
      events: flatEvents,
      tournamentStage: matchReport.tournamentStage
    }
  );
  return updatedTournament;
}

export async function createPlayer(tournamentId: number, teamId: number, name: string) {
  const { data: player } = await api.post(`/tournaments/${tournamentId}/teams/${teamId}/players`,
    { name }
  );
  return player as { id: number; name: string; teamId: number };
}