import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tournament, useTournamentContext } from '../context/TournamentContext';
import { fetchUserTournaments, fetchTournamentData, deleteTournaments } from '../services/tournamentService';
import UniversalModal, { ModalMode } from '../components/UniversalModal';
import '../styles/LoadTournamentPage.css';

export default function LoadTournamentPage() {

  const { setTournament } = useTournamentContext();
  const navigate = useNavigate();

  const [tournamentList, setTournamentList] = useState<Tournament[]>([]);
  const [selectedTournamentIds, setSelectedTournamentIds] = useState<number[]>([]);
  const [lastClickedTournamentListIndex, setLastClickedTournamentListIndex] = useState<number | null>(null);

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('confirm');

  const selectedTournamentNames = useMemo(() => {
    return tournamentList
      .filter(tournament => selectedTournamentIds.includes(tournament.id))
      .map(tournament => tournament.name);
  }, [tournamentList, selectedTournamentIds]);

  function toggleSelectedTournament(id: number) {
    setSelectedTournamentIds(selectedTournamentIds => 
      selectedTournamentIds.includes(id) ? selectedTournamentIds.filter(tournamentId => tournamentId !== id) : [...selectedTournamentIds, id]
    );
  }

  function toggleMultipleSelectedTournaments(startIndex: number, endIndex: number, shouldSelect: boolean) {
    const [fromIndex, toIndex] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
    const idsInSelectedRange = tournamentList.slice(fromIndex, toIndex + 1).map(tournament => tournament.id);

    setSelectedTournamentIds(selectedTournamentIds => {
      const selectedTournaments = new Set(selectedTournamentIds);    // Set to avoid duplicates and allow easy add/remove
      
      for (const tournamentId of idsInSelectedRange) {
        if (shouldSelect) 
          selectedTournaments.add(tournamentId);
        else 
          selectedTournaments.delete(tournamentId);
      }

      return Array.from(selectedTournaments);
    });
  };

  // Handle selection of tournaments in the displayed list
  function handleSelect(mouseEvent: React.MouseEvent, clickedTournamentListIndex: number, selectedTournamentId: number) {
    const isSelected = selectedTournamentIds.includes(selectedTournamentId);

    // Shift + click selection of multiple tournaments 
    if (mouseEvent.shiftKey && lastClickedTournamentListIndex !== null)
      toggleMultipleSelectedTournaments(lastClickedTournamentListIndex, clickedTournamentListIndex, !isSelected);
    else
      toggleSelectedTournament(selectedTournamentId);    // Single tournament

    // Update last clicked index in tournamentList
    setLastClickedTournamentListIndex(clickedTournamentListIndex);
  };

  function openModal(mode: ModalMode) {
    setModalMode(mode);
    setModalIsOpen(true);
  }

  function handleCancel() { 
    setModalIsOpen(false);
  }

  async function handleConfirm() {
    if (modalMode === 'confirm') 
      await handleDeleteTournaments();
    
    setModalIsOpen(false);
  }

  async function handleLoadTournament() {

    if (selectedTournamentIds.length !== 1)
      return;

    const tournamentId = selectedTournamentIds[0];
    const selectedTournament = tournamentList.find(tournament => tournament.id === tournamentId);
    
    try {
      if (selectedTournament) {
        const fetchedTournament = await fetchTournamentData(selectedTournament.id);
        setTournament(fetchedTournament);
        navigate('/tournament'); 
      }
    }
    catch (error) {
      console.error('Error loading tournament:', error);
    }
  }

  async function handleDeleteTournaments() {
    if (selectedTournamentIds.length === 0) 
      return;
    
    try {
      await deleteTournaments(selectedTournamentIds);
      removeDeletedTournamentsFromList();
      setSelectedTournamentIds([]);
    }
    catch (error) {
      console.error('Error deleting tournament/s:', error);
    }
  }

  function removeDeletedTournamentsFromList() {
    setTournamentList(tournamentList =>
      tournamentList.filter(tournament => !selectedTournamentIds.includes(tournament.id))
    );
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

  // Fetch list of tournaments saved by user
  useEffect(() => {
    (async () => {
      const fetchedTournaments = await fetchUserTournaments();
      setTournamentList(fetchedTournaments);
    })();
  }, []);

  return (
    <div className="load-tournament-page">
      <h1>Created Tournaments</h1>

      {/* Buttons */}
      <div className="buttons-container">
        
        {/* Load */}
        <button 
          className="load-tournament-button" 
          onClick={handleLoadTournament}
          disabled={selectedTournamentIds.length !== 1}      
        >
          Load
        </button>

        {/* Delete */}
        <button 
          className="delete-tournament-button" 
          onClick={() => openModal('confirm')} 
          disabled={selectedTournamentIds.length === 0}
        >
          Delete
        </button>
      </div>

      {/* List of tournaments */}
      <table className="tournaments-table">
        
        {/* Column headers */}
        <thead>
          <tr>
            <th> </th>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
            <th>Updated</th>
            <th>Created</th>
          </tr>
        </thead>

        {/* Tournament rows */}
        <tbody>
          {tournamentList.map((tournament: Tournament, index: number) => {
            const isSelected = selectedTournamentIds.includes(tournament.id);

            // Individual row
            return (
              <tr
                key={tournament.id}
                className={isSelected ? 'selected' : ''}
                onClick={(event) => handleSelect(event, index, tournament.id)}
              >
                <td>
                  <input
                    type="checkbox"
                    name="selectedTournament"
                    checked={isSelected}
                    onClick={(event) => { 
                      event.stopPropagation()
                      handleSelect(event, index, tournament.id);
                    }}
                  />
                </td>
                <td>{tournament.name}</td>
                <td>{formatTournamentType(tournament.type)}</td>
                <td>{formatTournamentStatus(tournament.status)}</td>
                <td>{new Date(tournament.updatedAt).toLocaleDateString()}</td>
                <td>{new Date(tournament.createdAt).toLocaleDateString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <UniversalModal
        isOpen={modalIsOpen}
        mode={modalMode}
        title='Delete Tournament/s?'
        message={
          selectedTournamentNames.length <= 3
            ? `Are you sure you want to delete: '${selectedTournamentNames.join("', '")}'?`
            : `Are you sure you want to delete ${selectedTournamentNames.length} tournaments?`
        }
        confirmButtonText="Delete"
        isDangerous={true}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    </div>
  );
}