import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import '../styles/SidePanel.css';

export default function SidePanel() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    // TODO: better naming than layout?
    <div className="layout">
      <aside className="sidepanel">

        {/* Create Tournament */}
        <button className="sidepanel-button blue" onClick={() => navigate('/create-tournament')}>
          Create Tournament
        </button>

        {/* Load Tournament */}
        <button className="sidepanel-button blue" onClick={() => navigate('/load-tournament')}>
          Load Tournament
        </button>

        {/* Invitations */}
        <button className="sidepanel-button blue" onClick={() => console.log('Invitations')}>
          Invitations
        </button>

        {/* Return */}
        <button
          className="sidepanel-button blue"
          disabled={pathname === '/dashboard'}
          onClick={() => navigate(-1)}
        >
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