import { api } from './api';
import { TournamentDetails } from '../context/TournamentContext';

export async function createTournament(details: TournamentDetails) {
  const { data: tournament } = await api.post('/tournaments', details);
  return tournament;
}