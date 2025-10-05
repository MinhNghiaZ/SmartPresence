// Test script để kiểm tra logic tạo tài khoản
const axios = require('axios');

async function testCreateAccount() {
    try {
        console.log('🧪 Testing create account logic...\n');

        // 1. Login as admin first
        console.log('1. Logging in as admin...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            userId: 'admin', // Thay đổi theo admin ID thực tế
            password: 'admin123' // Thay đổi theo password admin thực tế
        });

        if (!loginResponse.data.success) {
            console.error('❌ Admin login failed:', loginResponse.data.message);
            return;
        }

        const adminToken = loginResponse.data.token;
        console.log('✅ Admin login successful');

        // 2. Test create student account
        console.log('\n2. Creating test student account...');
        const createResponse = await axios.post(
            'http://localhost:5000/api/auth/admin/create-student',
            {
                studentId: 'TEST001',
                name: 'Nguyen Van Test',
                password: 'Test123A',
                subjectIds: [] // Empty array for now
            },
            {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('📋 Create account response:', createResponse.data);

        if (createResponse.data.success) {
            console.log('✅ Account created successfully!');
            
            // 3. Test login with new account
            console.log('\n3. Testing login with new account...');
            const testLoginResponse = await axios.post('http://localhost:5000/api/auth/login', {
                userId: 'TEST001',
                password: 'Test123A'
            });

            console.log('📋 Test login response:', testLoginResponse.data);
            
            if (testLoginResponse.data.success) {
                console.log('✅ New account login successful!');
            } else {
                console.log('❌ New account login failed:', testLoginResponse.data.message);
            }
        } else {
            console.log('❌ Account creation failed:', createResponse.data.message);
        }

    } catch (error) {
        console.error('🚨 Test error:', error.response?.data || error.message);
    }
}

// Chạy test
testCreateAccount();