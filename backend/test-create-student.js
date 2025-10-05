// Test script để kiểm tra API tạo tài khoản
const fetch = require('node-fetch');

async function testCreateStudent() {
    try {
        console.log('🔍 Testing create student API...');
        
        // Bước 1: Login với admin account
        console.log('📝 Step 1: Login as admin...');
        const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: 'admin', // Thay bằng admin ID thực tế
                password: 'admin123' // Thay bằng admin password thực tế
            })
        });
        
        console.log('Login status:', loginResponse.status);
        const loginResult = await loginResponse.json();
        console.log('Login result:', JSON.stringify(loginResult, null, 2));
        
        if (!loginResult.success) {
            console.log('❌ Login failed, cannot test create student');
            return;
        }
        
        const token = loginResult.token;
        console.log('✅ Login successful, token:', token ? 'Present' : 'Missing');
        
        // Bước 2: Test create student
        console.log('\n📝 Step 2: Create student account...');
        const createResponse = await fetch('http://localhost:3001/api/auth/admin/create-student', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                studentId: 'TEST001',
                name: 'Test Student',
                password: 'Test123456',
                subjectIds: []
            })
        });
        
        console.log('Create student status:', createResponse.status);
        const createResult = await createResponse.json();
        console.log('Create result:', JSON.stringify(createResult, null, 2));
        
    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

testCreateStudent();