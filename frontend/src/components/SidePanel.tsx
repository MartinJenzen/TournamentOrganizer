import React from 'react';
import '../styles/SidePanel.css';
import { Outlet, useNavigate } from 'react-router-dom'

export default function SidePanel() {
  const navigate = useNavigate();

  return (
    // TODO: better naming than layout?
    <div className="layout">
      <aside className="sidepanel">

        {/* Create Tournament */}
        <button className="sidepanel-button" onClick={() => navigate('/create-tournament')}>
          Create New Tournament
        </button>

        {/* Load Tournament */}
        <button className="sidepanel-button" onClick={() => console.log('Load Tournament')}>
          Load Tournament
        </button>

        {/* Invitations */}
        <button className="sidepanel-button" onClick={() => console.log('Invitations')}>
          Invitations
        </button>

        {/* Return */}
        {/* TODO: remove ability to return to LandingPage */}
        <button className="sidepanel-button" onClick={() => window.history.back()}>
          Return
        </button>
      </aside>

      {/* Main content area where the routed components will be rendered */}
      {/* Using Outlet to render child routes */}
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}