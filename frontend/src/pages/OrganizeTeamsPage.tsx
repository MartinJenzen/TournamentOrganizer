import React, { Fragment, useEffect, useState } from 'react';
import { useNavigate} from 'react-router-dom';
import { useTournamentDetails } from '../context/TournamentContext';
import '../styles/OrganizeTeamsPage.css';
import { createTournament } from '../services/tournamentService';

export default function OrganizeTeamsPage() {
  const navigate = useNavigate();
  const { tournamentDetails, setTournamentDetails } = useTournamentDetails();

  const [groups, setGroups] = useState(initializeGroups());
  
  // States for drag and drop functionality
  const [draggedTeam, setDraggedTeam] = useState<string | null>(null);
  const [sourceGroup, setSourceGroup] = useState<string | null>(null);
  const [hoveredTargetTeam, setHoveredTargetTeam] = useState<string | null>(null);

  useEffect(() => {
    if (tournamentDetails.tournamentType === 'GROUP_AND_KNOCKOUT')
      handleRandomizeGroups();
  }, []);

  // Initialize empty groups with groups names (A, B, C, ...)
  function initializeGroups() {
    if (tournamentDetails.tournamentType !== 'GROUP_AND_KNOCKOUT')
      return {};
    
    const initialGroups: Record<string, string[]> = {};
    
    for (let i = 0; i < tournamentDetails.groupsCount; i++) {
      const groupName = String.fromCharCode(65 + i); // Assignment of letters to groups, starting with 'A'
      initialGroups[groupName] = [];
    }

    return initialGroups;
  }

  // Randomly assign teams to groups
  function handleRandomizeGroups() {
    const teams = tournamentDetails.selectedTeams.slice();
    const shuffledTeams = teams.sort(() => Math.random() - 0.5);

    const randomGroups: Record<string, string[]> = initializeGroups();

    // Distribute teams into groups
    shuffledTeams.forEach((team, index) => {
      const groupName = String.fromCharCode(65 + (index % tournamentDetails.groupsCount));
      randomGroups[groupName].push(team);
    });

    console.log('Randomized Groups:', randomGroups);
    setGroups(randomGroups);
  }

  async function handleCreateTournament() {
    const newTournament = { ...tournamentDetails, groups };
    setTournamentDetails(newTournament);
    
    try {
      const createdTournament = await createTournament(newTournament);
      console.log('Tournament created successfully:', createdTournament); // TODO: REMOVE
      setTournamentDetails({
        ...newTournament,
        id: createdTournament.id,
        createdAt: createdTournament.createdAt,
        updatedAt: createdTournament.updatedAt
      });
      console.log(newTournament); // TODO: REMOVE
      navigate('/tournament-page');
    } 
    catch (error) {
      console.error('Error creating tournament:', error);
    }
  }

  // DRAG AND DROP HANDLERS

  const handleDragStart = (event: React.DragEvent, team: string, fromGroup: string) => {
    setDraggedTeam(team);
    setSourceGroup(fromGroup);
    event.dataTransfer.effectAllowed = 'move';
    
    const draggedTeamImage = createDraggedTeamImage(team);
    setDraggedTeamImage(event, draggedTeamImage);
  };

  function createDraggedTeamImage(team: string): HTMLElement {
    const draggedTeamImage = document.createElement('div');
    draggedTeamImage.textContent = team;
    draggedTeamImage.className = 'dragged-team';
    return draggedTeamImage;
  }

  function setDraggedTeamImage(event: React.DragEvent, draggedImage: HTMLElement) {
    document.body.appendChild(draggedImage);                // Append to body to avoid layout issues
    event.dataTransfer.setDragImage(draggedImage, 0, 0);    // Set the drag image to the custom element

    // Remove the dragged image after a short delay to avoid memory leaks
    setTimeout(() => {
      document.body.removeChild(draggedImage);
    }, 0);
  }
  
  // Indicate which target team the source team is being dragged into
  const handleDragOntoTargetTeam = (event: React.DragEvent, targetTeam: string) => {
    if (draggedTeam && draggedTeam !== targetTeam)
      setHoveredTargetTeam(targetTeam);
  };

  // Clear hovered target team when dragging source team away again
  const handleDragAwayFromTargetTeam = (event: React.DragEvent) => {
    // Only clear if cursor actually leaves the element (and not just a child element)
    if (!event.currentTarget.contains(event.relatedTarget as Node))
      setHoveredTargetTeam(null);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();    // Tell browser to allow a possible drop on dragOver
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event: React.DragEvent, targetTeam: string, targetGroup: string) => {
    event.preventDefault();
    
    if (!draggedTeam || !sourceGroup) 
      return;

    // Don't allow dropping on the same team
    if (draggedTeam === targetTeam) {
      setDraggedTeam(null);
      setSourceGroup(null);
      return;
    }

    setGroups(groups => {
      const newGroups = { ...groups };
      const sourceArray = newGroups[sourceGroup]; // Grab reference to sourceGroup within newGroups
      const targetArray = newGroups[targetGroup];

      if (!sourceArray || !targetArray) 
        return groups;

      const sourceIndex = sourceArray.indexOf(draggedTeam);
      const targetIndex = targetArray.indexOf(targetTeam);
      
      if (sourceIndex < 0 || targetIndex < 0) 
        return groups;

      // Swap the two teams w/ array destructuring, which mutates sourceGroup and targetGroup within newGroups
      [sourceArray[sourceIndex], targetArray[targetIndex]] = [targetArray[targetIndex], sourceArray[sourceIndex]];
      console.log("Updated groups: ", newGroups);  // TODO: remove

      return newGroups;
    });

    setDraggedTeam(null);
    setSourceGroup(null);
    setHoveredTargetTeam(null);
  };

  return (
    <div className="organize-teams-page">

      {tournamentDetails.tournamentType === 'GROUP_AND_KNOCKOUT' && (
        <h1>Organize Teams</h1>
      )}
      {tournamentDetails.tournamentType === 'CUP' && (
        <h1>Organize Knockout Bracket</h1>
      )}
      {tournamentDetails.tournamentType === 'LEAGUE' && (
        <h1>Organize League</h1> 
      )}
      
      {/* Buttons */}
      <div className="buttons-container">

        {/* Randomize Groups */}
        <button 
          onClick={handleRandomizeGroups} 
          className="control-button" 
          disabled={tournamentDetails.tournamentType !== 'GROUP_AND_KNOCKOUT'}
        >
          🎲 Randomize
        </button>

        {/* Create */}
        <button onClick={handleCreateTournament} className="control-button create-tournament">
          Create Tournament
        </button>
      </div>
      
      {/* Groups */}
      {tournamentDetails.tournamentType === 'GROUP_AND_KNOCKOUT' && (
        <Fragment>

          {/* Groups */}
          <div className="groups-container">
            {Object.entries(groups).map(([groupName, teams]) => (
              <div 
                key={groupName} 
                className="group"
              >
                
                {/* Group table */}
                <h2>{groupName}</h2>
                <ul>
                  {teams.map((team) => (
                    <li 
                      key={team}
                      draggable
                      onDragStart={(event) => handleDragStart(event, team, groupName)}
                      onDragOver={handleDragOver}
                      onDragEnter={(event) => handleDragOntoTargetTeam(event, team)}
                      onDragLeave={handleDragAwayFromTargetTeam} 
                      onDrop={(event) => handleDrop(event, team, groupName)}
                      className={`
                        ${draggedTeam === team ? 'source-team' : ''}
                        ${hoveredTargetTeam === team ? 'target-team' : ''}
                      `}
                    >
                      {team}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        </Fragment>
      )}

      {/* Knockout play-offs bracket */}
      {(tournamentDetails.tournamentType === 'CUP') && (
        <div className="knockout-bracket">
          {/* Placeholder for knockout bracket visualization */}
          <div className="bracket-placeholder">Knockout bracket will be displayed here.</div>
        </div>
      )}

      {/* League table */}
      {(tournamentDetails.tournamentType === 'LEAGUE') && (
        <div className="league-table">
          {/* Placeholder for league table visualization */}
          <div className="table-placeholder">League table will be displayed here.</div>
        </div>
      )}

    </div>
  )
}
