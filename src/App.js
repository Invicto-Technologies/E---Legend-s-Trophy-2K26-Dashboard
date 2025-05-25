// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/NavBar/NavBar';
import LiveMatch from './pages/LiveMatch/LiveMatch';
import UpcomingMatches from './pages/UpcomingMatches/UpcomingMatches';
import Fixtures from './pages/Fixtures/Fixtures';
import TopStories from './pages/TopStories/TopStories';
import Teams from './pages/Teams/Teams';
import Ranking from './pages/Ranking/Ranking';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<LiveMatch />} />
            <Route path="/upcoming-matches" element={<UpcomingMatches />} />
            <Route path="/fixtures" element={<Fixtures />} />
            <Route path="/top-stories" element={<TopStories />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/ranking" element={<Ranking />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;