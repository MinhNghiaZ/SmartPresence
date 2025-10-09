export interface User {
    id: string; // MSSV (22312000xx, 22312000yy, ...)
    name: string;
    email: string;
    password: string;
    registeredSubjects: string[]; // Mã môn học đã đăng ký ['CSE 107', 'CSE 201']
    cohort: string; // Khóa học (23, 24, 25)
    phone: string;
    avatar?: string;
    userType?: 'student' | 'admin';
}

export interface LoginRequest {
    userId: string;
    password: string;
}

export interface LoginResult {
    success: boolean;
    message: string;
    User?: Omit<User, 'password'>;
    token?: string;
}

