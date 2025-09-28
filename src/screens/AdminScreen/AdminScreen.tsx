import React, { useMemo, useState, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import './AdminScreen.css';
import { authService } from '../../Services/AuthService';

interface AdminScreenProps {
	onBackToHome?: () => void;
}

// Demo subjects & generated records (UI only)
const DEMO_SUBJECTS = ['CSE 107', 'CSE 201', 'CSE 305'];

interface DemoRecord {
	id: string;
	userId: string;
	userName: string;
	subject: string;
	time: string;
	date: string; // ISO date (YYYY-MM-DD)
	status: 'Present' | 'Late' | 'Absent';
	confidence: string;
	checkInStatus: 'success' | 'failed';
}

function generateRecords(): DemoRecord[] {
	const records: DemoRecord[] = [];
	const today = new Date();
	// Generate for last 5 days (including today)
	const daysBack = 5;
	DEMO_SUBJECTS.forEach(sub => {
		for (let d = 0; d < daysBack; d++) {
			const dateObj = new Date(today);
			dateObj.setDate(today.getDate() - d);
			const isoDate = dateObj.toISOString().slice(0,10); // YYYY-MM-DD
			// variable number of records per day (8-12)
			const count = 8 + ((d + sub.length) % 5); // 8..12
			for (let i = 0; i < count; i++) {
				const statusPicker = i % 11 === 0 ? 'Absent' : i % 7 === 0 ? 'Late' : 'Present';
				records.push({
					id: `${sub}-${isoDate}-REC-${i}`,
					userId: `SV${(200 + i).toString()}`,
					userName: `Student ${(i + 1).toString().padStart(2, '0')}`,
					subject: sub,
					time: `08:${(10 + i).toString().padStart(2, '0')}`,
					date: isoDate,
					status: statusPicker as DemoRecord['status'],
					confidence: (95 - (i % 10) * 2).toFixed(2) + '%',
					checkInStatus: statusPicker === 'Absent' ? 'failed' : 'success'
				});
			}
		}
	});
	// Sort descending by date then time
	records.sort((a,b) => (a.date === b.date ? a.time.localeCompare(b.time) : b.date.localeCompare(a.date)));
	return records;
}

// NOTE: We keep records in component state now so admin can edit attendance.

const AdminScreen: React.FC<AdminScreenProps> = ({ onBackToHome }) => {
		const currentUser = authService.getCurrentUser();
		const { push } = useNotifications();
		const isAdmin = authService.isAdmin();
		
		// Check if user is logged in and is admin
		useEffect(() => {
			console.log('AdminScreen: currentUser =', currentUser);
			console.log('AdminScreen: isAdmin =', isAdmin);
			
			if (!currentUser) {
				push('❌ Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.', 'error');
				handleBackToLogin();
				return;
			}
			
			if (!isAdmin) {
				push('❌ Bạn không có quyền truy cập trang Admin.', 'error');
				handleBackToLogin();
				return;
			}
		}, [currentUser, isAdmin, push]);

		// Handler for back to login with proper logout
		const handleBackToLogin = async () => {
			try {
				await authService.logout();
				console.log('User logged out successfully');
			} catch (error) {
				console.error('Error during logout:', error);
			}
			
			if (onBackToHome) {
				onBackToHome();
			}
		};

		// If no user or not admin, don't render the component
		if (!currentUser || !isAdmin) {
			return (
				<div className="min-h-screen bg-gray-100 flex items-center justify-center">
					<div className="text-center">
						<h2 className="text-2xl font-bold text-gray-800 mb-4">Đang kiểm tra quyền truy cập...</h2>
						<p className="text-gray-600">Vui lòng chờ trong giây lát.</p>
					</div>
				</div>
			);
		}

		// Records state (initially generated demo data)
		const [records, setRecords] = useState<DemoRecord[]>(() => generateRecords());
		// Editing state
		const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
		const [editingStatus, setEditingStatus] = useState<DemoRecord['status']>('Present');
            const [selectedSubject, setSelectedSubject] = useState<string>(DEMO_SUBJECTS[0]);
            const [currentDayIndex, setCurrentDayIndex] = useState<number>(0); // 0 = most recent day

			const subjectRecords = useMemo(() => records.filter(r => r.subject === selectedSubject), [records, selectedSubject]);

			const subjectDates = useMemo(() => {
				const uniq = Array.from(new Set(subjectRecords.map(r => r.date)));
				return uniq.sort((a,b)=> b.localeCompare(a)); // newest first
			}, [subjectRecords]);

            // Reset to first date when subject changes
            useEffect(() => { setCurrentDayIndex(0); }, [selectedSubject]);

            const totalDays = subjectDates.length || 1;

			const activeDate = subjectDates[currentDayIndex];
			const dayRecords = useMemo(() => {
				if(!activeDate) return [];
				return subjectRecords.filter(r => r.date === activeDate);
			}, [subjectRecords, activeDate]);

			// Reset editing if date/subject changes or record no longer visible
			useEffect(() => {
				if(editingRecordId && !dayRecords.some(r => r.id === editingRecordId)) {
					setEditingRecordId(null);
				}
			}, [editingRecordId, dayRecords, selectedSubject, activeDate]);

			const subjectStats = useMemo(() => {
				const total = subjectRecords.length;
				const present = subjectRecords.filter(r => r.status === 'Present').length;
				const late = subjectRecords.filter(r => r.status === 'Late').length;
				const absent = subjectRecords.filter(r => r.status === 'Absent').length;
				const rate = total ? Math.round(((present + late) / total) * 100) : 0;
				const uniqueStudents = new Set(subjectRecords.map(r => r.userId)).size;
				return { total, present, late, absent, rate, uniqueStudents };
			}, [subjectRecords]);

			// Day stats (activeDate)
			const dayStats = useMemo(() => {
				if(!activeDate) return { total:0,present:0,late:0,absent:0,rate:0, uniqueStudents:0 };
				const day = subjectRecords.filter(r => r.date === activeDate);
				const total = day.length;
				const present = day.filter(r => r.status==='Present').length;
				const late = day.filter(r => r.status==='Late').length;
				const absent = day.filter(r => r.status==='Absent').length;
				const rate = total ? Math.round(((present + late) / total) * 100) : 0;
				const uniqueStudents = new Set(day.map(r=>r.userId)).size;
				return { total,present,late,absent,rate,uniqueStudents };
			}, [subjectRecords, activeDate]);

			// Week stats (last 7 calendar days relative to activeDate or today if undefined)
			const weekStats = useMemo(() => {
				const base = activeDate ? new Date(activeDate) : new Date();
				const start = new Date(base); start.setDate(base.getDate() - 6); // 7 days window
				const startIso = start.toISOString().slice(0,10);
				const endIso = (activeDate ? activeDate : new Date().toISOString().slice(0,10));
				const windowRecords = subjectRecords.filter(r => r.date >= startIso && r.date <= endIso);
				const total = windowRecords.length;
				const present = windowRecords.filter(r => r.status==='Present').length;
				const late = windowRecords.filter(r => r.status==='Late').length;
				const absent = windowRecords.filter(r => r.status==='Absent').length;
				const rate = total ? Math.round(((present + late) / total) * 100) : 0;
				const uniqueStudents = new Set(windowRecords.map(r=>r.userId)).size;
				return { total,present,late,absent,rate,uniqueStudents, range:`${startIso} → ${endIso}` };
			}, [subjectRecords, activeDate]);

			// Students absent on more than 3 distinct dates for selected subject
			const absentMoreThan3Days = useMemo(() => {
				const map = new Map<string, Set<string>>();
				subjectRecords.forEach(r => {
					if (r.status === 'Absent') {
						if (!map.has(r.userId)) map.set(r.userId, new Set());
						map.get(r.userId)!.add(r.date);
					}
				});
				const list: { userId:string; userName:string; days:number }[] = [];
				map.forEach((dates, uid) => {
					if (dates.size > 3) {
						const sample = subjectRecords.find(s => s.userId === uid);
						list.push({ userId: uid, userName: sample?.userName || uid, days: dates.size });
					}
				});
				return list.sort((a,b)=> b.days - a.days || a.userName.localeCompare(b.userName));
			}, [subjectRecords]);

			// Handlers for editing attendance
			const startEdit = (rec: DemoRecord) => {
				setEditingRecordId(rec.id);
				setEditingStatus(rec.status);
			};

			const cancelEdit = () => {
				setEditingRecordId(null);
			};

			const saveEdit = () => {
				if(!editingRecordId) return;
				setRecords(prev => prev.map(r => r.id === editingRecordId ? {
					...r,
					status: editingStatus,
					checkInStatus: editingStatus === 'Absent' ? 'failed' : 'success'
				} : r));
				setEditingRecordId(null);
				push('Đã cập nhật điểm danh', 'success', 3000);
			};

			// Scroll to top handler for sidebar logo
			const scrollToTop = () => {
				window.scrollTo({ top: 0, behavior: 'smooth' });
			};

	return (
		<div className="admin-screen">
			<nav className="admin-nav">
				<div className="admin-nav-content">
					<div className="admin-nav-inner">
						<div className="admin-nav-title">
							<h1>SmartPresence Admin</h1>
							<p>EIU Management Dashboard (UI Demo)</p>
						</div>
						<div className="flex items-center space-x-4">
							<div className="text-right">
												<p className="text-sm text-white font-medium">{currentUser?.name}</p>
												<p className="text-xs text-gray-300">{currentUser?.email}</p>
							</div>
						</div>
					</div>
				</div>
							</nav>
				<div className="admin-container">
					<button onClick={handleBackToLogin} className="back-button">← Quay về Login</button>

					<div className="admin-content-grid">
					<div className="admin-main-content">

							{/* Prominent Subject Selection Card */}
							<div className="subject-filter-card" aria-label="Chọn môn học">
								<div className="subject-filter-header only-chips">
									<h3>📚 Môn học</h3>
								</div>
								<div className="subject-chips large" role="list" aria-label="Danh sách môn học">
									{DEMO_SUBJECTS.map(sub => (
										<button
											key={sub}
											role="listitem"
											type="button"
											className={`subject-chip ${sub === selectedSubject ? 'active' : ''}`}
											onClick={()=>setSelectedSubject(sub)}
											aria-pressed={sub === selectedSubject}
										>
											{sub}
										</button>
									))}
								</div>
							</div>

	                                <div className="admin-stats">
	                                <div className="stat-card">
	                                    <h3>Ngày</h3>
	                                    <div className="stat-number text-base" style={{fontSize:'1.1rem'}}>{activeDate || '—'}</div>
	                                    <div className="stat-label">{selectedSubject}</div>
	                                </div>
	                                <div className="stat-card">
	                                    <h3>📊 Tổng</h3>
	                                    <div className="stat-number">{dayStats.total}</div>
	                                    <div className="stat-label">Bản ghi (ngày)</div>
	                                </div>
	                                <div className="stat-card">
	                                    <h3>✅ Đi học</h3>
	                                    <div className="stat-number">{dayStats.present}</div>
	                                    <div className="stat-label">Present</div>
	                                </div>
	                                <div className="stat-card">
	                                    <h3>⏰ Trễ</h3>
	                                    <div className="stat-number">{dayStats.late}</div>
	                                    <div className="stat-label">Late</div>
	                                </div>
	                                <div className="stat-card">
	                                    <h3>❌ Vắng</h3>
	                                    <div className="stat-number">{dayStats.absent}</div>
	                                    <div className="stat-label">Absent</div>
	                                </div>
	                                <div className="stat-card">
	                                    <h3>📈 Tỷ lệ</h3>
	                                    <div className="stat-number">{dayStats.rate}%</div>
	                                    <div className="stat-label">Hiện diện (ngày)</div>
	                                </div>
	                            </div>


									<div className="admin-section">
										<div className="flex items-center justify-between mb-4">
											<h3 className="m-0 flex items-center gap-3">
				                                    <span>📋 Điểm danh – {selectedSubject}</span>
				                                    <span className="day-nav" aria-label="Điều hướng theo ngày">
				                                        <button
				                                            type="button"
				                                            className="day-nav-btn"
				                                            onClick={() => setCurrentDayIndex(i => Math.max(0, i - 1))}
				                                            disabled={currentDayIndex === 0}
				                                            aria-label="Ngày mới hơn"
				                                        >&lt;</button>
				                                        <span className="day-indicator" aria-live="polite">{activeDate || '—'}</span>
				                                        <button
				                                            type="button"
				                                            className="day-nav-btn"
				                                            onClick={() => setCurrentDayIndex(i => Math.min(totalDays - 1, i + 1))}
				                                            disabled={currentDayIndex >= totalDays - 1}
				                                            aria-label="Ngày cũ hơn"
				                                        >&gt;</button>
				                                    </span>
				                                </h3>
											<div className="text-sm text-gray-500">{dayRecords.length} bản ghi (demo) • {totalDays} ngày</div>
										</div>
										<div className="data-table custom-scrollbar" role="table" aria-label={`Bảng điểm danh môn ${selectedSubject}`}>
											<table>
												<thead>
													<tr>
														<th>#</th>
														<th>Sinh viên</th>
														<th>MSSV</th>
														<th>Giờ</th>
														<th>Trạng thái</th>
														<th className="col-confidence">Confidence</th>
														<th className="col-checkin">Check-in</th>
														<th>Sửa</th>
													</tr>
												</thead>
												<tbody>
													{dayRecords.map((r, idx) => {
														const isEditing = r.id === editingRecordId;
														return (
														<tr key={r.id} tabIndex={0} className={isEditing ? 'editing-row' : ''}>
															<td>{idx + 1}</td>
															<td>{r.userName}</td>
															<td>{r.userId}</td>
															<td>{r.time}</td>
															<td>
																{isEditing ? (
																	<select
																		aria-label="Chỉnh trạng thái"
																		value={editingStatus}
																		onChange={e => setEditingStatus(e.target.value as DemoRecord['status'])}
																		className="edit-status-select"
																	>
																		<option value="Present">Present</option>
																		<option value="Late">Late</option>
																		<option value="Absent">Absent</option>
																	</select>
																) : (
																	<span className={`status-badge ${r.status.toLowerCase()}`}>{r.status}</span>
																)}
															</td>
															<td className="col-confidence">{r.confidence}</td>
															<td className="col-checkin"><span className={`status-badge ${r.checkInStatus === 'success' ? 'success present' : 'failed'}`}>{r.checkInStatus}</span></td>
															<td>
																{isEditing ? (
																	<div className="row-actions" role="group" aria-label="Lưu hoặc hủy">
																		<button type="button" className="row-action-btn save" onClick={saveEdit} aria-label="Lưu">💾</button>
																		<button type="button" className="row-action-btn cancel" onClick={cancelEdit} aria-label="Hủy">✖</button>
																	</div>
																) : (
																	<button type="button" className="row-action-btn edit" onClick={() => startEdit(r)} aria-label={`Chỉnh sửa điểm danh cho ${r.userName}`}>✏️</button>
																)}
															</td>
														</tr>
														);
													})}
												</tbody>
											</table>
										</div>
									</div>
					</div>

								<div className="admin-sidebar">
									<div className="sidebar-section overview">
										<h3>📊 Tổng quan</h3>
										<div className="overview-groups">
											<div className="group-block">
												<div className="group-title">Ngày</div>
												<div className="kv"><span>Tổng:</span><span>{dayStats.total}</span></div>
												<div className="kv"><span>Present:</span><span>{dayStats.present}</span></div>
												<div className="kv"><span>Late:</span><span>{dayStats.late}</span></div>
												<div className="kv"><span>Absent:</span><span>{dayStats.absent}</span></div>
												<div className="kv"><span>Tỷ lệ:</span><span>{dayStats.rate}%</span></div>
											</div>
											<div className="group-block">
												<div className="group-title">Tuần (7d)</div>
												<div className="kv"><span>Tổng:</span><span>{weekStats.total}</span></div>
												<div className="kv"><span>Present:</span><span>{weekStats.present}</span></div>
												<div className="kv"><span>Late:</span><span>{weekStats.late}</span></div>
												<div className="kv"><span>Absent:</span><span>{weekStats.absent}</span></div>
												<div className="kv"><span>Tỷ lệ:</span><span>{weekStats.rate}%</span></div>
											</div>
											<div className="group-block">
												<div className="group-title">Môn (All)</div>
												<div className="kv"><span>Tổng:</span><span>{subjectStats.total}</span></div>
												<div className="kv"><span>Present:</span><span>{subjectStats.present}</span></div>
												<div className="kv"><span>Late:</span><span>{subjectStats.late}</span></div>
												<div className="kv"><span>Absent:</span><span>{subjectStats.absent}</span></div>
												<div className="kv"><span>Tỷ lệ:</span><span>{subjectStats.rate}%</span></div>
											</div>
										</div>
									</div>
									<div className="sidebar-section absent-alert">
										<h3>🚨 Vắng &gt; 3 ngày</h3>
										{absentMoreThan3Days.length === 0 && (
											<div className="text-xs text-gray-500">Không có sinh viên nào.</div>
										)}
										{absentMoreThan3Days.length > 0 && (
											<ul className="absent-list" aria-label="Danh sách sinh viên vắng nhiều ngày">
												{absentMoreThan3Days.map(s => (
													<li key={s.userId} className="absent-item">
														<span className="name">{s.userName}</span>
														<span className="days">{s.days} ngày</span>
													</li>
												))}
											</ul>
										)}
									</div>
									<div className="sidebar-section">
										<h3>⚙️ Hành động</h3>
										<div className="flex flex-col gap-2">
											<button className="control-button" disabled>Xuất CSV</button>
											<button className="control-button secondary" disabled>Làm mới</button>
											<button className="control-button success" disabled>Thêm bộ lọc</button>
										</div>
									</div>
									{/* Sidebar EIU Logo scroll-to-top */}
									<div className="sidebar-section sidebar-eiu-logo" role="button" tabIndex={0} aria-label="Lên đầu trang" onClick={scrollToTop} onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); scrollToTop(); } }}>
										<img src="/Logo_EIU.png" alt="EIU Logo" className="eiu-logo-img" />
										<div className="eiu-logo-caption">EIU • Back to Top</div>
									</div>
									</div>
							</div>
				</div>
		</div>
	);
};

export default AdminScreen;

