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

// 14:31
// ฟังก์ชันสำหรับบันทึกข้อมูล Check-in
async function recordStart(uid, jobNo, shift, lat, lng, nearPlace) {
    try {
        const params = new URLSearchParams({
            action: 'record_start',
            uid: uid,
            job_no: jobNo,
            day_type: '',
            shift: shift,
            start_datetime: formatTimestamp(new Date()),
            location: `https://www.google.com/maps?q=${lat},${lng}`,
            near_place: nearPlace
        });

        const response = await fetch(`${SCRIPT_URL}?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('recordStart response:', result);
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to record check-in');
        }

        return result;
    } catch (error) {
        console.error('Error in recordStart:', error);
        throw error;
    }
}

// ฟังก์ชันสำหรับบันทึกข้อมูล Check-out
async function recordFinish(uid, jobNo, lat, lng, nearPlace) {
    try {
        const params = new URLSearchParams({
            action: 'record_finish',
            uid: uid,
            job_no: jobNo,
            end_datetime: formatTimestamp(new Date()),
            location: `https://www.google.com/maps?q=${lat},${lng}`,
            near_place: nearPlace
        });

        const response = await fetch(`${SCRIPT_URL}?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('recordFinish response:', result);
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to record check-out');
        }

        return result;
    } catch (error) {
        console.error('Error in recordFinish:', error);
        throw error;
    }
}

// อัพเดทฟังก์ชัน checkIn สำหรับส่วนของ check-out
async function checkIn() {
    console.log('Starting checkIn function');
    
    try {
        const shift = document.getElementById('shift').value;
        const checkButton = document.querySelector('.checkin-button');
        const isCheckout = checkButton.classList.contains('checkout-button');
        
        console.log('Initial values:', { shift, isCheckout });
        
        if (!isCheckout && !shift) {
            console.log('No shift selected for check-in');
            await Swal.fire({
                title: 'กรุณาเลือกกะการทำงาน',
                icon: 'warning',
                confirmButtonText: 'ตกลง'
            });
            return;
        }

        const result = await Swal.fire({
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

        if (result.isConfirmed) {
            Swal.fire({
                title: 'กำลังดำเนินการ...',
                allowOutsideClick: false,
                showConfirmButton: false,
                willOpen: () => {
                    Swal.showLoading();
                }
            });

            const uid = liff.getContext().userId;
            const empNo = document.querySelector('.user-id').textContent.split(' ')[0];
            const nearPlace = document.querySelector('.location-details').textContent;

            if (!isCheckout) {
                // Check-in process
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
                    const now = new Date();
                    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    
                    await Swal.fire({
                        title: 'Check-in สำเร็จ',
                        text: `Job No: ${jobNo}`,
                        icon: 'success',
                        confirmButtonText: 'ตกลง'
                    });

                    document.getElementById('special-checkout').style.display = 'flex';
                    document.getElementById('main-page').style.display = 'none';
                    
                    document.getElementById('checkout-time').textContent = `คุณได้ Check-in ไว้เมื่อ ${timeStr}`;
                    document.getElementById('checkout-place').textContent = nearPlace;
                    
                    checkButton.textContent = 'Check Out';
                    checkButton.classList.add('checkout-button');
                    checkButton.dataset.jobNo = jobNo;
                    document.getElementById('shift').disabled = true;
                    
                    document.querySelector('.info-item:first-child .value').textContent = timeStr;
                }
            } else {
                // Check-out process
                const jobNo = checkButton.dataset.jobNo;
                console.log('Retrieved jobNo for checkout:', jobNo);
                
                try {
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
                        liff.closeWindow();
                    } else {
                        throw new Error(recordResult.message || 'Failed to record check-out');
                    }
                } catch (error) {
                    console.error('Error during check-out:', error);
                    throw error;
                }
            }
        }
    } catch (error) {
        console.error('Error during check-in/out:', error);
        Swal.close();
        await Swal.fire({
            title: 'เกิดข้อผิดพลาด',
            text: error.message || 'กรุณาลองใหม่อีกครั้ง',
            icon: 'error',
            confirmButtonText: 'ตกลง'
        });
    }
}
