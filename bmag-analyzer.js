/**
 * BMaG Analyzer - Phân tích và tính toán thời gian cho các khung thời gian BMAG
 * Phiên bản: 1.0.1
 * Cập nhật: Thêm hàm createDefaultTimeMarkers vào TimeCalculator để dễ dàng bảo trì
 */

// Constants
const TIMEFRAMES = [
    "Y1", "M3", "M1",
    "W1", "D5", "D3", "D2", "D1",
    "H12", "H6", "H4", "H2", "H1",
    "30m", "15m", "5m", "1m"
];

// Relationship between timeframes (parent-child)
const PARENT_CHILD = {
    "1m": "5m", "5m": "15m", "15m": "30m", "30m": "H1",
    "H1": "H2", "H2": "H4", "H4": "H6", 
    "H6": "D1", "H12": "D1",
    "D1": "D2", "D2": "D3", "D3": "D5", "D5": "W1",
    "W1": "M1", "M1": "M3", "M3": "Y1"
};

// Roles of different timeframes
const ROLES = {
    "W1": "Siêu Chủ Đạo", "M1": "Siêu Chủ Đạo", "M3": "Siêu Chủ Đạo", "Y1": "Siêu Chủ Đạo",
    "D5": "Chủ Đạo", "D3": "Chủ Đạo", "D2": "Chủ Đạo",
    "D1": "Giao Pha", "H12": "Giao Pha", "H6": "Giao Pha",
    "H4": "Hỗ Trợ", "H2": "Hỗ Trợ", "H1": "Hỗ Trợ", "30m": "Hỗ Trợ",
    "15m": "K.Chủ Đạo", "5m": "K.Chủ Đạo", "1m": "K.Chủ Đạo"
};

// Colors
const COLORS = {
    phases: {
        "Q1": "#a7d5fa",  // Xanh lam nhạt - Tìm đỉnh/đáy
        "Q2": "#a3e0a3",  // Xanh lá nhạt - Hình thành
        "Q3": "#ffffa3",  // Vàng nhạt - Cao trào
        "Q4": "#ffcdf3"   // Hồng nhạt - Xoa dịu
    },
    phasesBorder: {
        "Q1": "#1E90FF",  // Xanh lam - Tìm đỉnh/đáy
        "Q2": "#228B22",  // Xanh lá - Hình thành
        "Q3": "#DC143C",  // Đỏ - Cao trào
        "Q4": "#8B008B"   // Tím - Xoa dịu
    },
    roles: {
        "Siêu Chủ Đạo": "#DC143C",
        "Chủ Đạo": "#FF8C00",
        "Giao Pha": "#000080",
        "Hỗ Trợ": "#228B22",
        "K.Chủ Đạo": "#4169E1"
    }
};

// Time Calculator class - Handle all time-related calculations
class TimeCalculator {
    static getDurationMinutes(timeframe) {
        const durations = {
            "1m": 1, "5m": 5, "15m": 15, "30m": 30,
            "H1": 60, "H2": 120, "H4": 240, "H6": 360, "H12": 720,
            "D1": 1440, "D2": 2880, "D3": 4320, "D5": 7200,
            "W1": 10080,
            "M1": 43200, "M3": 129600, "M6": 259200,
            "Y1": 525600
        };
        return durations[timeframe] || 60;
    }

    static getCandleStart(timeframe) {
        // Sử dụng UTC cho thị trường crypto (24/7)
        const now = new Date();
        
        if (["1m", "5m", "15m", "30m"].includes(timeframe)) {
            const minutes = parseInt(timeframe.replace('m', ''));
            const currentMinute = now.getUTCMinutes();
            const startMinute = Math.floor(currentMinute / minutes) * minutes;
            return new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate(),
                now.getUTCHours(),
                startMinute,
                0,
                0
            ));
        } 
        else if (timeframe.startsWith("H")) {
            const hours = parseInt(timeframe.slice(1));
            const currentHour = now.getUTCHours();
            const startHour = Math.floor(currentHour / hours) * hours;
            
            // Đảm bảo sử dụng năm hiện tại
            const currentYear = now.getUTCFullYear();
            const currentMonth = now.getUTCMonth();
            const currentDay = now.getUTCDate();
            
            return new Date(Date.UTC(
                currentYear,
                currentMonth,
                currentDay,
                startHour,
                0,
                0,
                0
            ));
        } 
        else if (timeframe.startsWith("D")) {
            const days = parseInt(timeframe.slice(1));
            
            // Ngày bắt đầu lúc 0h UTC
            const startOfDay = new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate(),
                0, 0, 0, 0
            ));
            
            // Tính ngày bắt đầu của chu kỳ D nhiều ngày
            const msPerDay = 24 * 60 * 60 * 1000;
            const daysSinceEpoch = Math.floor((startOfDay.getTime()) / msPerDay);
            const cycleStart = daysSinceEpoch - (daysSinceEpoch % days);
            
            // Tính toán ngày bắt đầu chính xác từ số ngày kể từ epoch
            const startDate = new Date(cycleStart * msPerDay);
            return startDate;
        } 
        else if (timeframe === "W1") {
            // Tuần bắt đầu từ thứ Hai lúc 0h
            const dayOfWeek = now.getUTCDay(); // 0 = Chủ nhật, 1 = Thứ hai, ...
            const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            
            return new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate() - daysSinceMonday,
                0, 0, 0, 0
            ));
        } 
        else if (timeframe === "M1") {
            // Tháng bắt đầu từ ngày 1 lúc 0h
            return new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                1, 0, 0, 0, 0
            ));
        } 
        else if (timeframe === "M3") {
            // Quý bắt đầu từ tháng 1/4/7/10 ngày 1 lúc 0h
            const quarterMonths = [0, 3, 6, 9]; // 0=Jan, 3=Apr, 6=Jul, 9=Oct
            const currentQuarter = Math.floor(now.getUTCMonth() / 3);
            const startMonth = quarterMonths[currentQuarter];
            
            return new Date(Date.UTC(
                now.getUTCFullYear(),
                startMonth,
                1, 0, 0, 0, 0
            ));
        } 
        else if (timeframe === "M6") {
            // Nửa năm bắt đầu từ tháng 1/7 ngày 1 lúc 0h
            const startMonth = now.getUTCMonth() < 6 ? 0 : 6;
            
            return new Date(Date.UTC(
                now.getUTCFullYear(),
                startMonth,
                1, 0, 0, 0, 0
            ));
        } 
        else if (timeframe === "Y1") {
            // Năm bắt đầu từ 1/1 lúc 0h
            const currentYear = now.getUTCFullYear();
            return new Date(Date.UTC(
                currentYear,
                0, 1, 0, 0, 0, 0
            ));
        }
        
        return now;
    }

    static getActualDuration(timeframe, startTime) {
        if (timeframe === "M1") {
            // Tính số phút trong 1 tháng (tùy thuộc vào tháng)
            const endYear = startTime.getUTCMonth() === 11 ? startTime.getUTCFullYear() + 1 : startTime.getUTCFullYear();
            const endMonth = startTime.getUTCMonth() === 11 ? 0 : startTime.getUTCMonth() + 1;
            const endTime = new Date(Date.UTC(endYear, endMonth, 1, 0, 0, 0, 0));
            return (endTime - startTime) / (60 * 1000);
        } 
        else if (timeframe === "M3") {
            // Tính số phút trong 3 tháng
            let endMonth = startTime.getUTCMonth() + 3;
            let endYear = startTime.getUTCFullYear();
            if (endMonth > 11) {
                endYear += 1;
                endMonth -= 12;
            }
            const endTime = new Date(Date.UTC(endYear, endMonth, 1, 0, 0, 0, 0));
            return (endTime - startTime) / (60 * 1000);
        } 
        else if (timeframe === "M6") {
            // Tính số phút trong 6 tháng
            let endMonth = startTime.getUTCMonth() + 6;
            let endYear = startTime.getUTCFullYear();
            if (endMonth > 11) {
                endYear += 1;
                endMonth -= 12;
            }
            const endTime = new Date(Date.UTC(endYear, endMonth, 1, 0, 0, 0, 0));
            return (endTime - startTime) / (60 * 1000);
        } 
        else if (timeframe === "Y1") {
            // Tính số phút trong 1 năm theo lịch, từ 1/1 đến 31/12
            const startYear = startTime.getUTCFullYear();
            const endTime = new Date(Date.UTC(startYear + 1, 0, 1, 0, 0, 0, 0));
            return (endTime - startTime) / (60 * 1000);
        }
        
        return TimeCalculator.getDurationMinutes(timeframe);
    }

    static formatBMaGTime(date) {
        // Chuyển đổi sang giờ Việt Nam (UTC+7)
        const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
        const day = String(vnTime.getUTCDate()).padStart(2, '0');
        const month = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
        const year = vnTime.getUTCFullYear();
        
        // Hiển thị với giờ 07:00 (theo quy tắc BMaG) thay vì giờ thực tế
        // Chỉ cho phép hiển thị, không ảnh hưởng đến tính toán
        return `${day}/${month}/${year} 07:00`;
    }

    static formatDate(date) {
        // Chuyển đổi sang giờ Việt Nam (UTC+7)
        const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
        const day = String(vnTime.getUTCDate()).padStart(2, '0');
        const month = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
        const year = vnTime.getUTCFullYear();
        // Luôn hiển thị đầy đủ ngày/tháng/năm để tránh hiểu nhầm
        return `${day}/${month}/${year}`;
    }

    static formatTime(date) {
        // Chuyển đổi sang giờ Việt Nam (UTC+7)
        const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
        return `${String(vnTime.getUTCHours()).padStart(2, '0')}:${String(vnTime.getUTCMinutes()).padStart(2, '0')}`;
    }

    // Trong BMaG, ngày mới bắt đầu từ 7:00 sáng
    static getCurrentCryptoDay() {
        // Trả về ngày BMaG (ngày bắt đầu từ 7:00 sáng GMT+7)
        const now = new Date();
        // Chuyển đổi sang giờ Việt Nam (UTC+7)
        const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
        
        // Tạo đối tượng thời gian 7:00 sáng ngày hiện tại
        const today7am = new Date(Date.UTC(
            vnTime.getUTCFullYear(),
            vnTime.getUTCMonth(),
            vnTime.getUTCDate(),
            7, 0, 0, 0
        ));
        
        // Nếu thời gian hiện tại < 7h sáng, thì vẫn là ngày hôm trước
        let bmagDay;
        if (vnTime < today7am) {
            // Trước 7h sáng - vẫn là ngày hôm trước
            bmagDay = new Date(today7am);
            bmagDay.setUTCDate(bmagDay.getUTCDate() - 1);
        } else {
            // Từ 7h sáng trở đi - đã sang ngày mới
            bmagDay = today7am;
        }
        
        return bmagDay;
    }

    // Hàm tạo mốc thời gian mặc định cho các khung thời gian
    static createDefaultTimeMarkers(timeframe, markersArray, numPoints) {
        const now = new Date();
        const currentYear = now.getUTCFullYear(); // Lưu năm hiện tại
        const tfName = timeframe.name || "unknown";
        
        // Xác định thời điểm bắt đầu của khung thời gian
        let startTime;
        let endTime;
        
        if (tfName === "Y1") {
            // Năm bắt đầu từ 1/1 lúc 0h
            startTime = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0));
            endTime = new Date(Date.UTC(currentYear + 1, 0, 1, 0, 0, 0, 0));
            
            // Tạo các mốc thời gian cụ thể cho 4 quý của năm
            // Q1: 1/1
            markersArray.push([`01/01/${currentYear}`, `07:00`]);
            // Giữa Q1
            markersArray.push([`15/02/${currentYear}`, `07:00`]);
            // Q2: 1/4
            markersArray.push([`01/04/${currentYear}`, `07:00`]);
            // Giữa Q2
            markersArray.push([`15/05/${currentYear}`, `07:00`]);
            // Q3: 1/7
            markersArray.push([`01/07/${currentYear}`, `07:00`]);
            // Giữa Q3
            markersArray.push([`15/08/${currentYear}`, `07:00`]);
            // Q4: 1/10
            markersArray.push([`01/10/${currentYear}`, `07:00`]);
            // Giữa Q4
            markersArray.push([`15/11/${currentYear}`, `07:00`]);
            // Năm kết thúc
            markersArray.push([`31/12/${currentYear}`, `07:00`]);
            
            // Dừng hàm ở đây vì đã tạo đầy đủ các mốc thời gian
            return;
        } else if (tfName === "M3") {
            // Quý bắt đầu từ tháng 1/4/7/10 ngày 1 lúc 0h
            const currentQuarter = Math.floor(now.getUTCMonth() / 3);
            const startMonth = currentQuarter * 3; // 0=Jan, 3=Apr, 6=Jul, 9=Oct
            
            startTime = new Date(Date.UTC(currentYear, startMonth, 1, 0, 0, 0, 0));
            
            // Tính thời điểm kết thúc (đầu quý tiếp theo)
            let nextQuarterMonth = startMonth + 3;
            let nextQuarterYear = currentYear;
            if (nextQuarterMonth > 11) {
                nextQuarterMonth = 0;
                nextQuarterYear++;
            }
            endTime = new Date(Date.UTC(nextQuarterYear, nextQuarterMonth, 1, 0, 0, 0, 0));
        } else if (tfName === "M1") {
            // Tháng bắt đầu từ ngày 1 lúc 0h
            startTime = new Date(Date.UTC(currentYear, now.getUTCMonth(), 1, 0, 0, 0, 0));
            
            // Tính thời điểm kết thúc (đầu tháng tiếp theo)
            let nextMonth = now.getUTCMonth() + 1;
            let nextYear = currentYear;
            if (nextMonth > 11) {
                nextMonth = 0;
                nextYear++;
            }
            endTime = new Date(Date.UTC(nextYear, nextMonth, 1, 0, 0, 0, 0));
        } else if (tfName === "W1") {
            // Tuần bắt đầu từ thứ Hai lúc 0h
            const dayOfWeek = now.getUTCDay(); // 0 = Chủ nhật, 1 = Thứ hai, ...
            const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            
            startTime = new Date(Date.UTC(
                currentYear,
                now.getUTCMonth(),
                now.getUTCDate() - daysSinceMonday,
                0, 0, 0, 0
            ));
            
            // Thời điểm kết thúc là thứ Hai tuần sau
            endTime = new Date(startTime);
            endTime.setUTCDate(startTime.getUTCDate() + 7);
        } else if (tfName.startsWith("D")) {
            // Xác định số ngày của khung thời gian
            const days = parseInt(tfName.substring(1));
            
            // Ngày bắt đầu lúc 0h UTC
            startTime = new Date(Date.UTC(
                currentYear,
                now.getUTCMonth(),
                now.getUTCDate(),
                0, 0, 0, 0
            ));
            
            // Thời điểm kết thúc
            endTime = new Date(startTime);
            endTime.setUTCDate(startTime.getUTCDate() + days);
        } else if (tfName.startsWith("H")) {
            // Xác định số giờ của khung thời gian
            const hours = parseInt(tfName.substring(1));
            
            // Giờ bắt đầu
            const currentHour = now.getUTCHours();
            const startHour = Math.floor(currentHour / hours) * hours;
            
            startTime = new Date(Date.UTC(
                currentYear,
                now.getUTCMonth(),
                now.getUTCDate(),
                startHour, 0, 0, 0
            ));
            
            // Thời điểm kết thúc
            endTime = new Date(startTime);
            endTime.setUTCHours(startTime.getUTCHours() + hours);
        } else if (tfName.endsWith("m")) {
            // Xác định số phút của khung thời gian
            const minutes = parseInt(tfName.replace('m', ''));
            
            // Phút bắt đầu
            const currentMinute = now.getUTCMinutes();
            const startMinute = Math.floor(currentMinute / minutes) * minutes;
            
            startTime = new Date(Date.UTC(
                currentYear,
                now.getUTCMonth(),
                now.getUTCDate(),
                now.getUTCHours(),
                startMinute, 0, 0
            ));
            
            // Thời điểm kết thúc
            endTime = new Date(startTime);
            endTime.setUTCMinutes(startTime.getUTCMinutes() + minutes);
        } else {
            // Mặc định nếu không xác định được khung thời gian
            startTime = new Date();
            endTime = new Date(startTime);
            endTime.setUTCHours(startTime.getUTCHours() + 1);
        }
        
        // Tính toán khoảng thời gian
        const timeRange = endTime - startTime;
        
        // Tạo các mốc thời gian cho từng dấu chấm
        for (let i = 0; i < numPoints; i++) {
            const percentTime = i / (numPoints - 1);
            const timePoint = new Date(startTime.getTime() + (timeRange * percentTime));
            
            // Định dạng ngày và giờ
            const datePart = `${String(timePoint.getUTCDate()).padStart(2, '0')}/${String(timePoint.getUTCMonth() + 1).padStart(2, '0')}`;
            const timePart = `${String(timePoint.getUTCHours()).padStart(2, '0')}:${String(timePoint.getUTCMinutes()).padStart(2, '0')}`;
            
            // Đối với khung thời gian dài (Y1, M3, M1, W1), hiển thị giờ cố định là 07:00 theo quy tắc BMaG
            const displayTimePart = (tfName === "Y1" || tfName === "M3" || tfName === "M1" || tfName === "W1") ? "07:00" : timePart;
            
            markersArray.push([datePart, displayTimePart]);
        }
    }
}

// BMaG Analyzer class - Core analysis functionality
class BMaGAnalyzer {
    static calculatePhaseData(timeframe) {
        // Lấy thời điểm bắt đầu của nến và tính toán khoảng thời gian
        const startTime = TimeCalculator.getCandleStart(timeframe);
        const duration = TimeCalculator.getActualDuration(timeframe, startTime);
        
        // Thời gian hiện tại theo UTC
        const now = new Date();
        
        // Tính thời điểm kết thúc của nến hiện tại
        const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
        
        // Kiểm tra nếu nến hiện tại đã kết thúc
        if (now >= endTime) {
            // Tìm nến tiếp theo dựa trên khung thời gian
            let nextStartTime;
            
            if (["1m", "5m", "15m", "30m"].includes(timeframe)) {
                const minutes = parseInt(timeframe.replace('m', ''));
                // Tính thời điểm bắt đầu kế tiếp
                nextStartTime = new Date(endTime.getTime());
                nextStartTime.setUTCMinutes(endTime.getUTCMinutes() + minutes);
            } 
            else if (timeframe.startsWith("H")) {
                const hours = parseInt(timeframe.slice(1));
                nextStartTime = new Date(endTime.getTime());
                nextStartTime.setUTCHours(endTime.getUTCHours() + hours);
            } 
            else if (timeframe.startsWith("D")) {
                const days = parseInt(timeframe.slice(1));
                nextStartTime = new Date(endTime.getTime());
                nextStartTime.setUTCDate(endTime.getUTCDate() + days);
            } 
            else if (timeframe === "W1") {
                nextStartTime = new Date(endTime.getTime());
                nextStartTime.setUTCDate(endTime.getUTCDate() + 7);
            } 
            else if (timeframe === "M1") {
                // Tạo markers cho tháng
                const currentMonth = startTime.getUTCMonth();
                const currentYear = startTime.getUTCFullYear();
                
                // Tính số ngày trong tháng hiện tại
                const daysInMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
                
                // Tạo mảng markers với ngày đầu tiên của tháng
                markers = [TimeCalculator.formatDate(new Date(Date.UTC(currentYear, currentMonth, 1)))];
                
                // Thêm các ngày giữa tháng (ngày 10 và 20)
                markers.push(TimeCalculator.formatDate(new Date(Date.UTC(currentYear, currentMonth, 10))));
                markers.push(TimeCalculator.formatDate(new Date(Date.UTC(currentYear, currentMonth, 20))));
                
                // Thêm ngày cuối cùng của tháng
                markers.push(TimeCalculator.formatDate(new Date(Date.UTC(currentYear, currentMonth, daysInMonth))));
                
                // Thêm ngày đầu tiên của tháng tiếp theo
                let nextMonth = currentMonth + 1;
                let nextYear = currentYear;
                if (nextMonth > 11) {
                    nextMonth = 0;
                    nextYear++;
                }
                markers.push(TimeCalculator.formatDate(new Date(Date.UTC(nextYear, nextMonth, 1))));
            } 
            else if (timeframe === "M3") {
                // Tính quý kế tiếp
                let nextMonth = endTime.getUTCMonth() + 3;
                let nextYear = endTime.getUTCFullYear();
                if (nextMonth > 11) {
                    nextYear += 1;
                    nextMonth -= 12;
                }
                nextStartTime = new Date(Date.UTC(nextYear, nextMonth, 1, 0, 0, 0, 0));
            } 
            else if (timeframe === "M6") {
                // Tính nửa năm kế tiếp
                let nextMonth = endTime.getUTCMonth() + 6;
                let nextYear = endTime.getUTCFullYear();
                if (nextMonth > 11) {
                    nextYear += 1;
                    nextMonth -= 12;
                }
                nextStartTime = new Date(Date.UTC(nextYear, nextMonth, 1, 0, 0, 0, 0));
            } 
            else if (timeframe === "Y1") {
                // Tính năm kế tiếp
                nextStartTime = new Date(Date.UTC(endTime.getUTCFullYear() + 1, 0, 1, 0, 0, 0, 0));
            } 
            else {
                // Trường hợp mặc định
                nextStartTime = new Date(endTime.getTime());
                nextStartTime.setUTCDate(nextStartTime.getUTCDate() + 1);
            }
            
            // Kiểm tra nếu nến tiếp theo vẫn chưa bắt đầu (nếu là thời gian tương lai)
            if (now < nextStartTime) {
                // Trả về nến hiện tại với tiến độ 100%
                return {
                    timeframe: timeframe,
                    phase: "Q4",
                    progress: 1.0,
                    description: "Xoa dịu",
                    remainingToHalf: 0,
                    remainingTotal: 0,
                    startTime: startTime
                };
            }
            
            // Nếu nến tiếp theo đã bắt đầu, sử dụng nến tiếp theo
            const nextDuration = TimeCalculator.getActualDuration(timeframe, nextStartTime);
            const nextEndTime = new Date(nextStartTime.getTime() + nextDuration * 60 * 1000);
            const elapsedMinutes = (now - nextStartTime) / (60 * 1000);
            const progress = Math.max(0, Math.min(1, elapsedMinutes / nextDuration));
            
            // Tính thời gian còn lại đến khi kết thúc nến tiếp theo
            const remainingToEnd = Math.max(0, (nextEndTime - now) / (60 * 1000));
            
            // Tính thời điểm 50% của nến tiếp theo
            const halfwayPoint = new Date(nextStartTime.getTime() + (nextDuration * 0.5 * 60 * 1000));
            const remainingToHalf = now < halfwayPoint ? 
                                  Math.max(0, (halfwayPoint - now) / (60 * 1000)) : 0;
            
            // Xác định pha
            let phase, description;
            if (progress < 0.25) {
                phase = "Q1";
                description = "Tìm đỉnh/đáy";
            } else if (progress < 0.5) {
                phase = "Q2";
                description = "Hình thành";
            } else if (progress < 0.75) {
                phase = "Q3";
                description = "Cao trào";
            } else {
                phase = "Q4";
                description = "Xoa dịu";
            }
            
            return {
                timeframe: timeframe,
                phase: phase,
                progress: progress,
                description: description,
                remainingToHalf: remainingToHalf,
                remainingTotal: remainingToEnd,
                startTime: nextStartTime
            };
        }
        
        // Xử lý nến hiện tại (chưa kết thúc)
        const elapsedMinutes = (now - startTime) / (60 * 1000);
        const progress = Math.max(0, Math.min(1, elapsedMinutes / duration));
        
        // Tính thời gian còn lại đến khi kết thúc nến
        const remainingToEnd = Math.max(0, (endTime - now) / (60 * 1000));
        
        // Tính thời điểm 50% của nến
        const halfwayPoint = new Date(startTime.getTime() + (duration * 0.5 * 60 * 1000));
        const remainingToHalf = now < halfwayPoint ? 
                              Math.max(0, (halfwayPoint - now) / (60 * 1000)) : 0;
        
        // Xác định pha
        let phase, description;
        if (progress < 0.25) {
            phase = "Q1";
            description = "Tìm đỉnh/đáy";
        } else if (progress < 0.5) {
            phase = "Q2";
            description = "Hình thành";
        } else if (progress < 0.75) {
            phase = "Q3";
            description = "Cao trào";
        } else {
            phase = "Q4";
            description = "Xoa dịu";
        }
        
        return {
            timeframe: timeframe,
            phase: phase,
            progress: progress,
            description: description,
            remainingToHalf: remainingToHalf,
            remainingTotal: remainingToEnd,
            startTime: startTime
        };
    }

    static formatCountdown(minutes) {
        if (minutes <= 0) {
            return "Đã qua";
        }
        
        const totalSeconds = Math.floor(minutes * 60);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        
        if (days > 0) {
            return `${days}d ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    static getToolAdvice(timeframe, phaseData) {
        const phase = phaseData.phase;
        const progress = phaseData.progress;
        const role = ROLES[timeframe] || "Hỗ Trợ";
        const parent = PARENT_CHILD[timeframe] || "";
        
        // Trạng thái pha
        let status, behavior;
        if (phase === "Q1") {
            status = `${timeframe} đang ở Q1 – thị trường dò đỉnh/đáy`;
            behavior = "giá đang tìm kiếm vùng cực trị";
        } else if (phase === "Q2") {
            if (progress >= 0.45 && progress <= 0.55) {
                status = `${timeframe} gần mốc 50% – sắp chuyển pha`;
                behavior = "momentum đang tăng dần, chuẩn bị bùng nổ";
            } else {
                status = `${timeframe} đang ở Q2 – xu hướng đang hình thành`;
                behavior = "xu hướng mới bắt đầu rõ ràng";
            }
        } else if (phase === "Q3") {
            status = `${timeframe} đang ở Q3 – thị trường vào pha cao trào`;
            behavior = "lực mạnh nhất, xu hướng rõ ràng";
        } else {
            status = `${timeframe} đang ở Q4 – lực yếu dần, sắp kết thúc`;
            behavior = "momentum suy yếu, chuẩn bị đảo chiều";
        }
        
        // Lời khuyên theo vai trò
        let action;
        if (role === "Siêu Chủ Đạo") {
            if (phase === "Q3") {
                action = "🚀 ENTRY CHÍNH! Lệnh lớn nhất!";
            } else if (phase === "Q2" && progress >= 0.45 && progress <= 0.55) {
                action = "🎯 CHUẨN BỊ! Sắp có tín hiệu lớn!";
            } else if (phase === "Q1") {
                action = "👀 QUAN SÁT! Chờ tín hiệu rõ ràng!";
            } else {
                action = "😴 NGHỈ NGƠI! Tránh entry mới!";
            }
        } else if (role === "Chủ Đạo") {
            if (phase === "Q3") {
                action = "⚡ ENTRY NGAY! Quyết định chính!";
            } else if (phase === "Q2" && progress >= 0.45 && progress <= 0.55) {
                action = "🔥 SẴN SÀNG! Setup position!";
            } else if (phase === "Q1") {
                action = "🔍 THEO DÕI! Chờ breakout!";
            } else {
                action = "⏸️ TẠM DỪNG! Không mở lệnh mới!";
            }
        } else if (role === "Giao Pha") {
            if (phase === "Q3") {
                action = "🎯 TIMING PERFECT! Entry ngay!";
            } else if (phase === "Q2" && progress >= 0.45 && progress <= 0.55) {
                action = "⏰ CHUẨN BỊ! Timing sắp tới!";
            } else if (phase === "Q1") {
                action = "⌚ CHỜ ĐỢI! Chưa đến lúc!";
            } else {
                action = "🚫 TRÁNH! Timing không tốt!";
            }
        } else if (role === "Hỗ Trợ") {
            if (phase === "Q3") {
                action = "✅ XÁC NHẬN! Follow theo chính!";
            } else if (phase === "Q2" && progress >= 0.45 && progress <= 0.55) {
                action = "📊 THEO DÕI! Hỗ trợ tín hiệu!";
            } else {
                action = "📈 QUAN SÁT! Chỉ xác nhận thôi!";
            }
        } else {  // K.Chủ Đạo
            if (phase === "Q3") {
                action = "👁️ THEO DÕI! Chỉ quan sát!";
            } else {
                action = "📱 MONITOR! Không hành động!";
            }
        }
        
        // Thêm thông tin phục vụ
        const serviceInfo = parent ? ` | Phục vụ cho ${parent}` : "";
        
        return `${status}, ${behavior} → ${action}${serviceInfo}`;
    }

    static generateTimeframeData() {
        const timeframeData = [];
        const now = new Date(); // Thời gian hiện tại
        
        for (const tf of TIMEFRAMES) {
            const phaseData = this.calculatePhaseData(tf);
            const role = ROLES[tf] || "Hỗ Trợ";
            const parent = PARENT_CHILD[tf] || "-";
            const phaseColor = COLORS.phases[phaseData.phase];
            const phaseBorderColor = COLORS.phasesBorder[phaseData.phase];
            const advice = this.getToolAdvice(tf, phaseData);
            
            // Định dạng thời gian bắt đầu
            let displayStartTime;
            if (tf.startsWith("D") || tf === "W1" || tf.startsWith("M") || tf === "Y1") {
                // Các khung thời gian dài hiển thị 07:00
                displayStartTime = TimeCalculator.formatBMaGTime(phaseData.startTime);
            } else {
                // Các khung thời gian ngắn hiển thị giờ thực tế
                const vnStartTime = new Date(phaseData.startTime.getTime() + 7 * 60 * 60 * 1000);
                const hours = String(vnStartTime.getUTCHours()).padStart(2, '0');
                const minutes = String(vnStartTime.getUTCMinutes()).padStart(2, '0');
                displayStartTime = `${TimeCalculator.formatDate(phaseData.startTime)} ${hours}:${minutes}`;
            }
            
            // Tính thời điểm kết thúc
            const endTimeForDisplay = new Date(phaseData.startTime.getTime() + TimeCalculator.getActualDuration(tf, phaseData.startTime) * 60 * 1000);
            
            // Định dạng thời gian kết thúc
            let displayEndTime;
            if (tf.startsWith("D") || tf === "W1" || tf.startsWith("M") || tf === "Y1") {
                // Các khung thời gian dài hiển thị 07:00
                displayEndTime = TimeCalculator.formatBMaGTime(endTimeForDisplay);
            } else {
                // Các khung thời gian ngắn hiển thị giờ thực tế
                const vnEndTime = new Date(endTimeForDisplay.getTime() + 7 * 60 * 60 * 1000);
                const hours = String(vnEndTime.getUTCHours()).padStart(2, '0');
                const minutes = String(vnEndTime.getUTCMinutes()).padStart(2, '0');
                displayEndTime = `${TimeCalculator.formatDate(endTimeForDisplay)} ${hours}:${minutes}`;
            }
            
            // Calculate market markers for this timeframe
            const startTime = phaseData.startTime;
            const duration = TimeCalculator.getActualDuration(tf, startTime);
            const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
            
            // Tính vị trí hiển thị NOW (% so với thời gian bắt đầu và kết thúc)
            const elapsedTime = now - startTime;
            const totalTime = endTime - startTime;
            const nowPosition = Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100));
            
            // Kiểm tra nếu khung thời gian hiện tại đã kết thúc
            const isCurrentCandleEnded = now >= endTime;
            
            // Format time markers
            let markers = [];
            if (tf === "Y1") {
                // Đảm bảo sử dụng năm UTC chính xác
                const currentYear = startTime.getUTCFullYear();
                
                // Tạo các mốc thời gian rõ ràng cho Y1 với 4 quý
                // Thêm giờ 07:00 cho mỗi mốc thời gian theo quy tắc BMaG
                markers = [
                    `01/01/${currentYear}`, // Q1 bắt đầu
                    `01/04/${currentYear}`, // Q2 bắt đầu
                    `01/07/${currentYear}`, // Q3 bắt đầu
                    `01/10/${currentYear}`, // Q4 bắt đầu
                    `01/01/${currentYear + 1}` // Năm kết thúc
                ];
            } else if (tf === "M3") {
                // Tạo markers cho quý (ngày đầu tiên của mỗi tháng trong quý)
                const quarterStartMonth = Math.floor(startTime.getUTCMonth() / 3) * 3;
                markers = [
                    TimeCalculator.formatDate(new Date(Date.UTC(startTime.getUTCFullYear(), quarterStartMonth, 1))),
                    TimeCalculator.formatDate(new Date(Date.UTC(startTime.getUTCFullYear(), quarterStartMonth + 1, 1))),
                    TimeCalculator.formatDate(new Date(Date.UTC(startTime.getUTCFullYear(), quarterStartMonth + 2, 1)))
                ];
                
                // Thêm ngày đầu tiên của quý tiếp theo
                let nextQuarterMonth = quarterStartMonth + 3;
                let nextQuarterYear = startTime.getUTCFullYear();
                if (nextQuarterMonth > 11) {
                    nextQuarterYear++;
                    nextQuarterMonth -= 12;
                }
                markers.push(TimeCalculator.formatDate(new Date(Date.UTC(nextQuarterYear, nextQuarterMonth, 1))));
            } else if (tf === "M1") {
                // Tạo markers cho tháng
                const currentMonth = startTime.getUTCMonth();
                const currentYear = startTime.getUTCFullYear();
                
                // Tính số ngày trong tháng hiện tại
                const daysInMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
                
                // Tạo mảng markers với ngày đầu tiên của tháng
                markers = [TimeCalculator.formatDate(new Date(Date.UTC(currentYear, currentMonth, 1)))];
                
                // Thêm các ngày giữa tháng (ngày 10 và 20)
                markers.push(TimeCalculator.formatDate(new Date(Date.UTC(currentYear, currentMonth, 10))));
                markers.push(TimeCalculator.formatDate(new Date(Date.UTC(currentYear, currentMonth, 20))));
                
                // Thêm ngày cuối cùng của tháng
                markers.push(TimeCalculator.formatDate(new Date(Date.UTC(currentYear, currentMonth, daysInMonth))));
                
                // Thêm ngày đầu tiên của tháng tiếp theo
                let nextMonth = currentMonth + 1;
                let nextYear = currentYear;
                if (nextMonth > 11) {
                    nextMonth = 0;
                    nextYear++;
                }
                markers.push(TimeCalculator.formatDate(new Date(Date.UTC(nextYear, nextMonth, 1))));
            } else if (tf === "W1" || tf.startsWith("D")) {
                // Generate markers for weeks/days
                const markerCount = 5;
                const step = duration / (markerCount - 1);
                for (let i = 0; i < markerCount; i++) {
                    const markerTime = new Date(startTime.getTime() + i * step * 60 * 1000);
                    markers.push(TimeCalculator.formatDate(markerTime) + (i === 0 || i === markerCount-1 ? " " + TimeCalculator.formatTime(markerTime) : ""));
                }
            } else {
                // Hours and minutes
                const markerCount = 5;
                const step = duration / (markerCount - 1);
                for (let i = 0; i < markerCount; i++) {
                    const markerTime = new Date(startTime.getTime() + i * step * 60 * 1000);
                    markers.push(TimeCalculator.formatTime(markerTime));
                }
            }
            
            timeframeData.push({
                name: tf,
                startDate: displayStartTime,
                endDate: displayEndTime,
                startTime: startTime,
                endTime: endTime,
                phase: phaseData.phase,
                percent: Math.round(phaseData.progress * 100),
                remaining: this.formatCountdown(phaseData.remainingTotal),
                toHalf: this.formatCountdown(phaseData.remainingToHalf),
                phase_name: `${phaseData.phase}: ${phaseData.description}`,
                phase_color: phaseColor,
                phase_border_color: phaseBorderColor,
                markers: markers,
                role: role,
                parent: parent,
                advice: advice,
                now_position: nowPosition,
                show_now: !isCurrentCandleEnded // Chỉ hiển thị NOW nếu nến hiện tại chưa kết thúc
            });
        }
        
        return timeframeData;
    }

    static updateCurrentTime() {
        const now = new Date();
        // Chuyển đổi sang giờ Việt Nam (UTC+7)
        const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
        const day = String(vnTime.getUTCDate()).padStart(2, '0');
        const month = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
        const year = vnTime.getUTCFullYear();
        const hour = String(vnTime.getUTCHours()).padStart(2, '0');
        const minute = String(vnTime.getUTCMinutes()).padStart(2, '0');
        const second = String(vnTime.getUTCSeconds()).padStart(2, '0');
        
        return {
            now: now,
            formatted: `${day}/${month}/${year} ${hour}:${minute}:${second} (GMT+7)`,
            day: day,
            month: month,
            year: year,
            hour: hour,
            minute: minute,
            second: second
        };
    }

    static checkSpecialAlerts(timeframeData) {
        // Tìm các khung thời gian chủ đạo đang ở Q3
        const q3MajorTimeframes = timeframeData.filter(tf => 
            (tf.role === 'Siêu Chủ Đạo' || tf.role === 'Chủ Đạo') && 
            tf.phase === 'Q3'
        );

        // Tìm các khung thời gian gần mốc 50%
        const near50PercentTimeframes = timeframeData.filter(tf => 
            tf.percent >= 48 && tf.percent <= 52 &&
            (tf.role === 'Siêu Chủ Đạo' || tf.role === 'Chủ Đạo' || tf.role === 'Giao Pha')
        );

        let alertType = null;
        let alertMessage = '';
        
        if (q3MajorTimeframes.length > 0) {
            alertType = 'q3_major';
            alertMessage = `CẢNH BÁO: ${q3MajorTimeframes.length} khung thời gian chủ đạo đang ở Q3 (Cao trào) - THỜI ĐIỂM MẠNH NHẤT!`;
        } else if (near50PercentTimeframes.length > 0) {
            alertType = 'near_50_percent';
            alertMessage = `CHÚ Ý: ${near50PercentTimeframes.length} khung thời gian quan trọng đang gần mốc 50% - CHUYỂN PHA!`;
        }
        
        return {
            type: alertType,
            message: alertMessage,
            show: alertType !== null,
            q3MajorTimeframes: q3MajorTimeframes,
            near50PercentTimeframes: near50PercentTimeframes
        };
    }
}

// Export to use in HTML
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TIMEFRAMES,
        PARENT_CHILD,
        ROLES,
        COLORS,
        TimeCalculator,
        BMaGAnalyzer
    };
} 