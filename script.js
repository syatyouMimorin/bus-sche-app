// グローバル変数
let busData = null;
let intervalId = null;

// 初期化処理
document.addEventListener('DOMContentLoaded', () => {
    // データロード
    loadBusData();
    
    // 時計更新の開始
    updateClock();
    intervalId = setInterval(updateClock, 60000); // 1分ごとに更新
    
    // 更新ボタンの設定
    document.getElementById('refresh-btn').addEventListener('click', () => {
        updateClock();
    });
});

// バスのデータをロード
function loadBusData() {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            busData = data;
            updateClock(); // データロード後に画面更新
        })
        .catch(error => {
            console.error('データロードエラー:', error);
            document.getElementById('today-schedule').innerHTML = 
                '<div class="error">時刻表データのロードに失敗しました。</div>';
        });
}

// 現在時刻の更新と次のバス時刻計算
function updateClock() {
    const now = new Date();
    
    // 現在時刻と曜日を表示
    document.getElementById('current-day').textContent = formatTime();
    document.getElementById('current-dayname').textContent = getDayName(now);
    
    // バスデータがあれば次の出発時刻を計算
    if (busData) {
        const schedule = getTodaySchedule(now);
        const nextDeparture = findNextDeparture(schedule, now);
        updateNextBusInfo(nextDeparture, now);
        updateTodaySchedule(schedule, nextDeparture);
    }
}

// 日付のフォーマット (yyyy-MM-dd)
function formatTime() {
    const datetime = new Date().toLocaleDateString('ja-JP')
    return datetime;
}

// 曜日の名前を取得
function getDayName(date) {
    const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
    return dayNames[date.getDay()];
}

// 今日の時刻表を取得
function getTodaySchedule(date) {
    const day = date.getDay();
    
    // 0=日曜, 6=土曜, 1-5=平日
    if (day === 0) {
        return busData.holiday; // 日曜・祝日
    } else if (day === 6) {
        return busData.weekend; // 土曜
    } else {
        return busData.weekday; // 平日
    }
}

// 次の出発時刻を見つける
function findNextDeparture(schedule, now) {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // すべての出発時刻をチェック
    for (const hourData of schedule) {
        if (hourData.hour < currentHour) continue;
        
        for (const minute of hourData.minutes) {
            if (hourData.hour === currentHour && minute <= currentMinute) continue;
            
            // 次の出発時刻を発見
            return {
                hour: hourData.hour,
                minute: minute
            };
        }
    }
    
    // 本日の出発がもう無い場合は翌日の最初のバス
    if (schedule.length > 0 && schedule[0].minutes.length > 0) {
        return {
            hour: schedule[0].hour,
            minute: schedule[0].minutes[0],
            isNextDay: true
        };
    }
    
    // バスが見つからない場合（データなし）
    return null;
}

// 次のバス情報を画面に表示
function updateNextBusInfo(nextDeparture, now) {
    const nextDepartureEl = document.getElementById('next-departure');
    const minutesLeftEl = document.getElementById('minutes-left');
    
    if (!nextDeparture) {
        nextDepartureEl.textContent = '時刻表なし';
        minutesLeftEl.textContent = '';
        return;
    }
    
    // 時刻表示
    const timeStr = `${nextDeparture.hour.toString().padStart(2, '0')}:${nextDeparture.minute.toString().padStart(2, '0')}`;
    nextDepartureEl.textContent = timeStr;
    
    // 残り時間計算
    let minutesLeft;
    
    if (nextDeparture.isNextDay) {
        // 翌日の場合は残りの時間を計算
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(nextDeparture.hour, nextDeparture.minute, 0, 0);
        
        const diffMs = tomorrow - now;
        minutesLeft = Math.floor(diffMs / 60000); // ミリ秒から分に変換
        minutesLeftEl.textContent = `あと ${minutesLeft} 分 (明日)`;
    } else {
        // 同日の場合
        const nextTime = new Date(now);
        nextTime.setHours(nextDeparture.hour, nextDeparture.minute, 0, 0);
        
        const diffMs = nextTime - now;
        minutesLeft = Math.floor(diffMs / 60000); // ミリ秒から分に変換
        minutesLeftEl.textContent = `あと ${minutesLeft} 分`;
    }
}

// 本日の時刻表を表示
function updateTodaySchedule(schedule, nextDeparture) {
    const scheduleEl = document.getElementById('today-schedule');
    scheduleEl.innerHTML = '';
    
    if (!schedule || schedule.length === 0) {
        scheduleEl.innerHTML = '<div class="empty-message">本日の運行はありません</div>';
        return;
    }
    
    // 各時間帯をループ
    for (const hourData of schedule) {
        for (const minute of hourData.minutes) {
            const timeItem = document.createElement('div');
            timeItem.className = 'time-item';
            
            const timeStr = `${hourData.hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            
            // 次のバスかどうかを判定
            const isNext = nextDeparture && 
                          !nextDeparture.isNextDay && 
                          hourData.hour === nextDeparture.hour && 
                          minute === nextDeparture.minute;
            
            timeItem.innerHTML = `
                <span class="departure-time">${timeStr}</span>
                ${isNext ? '<span class="next-indicator">次</span>' : ''}
            `;
            
            scheduleEl.appendChild(timeItem);
        }
    }
}