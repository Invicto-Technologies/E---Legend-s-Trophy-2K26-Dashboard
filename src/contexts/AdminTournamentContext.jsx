import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    subscribeTournamentIndex,
    subscribeActiveTournament,
    getFallbackTournament,
    resolveTournamentKey
} from '../services/rtdbService';

const AdminTournamentContext = createContext();

export const AdminTournamentProvider = ({ children }) => {
    const [tournaments, setTournaments] = useState([]);
    const [activeTournament, setActiveTournament] = useState(null);
    // On first enter / new session, defaults to null ("Select tournament" mode)
    const [selectedTournamentId, setSelectedTournamentIdState] = useState(
        () => sessionStorage.getItem('adminSelectedTournamentId') || null
    );
    const [loading, setLoading] = useState(true);

    // 1. Subscribe to tournament index & all tournament editions
    useEffect(() => {
        const unsubIndex = subscribeTournamentIndex((list) => {
            if (list && list.length > 0) {
                // Enrich each tournament with info if available
                const enriched = list.map((item) => {
                    const fallback = getFallbackTournament(item.id);
                    return {
                        ...item,
                        info: fallback?.info || item.info || {},
                        status: item.status || fallback?.info?.status || 'upcoming',
                        year: item.year || fallback?.info?.year || '2026',
                        champion: item.champion || fallback?.info?.champion || '',
                        teamCount: Object.keys(fallback?.teamData || {}).length || 4,
                        matchesCount: Object.keys(fallback?.FixturesData?.finishedMatches || fallback?.Fixtures?.finishedMatches || {}).length || 0
                    };
                });
                setTournaments(enriched);
            }
            setLoading(false);
        });

        const unsubActive = subscribeActiveTournament((tourney) => {
            if (tourney) {
                setActiveTournament(tourney);
                // Do not auto-set selectedTournamentId so first enter stays in "Select tournament" mode
            }
        });

        return () => {
            unsubIndex();
            unsubActive();
        };
    }, []);

    const selectTournament = (id) => {
        const cleanId = id || null;
        setSelectedTournamentIdState(cleanId);
        if (cleanId) {
            sessionStorage.setItem('adminSelectedTournamentId', cleanId);
        } else {
            sessionStorage.removeItem('adminSelectedTournamentId');
        }
    };

    const activeTournamentId = activeTournament?.activeId || activeTournament?.id || "E-Legend's Trophy 2K26";

    // When in "Select tournament" mode, selectedTournamentId is null
    const selectedKey = selectedTournamentId ? resolveTournamentKey(selectedTournamentId) : null;
    const selectedFallback = selectedKey ? getFallbackTournament(selectedKey) : null;
    const selectedTournament = selectedKey
        ? (tournaments.find((t) => resolveTournamentKey(t.id) === selectedKey) || {
            id: selectedTournamentId,
            name: selectedTournamentId,
            info: selectedFallback?.info || {},
            status: selectedFallback?.info?.status || 'upcoming'
        })
        : null;

    const isSelectionActive = selectedTournamentId
        ? resolveTournamentKey(selectedTournamentId) === resolveTournamentKey(activeTournamentId)
        : false;

    const value = {
        tournaments,
        activeTournament,
        activeTournamentId,
        selectedTournamentId,
        selectedTournament,
        selectTournament,
        isSelectionActive,
        loading
    };

    return (
        <AdminTournamentContext.Provider value={value}>
            {children}
        </AdminTournamentContext.Provider>
    );
};

export const useAdminTournament = () => {
    const context = useContext(AdminTournamentContext);
    if (!context) {
        throw new Error('useAdminTournament must be used within an AdminTournamentProvider');
    }
    return context;
};

export default AdminTournamentContext;
