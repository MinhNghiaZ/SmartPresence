import React, { useState, useEffect, useMemo } from 'react';
import './StudentsList.css';

interface StudentStats {
  studentId: string;
  studentName: string;
  totalDays: number;
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
  subjectRecords: any[]; // DemoRecord[]
  subjects: Subject[]; // Danh sách tất cả môn học
  allRecords: any[]; // Tất cả records để tính toán cho môn khác
  onSubjectChange: (subjectCode: string) => void;
}

const StudentsList: React.FC<StudentsListProps> = ({ 
  isOpen, 
  onClose, 
  selectedSubject, 
  subjectRecords,
  subjects = [],
  allRecords = [],
  onSubjectChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSubject, setCurrentSubject] = useState(selectedSubject);

  // Update local subject khi selectedSubject thay đổi từ bên ngoài
  useEffect(() => {
    setCurrentSubject(selectedSubject);
  }, [selectedSubject]);

  // Function để lấy records theo môn học
  const getRecordsForSubject = (subjectCode: string) => {
    return allRecords.filter(record => record.subject === subjectCode);
  };

  // Records hiện tại dựa trên currentSubject
  const currentRecords = currentSubject === selectedSubject 
    ? subjectRecords 
    : getRecordsForSubject(currentSubject);

  // Tính toán thống kê cho từng sinh viên
  const studentsStats = useMemo(() => {
    const statsMap = new Map<string, StudentStats>();
    
    currentRecords.forEach(record => {
      const { userId: studentId, userName: studentName, status } = record;
      
      if (!statsMap.has(studentId)) {
        statsMap.set(studentId, {
          studentId,
          studentName,
          totalDays: 0,
          presentDays: 0,
          lateDays: 0,
          absentDays: 0,
          attendanceRate: 0
        });
      }
      
      const stats = statsMap.get(studentId)!;
      stats.totalDays++;
      
      switch (status) {
        case 'Present':
          stats.presentDays++;
          break;
        case 'Late':
          stats.lateDays++;
          break;
        case 'Absent':
          stats.absentDays++;
          break;
      }
      
      // Tính tỷ lệ điểm danh (Present + Late) / Total
      stats.attendanceRate = Math.round(((stats.presentDays + stats.lateDays) / stats.totalDays) * 100);
    });
    
    return Array.from(statsMap.values()).sort((a, b) => 
      a.studentName.localeCompare(b.studentName)
    );
  }, [currentRecords]);

  // Lọc sinh viên theo tìm kiếm
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return studentsStats;
    
    const searchLower = searchTerm.toLowerCase();
    return studentsStats.filter(student => 
      student.studentName.toLowerCase().includes(searchLower) ||
      student.studentId.toLowerCase().includes(searchLower)
    );
  }, [studentsStats, searchTerm]);

  // Reset search khi đóng modal hoặc đổi môn
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setCurrentSubject(selectedSubject);
    }
  }, [isOpen, selectedSubject]);

  // Handler để chuyển đổi môn học
  const handleSubjectChange = (subjectCode: string) => {
    setCurrentSubject(subjectCode);
    setSearchTerm(''); // Reset search khi chuyển môn
  };

  if (!isOpen) return null;

  return (
    <div className="students-list-overlay" onClick={onClose}>
      <div className="students-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="students-list-header">
          <div className="header-title">
            <h2>👥 Danh sách sinh viên - {currentSubject}</h2>
            <p>Tổng {studentsStats.length} sinh viên • Môn {currentSubject}</p>
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
            {filteredStudents.length} / {studentsStats.length} sinh viên
          </div>
        </div>

        <div className="students-table-container">
          <table className="students-table">
            <thead>
              <tr>
                <th>#</th>
                <th>MSSV</th>
                <th>Họ tên</th>
                <th>Tổng ngày</th>
                <th>Có mặt</th>
                <th>Trễ</th>
                <th>Vắng</th>
                <th>Tỷ lệ (%)</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="no-data">
                    {searchTerm ? 'Không tìm thấy sinh viên nào' : 'Không có dữ liệu'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => (
                  <tr key={student.studentId} className="student-row">
                    <td>{index + 1}</td>
                    <td className="student-id">{student.studentId}</td>
                    <td className="student-name">{student.studentName}</td>
                    <td>{student.totalDays}</td>
                    <td className="present-count">{student.presentDays}</td>
                    <td className="late-count">{student.lateDays}</td>
                    <td className="absent-count">{student.absentDays}</td>
                    <td className={`attendance-rate ${getAttendanceRateClass(student.attendanceRate)}`}>
                      {student.attendanceRate}%
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