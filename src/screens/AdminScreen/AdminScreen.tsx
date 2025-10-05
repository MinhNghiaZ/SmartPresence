import React, { useMemo, useState, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import './AdminScreen.css';
import { authService } from '../../Services/AuthService';
import AdminHistory from '../../components/AdminHistory/AdminHistory';
import StudentsList from '../../components/StudentsList/StudentsList';
// import { logger } from '../../utils/logger'; // Unused for now

// Interface cho dữ liệu thực từ database
interface StudentAccount {
	userId: string;
	name: string;
	email: string;
}

interface AttendanceRecord {
	AttendanceId: string;
	studentId: string;
	studentName: string;
	subjectId: string;
	status: 'PRESENT' | 'LATE' | 'ABSENT';
	checked_in_at: string;
	confidence?: number;
	hasImage: number;
}

interface Subject {
	subjectId: string;
	name: string;
	code: string;
}

// Function để fetch subjects từ database
const fetchSubjects = async (): Promise<Subject[]> => {
	try {
		const response = await fetch('/api/subjects');
		const data = await response.json();
		return data.success ? data.subjects : [];
	} catch (error) {
		console.error('Error fetching subjects:', error);
		return [];
	}
};

// Function để fetch attendance records theo ngày
const fetchAttendanceByDate = async (date: string): Promise<AttendanceRecord[]> => {
	try {
		// Use the date parameter instead of hardcoded 'today'
		const response = await fetch(`/api/attendance/records/${date}`);
		const data = await response.json();
		// console.log(`📊 Fetched attendance for ${date}:`, data.records?.length || 0, 'records');
		return data.success ? data.records : [];
	} catch (error) {
		console.error(`Error fetching attendance for ${date}:`, error);
		return [];
	}
};

// Interface cho dashboard session info
interface DashboardSession {
	sessionId: string;
	subjectId: string;
	subjectName: string;
	subjectCode: string;
	totalEnrolled: number;
	totalPresent: number;
	totalAbsent: number;
	start_time: string;
	end_time: string;
}

// Function để fetch dashboard sessions
const fetchDashboardSessions = async (date: string): Promise<DashboardSession[]> => {
	try {
		const response = await fetch(`/api/attendance/dashboard/${date}`);
		const data = await response.json();
		return data.success ? data.sessions : [];
	} catch (error) {
		console.error('Error fetching dashboard sessions:', error);
		return [];
	}
};

// Interface cho enrolled student từ API
interface EnrolledStudent {
	studentId: string;
	studentName: string;
	email: string;
}

// Function để lấy session dates cho navigation
const fetchSessionDates = async (subjectId: string): Promise<string[]> => {
	try {
		const response = await fetch(`/api/attendance/session-dates/${subjectId}`);
		const data = await response.json();
		if (data.success) {
			// Convert ISO dates to YYYY-MM-DD format
			return data.dates.map((date: string) => new Date(date).toISOString().split('T')[0]);
		}
		return [];
	} catch (error) {
		console.error('Error fetching session dates:', error);
		return [];
	}
};

// Function để fetch danh sách sinh viên enrolled trong subject
const fetchEnrolledStudents = async (subjectId: string): Promise<EnrolledStudent[]> => {
	try {
		const response = await fetch(`/api/subjects/${subjectId}/enrolled-students`);
		const data = await response.json();
		return data.success ? data.students : [];
	} catch (error) {
		console.error('Error fetching enrolled students:', error);
		return [];
	}
};

// Function để fetch thống kê attendance cho toàn bộ môn học
const fetchSubjectAttendanceStats = async (subjectId: string) => {
	try {
		const response = await fetch(`/api/attendance/subject/${subjectId}/students-stats`);
		const data = await response.json();
		
		if (!data.success) {
			throw new Error(data.message || 'Failed to fetch subject attendance stats');
		}
		
		// Tính tổng từ data của tất cả sinh viên
		const students = data.students || [];
		const totalSessions = data.totalSessions || 0;
		const totalStudents = students.length;
		
		let totalPresent = 0;
		let totalLate = 0; 
		let totalAbsent = 0;
		
		students.forEach((student: any) => {
			totalPresent += student.presentDays || 0;
			totalLate += student.lateDays || 0;
			totalAbsent += student.absentDays || 0;
		});
		
		const totalAttendances = totalPresent + totalLate;
		const totalPossible = totalStudents * totalSessions;
		const rate = totalPossible > 0 ? Math.round((totalAttendances / totalPossible) * 100) : 0;
		
		return {
			totalSessions,
			totalStudents,
			present: totalPresent,
			late: totalLate,
			absent: totalAbsent,
			rate
		};
	} catch (error) {
		console.error('Error fetching subject attendance stats:', error);
		return {
			totalSessions: 0,
			totalStudents: 0,
			present: 0,
			late: 0,
			absent: 0,
			rate: 0
		};
	}
};



const fetchRealConfidence = async (attendanceId: string): Promise<number | null> => {
	try {
		const response = await fetch(`/api/attendance/${attendanceId}/confidence`);
		const data = await response.json();
		return data.success ? data.confidence : null;
	} catch (error) {
		console.error('Error fetching confidence:', error);
		return null;
	}
};

// Function để convert AttendanceRecord thành DemoRecord format cho UI
const convertAttendanceToDemo = (
	attendanceRecords: AttendanceRecord[], 
	subjects: Subject[]
): DemoRecord[] => {
	return attendanceRecords.map(record => {
		// Tìm subject name từ subjectId
		const subject = subjects.find(s => s.subjectId === record.subjectId);
		const subjectDisplay = subject ? subject.code : record.subjectId;
		
		// Convert status từ database format sang UI format
		const statusMap: { [key: string]: DemoRecord['status'] } = {
			'PRESENT': 'Present',
			'LATE': 'Late', 
			'ABSENT': 'Absent'
		};
		
		// Extract time từ timestamp
		const checkInDate = new Date(record.checked_in_at);
		const timeStr = checkInDate.toLocaleTimeString('en-GB', { 
			hour: '2-digit', 
			minute: '2-digit' 
		});
		
		return {
			id: record.AttendanceId,
			userId: record.studentId,
			userName: record.studentName,
			subject: subjectDisplay,
			time: timeStr,
			date: checkInDate.toISOString().split('T')[0], // YYYY-MM-DD
			status: statusMap[record.status] || 'Absent',
			confidence: record.confidence ? `${record.confidence}%` : '95.00%',
			checkInStatus: record.hasImage ? 'success' : 'failed'
		};
	});
};

// Function để tạo complete attendance list với real enrolled students
const generateCompleteAttendanceListWithRealData = async (
	attendanceRecords: AttendanceRecord[],
	dashboardSessions: DashboardSession[],
	subjects: Subject[],
	selectedSubjectCode: string,
	targetDate?: string // Optional date parameter, defaults to today
): Promise<DemoRecord[]> => {
	// Tìm subject được chọn
	const selectedSubject = subjects.find(s => s.code === selectedSubjectCode);
	if (!selectedSubject) {
		return [];
	}

	// Determine the date to use for filtering
	const dateToUse = targetDate || new Date().toISOString().split('T')[0];
	// console.log(`📅 Using date: ${dateToUse} for attendance filtering`);

	// Fetch danh sách sinh viên enrolled thật từ database
	const enrolledStudents = await fetchEnrolledStudents(selectedSubject.subjectId);
	// console.log(`📚 Loaded ${enrolledStudents.length} enrolled students for ${selectedSubjectCode}`);

	// Get ALL attendance records for this subject (not just for target date)
	const allAttendanceForSubject = attendanceRecords.filter(r => r.subjectId === selectedSubject.subjectId);
	
	// Get attendance records specifically for target date
	const attendanceForDate = allAttendanceForSubject.filter(r => {
		const recordDate = new Date(r.checked_in_at).toISOString().split('T')[0];
		return recordDate === dateToUse;
	});
	
	// Create a comprehensive student list: enrolled + anyone who ever had attendance
	const allStudentIds = new Set<string>();
	const studentInfoMap = new Map<string, { studentId: string, studentName: string }>();
	
	// Add enrolled students
	enrolledStudents.forEach(student => {
		allStudentIds.add(student.studentId);
		studentInfoMap.set(student.studentId, {
			studentId: student.studentId,
			studentName: student.studentName
		});
	});
	
	// Add students who ever had attendance (even if not enrolled)
	allAttendanceForSubject.forEach(record => {
		if (!allStudentIds.has(record.studentId)) {
			allStudentIds.add(record.studentId);
			studentInfoMap.set(record.studentId, {
				studentId: record.studentId,
				studentName: `Student ${record.studentId}` // Fallback name
			});
		}
	});
	
	// console.log(`👥 Total unique students (enrolled + ever attended): ${allStudentIds.size}`);
	
	// Tạo complete list từ all students (enrolled + ever attended)
	const completeList: DemoRecord[] = [];
	
	// Process all students in comprehensive list
	for (const studentId of allStudentIds) {
		const studentInfo = studentInfoMap.get(studentId)!;
		
		// Tìm attendance record cho sinh viên này trong ngày được chọn
		const attendanceRecord = attendanceForDate.find(a => a.studentId === studentId);
		
		if (attendanceRecord) {
			// Sinh viên đã check-in cho ngày này - sử dụng data thực
			const checkInDate = new Date(attendanceRecord.checked_in_at);
			const timeStr = checkInDate.toLocaleTimeString('en-GB', { 
				hour: '2-digit', 
				minute: '2-digit' 
			});
			
			const statusMap: { [key: string]: DemoRecord['status'] } = {
				'PRESENT': 'Present',
				'LATE': 'Late', 
				'ABSENT': 'Absent'
			};
			
			// ✅ Fetch real confidence from captured_images table
			let realConfidence = '0.00%';
			try {
				const confidence = await fetchRealConfidence(attendanceRecord.AttendanceId);
				realConfidence = confidence !== null ? `${confidence.toFixed(2)}%` : '0.00%';
			} catch (error) {
				console.error('Error loading confidence:', error);
			}
			
			completeList.push({
				id: attendanceRecord.AttendanceId,
				userId: studentInfo.studentId,
				userName: studentInfo.studentName,
				subject: selectedSubjectCode,
				time: timeStr,
				date: checkInDate.toISOString().split('T')[0],
				status: statusMap[attendanceRecord.status] || 'Absent',
				confidence: realConfidence,
				checkInStatus: attendanceRecord.hasImage ? 'success' : 'failed',
				// Admin functionality fields
				AttendanceId: attendanceRecord.AttendanceId,
				StudentId: studentInfo.studentId
			});
		} else {
			// Sinh viên chưa check-in cho ngày này - absent
			completeList.push({
				id: `ABSENT_${selectedSubject.subjectId}_${studentInfo.studentId}`,
				userId: studentInfo.studentId,
				userName: studentInfo.studentName,
				subject: selectedSubjectCode,
				time: '--:--',
				date: dateToUse,
				status: 'Absent',
				confidence: '0.00%',
				checkInStatus: 'failed',
				// Admin functionality fields - no AttendanceId for absent students
				StudentId: studentInfo.studentId
			});
		}
	}
	
	return completeList;
};

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
	// Admin functionality fields
	AttendanceId?: string; // Backend attendance ID for updates
	StudentId?: string; // Backend student ID for new records
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
		
		// Admin API functions
		const adminUpdateAttendanceStatus = async (
			attendanceId: string, 
			newStatus: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED'
		): Promise<{ success: boolean; message: string }> => {
			try {
				const adminId = currentUser?.id || '';
				const token = authService.getToken();
				const response = await fetch('/api/attendance/admin/update-status', {
					method: 'PUT',
					headers: { 
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
					},
					body: JSON.stringify({ attendanceId, newStatus, adminId })
				});
				return await response.json();
			} catch (error) {
				console.error('Error updating attendance status:', error);
				return { success: false, message: 'Network error' };
			}
		};

		const adminCreateAttendanceRecord = async (
			studentId: string,
			subjectId: string,
			status: 'PRESENT' | 'LATE'
		): Promise<{ success: boolean; message: string; attendanceId?: string }> => {
			try {
				const adminId = currentUser?.id || '';
				const token = authService.getToken();
				const response = await fetch('/api/attendance/admin/create-record', {
					method: 'POST',
					headers: { 
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
					},
					body: JSON.stringify({ studentId, subjectId, status, adminId })
				});
				return await response.json();
			} catch (error) {
				console.error('Error creating attendance record:', error);
				return { success: false, message: 'Network error' };
			}
		};
		
		// Check if user is logged in and is admin
		useEffect(() => {
			// console.log('AdminScreen: currentUser =', currentUser);
			// console.log('AdminScreen: isAdmin =', isAdmin);
			
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

		// Load real data từ database
		useEffect(() => {
			const loadRealData = async () => {
				if (!currentUser || !isAdmin) return;
				
				try {
					setIsLoading(true);
					// console.log('🔄 Loading real data from database...');

					// Load subjects
					const subjectsData = await fetchSubjects();
					setSubjects(subjectsData);
					// console.log('✅ Loaded subjects:', subjectsData.length);

					// Load attendance for today
					const today = new Date().toISOString().split('T')[0];
					const attendanceData = await fetchAttendanceByDate(today);
					setAttendanceRecords(attendanceData);
					// console.log('✅ Loaded attendance records:', attendanceData.length);

					// Load dashboard sessions để lấy thông tin enrollment
					const dashboardData = await fetchDashboardSessions(today);
					setDashboardSessions(dashboardData);
					// console.log('✅ Loaded dashboard sessions:', dashboardData.length);

					// Set first subject as selected if available
					if (subjectsData.length > 0) {
						setSelectedSubject(subjectsData[0].code);
						
						// Generate complete attendance list với real enrolled students
						const today = new Date().toISOString().split('T')[0];
						const completeRecords = await generateCompleteAttendanceListWithRealData(
							attendanceData, 
							dashboardData, 
							subjectsData, 
							subjectsData[0].code,
							today
						);
						setRecords(completeRecords);
						// console.log('✅ Generated complete attendance list with real data:', completeRecords.length);
					}

				} catch (error) {
					console.error('❌ Error loading real data:', error);
					push('❌ Không thể tải dữ liệu từ database', 'error');
				} finally {
					setIsLoading(false);
				}
			};

			loadRealData();
		}, [currentUser, isAdmin, push]);

		// Handler for back to login with proper logout
		const handleBackToLogin = async () => {
			try {
				await authService.logout();
				// console.log('User logged out successfully');
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

		// State cho real data từ database
		const [subjects, setSubjects] = useState<Subject[]>([]);
		const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
		const [dashboardSessions, setDashboardSessions] = useState<DashboardSession[]>([]);
		const [isLoading, setIsLoading] = useState(true);
		
		// Temporary fallback - tạm thời giữ records cũ trong khi chuyển đổi
		const [records, setRecords] = useState<DemoRecord[]>(() => generateRecords());
		// Editing state
		const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
		const [editingStatus, setEditingStatus] = useState<DemoRecord['status']>('Present');
            const [selectedSubject, setSelectedSubject] = useState<string>(''); // Sẽ được set khi load data
            const [currentDayIndex, setCurrentDayIndex] = useState<number>(0); // 0 = most recent day
            const [activeView, setActiveView] = useState<'attendance' | 'history'>('attendance'); // New state for view switching
            const [showStudentsList, setShowStudentsList] = useState<boolean>(false); // State for StudentsList modal
            const [subjectAttendanceStats, setSubjectAttendanceStats] = useState<{
                totalSessions: number;
                totalStudents: number;
                present: number;
                late: number;
                absent: number;
                rate: number;
            }>({
                totalSessions: 0,
                totalStudents: 0,
                present: 0,
                late: 0,
                absent: 0,
                rate: 0
            });
            const [absentStudentsList, setAbsentStudentsList] = useState<{
                userId: string;
                userName: string;
                days: number;
            }[]>([]);

			// Update records when selectedSubject changes để hiển thị tất cả students
			useEffect(() => {
				const updateRecords = async () => {
					if (selectedSubject && subjects.length > 0) {
						const today = new Date().toISOString().split('T')[0];
						const completeRecords = await generateCompleteAttendanceListWithRealData(
							attendanceRecords, 
							dashboardSessions, 
							subjects, 
							selectedSubject,
							today
						);
						setRecords(completeRecords);
						// console.log(`✅ Updated records for ${selectedSubject}:`, completeRecords.length);
					}
				};
				
				updateRecords();
			}, [selectedSubject, subjects, attendanceRecords, dashboardSessions]);

			const subjectRecords = useMemo(() => records.filter(r => r.subject === selectedSubject), [records, selectedSubject]);

			// Load session dates for navigation (based on ClassSession instead of Attendance)
			const [sessionDates, setSessionDates] = useState<string[]>([]);
			
			useEffect(() => {
				const loadSessionDates = async () => {
					if (selectedSubject && subjects.length > 0) {
						const subjectObj = subjects.find(s => s.code === selectedSubject);
						if (subjectObj) {
							const dates = await fetchSessionDates(subjectObj.subjectId);
							setSessionDates(dates);
							// console.log(`📅 Loaded ${dates.length} session dates for ${selectedSubject}:`, dates);
						}
					}
				};
				
				loadSessionDates();
			}, [selectedSubject, subjects]);

			// Load subject attendance stats and absent students when selectedSubject changes
			useEffect(() => {
				const loadSubjectData = async () => {
					if (selectedSubject && subjects.length > 0) {
						const subjectObj = subjects.find(s => s.code === selectedSubject);
						if (subjectObj) {
							// Load attendance stats
							const stats = await fetchSubjectAttendanceStats(subjectObj.subjectId);
							setSubjectAttendanceStats(stats);
							// console.log(`📊 Loaded stats for ${selectedSubject}:`, stats);

							// Load individual student stats to get absent students
							try {
								const response = await fetch(`/api/attendance/subject/${subjectObj.subjectId}/students-stats`);
								const data = await response.json();
								
								if (data.success && data.students) {
									// Filter students with absentDays >= 3
									const absentStudents = data.students
										.filter((student: any) => student.absentDays >= 3)
										.map((student: any) => ({
											userId: student.studentId,
											userName: student.studentName,
											days: student.absentDays
										}))
										.sort((a: any, b: any) => b.days - a.days || a.userName.localeCompare(b.userName));
									
									setAbsentStudentsList(absentStudents);
									// console.log(`📋 Loaded absent students for ${selectedSubject}:`, absentStudents);
								}
							} catch (error) {
								console.error('Error loading absent students:', error);
								setAbsentStudentsList([]);
							}
						}
					}
				};
				
				loadSubjectData();
			}, [selectedSubject, subjects]);

			const subjectDates = sessionDates; // Use session dates instead of attendance dates

            // Set intelligent initial date when subject changes or sessionDates load
            useEffect(() => {
                if (sessionDates.length === 0) return;
                
                const today = new Date().toISOString().split('T')[0];
                
                // Find today's index
                const todayIndex = sessionDates.findIndex(date => date === today);
                
                if (todayIndex !== -1) {
                    // Today exists in sessions, use it
                    setCurrentDayIndex(todayIndex);
                    // console.log(`📅 Set to today's session: ${today} (index ${todayIndex})`);
                } else {
                    // Today not found, find the most recent past date
                    let mostRecentPastIndex = -1;
                    
                    for (let i = 0; i < sessionDates.length; i++) {
                        const sessionDate = sessionDates[i];
                        if (sessionDate < today) {
                            // This is a past date, check if it's more recent than our current candidate
                            if (mostRecentPastIndex === -1 || sessionDate > sessionDates[mostRecentPastIndex]) {
                                mostRecentPastIndex = i;
                            }
                        }
                    }
                    
                    if (mostRecentPastIndex !== -1) {
                        // Found a past date, use the most recent one
                        setCurrentDayIndex(mostRecentPastIndex);
                        // console.log(`📅 Set to most recent past session: ${sessionDates[mostRecentPastIndex]} (index ${mostRecentPastIndex})`);
                    } else {
                        // No past dates found, use first date (default behavior)
                        setCurrentDayIndex(0);
                        // console.log(`📅 No past dates found, using first session: ${sessionDates[0]} (index 0)`);
                    }
                }
            }, [sessionDates]); // Trigger when sessionDates changes, not just selectedSubject

            const totalDays = subjectDates.length || 1;

			const activeDate = subjectDates[currentDayIndex];

			// Load attendance data when activeDate changes
			useEffect(() => {
				const loadAttendanceForDate = async () => {
					if (!activeDate || !selectedSubject || !subjects.length) {
						// console.log('⏭️ Skipping load - missing requirements:', { activeDate, selectedSubject, subjectsLength: subjects.length });
						return;
					}
					
					try {
						setIsLoading(true);
						// console.log(`🔄 Loading attendance data for date: ${activeDate}`);

						// Fetch attendance data for the specific date
						// console.log('📊 Fetching attendance records...');
						const attendanceData = await fetchAttendanceByDate(activeDate);
						// console.log(`✅ Loaded ${attendanceData.length} attendance records for ${activeDate}`);

						// Fetch dashboard data for the specific date
						// console.log('📈 Fetching dashboard sessions...');
						const dashboardData = await fetchDashboardSessions(activeDate);
						// console.log(`✅ Loaded ${dashboardData.length} dashboard sessions for ${activeDate}`);

						// Find selected subject object
						const subjectObj = subjects.find(s => s.code === selectedSubject);
						if (!subjectObj) {
							console.error(`❌ Subject ${selectedSubject} not found in subjects list`);
							return;
						}

						// console.log('🧮 Generating complete attendance list...');
						// Generate complete attendance list for this date
						const completeRecords = await generateCompleteAttendanceListWithRealData(
							attendanceData,
							dashboardData,
							subjects,
							selectedSubject,
							activeDate // Pass the active date
						);
						setRecords(completeRecords);
						// console.log(`✅ Generated ${completeRecords.length} complete records for ${activeDate}`);

					} catch (error) {
						console.error(`❌ Error loading attendance for ${activeDate}:`, error);
						console.error('Error details:', error);
						push(`❌ Không thể tải dữ liệu cho ngày ${activeDate}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
					} finally {
						setIsLoading(false);
					}
				};

				loadAttendanceForDate();
			}, [activeDate, selectedSubject, subjects, push]);
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

			// Use the new subject attendance stats from API instead of calculating from subjectRecords
			const subjectStats = useMemo(() => {
				return {
					totalSessions: subjectAttendanceStats.totalSessions,
					totalStudents: subjectAttendanceStats.totalStudents, 
					present: subjectAttendanceStats.present,
					late: subjectAttendanceStats.late,
					absent: subjectAttendanceStats.absent,
					rate: subjectAttendanceStats.rate
				};
			}, [subjectAttendanceStats]);

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

			// Note: Removed weekStats as it's no longer needed

			// Students absent on 3 or more days for selected subject (using API data)
			const absentMoreThan2Days = useMemo(() => {
				return absentStudentsList.filter(student => student.days >= 3);
			}, [absentStudentsList]);

			// Handlers for editing attendance
			const startEdit = (rec: DemoRecord) => {
				setEditingRecordId(rec.id);
				setEditingStatus(rec.status);
			};

			const cancelEdit = () => {
				setEditingRecordId(null);
			};

			const saveEdit = async () => {
				if(!editingRecordId) return;
				
				try {
					const currentRecord = records.find(r => r.id === editingRecordId);
					if (!currentRecord) return;

					// Convert status format from UI to API format
					const apiStatus = editingStatus.toUpperCase() as 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';

					// Kiểm tra xem có AttendanceId không (record có tồn tại trong database)
					if (currentRecord.AttendanceId) {
						// Update existing record
						const result = await adminUpdateAttendanceStatus(currentRecord.AttendanceId, apiStatus);
						if (result.success) {
							push('Đã cập nhật trạng thái điểm danh', 'success', 3000);
						} else {
							push(`Lỗi: ${result.message}`, 'error', 3000);
							return;
						}
					} else {
						// Create new attendance record (student was Absent, now Present/Late)
						if (editingStatus !== 'Absent' && currentRecord.StudentId) {
							// Get subjectId from subjects array using selectedSubject (code)
							const subjectObj = subjects.find(s => s.code === selectedSubject);
							if (!subjectObj) {
								push('Lỗi: Không tìm thấy thông tin môn học', 'error', 3000);
								return;
							}
							
							const result = await adminCreateAttendanceRecord(
								currentRecord.StudentId,
								subjectObj.subjectId, // Use actual subjectId from database
								apiStatus as 'PRESENT' | 'LATE'
							);
							
							if (result.success && result.attendanceId) {
								// Update local state với AttendanceId mới
								setRecords(prev => prev.map(r => r.id === editingRecordId ? {
									...r,
									AttendanceId: result.attendanceId,
									status: editingStatus,
									checkInStatus: 'success'
								} : r));
								
								push('Đã tạo bản ghi điểm danh mới', 'success', 3000);
							} else {
								push(`Lỗi: ${result.message}`, 'error', 3000);
								return;
							}
						}
					}
					
					// Update local state for existing records
					setRecords(prev => prev.map(r => r.id === editingRecordId ? {
						...r,
						status: editingStatus,
						checkInStatus: editingStatus === 'Absent' ? 'failed' : 'success'
					} : r));
					
				} catch (error) {
					console.error('Error updating attendance:', error);
					push('Lỗi khi cập nhật điểm danh', 'error', 3000);
				} finally {
					setEditingRecordId(null);
				}
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
							<p>EIU Management Dashboard</p>
						</div>
						
						{/* Navigation Tabs */}
						<div className="flex items-center space-x-4">
							<div className="flex space-x-2">
								<button
									className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
										activeView === 'attendance'
											? 'bg-white text-gray-700 shadow-lg border-2 border-white/30'
											: 'bg-white/10 text-white hover:bg-white/20 hover:shadow-md backdrop-blur-sm'
									}`}
									onClick={() => setActiveView('attendance')}
								>
									<span className="text-lg">📊</span>
									<span>Điểm danh</span>
								</button>
								<button
									className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
										activeView === 'history'
											? 'bg-white text-gray-700 shadow-lg border-2 border-white/30'
											: 'bg-white/10 text-white hover:bg-white/20 hover:shadow-md backdrop-blur-sm'
									}`}
									onClick={() => setActiveView('history')}
								>
									<span className="text-lg">📸</span>
									<span>Lịch sử ảnh</span>
								</button>
								<button
									className="px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
									onClick={() => setShowStudentsList(true)}
									disabled={!selectedSubject}
								>
									<span className="text-lg">👥</span>
									<span>Danh sách SV</span>
								</button>
							</div>
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

					{isLoading ? (
						<div style={{textAlign: 'center', padding: '2rem'}}>
							<p>🔄 Đang tải dữ liệu từ database...</p>
							<p>Subjects: {subjects.length} | Attendance: {attendanceRecords.length}</p>
						</div>
					) : (
						<>
							{/* Conditional Layout Based on Active View */}
							{activeView === 'history' ? (
								/* Full width for AdminHistory */
								<div className="admin-full-width">
									<AdminHistory />
								</div>
							) : (
								/* Normal grid layout for Attendance Dashboard */
								<div className="admin-content-grid">
									<div className="admin-main-content">
										{/* Original Attendance Dashboard Content */}

							{/* Prominent Subject Selection Card */}
							<div className="subject-filter-card" aria-label="Chọn môn học">
								<div className="subject-filter-header only-chips">
									<h3>📚 Môn học</h3>
								</div>
								<div className="subject-chips large" role="list" aria-label="Danh sách môn học">
									{subjects.map(subject => (
										<button
											key={subject.subjectId}
											role="listitem"
											type="button"
											className={`subject-chip ${subject.code === selectedSubject ? 'active' : ''}`}
											onClick={()=>setSelectedSubject(subject.code)}
											aria-pressed={subject.code === selectedSubject}
										>
											{subject.code}
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
													<div className="group-title">Môn {selectedSubject}</div>
													<div className="kv"><span>Tổng sessions:</span><span>{subjectStats.totalSessions}</span></div>
													<div className="kv"><span>Tổng sinh viên:</span><span>{subjectStats.totalStudents}</span></div>
													<div className="kv"><span>Present:</span><span>{subjectStats.present}</span></div>
													<div className="kv"><span>Late:</span><span>{subjectStats.late}</span></div>
													<div className="kv"><span>Absent:</span><span>{subjectStats.absent}</span></div>
													<div className="kv"><span>Tỷ lệ:</span><span>{subjectStats.rate}%</span></div>
												</div>
											</div>
										</div>
										<div className="sidebar-section absent-alert">
											<h3>🚨 Vắng ≥ 3 ngày</h3>
											{absentMoreThan2Days.length === 0 && (
												<div className="text-xs text-gray-500">Không có sinh viên nào.</div>
											)}
											{absentMoreThan2Days.length > 0 && (
												<ul className="absent-list" aria-label="Danh sách sinh viên vắng nhiều ngày">
													{absentMoreThan2Days.map((s: any) => (
														<li key={s.userId} className="absent-item">
															<span className="name">{s.userName}</span>
															<span className="days">{s.days} ngày</span>
														</li>
													))}
												</ul>
											)}
										</div>
										{/* Sidebar EIU Logo scroll-to-top */}
										<div className="sidebar-section sidebar-eiu-logo" role="button" tabIndex={0} aria-label="Lên đầu trang" onClick={scrollToTop} onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); scrollToTop(); } }}>
											<img src="/Logo_EIU.png" alt="EIU Logo" className="eiu-logo-img" />
											<div className="eiu-logo-caption">EIU • Back to Top</div>
										</div>
									</div>
								</div>
							)}
						</>
					)}
				</div>

			{/* Students List Modal */}
			<StudentsList
				isOpen={showStudentsList}
				onClose={() => setShowStudentsList(false)}
				selectedSubject={selectedSubject}
				subjects={subjects}
				onSubjectChange={setSelectedSubject}
			/>
		</div>
	);
};

export default AdminScreen;

