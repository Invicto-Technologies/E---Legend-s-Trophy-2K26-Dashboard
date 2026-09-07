import React, { useState, useEffect, useRef } from 'react';
import ConfirmationModal from '../../../components/common/ConfirmationModal';
import ToastNotification from '../../../components/common/ToastNotification';
import Footer from '../../../components/common/Footer/Footer';
import { subscribeTeams, updateTeamSquad, registerCaptainAuth, createNewTeam, deleteTeam } from '../../../services/rtdbService';
import {
    MdPerson,
    MdEdit,
    MdAdd,
    MdClose,
    MdStar,
    MdVpnKey,
    MdEmail,
    MdLock,
    MdDelete,
    MdCheck,
    MdSportsCricket,
    MdGroups,
    MdDeleteForever,
    MdShield,
    MdImage
} from 'react-icons/md';
import { FaCrown, FaBolt } from 'react-icons/fa6';
import { GiCricketBat, GiCrossedSwords, GiGloves } from 'react-icons/gi';
import AdminSubNav from '../../../components/Navigation/AdminSubNav';
import { useAdminTournament } from '../../../contexts/AdminTournamentContext';
import './TeamManagement.css';

const renderRoleIcon = (role) => {
    const r = (role || '').toLowerCase().replace(/[\s-_]/g, '');
    if (r === 'bowler') return <FaBolt className="tmr-role-icon" />;
    if (r === 'batter') return <GiCricketBat className="tmr-role-icon" />;
    if (r === 'wicketkeeper' || r === 'keeper') return <GiGloves className="tmr-role-icon" />;
    return <GiCrossedSwords className="tmr-role-icon" />;
};

const TEAM_LOGO_PRESETS = [
    { label: '🛡️ Royal Blue Crest', url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=200&auto=format&fit=crop' },
    { label: '🦅 Golden Eagle', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop' },
    { label: '⚡ Neon Thunder', url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=200&auto=format&fit=crop' },
    { label: '🦁 Crimson Lion', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop' },
    { label: '⚔️ Green Gladiator', url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=200&auto=format&fit=crop' }
];

const TeamManagement = () => {
    const toastRef = useRef();
    const { selectedTournamentId } = useAdminTournament();
    const [teamsData, setTeamsData] = useState({});
    const [selectedTeamKey, setSelectedTeamKey] = useState('');
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [editPlayerName, setEditPlayerName] = useState('');
    const [editPlayerRole, setEditPlayerRole] = useState('All Rounder');
    const [editPlayerIcon, setEditPlayerIcon] = useState('all-rounder');

    // Add Player Modal
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerRole, setNewPlayerRole] = useState('Batter');
    const [isExtraPlayer, setIsExtraPlayer] = useState(false);

    // Add New Team Modal
    const [addTeamModalOpen, setAddTeamModalOpen] = useState(false);
    const [newTeamKey, setNewTeamKey] = useState('');
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamCaptain, setNewTeamCaptain] = useState('');
    const [newTeamLogo, setNewTeamLogo] = useState('');
    const [includeCaptainInSquad, setIncludeCaptainInSquad] = useState(true);

    // Edit Team & Logo Modal
    const [editTeamModalOpen, setEditTeamModalOpen] = useState(false);
    const [editTeamName, setEditTeamName] = useState('');
    const [editTeamCaptain, setEditTeamCaptain] = useState('');
    const [editTeamLogo, setEditTeamLogo] = useState('');

    // Delete Team Confirmation Target
    const [deleteTeamTarget, setDeleteTeamTarget] = useState(null);

    // Captain Authentication Modal
    const [captainModalOpen, setCaptainModalOpen] = useState(false);
    const [captainEmail, setCaptainEmail] = useState('');
    const [captainPassword, setCaptainPassword] = useState('');
    const [captainAuthLoading, setCaptainAuthLoading] = useState(false);

    // Delete Player Confirmation
    const [deletePlayerTarget, setDeletePlayerTarget] = useState(null);

    useEffect(() => {
        const unsub = subscribeTeams((data) => {
            if (data) {
                setTeamsData(data);
                const keys = Object.keys(data);
                if (keys.length > 0) {
                    setSelectedTeamKey(prev => (prev && data[prev] ? prev : keys[0]));
                } else {
                    setSelectedTeamKey('');
                }
            } else {
                setTeamsData({});
                setSelectedTeamKey('');
            }
        }, selectedTournamentId);
        return () => unsub();
    }, [selectedTournamentId]);

    const activeTeam = teamsData[selectedTeamKey] || {
        name: selectedTeamKey,
        captain: 'Team Captain',
        players: {},
        extraPlayers: {}
    };

    const squadPlayers = Object.values(activeTeam.players || {});
    const reservePlayers = Object.values(activeTeam.extraPlayers || {});

    // Save Player Edits
    const handleSavePlayerEdit = async (e) => {
        e.preventDefault();
        if (!editingPlayer || !selectedTeamKey) return;

        try {
            const updatedTeam = JSON.parse(JSON.stringify(activeTeam));
            const isSquad = Boolean(updatedTeam.players?.[editingPlayer.id]);

            const targetDict = isSquad ? updatedTeam.players : updatedTeam.extraPlayers;
            if (targetDict?.[editingPlayer.id]) {
                targetDict[editingPlayer.id].name = editPlayerName.trim();
                targetDict[editingPlayer.id].role = editPlayerRole;
                targetDict[editingPlayer.id].icon = editPlayerIcon;
            }

            await updateTeamSquad(selectedTeamKey, updatedTeam, selectedTournamentId);
            setEditingPlayer(null);
            toastRef.current.showToast('success', 'Player profile updated!');
        } catch (error) {
            console.error('Error updating player:', error);
            toastRef.current.showToast('error', 'Failed to update player.');
        }
    };

    // Add New Player
    const handleAddPlayer = async (e) => {
        e.preventDefault();
        if (!newPlayerName.trim() || !selectedTeamKey) return;

        try {
            const updatedTeam = JSON.parse(JSON.stringify(activeTeam));
            const newId = Date.now();
            const playerObj = {
                id: newId,
                name: newPlayerName.trim(),
                role: newPlayerRole,
                icon: newPlayerRole === 'Bowler' ? 'ball' : newPlayerRole === 'Batter' ? 'bat' : 'all-rounder',
                runs: 0,
                balls: 0
            };

            if (isExtraPlayer) {
                updatedTeam.extraPlayers = updatedTeam.extraPlayers || {};
                updatedTeam.extraPlayers[newId] = playerObj;
            } else {
                updatedTeam.players = updatedTeam.players || {};
                updatedTeam.players[newId] = playerObj;
            }

            await updateTeamSquad(selectedTeamKey, updatedTeam, selectedTournamentId);
            setAddModalOpen(false);
            setNewPlayerName('');
            toastRef.current.showToast('success', `Added ${newPlayerName} to ${selectedTeamKey}!`);
        } catch (error) {
            console.error('Error adding player:', error);
            toastRef.current.showToast('error', 'Failed to add player.');
        }
    };

    // Set player as team captain
    const handleSetCaptain = async (playerName) => {
        try {
            const updatedTeam = {
                ...activeTeam,
                captain: playerName
            };
            await updateTeamSquad(selectedTeamKey, updatedTeam, selectedTournamentId);
            toastRef.current.showToast('success', `${playerName} is now appointed Captain of ${selectedTeamKey}!`);
        } catch (error) {
            console.error('Error setting captain:', error);
            toastRef.current.showToast('error', 'Failed to appoint captain.');
        }
    };

    // Confirm remove player
    const handleConfirmDeletePlayer = async () => {
        if (!deletePlayerTarget || !selectedTeamKey) return;

        try {
            const updatedTeam = JSON.parse(JSON.stringify(activeTeam));
            if (deletePlayerTarget.isSquad) {
                delete updatedTeam.players[deletePlayerTarget.id];
            } else {
                delete updatedTeam.extraPlayers[deletePlayerTarget.id];
            }

            await updateTeamSquad(selectedTeamKey, updatedTeam, selectedTournamentId);
            toastRef.current.showToast('info', `Removed ${deletePlayerTarget.name} from squad.`);
            setDeletePlayerTarget(null);
        } catch (error) {
            console.error('Error removing player:', error);
            toastRef.current.showToast('error', 'Failed to remove player.');
        }
    };

    // Open Captain Auth Modal
    const handleOpenCaptainAuthModal = () => {
        setCaptainEmail(activeTeam.captainEmail || `${selectedTeamKey.toLowerCase()}.captain@eng.jfn.ac.lk`);
        setCaptainPassword('');
        setCaptainModalOpen(true);
    };

    // Register Captain Credentials in Firebase Auth
    const handleSaveCaptainCredentials = async (e) => {
        e.preventDefault();
        if (!captainEmail.trim() || !captainPassword.trim()) {
            toastRef.current.showToast('error', 'Please provide both email and temporary password.');
            return;
        }

        if (captainPassword.length < 6) {
            toastRef.current.showToast('error', 'Password must be at least 6 characters.');
            return;
        }

        setCaptainAuthLoading(true);
        try {
            const res = await registerCaptainAuth(captainEmail.trim(), captainPassword);
            if (res.success) {
                // Save captain email and uid to team in RTDB
                const updatedTeam = {
                    ...activeTeam,
                    captainEmail: captainEmail.trim(),
                    captainUid: res.uid,
                    captainAuthCreated: true
                };
                await updateTeamSquad(selectedTeamKey, updatedTeam, selectedTournamentId);
                setCaptainModalOpen(false);
                setCaptainPassword('');
                toastRef.current.showToast('success', `Captain credentials created in Firebase Auth for ${selectedTeamKey} (${captainEmail})!`);
            }
        } catch (error) {
            console.error('Error creating captain account:', error);
            if (error.code === 'auth/operation-not-allowed') {
                // Save captain email into RTDB team record so admin workflow is never blocked
                const updatedTeam = {
                    ...activeTeam,
                    captainEmail: captainEmail.trim(),
                    captainAuthCreated: false
                };
                await updateTeamSquad(selectedTeamKey, updatedTeam, selectedTournamentId);
                setCaptainModalOpen(false);
                setCaptainPassword('');
                toastRef.current.showToast('warning', 'Captain email saved to database! Note: Enable "Email/Password" in Firebase Console (Authentication > Sign-in method) for Firebase Auth accounts.');
                return;
            }

            if (error.code === 'auth/email-already-in-use') {
                const updatedTeam = {
                    ...activeTeam,
                    captainEmail: captainEmail.trim(),
                    captainAuthCreated: true
                };
                await updateTeamSquad(selectedTeamKey, updatedTeam, selectedTournamentId);
                setCaptainModalOpen(false);
                setCaptainPassword('');
                toastRef.current.showToast('info', 'This email already exists in Firebase Auth. Team record updated with this captain email.');
                return;
            }

            toastRef.current.showToast('error', error.message || 'Failed to create captain login.');
        } finally {
            setCaptainAuthLoading(false);
        }
    };

    // Open Edit Team Modal
    const handleOpenEditTeam = () => {
        setEditTeamName(activeTeam.name || selectedTeamKey);
        setEditTeamCaptain(activeTeam.captain || '');
        setEditTeamLogo(activeTeam.logo || activeTeam.logoUrl || '');
        setEditTeamModalOpen(true);
    };

    // Save Edit Team Details & Logo
    const handleSaveTeamDetails = async (e) => {
        e.preventDefault();
        if (!selectedTeamKey || !editTeamName.trim()) return;

        try {
            const updatedTeam = {
                ...activeTeam,
                name: editTeamName.trim(),
                captain: editTeamCaptain.trim() || activeTeam.captain || 'Not Appointed',
                logo: editTeamLogo.trim(),
                logoUrl: editTeamLogo.trim()
            };

            await updateTeamSquad(selectedTeamKey, updatedTeam, selectedTournamentId);
            setEditTeamModalOpen(false);
            toastRef.current.showToast('success', `Team details and crest for ${selectedTeamKey} updated!`);
        } catch (error) {
            console.error('Error updating team:', error);
            toastRef.current.showToast('error', 'Failed to update team details.');
        }
    };

    // Create New Team with Logo
    const handleCreateTeam = async (e) => {
        e.preventDefault();
        const cleanKey = newTeamKey.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        if (!cleanKey) {
            toastRef.current.showToast('error', 'Please provide a valid unique Team Code (e.g. E22, Staff).');
            return;
        }

        if (teamsData[cleanKey]) {
            toastRef.current.showToast('error', `A team with code "${cleanKey}" already exists in this tournament!`);
            return;
        }

        if (!newTeamName.trim()) {
            toastRef.current.showToast('error', 'Please provide a full team display name.');
            return;
        }

        try {
            const initialPlayers = {};
            if (includeCaptainInSquad && newTeamCaptain.trim()) {
                const capId = Date.now();
                initialPlayers[capId] = {
                    id: capId,
                    name: newTeamCaptain.trim(),
                    role: 'All Rounder',
                    icon: 'all-rounder',
                    runs: 0,
                    balls: 0
                };
            }

            const newTeamObj = {
                id: Date.now(),
                name: newTeamName.trim(),
                captain: newTeamCaptain.trim() || 'Not Appointed',
                logo: newTeamLogo.trim() || '',
                logoUrl: newTeamLogo.trim() || '',
                players: initialPlayers,
                extraPlayers: {}
            };

            await createNewTeam(cleanKey, newTeamObj, selectedTournamentId);
            setAddTeamModalOpen(false);
            setNewTeamKey('');
            setNewTeamName('');
            setNewTeamCaptain('');
            setNewTeamLogo('');
            setSelectedTeamKey(cleanKey);
            toastRef.current.showToast('success', `Team "${cleanKey} - ${newTeamName.trim()}" created successfully!`);
        } catch (error) {
            console.error('Error creating team:', error);
            toastRef.current.showToast('error', 'Failed to create new team.');
        }
    };

    // Delete Entire Team
    const handleConfirmDeleteTeam = async () => {
        if (!deleteTeamTarget) return;

        try {
            const teamToDelete = deleteTeamTarget;
            await deleteTeam(teamToDelete, selectedTournamentId);
            const remainingKeys = Object.keys(teamsData).filter(k => k !== teamToDelete);
            setSelectedTeamKey(remainingKeys.length > 0 ? remainingKeys[0] : '');
            setDeleteTeamTarget(null);
            toastRef.current.showToast('info', `Team "${teamToDelete}" has been completely removed.`);
        } catch (error) {
            console.error('Error deleting team:', error);
            toastRef.current.showToast('error', 'Failed to delete team.');
        }
    };

    const hasTeams = Object.keys(teamsData).length > 0;

    return (
        <div className="team-mgmt-page">
            <AdminSubNav />
            <ToastNotification ref={toastRef} />

            <div className="tm-container">
                {/* Header */}
                <div className="tm-header">
                    <div>
                        <span className="tm-tag">FACULTY BATCH ROSTERS</span>
                        <h1 className="tm-title">Team Squad Management</h1>
                        <p className="tm-subtitle">
                            Configure playing XI squads, bench substitutes, and team crests for each engineering batch.
                        </p>
                    </div>

                    <div className="tm-header-actions">
                        <button className="cx-btn-secondary tm-header-add-team-btn" onClick={() => setAddTeamModalOpen(true)}>
                            <MdGroups /> Add New Team
                        </button>
                        <button className="cx-btn-primary" onClick={() => setAddModalOpen(true)} disabled={!selectedTeamKey}>
                            <MdAdd /> Add Player
                        </button>
                    </div>
                </div>

                {/* Batch Selector Tabs with Logos */}
                <div className="tm-batch-tabs">
                    {Object.keys(teamsData).map((batchKey) => {
                        const teamItem = teamsData[batchKey];
                        const logoSrc = teamItem?.logo || teamItem?.logoUrl;
                        return (
                            <button
                                key={batchKey}
                                className={`batch-tab-btn ${selectedTeamKey === batchKey ? 'active' : ''}`}
                                onClick={() => setSelectedTeamKey(batchKey)}
                            >
                                <div className="batch-tab-inner">
                                    <div className="batch-tab-logo">
                                        {logoSrc ? (
                                            <img src={logoSrc} alt={batchKey} onError={(e) => { e.target.style.display = 'none'; }} />
                                        ) : (
                                            <span>{batchKey.slice(0, 3)}</span>
                                        )}
                                    </div>
                                    <div className="batch-tab-info">
                                        <span className="batch-tab-name">{batchKey}</span>
                                        <small>{teamItem?.name || 'Batch'}</small>
                                    </div>
                                </div>
                            </button>
                        );
                    })}

                    <button
                        type="button"
                        className="batch-tab-btn add-team-tab-btn"
                        onClick={() => setAddTeamModalOpen(true)}
                        title="Register New Team Squad"
                    >
                        <div className="batch-tab-inner add-team-inner">
                            <div className="batch-tab-logo add-logo">
                                <MdAdd />
                            </div>
                            <div className="batch-tab-info">
                                <span className="batch-tab-name">New Team</span>
                                <small>Add Squad</small>
                            </div>
                        </div>
                    </button>
                </div>

                {!hasTeams ? (
                    <div className="tm-no-teams-card">
                        <div className="tm-no-teams-icon">
                            <MdGroups />
                        </div>
                        <h3>No Teams Registered in this Tournament</h3>
                        <p>No squad rosters or batches exist yet. Click below to add your first team with crest and details.</p>
                        <button className="cx-btn-primary" onClick={() => setAddTeamModalOpen(true)}>
                            <MdAdd /> Add First Team
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Team Overview Card */}
                        <div className="tm-team-overview-card">
                            <div className="tmo-left">
                                <div className="tmo-crest-frame" title="Team Crest / Logo">
                                    {(activeTeam.logo || activeTeam.logoUrl) ? (
                                        <img
                                            src={activeTeam.logo || activeTeam.logoUrl}
                                            alt={activeTeam.name || selectedTeamKey}
                                            className="tmo-crest-img"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="tmo-crest-placeholder">
                                            <MdShield className="tmo-crest-shield" />
                                            <span className="tmo-crest-code">{selectedTeamKey.slice(0, 3)}</span>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        className="tmo-edit-crest-btn"
                                        onClick={handleOpenEditTeam}
                                        title="Change Team Logo / Crest"
                                    >
                                        <MdEdit />
                                    </button>
                                </div>

                                <div className="tmo-info-block">
                                    <div className="tmo-tag-row">
                                        <span className="tmo-batch-tag">{selectedTeamKey} SQUAD</span>
                                        <button
                                            type="button"
                                            className="tmo-edit-link-btn"
                                            onClick={handleOpenEditTeam}
                                            title="Edit team name & logo"
                                        >
                                            <MdEdit /> Edit Team & Logo
                                        </button>
                                    </div>
                                    <h2 className="tmo-title">{activeTeam.name || selectedTeamKey}</h2>
                                    <div className="tmo-captain-meta">
                                        <div className="tmo-captain">
                                            <MdStar className="captain-star-icon" /> Captain: <strong>{activeTeam.captain || 'Not Appointed'}</strong>
                                        </div>
                                        {activeTeam.captainEmail && (
                                            <span className="tmo-captain-email-pill" title="Captain Auth Active">
                                                <MdEmail /> {activeTeam.captainEmail}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="tmo-right">
                                <div className="tmo-actions-group">
                                    <button className="tm-captain-auth-btn" onClick={handleOpenCaptainAuthModal}>
                                        <MdVpnKey /> {activeTeam.captainEmail ? 'Manage Captain Account' : 'Set Captain Credentials'}
                                    </button>
                                    <button
                                        className="tm-delete-team-btn"
                                        onClick={() => setDeleteTeamTarget(selectedTeamKey)}
                                        title={`Delete entire team ${selectedTeamKey}`}
                                    >
                                        <MdDeleteForever /> Remove Team
                                    </button>
                                </div>
                                <div className="tmo-stats-wrap">
                                    <div className="tmo-stat">
                                        <span>Playing XI</span>
                                        <strong>{squadPlayers.length}</strong>
                                    </div>
                                    <div className="tmo-stat">
                                        <span>Reserves</span>
                                        <strong>{reservePlayers.length}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Squad Players (Playing XI) */}
                        <div className="tm-section-block">
                            <div className="tm-block-header">
                                <div>
                                    <h3 className="tm-block-title">
                                        Playing XI Squad ({squadPlayers.length})
                                    </h3>
                                    <p className="tm-block-desc">Active match players representing {selectedTeamKey}</p>
                                </div>
                            </div>

                            {squadPlayers.length === 0 ? (
                                <div className="tm-empty-roster">
                                    <p>No players added to the playing squad yet. Click "+ Add Player" above.</p>
                                </div>
                            ) : (
                                <div className="tm-table-wrap">
                                    <table className="tm-roster-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '60px' }}>#</th>
                                                <th>Player Name</th>
                                                <th>Role</th>
                                                <th>Designation</th>
                                                <th style={{ textAlign: 'right' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {squadPlayers.map((player, index) => {
                                                const isCaptain = activeTeam.captain && (player.name.trim().toLowerCase() === activeTeam.captain.trim().toLowerCase());
                                                const roleNormalized = (player.role || 'all rounder').toLowerCase().replace(/[\s-_]/g, '');

                                                return (
                                                    <tr key={player.id} className={`tmr-row ${isCaptain ? 'is-captain-row' : ''}`}>
                                                        <td className="tm-col-num">
                                                            <span className="tmr-table-num">#{index + 1}</span>
                                                        </td>
                                                        <td className="tm-col-player">
                                                            <div className="tmr-player-cell">
                                                                <div className="tmr-table-avatar">
                                                                    {player.imageUrl ? (
                                                                        <img src={player.imageUrl} alt={player.name} />
                                                                    ) : (
                                                                        <span>{player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || <MdPerson />}</span>
                                                                    )}
                                                                    {isCaptain && (
                                                                        <span className="tmr-table-crown" title="Team Captain">
                                                                            <FaCrown />
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="tmr-name-box">
                                                                    <span className="tmr-table-name">{player.name}</span>
                                                                    {isCaptain && <span className="tmr-captain-tag">Captain</span>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="tm-col-role">
                                                            <span className={`tmr-role-pill ${roleNormalized}`}>
                                                                {renderRoleIcon(player.role)}
                                                                <span>{player.role || 'All Rounder'}</span>
                                                            </span>
                                                        </td>
                                                        <td className="tm-col-status">
                                                            {isCaptain ? (
                                                                <span className="tmr-status-badge captain">
                                                                    <FaCrown className="tmr-badge-crown-icon" /> Team Captain
                                                                </span>
                                                            ) : (
                                                                <span className="tmr-status-badge playing">Playing XI</span>
                                                            )}
                                                        </td>
                                                        <td className="tm-col-actions">
                                                            <div className="tmr-actions-cell">
                                                                {!isCaptain && (
                                                                    <button
                                                                        className="tmr-action-btn captain"
                                                                        onClick={() => handleSetCaptain(player.name)}
                                                                        title="Appoint as Captain"
                                                                    >
                                                                        <MdStar /> <span>Make Captain</span>
                                                                    </button>
                                                                )}
                                                                <button
                                                                    className="tmr-action-btn edit"
                                                                    onClick={() => {
                                                                        setEditingPlayer(player);
                                                                        setEditPlayerName(player.name);
                                                                        setEditPlayerRole(player.role || 'All Rounder');
                                                                        setEditPlayerIcon(player.icon || 'all-rounder');
                                                                    }}
                                                                    title="Edit Player Profile"
                                                                >
                                                                    <MdEdit />
                                                                </button>
                                                                <button
                                                                    className="tmr-action-btn delete"
                                                                    onClick={() => setDeletePlayerTarget({ ...player, isSquad: true })}
                                                                    title="Remove Player"
                                                                >
                                                                    <MdDelete />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Reserve / Extra Players */}
                        <div className="tm-section-block">
                            <div className="tm-block-header">
                                <div>
                                    <h3 className="tm-block-title">
                                        Bench & Reserves ({reservePlayers.length})
                                    </h3>
                                    <p className="tm-block-desc">Substitute and backup players on standby</p>
                                </div>
                            </div>

                            {reservePlayers.length === 0 ? (
                                <div className="tm-empty-roster reserve">
                                    <p>No reserves added. You can add extra bench players using "+ Add Player".</p>
                                </div>
                            ) : (
                                <div className="tm-table-wrap">
                                    <table className="tm-roster-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '60px' }}>#</th>
                                                <th>Player Name</th>
                                                <th>Role</th>
                                                <th>Designation</th>
                                                <th style={{ textAlign: 'right' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reservePlayers.map((player, index) => {
                                                const roleNormalized = (player.role || 'all rounder').toLowerCase().replace(/[\s-_]/g, '');

                                                return (
                                                    <tr key={player.id} className="tmr-row is-reserve-row">
                                                        <td className="tm-col-num">
                                                            <span className="tmr-table-num reserve">#{squadPlayers.length + index + 1}</span>
                                                        </td>
                                                        <td className="tm-col-player">
                                                            <div className="tmr-player-cell">
                                                                <div className="tmr-table-avatar reserve">
                                                                    <span>{player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || <MdPerson />}</span>
                                                                </div>
                                                                <div className="tmr-name-box">
                                                                    <span className="tmr-table-name">{player.name}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="tm-col-role">
                                                            <span className={`tmr-role-pill ${roleNormalized}`}>
                                                                {renderRoleIcon(player.role)}
                                                                <span>{player.role || 'All Rounder'}</span>
                                                            </span>
                                                        </td>
                                                        <td className="tm-col-status">
                                                            <span className="tmr-status-badge reserve">Bench / Reserve</span>
                                                        </td>
                                                        <td className="tm-col-actions">
                                                            <div className="tmr-actions-cell">
                                                                <button
                                                                    className="tmr-action-btn edit"
                                                                    onClick={() => {
                                                                        setEditingPlayer(player);
                                                                        setEditPlayerName(player.name);
                                                                        setEditPlayerRole(player.role || 'All Rounder');
                                                                        setEditPlayerIcon(player.icon || 'all-rounder');
                                                                    }}
                                                                    title="Edit Player Profile"
                                                                >
                                                                    <MdEdit />
                                                                </button>
                                                                <button
                                                                    className="tmr-action-btn delete"
                                                                    onClick={() => setDeletePlayerTarget({ ...player, isSquad: false })}
                                                                    title="Remove Player"
                                                                >
                                                                    <MdDelete />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Edit Player Modal */}
            {editingPlayer && (
                <div className="tm-modal-overlay" onClick={() => setEditingPlayer(null)}>
                    <div className="tm-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="tm-modal-header">
                            <div>
                                <span className="tm-modal-badge">ROSTER UPDATE</span>
                                <h3>Edit Player Profile</h3>
                            </div>
                            <button className="tm-modal-close" onClick={() => setEditingPlayer(null)}>
                                <MdClose />
                            </button>
                        </div>

                        <form onSubmit={handleSavePlayerEdit} className="tm-form">
                            <div className="tm-form-group">
                                <label><MdPerson /> Player Name</label>
                                <input
                                    type="text"
                                    className="tm-input"
                                    value={editPlayerName}
                                    onChange={(e) => setEditPlayerName(e.target.value)}
                                    placeholder="Full name"
                                    required
                                />
                            </div>

                            <div className="tm-form-group">
                                <label><MdSportsCricket /> Role</label>
                                <select
                                    value={editPlayerRole}
                                    onChange={(e) => {
                                        setEditPlayerRole(e.target.value);
                                        setEditPlayerIcon(e.target.value === 'Bowler' ? 'ball' : e.target.value === 'Batter' ? 'bat' : 'all-rounder');
                                    }}
                                    className="tm-select"
                                >
                                    <option value="Batter">Batter</option>
                                    <option value="Bowler">Bowler</option>
                                    <option value="All Rounder">All Rounder</option>
                                    <option value="Wicket Keeper">Wicket Keeper</option>
                                </select>
                            </div>

                            <div className="tm-modal-actions">
                                <button type="button" className="cx-btn-secondary" onClick={() => setEditingPlayer(null)}>
                                    Cancel
                                </button>
                                <button type="submit" className="cx-btn-confirm primary">
                                    <MdCheck /> Save Profile
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Player Modal */}
            {addModalOpen && (
                <div className="tm-modal-overlay" onClick={() => setAddModalOpen(false)}>
                    <div className="tm-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="tm-modal-header">
                            <div>
                                <span className="tm-modal-badge">NEW RECRUIT</span>
                                <h3>Add Player to {selectedTeamKey}</h3>
                            </div>
                            <button className="tm-modal-close" onClick={() => setAddModalOpen(false)}>
                                <MdClose />
                            </button>
                        </div>

                        <form onSubmit={handleAddPlayer} className="tm-form">
                            <div className="tm-form-group">
                                <label><MdPerson /> Player Full Name</label>
                                <input
                                    type="text"
                                    className="tm-input"
                                    placeholder="e.g. Sahan Perera"
                                    value={newPlayerName}
                                    onChange={(e) => setNewPlayerName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="tm-form-group">
                                <label><MdSportsCricket /> Player Role</label>
                                <select
                                    value={newPlayerRole}
                                    onChange={(e) => setNewPlayerRole(e.target.value)}
                                    className="tm-select"
                                >
                                    <option value="Batter">Batter</option>
                                    <option value="Bowler">Bowler</option>
                                    <option value="All Rounder">All Rounder</option>
                                    <option value="Wicket Keeper">Wicket Keeper</option>
                                </select>
                            </div>

                            <div className="tm-form-checkbox">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={isExtraPlayer}
                                        onChange={(e) => setIsExtraPlayer(e.target.checked)}
                                    />
                                    Add as Reserve / Bench Player
                                </label>
                            </div>

                            <div className="tm-modal-actions">
                                <button type="button" className="cx-btn-secondary" onClick={() => setAddModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="cx-btn-confirm primary">
                                    <MdAdd /> Add Player
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Captain Credentials Modal */}
            {captainModalOpen && (
                <div className="tm-modal-overlay" onClick={() => setCaptainModalOpen(false)}>
                    <div className="tm-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="tm-modal-header">
                            <div>
                                <span className="tm-modal-badge">CAPTAIN AUTH PORTAL</span>
                                <h3>Manage Captain Credentials</h3>
                                <p className="tm-modal-sub">Team: {selectedTeamKey} • Captain: {activeTeam.captain || 'Appointed Captain'}</p>
                            </div>
                            <button className="tm-modal-close" onClick={() => setCaptainModalOpen(false)}>
                                <MdClose />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCaptainCredentials} className="tm-form">
                            <div className="tm-form-group">
                                <label><MdEmail /> Captain Email Address</label>
                                <input
                                    type="email"
                                    className="tm-input"
                                    placeholder="e.g. e21.captain@eng.jfn.ac.lk"
                                    value={captainEmail}
                                    onChange={(e) => setCaptainEmail(e.target.value)}
                                    required
                                />
                                <span className="tm-field-hint">Used by captain to sign into the system.</span>
                            </div>

                            <div className="tm-form-group">
                                <label><MdLock /> Temporary / New Password</label>
                                <input
                                    type="text"
                                    className="tm-input"
                                    placeholder="At least 6 characters (e.g. Captain#2026)"
                                    value={captainPassword}
                                    onChange={(e) => setCaptainPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                                <span className="tm-field-hint">Registered directly into Firebase Authentication.</span>
                            </div>

                            <div className="tm-modal-actions">
                                <button type="button" className="cx-btn-secondary" onClick={() => setCaptainModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="cx-btn-confirm primary" disabled={captainAuthLoading}>
                                    {captainAuthLoading ? 'Registering...' : <><MdVpnKey /> Save & Create in Auth</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Player Confirmation */}
            <ConfirmationModal
                isOpen={Boolean(deletePlayerTarget)}
                title="Remove Player from Squad"
                message={`Are you sure you want to remove ${deletePlayerTarget?.name} from ${selectedTeamKey}? This will update the roster immediately.`}
                confirmText="Remove Player"
                type="danger"
                onConfirm={handleConfirmDeletePlayer}
                onCancel={() => setDeletePlayerTarget(null)}
            />

            {/* Create New Team Modal */}
            {addTeamModalOpen && (
                <div className="tm-modal-overlay" onClick={() => setAddTeamModalOpen(false)}>
                    <div className="tm-modal-card pro-team-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="tm-modal-header">
                            <div className="tm-modal-header-left">
                                <div className="tm-modal-header-icon">
                                    <MdGroups />
                                </div>
                                <div>
                                    <span className="tm-modal-badge">NEW SQUAD REGISTRATION</span>
                                    <h3>Create New Team</h3>
                                    <p className="tm-modal-sub">Register a new faculty batch or team squad with custom crest and designation.</p>
                                </div>
                            </div>
                            <button className="tm-modal-close" onClick={() => setAddTeamModalOpen(false)} aria-label="Close">
                                <MdClose />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTeam} className="tm-form">
                            {/* SECTION 1: TEAM IDENTIFICATION */}
                            <div className="tm-section-box">
                                <div className="tm-section-header">
                                    <span className="tm-section-step">1</span>
                                    <div>
                                        <h4>Team Identification</h4>
                                        <p className="tm-section-desc">Define unique batch/team code and official display title.</p>
                                    </div>
                                </div>

                                <div className="tm-form-row">
                                    <div className="tm-form-group flex-1">
                                        <label>Team Code / Key *</label>
                                        <input
                                            type="text"
                                            className="tm-input"
                                            placeholder="e.g. E22, Staff, Faculty"
                                            value={newTeamKey}
                                            onChange={(e) => setNewTeamKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                                            required
                                        />
                                        <span className="tm-field-hint">Unique short code used in brackets and scorecards.</span>
                                    </div>
                                    <div className="tm-form-group flex-2">
                                        <label>Team Display Name *</label>
                                        <input
                                            type="text"
                                            className="tm-input"
                                            placeholder="e.g. E22 Batch, Academic Staff XI"
                                            value={newTeamName}
                                            onChange={(e) => setNewTeamName(e.target.value)}
                                            required
                                        />
                                        <span className="tm-field-hint">Full team name shown in leaderboards and feed.</span>
                                    </div>
                                </div>

                                <div className="tm-form-group">
                                    <label><MdPerson /> Appointed Captain (Optional)</label>
                                    <input
                                        type="text"
                                        className="tm-input"
                                        placeholder="e.g. Kavinda Senanayake"
                                        value={newTeamCaptain}
                                        onChange={(e) => setNewTeamCaptain(e.target.value)}
                                    />
                                    <span className="tm-field-hint">Can be appointed now or assigned later from the player roster.</span>
                                </div>
                            </div>

                            {/* SECTION 2: TEAM CREST & LOGO */}
                            <div className="tm-section-box">
                                <div className="tm-section-header">
                                    <span className="tm-section-step">2</span>
                                    <div>
                                        <h4>Team Crest & Logo</h4>
                                        <p className="tm-section-desc">Attach a custom image URL or select from curated emblem presets.</p>
                                    </div>
                                </div>

                                <div className="tm-form-group">
                                    <label><MdImage /> Team Logo URL (Optional)</label>
                                    <input
                                        type="url"
                                        className="tm-input"
                                        placeholder="https://images.unsplash.com/... or https://..."
                                        value={newTeamLogo}
                                        onChange={(e) => setNewTeamLogo(e.target.value)}
                                    />
                                    <div className="tm-preset-chips">
                                        <span className="tm-presets-label">Presets:</span>
                                        {TEAM_LOGO_PRESETS.map((preset, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                className="tm-preset-btn"
                                                onClick={() => setNewTeamLogo(preset.url)}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Logo Live Preview */}
                                <div className="tm-logo-preview-card">
                                    <div className="tm-preview-frame">
                                        {newTeamLogo ? (
                                            <img
                                                src={newTeamLogo}
                                                alt="Crest Preview"
                                                className="tm-preview-img"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="tm-preview-placeholder">
                                                <MdShield className="tm-preview-shield" />
                                                <span>{(newTeamKey || 'NEW').slice(0, 3)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="tm-preview-text">
                                        <strong>{newTeamName || 'New Team Squad'}</strong>
                                        <small>{newTeamKey ? `${newTeamKey} Crest` : 'Default Crest'}</small>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: SQUAD OPTIONS */}
                            {newTeamCaptain.trim() && (
                                <div className="tm-form-checkbox">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={includeCaptainInSquad}
                                            onChange={(e) => setIncludeCaptainInSquad(e.target.checked)}
                                        />
                                        Automatically add <strong>{newTeamCaptain.trim()}</strong> to Playing XI squad as All Rounder
                                    </label>
                                </div>
                            )}

                            <div className="tm-modal-actions">
                                <button type="button" className="cx-btn-secondary" onClick={() => setAddTeamModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="cx-btn-confirm primary">
                                    <MdCheck /> Create Team Roster
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Team Details & Logo Modal */}
            {editTeamModalOpen && (
                <div className="tm-modal-overlay" onClick={() => setEditTeamModalOpen(false)}>
                    <div className="tm-modal-card pro-team-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="tm-modal-header">
                            <div className="tm-modal-header-left">
                                <div className="tm-modal-header-icon">
                                    <MdShield />
                                </div>
                                <div>
                                    <span className="tm-modal-badge">TEAM PROFILE</span>
                                    <h3>Edit {selectedTeamKey} Details & Logo</h3>
                                    <p className="tm-modal-sub">Update display name, appointed captain, and team crest imagery.</p>
                                </div>
                            </div>
                            <button className="tm-modal-close" onClick={() => setEditTeamModalOpen(false)} aria-label="Close">
                                <MdClose />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTeamDetails} className="tm-form">
                            <div className="tm-section-box">
                                <div className="tm-form-group">
                                    <label>Team Display Name *</label>
                                    <input
                                        type="text"
                                        className="tm-input"
                                        value={editTeamName}
                                        onChange={(e) => setEditTeamName(e.target.value)}
                                        placeholder="e.g. E21 Batch"
                                        required
                                    />
                                </div>

                                <div className="tm-form-group" style={{ marginTop: '15px' }}>
                                    <label><MdPerson /> Appointed Captain</label>
                                    <input
                                        type="text"
                                        className="tm-input"
                                        value={editTeamCaptain}
                                        onChange={(e) => setEditTeamCaptain(e.target.value)}
                                        placeholder="Captain full name"
                                    />
                                </div>

                                <div className="tm-form-group" style={{ marginTop: '15px' }}>
                                    <label><MdImage /> Team Crest / Logo URL</label>
                                    <input
                                        type="url"
                                        className="tm-input"
                                        placeholder="https://..."
                                        value={editTeamLogo}
                                        onChange={(e) => setEditTeamLogo(e.target.value)}
                                    />
                                </div>

                                {/* Logo Live Preview */}
                                <div className="tm-logo-preview-card">
                                    <div className="tm-preview-frame">
                                        {editTeamLogo ? (
                                            <img
                                                src={editTeamLogo}
                                                alt="Crest Preview"
                                                className="tm-preview-img"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="tm-preview-placeholder">
                                                <MdShield className="tm-preview-shield" />
                                                <span>{selectedTeamKey.slice(0, 3)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="tm-preview-text">
                                        <strong>{editTeamName || selectedTeamKey}</strong>
                                        <small>{editTeamLogo ? 'Custom Logo Active' : 'Default Shield Active'}</small>
                                    </div>
                                </div>
                            </div>

                            <div className="tm-modal-actions">
                                <button type="button" className="cx-btn-secondary" onClick={() => setEditTeamModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="cx-btn-confirm primary">
                                    <MdCheck /> Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Entire Team Confirmation */}
            <ConfirmationModal
                isOpen={Boolean(deleteTeamTarget)}
                title={`Delete Team ${deleteTeamTarget}?`}
                message={`Are you sure you want to completely remove ${activeTeam.name || deleteTeamTarget}? All playing XI squad players, bench reserves, and captain credentials for this team will be permanently deleted.`}
                confirmText="Delete Entire Team"
                type="danger"
                onConfirm={handleConfirmDeleteTeam}
                onCancel={() => setDeleteTeamTarget(null)}
            />

            <Footer />
        </div>
    );
};

export default TeamManagement;
