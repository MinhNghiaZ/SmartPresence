import React, { useState, useEffect, useMemo } from 'react';
import './StudentsList.css';

interface StudentStats {
  studentId: string;
  studentName: string;
  email: string;
  totalSessions: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  attendanceRate: number;
}

interface Subject {
  subjectId: string;
  name: string;
  code: string;
}

interface StudentsListProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSubject: string;
  subjects: Subject[]; // Danh sách tất cả môn học
  onSubjectChange: (subjectCode: string) => void;
}

const StudentsList: React.FC<StudentsListProps> = ({ 
  isOpen, 
  onClose, 
  selectedSubject, 
  subjects = [],
  onSubjectChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSubject, setCurrentSubject] = useState(selectedSubject);
  const [studentsStats, setStudentsStats] = useState<StudentStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingFaceId, setDeletingFaceId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'id' | 'rate'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showScrollHint, setShowScrollHint] = useState(false);

  // Update local subject khi selectedSubject thay đổi từ bên ngoài
  useEffect(() => {
    setCurrentSubject(selectedSubject);
  }, [selectedSubject]);

  // Lock body scroll when modal is open (for mobile)
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      // Prevent scroll on iOS
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // Show scroll hint on mobile when table is loaded
  useEffect(() => {
    if (isOpen && studentsStats.length > 0 && window.innerWidth <= 768) {
      setShowScrollHint(true);
      const timer = setTimeout(() => {
        setShowScrollHint(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, studentsStats]);

  // Function để xóa face embedding của sinh viên
  const deleteFaceEmbedding = async (studentId: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa thông tin khuôn mặt của sinh viên ${studentId}?`)) {
      return;
    }

    try {
      setDeletingFaceId(studentId);
      
      // Get admin info from localStorage
      const adminInfo = localStorage.getItem('user');
      let adminId = 'admin'; // default fallback
      
      if (adminInfo) {
        try {
          const parsedAdmin = JSON.parse(adminInfo);
          adminId = parsedAdmin.id || parsedAdmin.studentId || adminId;
        } catch (e) {
          console.warn('Could not parse admin info, using default adminId');
        }
      }
      
      const response = await fetch(`/api/face/delete-embedding/${studentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          adminId: adminId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Đã xóa thông tin khuôn mặt thành công!');
      } else {
        throw new Error(data.message || 'Không thể xóa thông tin khuôn mặt');
      }
    } catch (error) {
      console.error('Error deleting face embedding:', error);
      alert(`❌ Lỗi: ${error instanceof Error ? error.message : 'Có lỗi xảy ra'}`);
    } finally {
      setDeletingFaceId(null);
    }
  };

  // Function để fetch attendance stats cho một môn học
  const fetchSubjectAttendanceStats = async (subjectCode: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Tìm subjectId từ subjectCode
      const subject = subjects.find(s => s.code === subjectCode);
      if (!subject) {
        throw new Error(`Không tìm thấy môn học: ${subjectCode}`);
      }
      
      const response = await fetch(`/api/attendance/subject/${subject.subjectId}/students-stats`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Không thể tải dữ liệu');
      }
      
      setStudentsStats(data.students || []);
    } catch (error) {
      console.error('Error fetching subject attendance stats:', error);
      setError(error instanceof Error ? error.message : 'Có lỗi xảy ra');
      setStudentsStats([]);
    } finally {
      setLoading(false);
    }
  };

  // Load dữ liệu khi modal mở hoặc chuyển môn học
  useEffect(() => {
    if (isOpen && currentSubject && subjects.length > 0) {
      fetchSubjectAttendanceStats(currentSubject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentSubject]); // Removed 'subjects' dependency to prevent unnecessary re-fetches

  // Lọc sinh viên theo tìm kiếm
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return studentsStats;
    
    const searchLower = searchTerm.toLowerCase();
    return studentsStats.filter(student => 
      student.studentName.toLowerCase().includes(searchLower) ||
      student.studentId.toLowerCase().includes(searchLower)
    );
  }, [studentsStats, searchTerm]);

  // Helper function to extract Vietnamese given name (last word)
  // Example: "Nguyễn Văn Anh" → "Anh", "Trần Thị Bình" → "Bình"
  const extractGivenName = (fullName: string): string => {
    const parts = fullName.trim().split(/\s+/);
    return parts[parts.length - 1] || fullName;
  };

  // Sort students
  const sortedStudents = useMemo(() => {
    const sorted = [...filteredStudents];
    
    sorted.sort((a, b) => {
      let compareResult = 0;
      
      if (sortBy === 'name') {
        // Sort by given name (TÊN - last word), then full name, then MSSV
        const givenNameA = extractGivenName(a.studentName);
        const givenNameB = extractGivenName(b.studentName);
        
        compareResult = givenNameA.localeCompare(givenNameB, 'vi', { sensitivity: 'base' });
        if (compareResult === 0) {
          compareResult = a.studentName.localeCompare(b.studentName, 'vi', { sensitivity: 'base' });
        }
        if (compareResult === 0) {
          compareResult = a.studentId.localeCompare(b.studentId);
        }
      } else if (sortBy === 'id') {
        compareResult = a.studentId.localeCompare(b.studentId);
      } else if (sortBy === 'rate') {
        compareResult = a.attendanceRate - b.attendanceRate;
      }
      
      return sortOrder === 'asc' ? compareResult : -compareResult;
    });
    
    return sorted;
  }, [filteredStudents, sortBy, sortOrder]);

  // Handle sort column click
  const handleSort = (column: 'name' | 'id' | 'rate') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Reset search khi đóng modal hoặc đổi môn
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setCurrentSubject(selectedSubject);
      setSortBy('name');
      setSortOrder('asc');
    }
  }, [isOpen, selectedSubject]);

  // Handler để chuyển đổi môn học
  const handleSubjectChange = (subjectCode: string) => {
    setCurrentSubject(subjectCode);
    setSearchTerm(''); // Reset search khi chuyển môn
    onSubjectChange && onSubjectChange(subjectCode); // Notify parent component
  };

  if (!isOpen) return null;

  return (
    <div className="students-list-overlay" onClick={onClose}>
      <div className="students-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="students-list-header">
          <div className="header-title">
            <h2>👥 Danh sách sinh viên - {currentSubject}</h2>
            <p>Tổng {studentsStats.length} sinh viên • Môn {currentSubject}</p>
            {loading && <p className="students-loading-text">🔄 Đang tải dữ liệu...</p>}
            {error && <p className="students-error-text">❌ {error}</p>}
          </div>
          
          {/* Subject Selector */}
          <div className="subject-selector">
            <label className="subject-label">Chọn môn:</label>
            <select 
              value={currentSubject} 
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="subject-select"
            >
              {subjects.map(subject => (
                <option key={subject.subjectId} value={subject.code}>
                  {subject.code}
                </option>
              ))}
            </select>
          </div>
          
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="students-list-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc MSSV..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
          <div className="results-count">
            {sortedStudents.length} / {studentsStats.length} sinh viên
          </div>
        </div>

        <div className={`students-table-container ${showScrollHint ? 'show-hint' : ''}`}>
          <table className="students-table">
            <thead>
              <tr>
                <th className="text-center">#</th>
                <th 
                  className="sortable text-center"
                  onClick={() => handleSort('id')}
                >
                  MSSV {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="sortable text-center"
                  onClick={() => handleSort('name')}
                >
                  Họ tên {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-center">Tổng ngày</th>
                <th className="text-center">Có mặt</th>
                <th className="text-center">Trễ</th>
                <th className="text-center">Vắng</th>
                <th 
                  className="sortable text-center"
                  onClick={() => handleSort('rate')}
                >
                  Tỷ lệ (%) {sortBy === 'rate' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-center">Reset faceId</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="loading-data text-center">
                    🔄 Đang tải dữ liệu...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="error-data text-center">
                    ❌ {error}
                  </td>
                </tr>
              ) : sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="no-data text-center">
                    {searchTerm ? 'Không tìm thấy sinh viên nào' : 'Không có dữ liệu'}
                  </td>
                </tr>
              ) : (
                sortedStudents.map((student, index) => (
                  <tr key={student.studentId} className="student-row">
                    <td className="text-center">{index + 1}</td>
                    <td className="student-id text-center">{student.studentId}</td>
                    <td className="student-name text-center">{student.studentName}</td>
                    <td className="text-center">{student.totalSessions}</td>
                    <td className="present-count text-center">{student.presentDays}</td>
                    <td className="late-count text-center">{student.lateDays}</td>
                    <td className="absent-count text-center">{student.absentDays}</td>
                    <td className={`attendance-rate text-center ${getAttendanceRateClass(student.attendanceRate)}`}>
                      {student.attendanceRate}%
                    </td>
                    <td className="text-center">
                      <button 
                        onClick={() => deleteFaceEmbedding(student.studentId)}
                        disabled={deletingFaceId === student.studentId}
                        className={`delete-face-btn ${deletingFaceId === student.studentId ? 'deleting' : ''}`}
                        title="Xóa dữ liệu nhận diện khuôn mặt"
                      >
                        {deletingFaceId === student.studentId ? '⏳' : '🗑️'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="students-list-footer">
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">Tổng sinh viên:</span>
              <span className="stat-value">{studentsStats.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Tỷ lệ điểm danh trung bình:</span>
              <span className="stat-value">
                {studentsStats.length > 0 
                  ? Math.round(studentsStats.reduce((sum, s) => sum + s.attendanceRate, 0) / studentsStats.length)
                  : 0
                }%
              </span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function để xác định class CSS cho tỷ lệ điểm danh
const getAttendanceRateClass = (rate: number): string => {
  if (rate >= 90) return 'excellent';
  if (rate >= 75) return 'good';
  if (rate >= 60) return 'average';
  return 'poor';
};

export default StudentsList;