// AuthService.ts - Quản lý xác thực và thông tin sinh viên

export interface Student {
  id: string; // MSSV (SV001, SV002, ...)
  name: string;
  email: string;
  password: string;
  registeredSubjects: string[]; // Mã môn học đã đăng ký ['CSE 107', 'CSE 201']
  cohort: string; // Khóa học (23, 24, 25)
  phone: string;
  avatar?: string;
}

export interface LoginResult {
  success: boolean;
  message: string;
  student?: Student;
}

// Mock data 30 sinh viên
const MOCK_STUDENTS: Student[] = [
  // Học cả 2 môn (10 sinh viên)
  {
    id: "SV001",
    name: "Nguyễn Văn An",
    email: "nguyenvanan@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 107", "CSE 201"],
    cohort: "23",
    phone: "0901234567"
  },
  {
    id: "SV002", 
    name: "Trần Thị Bình",
    email: "tranthibinh@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 107", "CSE 201"],
    cohort: "24",
    phone: "0901234568"
  },
  {
    id: "SV003",
    name: "Lê Hoàng Cường",
    email: "lehoangcuong@eiu.edu.vn", 
    password: "1",
    registeredSubjects: ["CSE 107", "CSE 201"],
    cohort: "25",
    phone: "0901234569"
  },
  {
    id: "SV004",
    name: "Phạm Thị Dung",
    email: "phamthidung@eiu.edu.vn",
    password: "1", 
    registeredSubjects: ["CSE 107", "CSE 201"],
    cohort: "23",
    phone: "0901234570"
  },
  {
    id: "SV005",
    name: "Hoàng Văn Em",
    email: "hoangvanem@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 107", "CSE 201"],
    cohort: "24",
    phone: "0901234571"
  },
  {
    id: "SV006",
    name: "Đặng Thị Phương",
    email: "dangthiphuong@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 107", "CSE 201"], 
    cohort: "25",
    phone: "0901234572"
  },
  {
    id: "SV007",
    name: "Vũ Minh Giang",
    email: "vuminhgiang@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 107", "CSE 201"],
    cohort: "23", 
    phone: "0901234573"
  },
  {
    id: "SV008",
    name: "Bùi Thị Hoa",
    email: "buithihoa@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 107", "CSE 201"],
    cohort: "24",
    phone: "0901234574"
  },
  {
    id: "SV009", 
    name: "Đinh Văn Inh",
    email: "dinhvaninh@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 107", "CSE 201"],
    cohort: "25",
    phone: "0901234575"
  },
  {
    id: "SV010",
    name: "Ngô Thị Kiều",
    email: "ngothikieu@eiu.edu.vn",
    password: "1", 
    registeredSubjects: ["CSE 107", "CSE 201"],
    cohort: "23",
    phone: "0901234576"
  },

  // Chỉ học CSE 107 (10 sinh viên)
  {
    id: "SV011",
    name: "Lý Văn Long",
    email: "lyvanlong@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 107"],
    cohort: "24",
    phone: "0901234577"
  },
  {
    id: "SV012",
    name: "Cao Thị Mai",
    email: "caothimai@eiu.edu.vn", 
    password: "1",
    registeredSubjects: ["CSE 107"],
    cohort: "25",
    phone: "0901234578"
  },
  {
    id: "SV013",
    name: "Đỗ Minh Nam",
    email: "dominhnam@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 107"],
    cohort: "23",
    phone: "0901234579"
  },
  {
    id: "SV014",
    name: "Võ Thị Oanh", 
    email: "vothioanh@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 107"],
    cohort: "24",
    phone: "0901234580"
  },
  {
    id: "SV015",
    name: "Trịnh Văn Phú",
    email: "trinhvanphu@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 107"],
    cohort: "25",
    phone: "0901234581"
  },
  {
    id: "SV016",
    name: "Lại Thị Quỳnh",
    email: "laithiquynh@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 107"],
    cohort: "23", 
    phone: "0901234582"
  },
  {
    id: "SV017",
    name: "Phan Văn Rùa",
    email: "phanvanrua@eiu.edu.vn", 
    password: "1",
    registeredSubjects: ["CSE 107"],
    cohort: "24",
    phone: "0901234583"
  },
  {
    id: "SV018",
    name: "Hồ Thị Sương",
    email: "hothisuong@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 107"],
    cohort: "25",
    phone: "0901234584"
  },
  {
    id: "SV019",
    name: "Dương Văn Tài",
    email: "duongvantai@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 107"],
    cohort: "23",
    phone: "0901234585"
  },
  {
    id: "SV020",
    name: "Chu Thị Uyên",
    email: "chuthiuyen@eiu.edu.vn", 
    password: "1",
    registeredSubjects: ["CSE 107"],
    cohort: "24",
    phone: "0901234586"
  },

  // Chỉ học CSE 201 (10 sinh viên)
  {
    id: "SV021",
    name: "Kiều Văn Vinh",
    email: "kieuvanvinh@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 201"],
    cohort: "25",
    phone: "0901234587"
  },
  {
    id: "SV022",
    name: "Tô Thị Xuân",
    email: "tothixuan@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 201"],
    cohort: "23", 
    phone: "0901234588"
  },
  {
    id: "SV023",
    name: "Lương Văn Yên",
    email: "luongvanyen@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 201"],
    cohort: "24",
    phone: "0901234589"
  },
  {
    id: "SV024", 
    name: "Mai Thị Zưa",
    email: "maithizua@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 201"],
    cohort: "25",
    phone: "0901234590"
  },
  {
    id: "SV025",
    name: "Hà Văn Anh",
    email: "havananh@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 201"],
    cohort: "23",
    phone: "0901234591"
  },
  {
    id: "SV026",
    name: "Nguyễn Thị Bích",
    email: "nguyenthibich@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 201"],
    cohort: "24",
    phone: "0901234592"
  },
  {
    id: "SV027",
    name: "Trần Văn Chí", 
    email: "tranvanchi@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 201"],
    cohort: "25",
    phone: "0901234593"
  },
  {
    id: "SV028",
    name: "Lê Thị Duyên",
    email: "lethiduyen@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 201"],
    cohort: "23",
    phone: "0901234594"
  },
  {
    id: "SV029",
    name: "Phạm Văn Ễn",
    email: "phamvanen@eiu.edu.vn",
    password: "1", 
    registeredSubjects: ["CSE 201"],
    cohort: "24",
    phone: "0901234595"
  },
  {
    id: "SV030",
    name: "Hoàng Thị Phương",
    email: "hoangthiphuong@eiu.edu.vn",
    password: "1",
    registeredSubjects: ["CSE 201"],
    cohort: "25",
    phone: "0901234596"
  }
];

export class AuthService {
  private static currentStudent: Student | null = null;

  /**
   * Đăng nhập với MSSV và mật khẩu
   */
  static async login(studentId: string, password: string): Promise<LoginResult> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Tìm sinh viên theo ID
      const student = MOCK_STUDENTS.find(s => s.id === studentId);

      if (!student) {
        return {
          success: false,
          message: "Mã số sinh viên không tồn tại!"
        };
      }

      if (student.password !== password) {
        return {
          success: false,
          message: "Mật khẩu không chính xác!"
        };
      }

      // Lưu session chỉ trong memory (không localStorage)
      this.currentStudent = student;
      // Không lưu vào localStorage nữa để app luôn yêu cầu đăng nhập lại

      return {
        success: true,
        message: `Chào mừng ${student.name}!`,
        student: student
      };

    } catch (error) {
      return {
        success: false,
        message: "Lỗi hệ thống. Vui lòng thử lại!"
      };
    }
  }

  /**
   * Đăng xuất
   */
  static logout(): void {
    this.currentStudent = null;
    localStorage.removeItem('currentStudent');
  }

  /**
   * Lấy thông tin sinh viên hiện tại
   */
  static getCurrentStudent(): Student | null {
    // Chỉ trả về currentStudent từ memory, không load từ localStorage
    return this.currentStudent;
  }

  /**
   * Kiểm tra xem có sinh viên đăng nhập không
   */
  static isLoggedIn(): boolean {
    return this.getCurrentStudent() !== null;
  }

  /**
   * Lấy danh sách môn học mà sinh viên đã đăng ký
   */
  static getStudentRegisteredSubjects(): string[] {
    const student = this.getCurrentStudent();
    return student ? student.registeredSubjects : [];
  }

  /**
   * Kiểm tra xem sinh viên có đăng ký môn học cụ thể không
   */
  static isStudentRegisteredForSubject(subjectCode: string): boolean {
    const registeredSubjects = this.getStudentRegisteredSubjects();
    return registeredSubjects.includes(subjectCode);
  }

  /**
   * Lấy danh sách tất cả sinh viên (for admin/debug)
   */
  static getAllStudents(): Student[] {
    return MOCK_STUDENTS;
  }

  /**
   * Tìm sinh viên theo ID
   */
  static getStudentById(studentId: string): Student | undefined {
    return MOCK_STUDENTS.find(s => s.id === studentId);
  }
}

// Export singleton instance
export const authService = AuthService;