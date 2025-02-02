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
async function recordStart(uid, jobNo, shift, lat, lng, nearPlace) {
    try {
        const data = {
            action: 'record_start',
            uid: uid,
            job_no: jobNo,
            day_type: '',
            shift: shift,
            start_datetime: formatTimestamp(new Date()),
            location: `https://www.google.com/maps?q=${lat},${lng}`,
            near_place: nearPlace
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to record check-in');
        }

        return result;
    } catch (error) {
        console.error('Record start error:', error);
        throw error;
    }
}

async function checkIn() {
    const shift = document.getElementById('shift').value;
    const checkButton = document.querySelector('.checkin-button');
    const isCheckout = checkButton.classList.contains('checkout-button');

    if (!isCheckout && !shift) {
        await Swal.fire({
            title: 'กรุณาเลือกกะการทำงาน',
            icon: 'warning',
            confirmButtonText: 'ตกลง'
        });
        return;
    }

    try {
        // Verify location data is available
        if (!userLocation || !userLocation.lat || !userLocation.lng) {
            throw new Error('Location data not available');
        }

        const confirmResult = await Swal.fire({
            title: isCheckout ? 'ยืนยันการ Check-out?' : `ยืนยันการ Check-in กะ ${shift}?`,
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

        if (!confirmResult.isConfirmed) {
            return;
        }

        // Show loading state
        Swal.fire({
            title: 'กำลังดำเนินการ...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const uid = liff.getContext().userId;
        const empNo = document.querySelector('.user-id').textContent.split(' ')[0];
        const nearPlace = document.querySelector('.location-details').textContent;

        if (!uid || !empNo) {
            throw new Error('User information not available');
        }

        if (isCheckout) {
            const jobNo = checkButton.dataset.jobNo;
            if (!jobNo) {
                throw new Error('Job number not found');
            }

            const result = await recordFinish(uid, jobNo, userLocation.lat, userLocation.lng, nearPlace);
            handleCheckoutSuccess(result, jobNo);
        } else {
            const jobNo = generateJobNo(empNo);
            const result = await recordStart(uid, jobNo, shift, userLocation.lat, userLocation.lng, nearPlace);
            handleCheckinSuccess(result, jobNo, shift);
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

function handleCheckinSuccess(result, jobNo, shift) {
    if (result.success) {
        const checkButton = document.querySelector('.checkin-button');
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        // Update UI
        checkButton.textContent = 'Check Out';
        checkButton.classList.add('checkout-button');
        checkButton.dataset.jobNo = jobNo;
        document.getElementById('shift').disabled = true;
        document.querySelector('.info-item:first-child .value').textContent = timeStr;
        
        Swal.fire({
            title: 'Check-in สำเร็จ',
            text: `Job No: ${jobNo}`,
            icon: 'success',
            confirmButtonText: 'ตกลง'
        });
    }
}

function handleCheckoutSuccess(result, jobNo) {
    if (result.success) {
        const checkButton = document.querySelector('.checkin-button');
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        // Update UI
        document.querySelector('.info-item:last-child .value').textContent = timeStr;
        checkButton.textContent = 'Check In';
        checkButton.classList.remove('checkout-button');
        delete checkButton.dataset.jobNo;
        document.getElementById('shift').disabled = false;
        document.getElementById('shift').value = '';
        
        Swal.fire({
            title: 'Check-out สำเร็จ',
            text: `Job No: ${jobNo}`,
            icon: 'success',
            confirmButtonText: 'ตกลง'
        }).then(() => {
            setTimeout(() => {
                liff.closeWindow();
            }, 500);
        });
    }
}}
