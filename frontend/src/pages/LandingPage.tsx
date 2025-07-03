import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/LandingPage.css';

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-header">
        <h1>Tournament Organizer</h1>
        <p>Create and manage your football tournaments with ease.</p>
      </header>
      <div className="landing-actions">
{/*         <Link to="/signup" className="btn">Sign Up</Link>
        <Link to="/login" className="btn btn-outline">Login</Link> */}
      </div>
    </div>
  )
}