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

// ฟังก์ชันสำหรับฟอร์แมตเวลาเป็น YYYY-MM-DD,HH:mm:ss
function formatTimestamp(dateString) {
    const date = new Date(dateString || new Date());
    
    // แปลงเป็น timezone ของประเทศไทย (UTC+7)
    const bangkokDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    
    const year = bangkokDate.getUTCFullYear();
    const month = String(bangkokDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(bangkokDate.getUTCDate()).padStart(2, '0');
    const hours = String(bangkokDate.getUTCHours()).padStart(2, '0');
    const minutes = String(bangkokDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(bangkokDate.getUTCSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day},${hours}:${minutes}:${seconds}`;
}

// ฟังก์ชันสำหรับบันทึกข้อมูล Check-in
async function recordStart(uid, jobNo, shift, lat, lng, nearPlace) {
    const data = {
        action: 'record_start',
        uid: uid,
        job_no: jobNo,
        day_type: '', // เว้นว่างให้หลังบ้านจัดการ
        shift: shift,
        start_datetime: formatTimestamp(new Date()),
        location: `https://www.google.com/maps?q=${lat},${lng}`,
        near_place: nearPlace
    };

    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(data)
    });

    return response.json();
}

// ฟังก์ชันสำหรับบันทึกข้อมูล Check-out
async function recordFinish(uid, jobNo, lat, lng, nearPlace) {
    if (!jobNo) {
        throw new Error('Missing job number for check-out');
    }
    
    const data = {
        action: 'record_finish',
        uid: uid,
        job_no: jobNo,
        end_datetime: formatTimestamp(new Date()),
        location: `https://www.google.com/maps?q=${lat},${lng}`,
        near_place: nearPlace
    };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Record finish error:', error);
        throw error;
    }
}

// ปรับปรุงฟังก์ชัน checkIn
async function checkIn() {
    // Get current state
    const shift = document.getElementById('shift').value;
    const checkButton = document.querySelector('.checkin-button');
    const isCheckout = checkButton.classList.contains('checkout-button');
    
    // Validate shift selection for check-in
    if (!isCheckout && !shift) {
        await Swal.fire({
            title: 'กรุณาเลือกกะการทำงาน',
            icon: 'warning',
            confirmButtonText: 'ตกลง'
        });
        return;
    }

    // Show confirmation dialog
    const confirmText = isCheckout ? 
        'ยืนยันการ Check-out?' : 
        `ยืนยันการ Check-in กะ ${shift}?`;

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

    if (result.isConfirmed) {
        try {
            // Show loading state
            Swal.fire({
                title: 'กำลังดำเนินการ...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Get common data
            const uid = liff.getContext().userId;
            const empNo = document.querySelector('.user-id').textContent.split(' ')[0];
            const nearPlace = document.querySelector('.location-details').textContent;
            
            if (!isCheckout) {
                // Handle Check-in
                try {
                    const jobNo = generateJobNo(empNo);
                    const recordResult = await recordStart(
                        uid,
                        jobNo,
                        shift,
                        userLocation.lat,
                        userLocation.lng,
                        nearPlace
                    );

                    if (recordResult.success) {
                        await Swal.fire({
                            title: 'Check-in สำเร็จ',
                            text: `Job No: ${jobNo}`,
                            icon: 'success',
                            confirmButtonText: 'ตกลง'
                        });

                        // Update UI for check-in state
                        checkButton.textContent = 'Check Out';
                        checkButton.classList.add('checkout-button');
                        checkButton.dataset.jobNo = jobNo;
                        document.getElementById('shift').disabled = true;
                        
                        // Update time display
                        const now = new Date();
                        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                        document.querySelector('.info-item:first-child .value').textContent = timeStr;
                    } else {
                        throw new Error(recordResult.error || 'Failed to record check-in');
                    }
                } catch (error) {
                    console.error('Check-in error:', error);
                    throw error;
                }
            } else {
                // Handle Check-out
                try {
                    const jobNo = checkButton.dataset.jobNo;
                    if (!jobNo) {
                        throw new Error('Job number not found');
                    }

                    const recordResult = await recordFinish(
                        uid,
                        jobNo,
                        userLocation.lat,
                        userLocation.lng,
                        nearPlace
                    );

                    if (recordResult.success) {
                        await Swal.fire({
                            title: 'Check-out สำเร็จ',
                            text: `Job No: ${jobNo}`,
                            icon: 'success',
                            confirmButtonText: 'ตกลง'
                        });

                        // Update UI before closing
                        const now = new Date();
                        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                        document.querySelector('.info-item:last-child .value').textContent = timeStr;

                        // Reset UI state
                        checkButton.textContent = 'Check In';
                        checkButton.classList.remove('checkout-button');
                        delete checkButton.dataset.jobNo;
                        document.getElementById('shift').disabled = false;
                        document.getElementById('shift').value = '';

                        // Allow time for UI updates before closing
                        setTimeout(() => {
                            liff.closeWindow();
                        }, 500);
                    } else {
                        throw new Error(recordResult.error || 'Failed to record check-out');
                    }
                } catch (error) {
                    console.error('Check-out error:', error);
                    throw error;
                }
            }
        } catch (error) {
            console.error('Error during check-in/out:', error);
            await Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: error.message || 'กรุณาลองใหม่อีกครั้ง',
                icon: 'error',
                confirmButtonText: 'ตกลง'
            });
        }
    }
}
