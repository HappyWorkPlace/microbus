// ฟังก์ชันสร้าง Job_No
function generateJobNo(empNo) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // Format: EMPNo + YYYYMMDD + HHMMSS
    return `${empNo}${year}${month}${day}${hours}${minutes}${seconds}`;
}

// ฟังก์ชัน Check-in/Check-out
async function checkIn() {
    const shift = document.getElementById('shift').value;
    const isCheckout = document.querySelector('.checkin-button').classList.contains('checkout-button');
    
    // ตรวจสอบว่าเลือกกะหรือยัง (เฉพาะตอน Check-in)
    if (!isCheckout && !shift) {
        await Swal.fire({
            title: 'กรุณาเลือกกะการทำงาน',
            icon: 'warning',
            confirmButtonText: 'ตกลง'
        });
        return;
    }

    // ข้อความที่จะแสดงใน Swal ขึ้นอยู่กับว่าเป็น Check-in หรือ Check-out
    const confirmText = isCheckout ? 
        'ยืนยันการ Check-out?' : 
        `ยืนยันการ Check-in กะ ${shift}?`;

    // แสดง Swal เพื่อให้ยืนยัน
    const result = await Swal.fire({
        title: confirmText,
        html: `
            <p>พิกัด: (${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)})</p>
            <p>${document.querySelector('.location-details').textContent}</p>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#00B8D9',
        cancelButtonColor: '#FF6B6B'
    });

    // ถ้ากดยืนยัน
    if (result.isConfirmed) {
        try {
            showLoading();
            const uid = liff.getContext().userId;
            const empNo = document.querySelector('.user-id').textContent.split(' ')[0];
            const jobNo = generateJobNo(empNo);

            // TODO: ส่งข้อมูลไป Google Sheets
            
            await Swal.fire({
                title: isCheckout ? 'Check-out สำเร็จ' : 'Check-in สำเร็จ',
                text: `Job No: ${jobNo}`,
                icon: 'success',
                confirmButtonText: 'ตกลง'
            });

            if (!isCheckout) {
                // อัพเดท UI เป็นโหมด Check-out
                const checkButton = document.querySelector('.checkin-button');
                checkButton.textContent = 'Check Out';
                checkButton.classList.add('checkout-button');
                document.getElementById('shift').disabled = true;
                
                // อัพเดทเวลา Check-in
                const now = new Date();
                const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                document.querySelector('.info-item:first-child .value').textContent = timeStr;
            } else {
                // รีเฟรชหน้าหลังจาก Check-out
                location.reload();
            }
        } catch (error) {
            console.error('Error during check-in/out:', error);
            await Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'กรุณาลองใหม่อีกครั้ง',
                icon: 'error',
                confirmButtonText: 'ตกลง'
            });
        } finally {
            hideLoading();
        }
    }
}
