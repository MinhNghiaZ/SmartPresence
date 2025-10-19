import React, { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import './AdminScreen.css';
import { authService } from '../../Services/AuthService';
import SubjectServiceClass from '../../Services/SubjectService';
import attendanceService from '../../Services/AttendanceService';
import type { AttendanceRecord, Subject } from '../../models';

// Lazy load các component nặng chỉ khi cần thiết
const AdminHistory = lazy(() => import('../../components/AdminHistory/AdminHistory'));
const StudentsList = lazy(() => import('../../components/StudentsList/StudentsList'));
const CreateAccountModal = lazy(() => import('../../components/CreateAccountModal/CreateAccountModal'));
const ResetPasswordModal = lazy(() => import('../../components/ResetPasswordModal/ResetPasswordModal'));

// Fetch all subjects from database | Lấy tất cả môn học từ database
const fetchSubjects = async (): Promise<Subject[]> => {
	try {
		return await SubjectServiceClass.getAllSubjects();
	} catch (error) {
		console.error('Error fetching subjects:', error);
		return [];
	}
};

// Fetch attendance records by date | Lấy danh sách điểm danh theo ngày
const fetchAttendanceByDate = async (date: string): Promise<AttendanceRecord[]> => {
	try {
		const result = await attendanceService.getAttendanceByDate(date);
		return result.success ? result.records : [];
	} catch (error) {
		console.error(`Error fetching attendance for ${date}:`, error);
		return [];
	}
};

// Dashboard session information | Thông tin phiên học cho dashboard
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

// Fetch dashboard sessions by date | Lấy thông tin các phiên học theo ngày
const fetchDashboardSessions = async (date: string): Promise<DashboardSession[]> => {
	try {
		const result = await attendanceService.getDailyDashboard(date);
		return result.sessions;
	} catch (error) {
		console.error('Error fetching dashboard sessions:', error);
		return [];
	}
};

// Enrolled student data from API | Dữ liệu sinh viên đã đăng ký từ API
interface EnrolledStudent {
	studentId: string;
	studentName: string;
	email: string;
}

// Fetch session dates for navigation | Lấy danh sách ngày có phiên học để điều hướng
const fetchSessionDates = async (subjectId: string): Promise<string[]> => {
	try {
		return await attendanceService.getSessionDates(subjectId);
	} catch (error) {
		console.error('Error fetching session dates:', error);
		return [];
	}
};

// Fetch enrolled students in a subject | Lấy danh sách sinh viên đã đăng ký môn học
const fetchEnrolledStudents = async (subjectId: string): Promise<EnrolledStudent[]> => {
	try {
		return await SubjectServiceClass.getEnrolledStudents(subjectId);
	} catch (error) {
		console.error('Error fetching enrolled students:', error);
		return [];
	}
};

// Fetch attendance statistics for entire subject | Lấy thống kê điểm danh cho toàn bộ môn học
const fetchSubjectAttendanceStats = async (subjectId: string) => {
	try {
		const data = await attendanceService.getSubjectAttendanceStats(subjectId);

		// Calculate totals from all student data | Tính tổng từ dữ liệu của tất cả sinh viên
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

		// ✅ Return both stats AND students data to avoid duplicate API call
		return {
			totalSessions,
			totalStudents,
			present: totalPresent,
			late: totalLate,
			absent: totalAbsent,
			rate,
			students // ← Include students data
		};
	} catch (error) {
		console.error('Error fetching subject attendance stats:', error);
		return {
			totalSessions: 0,
			totalStudents: 0,
			present: 0,
			late: 0,
			absent: 0,
			rate: 0,
			students: []
		};
	}
};

// Generate complete attendance list with real enrolled students data
// Tạo danh sách điểm danh đầy đủ với dữ liệu sinh viên thực tế
const generateCompleteAttendanceListWithRealData = async (
	attendanceRecords: AttendanceRecord[],
	_dashboardSessions: DashboardSession[],
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

			// ✅ Use confidence từ API response (đã JOIN trong backend) - KHÔNG CẦN fetch riêng lẻ nữa
			const realConfidence = attendanceRecord.confidence !== undefined && attendanceRecord.confidence !== null
				? `${Number(attendanceRecord.confidence).toFixed(2)}%`
				: '0.00%';

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

	// Helper function to extract Vietnamese given name (last word)
	// Example: "Nguyễn Văn Anh" → "Anh", "Trần Thị Bình" → "Bình"
	const extractGivenName = (fullName: string): string => {
		const parts = fullName.trim().split(/\s+/);
		return parts[parts.length - 1] || fullName;
	};

	// Sort student list by given name (TÊN - last word), then full name, then student ID
	// Vietnamese naming convention: Sort by given name first (e.g., "Anh" in "Nguyễn Văn Anh")
	// Example: Anh (various surnames) → Bình → Châu → ...
	completeList.sort((a, b) => {
		const givenNameA = extractGivenName(a.userName);
		const givenNameB = extractGivenName(b.userName);

		// First, sort by given name (TÊN)
		const givenNameCompare = givenNameA.localeCompare(givenNameB, 'vi', { sensitivity: 'base' });
		if (givenNameCompare !== 0) {
			return givenNameCompare;
		}

		// If given names are equal, sort by full name (to differentiate "Nguyễn Văn Anh" vs "Lê Minh Anh")
		const fullNameCompare = a.userName.localeCompare(b.userName, 'vi', { sensitivity: 'base' });
		if (fullNameCompare !== 0) {
			return fullNameCompare;
		}

		// If full names are equal, sort by userId (MSSV)
		return a.userId.localeCompare(b.userId);
	});

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
			const isoDate = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD
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
	records.sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : b.date.localeCompare(a.date)));
	return records;
}

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
			return await attendanceService.admin.updateStatus(attendanceId, newStatus, adminId);
		} catch (error) {
			console.error('Error updating attendance status:', error);
			return { success: false, message: 'Network error' };
		}
	};

	const adminCreateAttendanceRecord = async (
		studentId: string,
		subjectId: string,
		status: 'PRESENT' | 'LATE',
		sessionDate?: string // Optional: YYYY-MM-DD format
	): Promise<{ success: boolean; message: string; attendanceId?: string }> => {
		try {
			const adminId = currentUser?.id || '';
			return await attendanceService.admin.createRecord(studentId, subjectId, status, adminId, sessionDate);
		} catch (error) {
			console.error('Error creating attendance record:', error);
			return { success: false, message: 'Network error' };
		}
	};

	// Admin API function to create student account
	const adminCreateStudentAccount = async (
		studentId: string,
		name: string,
		email: string,
		password: string,
		subjectIds: string[]
	): Promise<{ success: boolean; message: string }> => {
		try {
			return await authService.adminCreateStudent(studentId, name, email, password, subjectIds);
		} catch (error) {
			console.error('Error creating student account:', error);
			return { success: false, message: 'Network error' };
		}
	};

	// Admin API function to reset student password
	const adminResetStudentPassword = async (
		studentId: string,
		newPassword: string
	): Promise<{ success: boolean; message: string }> => {
		try {
			return await authService.adminResetPassword(studentId, newPassword);
		} catch (error) {
			console.error('Error resetting password:', error);
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

				// ✅ Step 1: Load subjects first
				const subjectsData = await fetchSubjects();
				setSubjects(subjectsData);
				// console.log('✅ Loaded subjects:', subjectsData.length);

				// Set first subject - other useEffects will handle loading data
				// Chọn môn học đầu tiên - các useEffect khác sẽ xử lý load dữ liệu
				if (subjectsData.length > 0) {
					setSelectedSubject(subjectsData[0].code);
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

	// Temporary workaround for unused variable warning (used in reload button handler below)
	void dashboardSessions;

	// Temporary fallback - tạm thời giữ records cũ trong khi chuyển đổi
	const [records, setRecords] = useState<DemoRecord[]>(() => generateRecords());
	const [selectedSubject, setSelectedSubject] = useState<string>(''); // Sẽ được set khi load data
	const [currentDayIndex, setCurrentDayIndex] = useState<number>(0); // 0 = most recent day
	const [activeView, setActiveView] = useState<'attendance' | 'history'>('attendance'); // New state for view switching
	const [showStudentsList, setShowStudentsList] = useState<boolean>(false); // State for StudentsList modal
	const [showCreateAccountModal, setShowCreateAccountModal] = useState<boolean>(false); // State for Create Account modal
	const [showResetPasswordModal, setShowResetPasswordModal] = useState<boolean>(false); // State for Reset Password modal
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
		actualAbsent?: number;
		lateDays?: number;
	}[]>([]);

	// ⚠️ REMOVED useEffect that loads TODAY data when selectedSubject changes
	// This was causing duplicate data loading (conflict with activeDate useEffect)
	// Now only useEffect for activeDate loads the attendance data

	const subjectRecords = useMemo(() => records.filter(r => r.subject === selectedSubject), [records, selectedSubject]);			// Load session dates for navigation (based on ClassSession instead of Attendance)
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedSubject]); // Only trigger when selectedSubject changes

	// Load subject attendance stats and absent students when selectedSubject changes
	useEffect(() => {
		const loadSubjectData = async () => {
			if (selectedSubject && subjects.length > 0) {
				const subjectObj = subjects.find(s => s.code === selectedSubject);
				if (subjectObj) {
					// ✅ Load attendance stats - now includes students data
					const stats = await fetchSubjectAttendanceStats(subjectObj.subjectId);
					setSubjectAttendanceStats(stats);
					// console.log(`📊 Loaded stats for ${selectedSubject}:`, stats);

					// ✅ Extract absent students from stats.students (NO duplicate API call!)
					try {
						const students = stats.students || [];

						// Filter students with absentEquivalent >= 3 (including late days calculation)
						const absentStudents = students
							.filter((student: any) => student.absentEquivalent >= 3)
							.map((student: any) => ({
								userId: student.studentId,
								userName: student.studentName,
								days: student.absentEquivalent,
								actualAbsent: student.absentDays,
								lateDays: student.lateDays
							}))
							.sort((a: any, b: any) => b.days - a.days || a.userName.localeCompare(b.userName));

						setAbsentStudentsList(absentStudents);
						// console.log(`📋 Loaded absent students for ${selectedSubject}:`, absentStudents);
					} catch (error) {
						console.error('Error processing absent students:', error);
						setAbsentStudentsList([]);
					}
				}
			}
		};

		loadSubjectData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedSubject]); // Only trigger when selectedSubject changes

	const subjectDates = sessionDates; // Use session dates instead of attendance dates

	// Set intelligent initial date when subject changes or sessionDates load
	useEffect(() => {
		if (sessionDates.length === 0) return;

		const today = new Date().toISOString().split('T')[0];                // Find today's index
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

	// Format date to Vietnamese format: "Ngày DD/MM/YYYY"
	const formatDateDisplay = (dateStr: string): string => {
		if (!dateStr) return '—';
		const [year, month, day] = dateStr.split('-');
		return `Ngày ${day}/${month}/${year}`;
	};

	// sessionDates is sorted DESC (newest to oldest) from backend
	// sessionDates được sắp xếp giảm dần (mới nhất → cũ nhất) từ backend
	// Index 0 = newest date | ngày mới nhất, Index max = oldest date | ngày cũ nhất
	// Button < : increase index → older date | tăng index → ngày cũ hơn
	// Button > : decrease index → newer date | giảm index → ngày mới hơn

	// Load attendance data when activeDate changes | Tải dữ liệu điểm danh khi ngày thay đổi
	useEffect(() => {
		const loadAttendanceForDate = async () => {
			if (!activeDate || !selectedSubject || !subjects.length) {
				return;
			}

			try {
				setIsLoading(true);

				// Fetch attendance data for the specific date
				const attendanceData = await fetchAttendanceByDate(activeDate);

				// Fetch dashboard data for the specific date
				const dashboardData = await fetchDashboardSessions(activeDate);

				// Find selected subject object
				const subjectObj = subjects.find(s => s.code === selectedSubject);
				if (!subjectObj) {
					console.error(`❌ Subject ${selectedSubject} not found in subjects list`);
					return;
				}

				// Generate complete attendance list for this date
				const completeRecords = await generateCompleteAttendanceListWithRealData(
					attendanceData,
					dashboardData,
					subjects,
					selectedSubject,
					activeDate
				);
				setRecords(completeRecords);

			} catch (error) {
				console.error(`❌ Error loading attendance for ${activeDate}:`, error);
				push(`❌ Không thể tải dữ liệu cho ngày ${activeDate}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
			} finally {
				setIsLoading(false);
			}
		};

		loadAttendanceForDate();
	}, [activeDate, selectedSubject, subjects, push]);
	const dayRecords = useMemo(() => {
		if (!activeDate) return [];
		return subjectRecords.filter(r => r.date === activeDate);
	}, [subjectRecords, activeDate]);

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
		if (!activeDate) return { total: 0, present: 0, late: 0, absent: 0, rate: 0, uniqueStudents: 0 };
		const day = subjectRecords.filter(r => r.date === activeDate);
		const total = day.length;
		const present = day.filter(r => r.status === 'Present').length;
		const late = day.filter(r => r.status === 'Late').length;
		const absent = day.filter(r => r.status === 'Absent').length;
		const rate = total ? Math.round(((present + late) / total) * 100) : 0;
		const uniqueStudents = new Set(day.map(r => r.userId)).size;
		return { total, present, late, absent, rate, uniqueStudents };
	}, [subjectRecords, activeDate]);

	// Students absent on 3 or more days for selected subject | Sinh viên vắng 3 ngày trở lên
	const absentMoreThan2Days = useMemo(() => {
		return absentStudentsList.filter(student => student.days >= 3);
	}, [absentStudentsList]);

	// Handler for saving attendance edits
	const saveEdit = async (recordId: string, newStatus: DemoRecord['status']) => {
		if (!recordId) return;

		try {
			const currentRecord = records.find(r => r.id === recordId);
			if (!currentRecord) return;

			// Convert status format from UI to API format
			const apiStatus = newStatus.toUpperCase() as 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';

			// Kiểm tra xem có AttendanceId không (record có tồn tại trong database)
			if (currentRecord.AttendanceId) {
				// Update existing record
				const result = await adminUpdateAttendanceStatus(currentRecord.AttendanceId, apiStatus);
				if (result.success) {
					push('Đã cập nhật trạng thái điểm danh', 'success', 3000);
					
					// Update local state for existing records
					setRecords(prev => prev.map(r => r.id === recordId ? {
						...r,
						status: newStatus,
						checkInStatus: newStatus === 'Absent' ? 'failed' : 'success'
					} : r));
				} else {
					push(`Lỗi: ${result.message}`, 'error', 3000);
					return;
				}
			} else {
				// Create new attendance record (student was Absent, now Present/Late)
				if (newStatus !== 'Absent' && currentRecord.StudentId) {
					// Get subjectId from subjects array using selectedSubject (code)
					const subjectObj = subjects.find(s => s.code === selectedSubject);
					if (!subjectObj) {
						push('Lỗi: Không tìm thấy thông tin môn học', 'error', 3000);
						return;
					}

					// Pass activeDate as sessionDate to support editing past/future dates
					const result = await adminCreateAttendanceRecord(
						currentRecord.StudentId,
						subjectObj.subjectId, // Use actual subjectId from database
						apiStatus as 'PRESENT' | 'LATE',
						activeDate // Pass the current viewing date (YYYY-MM-DD)
					);

					if (result.success && result.attendanceId) {
						push('Đã tạo bản ghi điểm danh mới', 'success', 3000);
						
						// ✅ CẬP NHẬT cả id và AttendanceId để sync với database
						const newAttendanceId = result.attendanceId;
						setRecords(prev => prev.map(r => r.id === recordId ? {
							...r,
							id: newAttendanceId, // ✅ Update id to match database
							AttendanceId: newAttendanceId, // ✅ Add AttendanceId
							status: newStatus,
							checkInStatus: 'success'
						} : r));
					} else {
						push(`Lỗi: ${result.message}`, 'error', 3000);
						return;
					}
				}
			}

		} catch (error) {
			console.error('Error updating attendance:', error);
			push('Lỗi khi cập nhật điểm danh', 'error', 3000);
		}
	};			// Scroll to top handler for sidebar logo
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
									className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${activeView === 'attendance'
										? 'bg-white text-gray-700 shadow-lg border-2 border-white/30'
										: 'bg-white/10 text-white hover:bg-white/20 hover:shadow-md backdrop-blur-sm'
										}`}
									onClick={() => setActiveView('attendance')}
								>
									<span className="text-lg">📊</span>
									<span>Điểm danh</span>
								</button>
								<button
									className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${activeView === 'history'
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
								<button
									className="px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg flex items-center justify-center gap-2"
									onClick={() => setShowCreateAccountModal(true)}
								>
									<span className="text-lg">➕</span>
									<span>Tạo tài khoản</span>
								</button>
								<button
									className="px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 hover:shadow-lg flex items-center justify-center gap-2"
									onClick={() => setShowResetPasswordModal(true)}
								>
									<span className="text-lg">🔑</span>
									<span>Reset mật khẩu</span>
								</button>

								<button
									className="px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700 hover:shadow-lg flex items-center justify-center gap-2"
									onClick={async () => {
										if (isLoading) return;

										setIsLoading(true);
										push('Đang tải lại dữ liệu...', 'info');

										try {
											const today = new Date().toISOString().split('T')[0];

											// 1. Reload subjects list
											const newSubjects = await fetchSubjects();
											setSubjects(newSubjects);

											// 2. Reload attendance records for current date
											const currentDate = activeDate || today;
											const newAttendance = await fetchAttendanceByDate(currentDate);
											setAttendanceRecords(newAttendance);

											// 3. Reload dashboard sessions for current date
											const newDashboard = await fetchDashboardSessions(currentDate);
											setDashboardSessions(newDashboard);

											// 4. Reload session dates for current subject
											if (selectedSubject && newSubjects.length > 0) {
												const subjectObj = newSubjects.find(s => s.code === selectedSubject);
												if (subjectObj) {
													const dates = await fetchSessionDates(subjectObj.subjectId);
													setSessionDates(dates);

													// 5. Reload subject attendance stats (includes students data)
													const stats = await fetchSubjectAttendanceStats(subjectObj.subjectId);
													setSubjectAttendanceStats(stats);

													// 6. Extract absent students from stats (NO duplicate API call!)
													try {
														const students = stats.students || [];
														const absentStudents = students
															.filter((student: any) => student.absentEquivalent >= 3)
															.map((student: any) => ({
																userId: student.studentId,
																userName: student.studentName,
																days: student.absentEquivalent,
																actualAbsent: student.absentDays,
																lateDays: student.lateDays
															}))
															.sort((a: any, b: any) => b.days - a.days || a.userName.localeCompare(b.userName));

														setAbsentStudentsList(absentStudents);
													} catch (error) {
														console.error('Error processing absent students:', error);
														setAbsentStudentsList([]);
													}
												}
											}

											// 7. Regenerate complete attendance records for current date
											if (selectedSubject && newSubjects.length > 0) {
												const completeRecords = await generateCompleteAttendanceListWithRealData(
													newAttendance,
													newDashboard,
													newSubjects,
													selectedSubject,
													currentDate
												);
												setRecords(completeRecords);
											}

											push('✅ Đã tải lại toàn bộ dữ liệu: môn học, điểm danh, thống kê và ảnh check-in', 'success');
										} catch (error) {
											console.error('Error reloading data:', error);
											push('❌ Lỗi khi tải lại dữ liệu', 'error');
										} finally {
											setIsLoading(false);
										}
									}}
									disabled={isLoading}
								>
									<span className="text-lg">{isLoading ? '⏳' : '🔄'}</span>
									<span>{isLoading ? 'Đang tải...' : 'Reload'}</span>
								</button>
							</div>
						</div>						<div className="flex items-center space-x-4">
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
					<div style={{ textAlign: 'center', padding: '2rem' }}>
						<p>🔄 Đang tải dữ liệu từ database...</p>
						<p>Subjects: {subjects.length} | Attendance: {attendanceRecords.length}</p>
					</div>
				) : (
					<>
						{/* Conditional Layout Based on Active View */}
						{activeView === 'history' ? (
							/* Full width for AdminHistory */
							<div className="admin-full-width">
								<Suspense fallback={
									<div style={{ textAlign: 'center', padding: '2rem' }}>
										<p>⏳ Đang tải lịch sử ảnh...</p>
									</div>
								}>
									<AdminHistory />
								</Suspense>
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
													onClick={() => setSelectedSubject(subject.code)}
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
											<div className="stat-number text-base" style={{ fontSize: '1.1rem' }}>{activeDate || '—'}</div>
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
														onClick={() => setCurrentDayIndex(i => Math.min(totalDays - 1, i + 1))}
														disabled={currentDayIndex >= totalDays - 1}
														aria-label="Ngày cũ hơn"
														title="Xem ngày trước đó"
													>&lt;</button>
													<span className="day-indicator" aria-live="polite">{formatDateDisplay(activeDate)}</span>
													<button
														type="button"
														className="day-nav-btn"
														onClick={() => setCurrentDayIndex(i => Math.max(0, i - 1))}
														disabled={currentDayIndex === 0}
														aria-label="Ngày mới hơn"
														title="Xem ngày sau đó"
													>&gt;</button>
												</span>
											</h3>
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
														<th className="col-present">✅</th>
														<th className="col-late">⏰</th>
														<th className="col-absent">❌</th>
													</tr>
												</thead>
												<tbody>
													{dayRecords.map((r, idx) => {
														return (
															<tr key={r.id} tabIndex={0}>
																<td>{idx + 1}</td>
																<td>{r.userName}</td>
																<td>{r.userId}</td>
																<td>{r.time}</td>
																<td>
																	<span className={`status-badge ${r.status.toLowerCase()}`}>{r.status}</span>
																</td>
																<td className="col-confidence">{r.confidence}</td>
																<td className="col-present">
																	<label className="status-radio-label" title="Present">
																		<input
																			type="radio"
																			name={`status-${r.id}`}
																			value="Present"
																			checked={r.status === 'Present'}
																			onChange={async (e) => {
																				if (!e.target.checked) return;
																				await saveEdit(r.id, 'Present');
																			}}
																			className="radio-present"
																			aria-label="Present"
																		/>
																	</label>
																</td>
																<td className="col-late">
																	<label className="status-radio-label" title="Late">
																		<input
																			type="radio"
																			name={`status-${r.id}`}
																			value="Late"
																			checked={r.status === 'Late'}
																			onChange={async (e) => {
																				if (!e.target.checked) return;
																				await saveEdit(r.id, 'Late');
																			}}
																			className="radio-late"
																			aria-label="Late"
																		/>
																	</label>
																</td>
																<td className="col-absent">
																	<label className="status-radio-label" title="Absent">
																		<input
																			type="radio"
																			name={`status-${r.id}`}
																			value="Absent"
																			checked={r.status === 'Absent'}
																			onChange={async (e) => {
																				if (!e.target.checked) return;
																				await saveEdit(r.id, 'Absent');
																			}}
																			className="radio-absent"
																			aria-label="Absent"
																		/>
																	</label>
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
										<div className="text-xs text-gray-600 mb-2" style={{ fontSize: '0.7rem', lineHeight: '1.2' }}>
											* 2 lần trễ = 1 lần vắng
										</div>
										{absentMoreThan2Days.length === 0 && (
											<div className="text-xs text-gray-500">Không có sinh viên nào.</div>
										)}
										{absentMoreThan2Days.length > 0 && (
											<ul className="absent-list" aria-label="Danh sách sinh viên vắng nhiều ngày">
												{absentMoreThan2Days.map((s: any) => (
													<li key={s.userId} className="absent-item">
														<span className="name">{s.userName}</span>
														<span className="days" title={`Vắng thực: ${s.actualAbsent || s.days}, Trễ: ${s.lateDays || 0}`}>
															{s.days} ngày
														</span>
													</li>
												))}
											</ul>
										)}
									</div>
								</div>
							</div>
						)}
					</>
				)}

				{/* Floating Back to Top Button */}
				<div
					className="floating-back-to-top"
					role="button"
					tabIndex={0}
					aria-label="Lên đầu trang"
					onClick={scrollToTop}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							scrollToTop();
						}
					}}
				>
					<img src="/Logo_EIU.png" alt="EIU Logo" className="eiu-logo-img" />
				</div>
			</div>

			{/* Students List Modal */}
			{showStudentsList && (
				<Suspense fallback={<div className="loading-overlay">⏳ Đang tải...</div>}>
					<StudentsList
						isOpen={showStudentsList}
						onClose={() => setShowStudentsList(false)}
						selectedSubject={selectedSubject}
						subjects={subjects}
						onSubjectChange={setSelectedSubject}
					/>
				</Suspense>
			)}

			{/* Create Account Modal */}
			{showCreateAccountModal && (
				<Suspense fallback={<div className="loading-overlay">⏳ Đang tải...</div>}>
					<CreateAccountModal
						isOpen={showCreateAccountModal}
						onClose={() => setShowCreateAccountModal(false)}
						onCreateAccount={adminCreateStudentAccount}
						subjects={subjects}
					/>
				</Suspense>
			)}

			{/* Reset Password Modal */}
			{showResetPasswordModal && (
				<Suspense fallback={<div className="loading-overlay">⏳ Đang tải...</div>}>
					<ResetPasswordModal
						isOpen={showResetPasswordModal}
						onClose={() => setShowResetPasswordModal(false)}
						onResetPassword={adminResetStudentPassword}
					/>
				</Suspense>
			)}
		</div>
	);
};

export default AdminScreen;

