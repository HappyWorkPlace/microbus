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

// ฟังก์ชันสำหรับแปลงเวลาเป็นรูปแบบภาษาไทย
// ฟังก์ชันสำหรับแปลงเวลาเป็นรูปแบบภาษาไทย
function formatThaiDateTime(timestamp) {
    try {
        console.log('Input timestamp:', timestamp);
        
        // ตรวจสอบว่า timestamp มีค่าและเป็นสตริง
        if (!timestamp || typeof timestamp !== 'string') {
            console.error('Invalid timestamp:', timestamp);
            return '';
        }

        let datePart, timePart;

        // รองรับทั้งรูปแบบที่มี comma และไม่มี comma
        if (timestamp.includes(',')) {
            [datePart, timePart] = timestamp.split(',');
        } else {
            [datePart, timePart] = timestamp.split(' ');
        }

        // ตรวจสอบว่าแยกวันที่และเวลาได้ถูกต้อง
        if (!datePart || !timePart) {
            console.error('Cannot split date and time:', { datePart, timePart });
            return '';
        }

        console.log('Split result:', { datePart, timePart });

        // แยกส่วนประกอบของวันที่
        const [year, month, day] = datePart.split('-');
        
        // ตรวจสอบความถูกต้องของค่าวันที่
        if (!year || !month || !day) {
            console.error('Invalid date components:', { year, month, day });
            return '';
        }

        console.log('Date components:', { year, month, day });

        // แปลงเดือนเป็นภาษาไทย
        const thaiMonths = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];

        // แปลงปีเป็น พ.ศ.
        const thaiYear = parseInt(year) + 543;
        
        // ตรวจสอบและแปลงค่าเดือน
        const monthIndex = parseInt(month) - 1;
        if (monthIndex < 0 || monthIndex >= 12) {
            console.error('Invalid month index:', monthIndex);
            return '';
        }

        const thaiDate = `วันที่ ${parseInt(day)} ${thaiMonths[monthIndex]} ${thaiYear} เวลา ${timePart} น.`;
        console.log('Thai date result:', thaiDate);
        
        return thaiDate;
    } catch (error) {
        console.error('Error in formatThaiDateTime:', error);
        return '';
    }
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
    const data = {
        action: 'record_finish',
        uid: uid,
        job_no: jobNo,
        end_datetime: formatTimestamp(new Date()),
        location: `https://www.google.com/maps?q=${lat},${lng}`,
        near_place: nearPlace
    };

    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(data)
    });

    return response.json();
}

// ปรับปรุงฟังก์ชัน checkIn
async function checkIn() {
    const shift = document.getElementById('shift').value;
    const isCheckout = document.querySelector('.checkin-button').classList.contains('checkout-button');
    
    if (!isCheckout && !shift) {
        await Swal.fire({
            title: 'กรุณาเลือกกะการทำงาน',
            icon: 'warning',
            confirmButtonText: 'ตกลง'
        });
        return;
    }

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
            // แสดง loading ด้วย Swal
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
                    await Swal.fire({
                        title: 'Check-in สำเร็จ',
                        text: `Job No: ${jobNo}`,
                        icon: 'success',
                        confirmButtonText: 'ตกลง'
                    });

                    // Update UI
                    const checkButton = document.querySelector('.checkin-button');
                    checkButton.textContent = 'Check Out';
                    checkButton.classList.add('checkout-button');
                    checkButton.dataset.jobNo = jobNo;
                    document.getElementById('shift').disabled = true;
                    
                    const now = new Date();
                    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    document.querySelector('.info-item:first-child .value').textContent = timeStr;
                } else {
                    throw new Error('Failed to record check-in');
                }
            } else {
                // Check-out process
                const jobNo = document.querySelector('.checkin-button').dataset.jobNo;
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
                    liff.closeWindow(); // ปิดหน้า LIFF
                } else {
                    throw new Error('Failed to record check-out');
                }
            }
        } catch (error) {
            console.error('Error during check-in/out:', error);
            await Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'กรุณาลองใหม่อีกครั้ง',
                icon: 'error',
                confirmButtonText: 'ตกลง'
            });
        }
    }
}
