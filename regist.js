        let isLoading = false;
        const API_URL = "https://script.google.com/macros/s/AKfycbxXekWmewemj9UWCGJ_3v2bjTE9DfjI5Wwmi_FAt1CPcaau-WMB_bG2fdStdxM35_xq/exec";
        window.onload = initializeLIFF;
        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
            setTimeout(() => errorDiv.classList.add('hidden'), 3000);
        }

        function displayEmployeeDetails(data) {
            const detailsDiv = document.getElementById('employeeDetails');
            detailsDiv.innerHTML = `
                <div class="space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">ชื่อพนักงาน</label>
                    <input type="text" value="${data.name} ${data.lastName}" 
                        class="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50" disabled>
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">ตำแหน่ง</label>
                    <input type="text" value="${data.position}" 
                        class="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50" disabled>
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-semibold text-gray-700">โรงงาน</label>
                    <input type="text" value="${data.factory}" 
                        class="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50" disabled>
                </div>
                <button type="button" onclick="submitRegistration()" id="submitButton" 
                    class="w-full px-6 py-3.5 btn-primary text-white text-base font-medium rounded-xl shadow-lg pulse">
                    ลงทะเบียน
                </button>
            `;

            detailsDiv.classList.remove('hidden');
            document.getElementById('employeeId').disabled = true;
            document.getElementById('verifyButton').style.display = 'none';
        }

 async function verifyEmployee() {
    if (isLoading) return;

    const employeeId = document.getElementById('employeeId').value;
    const verifyButton = document.getElementById('verifyButton');

    if (!employeeId) {
        showError('กรุณากรอกรหัสพนักงาน');
        return;
    }

    isLoading = true;
    verifyButton.disabled = true;
    verifyButton.innerHTML = '<div class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full inline-block mr-2"></div>กำลังตรวจสอบ';

    try {
        const response = await fetch(`${API_URL}?action=verify&empId=${employeeId}`);
        const result = await response.json();

        if (result.found) {
            if (result.alreadyRegistered) {
                showError('รหัสพนักงานนี้ได้ลงทะเบียนไว้แล้ว');
                return;
            }
            displayEmployeeDetails(result.data);
        } else {
            showError('ไม่พบข้อมูลพนักงาน');
        }
    } catch (error) {
        showError('เกิดข้อผิดพลาดในการตรวจสอบ');
    } finally {
        isLoading = false;
        verifyButton.disabled = false;
        verifyButton.innerHTML = '<span>ตรวจสอบ</span>';
    }
}

async function submitRegistration() {
    if (!liff.isLoggedIn()) {
        showError('กรุณาเข้าสู่ระบบ LINE');
        return;
    }

    const submitButton = document.getElementById('submitButton');
    const employeeId = document.getElementById('employeeId').value;
    
    submitButton.disabled = true;
    submitButton.innerHTML = '<div class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full inline-block mr-2"></div>กำลังลงทะเบียน';

    try {
        const profile = await liff.getProfile();
        const response = await fetch(`${API_URL}?action=register&empId=${employeeId}&uid=${profile.userId}`);
        const result = await response.json();

        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'ลงทะเบียนสำเร็จ!',
                text: 'ระบบกำลังปิดหน้าต่าง...',
                showConfirmButton: false,
                timer: 2000
            }).then(() => {
                liff.closeWindow();
            });
        } else {
            if (result.error === "UID_ALREADY_REGISTERED") {
                showError('คุณได้ลงทะเบียนไว้แล้ว');
            } else if (result.error === "EMPLOYEE_ALREADY_REGISTERED") {
                showError('รหัสพนักงานนี้ได้ลงทะเบียนไว้แล้ว');
            } else {
                showError('เกิดข้อผิดพลาดในการลงทะเบียน');
            }
        }
    } catch (error) {
        showError('เกิดข้อผิดพลาดในการลงทะเบียน');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'ลงทะเบียน';
    }
}


// แก้ไขฟังก์ชัน initializeLIFF
async function initializeLIFF() {
    try {
        await liff.init({ liffId: "2006809014-zqJWBVbA" });
        if (!liff.isLoggedIn()) {
            liff.login();
        } else {
            await checkUserRegistration();
        }
    } catch (err) {
        showError('ไม่สามารถเชื่อมต่อกับ LINE ได้');
    }
}
        // เพิ่มฟังก์ชันตรวจสอบ UID ตอนโหลดหน้า
async function checkUserRegistration() {
    try {
        const profile = await liff.getProfile();
        const response = await fetch(`${API_URL}?action=check_registration&uid=${profile.userId}`);
        const result = await response.json();

        if (result.registered) {
            Swal.fire({
                icon: 'warning',
                title: 'คุณได้ลงทะเบียนไว้แล้ว',
                text: 'ระบบกำลังปิดหน้าต่าง...',
                showConfirmButton: false,
                timer: 2000
            }).then(() => {
                liff.closeWindow();
            });
        }
    } catch (error) {
        showError('เกิดข้อผิดพลาดในการตรวจสอบสถานะ');
    }
}
