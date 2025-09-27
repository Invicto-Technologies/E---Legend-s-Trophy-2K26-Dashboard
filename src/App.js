import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/NavBar/NavBar';
import LiveMatch from './pages/LiveMatch/LiveMatch';
import UpcomingMatches from './pages/UpcomingMatches/UpcomingMatches';
import Fixtures from './pages/Fixtures/Fixtures';
import TopStories from './pages/TopStories/TopStories';
import Teams from './pages/Teams/Teams';
import Ranking from './pages/Ranking/Ranking';
import Login from './pages/Login/Login';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = () => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
    setIsChecking(false);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  if (isChecking) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="app">
        {isLoggedIn && <Navbar onLogout={handleLogout} />}
        <div className="main-content">
          <Routes>
            <Route
              path="/login"
              element={
                isLoggedIn ?
                  <Navigate to="/" replace /> :
                  <Login onLogin={handleLogin} />
              }
            />
            <Route
              path="/"
              element={
                isLoggedIn ?
                  <LiveMatch /> :
                  <Navigate to="/login" replace />
              }
            />
            <Route
              path="/upcoming-matches"
              element={
                isLoggedIn ?
                  <UpcomingMatches /> :
                  <Navigate to="/login" replace />
              }
            />
            <Route
              path="/fixtures"
              element={
                isLoggedIn ?
                  <Fixtures /> :
                  <Navigate to="/login" replace />
              }
            />
            <Route
              path="/top-stories"
              element={
                isLoggedIn ?
                  <TopStories /> :
                  <Navigate to="/login" replace />
              }
            />
            <Route
              path="/teams"
              element={
                isLoggedIn ?
                  <Teams /> :
                  <Navigate to="/login" replace />
              }
            />
            <Route
              path="/ranking"
              element={
                isLoggedIn ?
                  <Ranking /> :
                  <Navigate to="/login" replace />
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;