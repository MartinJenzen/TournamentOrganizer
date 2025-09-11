import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournamentContext } from '../context/TournamentContext';
import { fetchUserTournaments, fetchTournamentData, deleteTournament } from '../services/tournamentService';
import UniversalModal, { ModalMode } from '../components/UniversalModal';
import '../styles/LoadTournamentPage.css';

export default function LoadTournamentPage() {

  const { setTournament } = useTournamentContext();
  const navigate = useNavigate();

  // Fetch list of tournaments saved by user
  const [tournamentList, setTournamentList] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [tournamentName, setTournamentName] = useState<string>('');

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('confirm');

  useEffect(() => {
    (async () => {
      const userTournaments = await fetchUserTournaments();
      setTournamentList(userTournaments);
    })();
  }, []);

  const openModal = (mode: ModalMode) => {
    setModalMode(mode);
    setModalIsOpen(true);
  }

  const handleCancel = () => { 
    setModalIsOpen(false);
    setSelectedTournamentId(null);
  }

  const handleConfirm = async (data?: any) => {
    if (modalMode === 'confirm') {
      await handleDeleteTournament();
    }
    setModalIsOpen(false);
  }

  // Logic to load the selected tournament
  async function handleLoadTournament() {

    if (selectedTournamentId == null) 
      return;

    const selectedTournament = tournamentList.find(t => t.id === selectedTournamentId);

    console.log('Loading tournament with ID:', selectedTournament.id);

    try {
      if (selectedTournament) {
        const fetchedTournament = await fetchTournamentData(selectedTournament.id);
        console.log('Fetched tournament data:', fetchedTournament);
        setTournament(fetchedTournament);
        navigate('/tournament'); 
      }
    }
    catch (error) {
      console.error('Error loading tournament:', error);
    }
  }

  async function handleDeleteTournament() {
    if (selectedTournamentId == null) 
      return;
    
    try {
      console.log('Deleting tournament with ID:', selectedTournamentId);
      await deleteTournament(selectedTournamentId);

      // Refresh the tournament list
      setTournamentList(tournamentList.filter(tournament => tournament.id !== selectedTournamentId));

      setSelectedTournamentId(null);
    }
    catch (error) {
      console.error('Error deleting tournament:', error);
    }
  }

  function formatTournamentStatus(status: string) {
    switch (status) {
      case 'IN_PROGRESS':
        return "In Progress";
      case 'COMPLETED':
        return "Completed";
      default:
        return "Unknown";
    }
  }

  function formatTournamentType(type: string) {
    switch (type) {
      case 'LEAGUE':
        return "League";
      case 'GROUP_AND_KNOCKOUT':
        return "Group & Knockout";
      case 'CUP':
        return "Cup";
      default:
        return "Unknown";
    }
  }

  return (
    <div className="load-tournament-page">
      <h1>Created Tournaments</h1>

      {/* Buttons */}
      <div className="buttons-container">
        <button 
          className="load-tournament-button" 
          onClick={handleLoadTournament}
          disabled={!selectedTournamentId}          
        >
          Load
        </button>
        <button 
          className="delete-tournament-button" 
          onClick={() => openModal('confirm')} 
          disabled={!selectedTournamentId}
        >
          Delete
        </button>
      </div>

      {/* List of tournaments */}
      <table className="tournaments-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
            <th>Updated</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {tournamentList.map((tournament: any) => (
            <tr 
              key={tournament.id}
              className={tournament.id === selectedTournamentId ? 'selected' : ''}
              onClick={() => {
                setSelectedTournamentId(tournament.id);
                setTournamentName(tournament.name);
              }}
            >
              <td>{tournament.name}</td>
              <td>{formatTournamentType(tournament.type)}</td>
              <td>{formatTournamentStatus(tournament.status)}</td>
              <td>{new Date(tournament.updatedAt).toLocaleDateString()}</td>
              <td>{new Date(tournament.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <UniversalModal
        isOpen={modalIsOpen}
        mode={modalMode}
        title='Delete Tournament?'
        message={`Are you sure you want to delete tournament: '${tournamentName}'?`}
        confirmButtonText="Delete"
        isDangerous={true}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    </div>
  );
}